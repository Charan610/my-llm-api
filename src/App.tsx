import React, { useState, useEffect, useRef } from 'react';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { Composer } from './components/Composer';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { ReasoningBox } from './components/ReasoningBox';
import { SettingsModal } from './components/SettingsModal';
import { DashboardView } from './components/DashboardView';
import { Storage, Conversation, AppSettings } from './lib/storage';
import { ProviderManager } from './lib/ai/provider-manager';
import { ChatMessage, ProviderMode, AIStatus } from './lib/ai/types';
import { builtInTools } from './lib/tools';
import { Sparkles, Bot, User, RotateCcw, Copy, Check } from 'lucide-react';

export const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(() => Storage.getSettings());
  const [conversations, setConversations] = useState<Conversation[]>(() => Storage.getConversations());
  const [currentId, setCurrentId] = useState<string | null>(() => Storage.getCurrentConversationId());
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const providerManagerRef = useRef<ProviderManager | null>(null);

  // Initialize Provider Manager
  if (!providerManagerRef.current) {
    providerManagerRef.current = new ProviderManager({
      mode: settings.providerMode,
      apiConfig: {
        baseUrl: settings.apiBaseUrl,
        apiKey: settings.apiKey,
        model: settings.modelName,
      },
    });
  }

  // Sync settings changes to Provider Manager
  useEffect(() => {
    if (providerManagerRef.current) {
      providerManagerRef.current.setMode(settings.providerMode);
      providerManagerRef.current.updateApiConfig({
        baseUrl: settings.apiBaseUrl,
        apiKey: settings.apiKey,
        model: settings.modelName,
      });
    }
  }, [settings]);

  // Current active conversation
  const currentConv = conversations.find((c) => c.id === currentId);

  // Auto-scroll on new tokens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConv?.messages, isGenerating]);

  // Create initial conversation if empty
  useEffect(() => {
    if (conversations.length === 0) {
      handleNewChat();
    } else if (!currentId) {
      setCurrentId(conversations[0].id);
    }
  }, []);

  const handleNewChat = () => {
    const newConv: Conversation = {
      id: 'conv_' + Date.now().toString(36),
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      providerMode: settings.providerMode,
      model: settings.modelName,
    };
    const updated = [newConv, ...conversations];
    setConversations(updated);
    setCurrentId(newConv.id);
    Storage.saveConversations(updated);
    Storage.setCurrentConversationId(newConv.id);
  };

  const handleDeleteConversation = (id: string) => {
    const filtered = conversations.filter((c) => c.id !== id);
    setConversations(filtered);
    Storage.saveConversations(filtered);
    if (currentId === id) {
      const nextId = filtered[0]?.id || null;
      setCurrentId(nextId);
      if (nextId) Storage.setCurrentConversationId(nextId);
    }
  };

  const handleClearAll = () => {
    if (confirm('Clear all conversation history?')) {
      setConversations([]);
      Storage.saveConversations([]);
      handleNewChat();
    }
  };

  const handleExportMarkdown = () => {
    if (!currentConv) return;
    let md = `# ${currentConv.title}\n\n`;
    currentConv.messages.forEach((m) => {
      md += `### ${m.role.toUpperCase()} (${new Date(m.timestamp).toLocaleTimeString()}):\n\n`;
      if (m.reasoning) {
        md += `> Thought process:\n> ${m.reasoning.replace(/\n/g, '\n> ')}\n\n`;
      }
      md += `${m.content}\n\n---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentConv.title.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    if (!currentConv) return;
    const blob = new Blob([JSON.stringify(currentConv, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentConv.title.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || isGenerating) return;

    setInput('');

    let conv = currentConv;
    if (!conv) {
      handleNewChat();
      conv = conversations[0];
    }

    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now().toString(36),
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
    };

    const assistantMsgId = 'msg_' + (Date.now() + 1).toString(36);
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    // Update conversation with user and empty assistant message
    const updatedMessages = [...(conv?.messages || []), userMsg, assistantMsg];
    const isFirstUserMessage = (conv?.messages.length || 0) === 0;
    const title = isFirstUserMessage ? textToSend.slice(0, 36) : conv?.title || 'New Conversation';

    const updatedConv: Conversation = {
      ...(conv || {
        id: 'conv_' + Date.now().toString(36),
        createdAt: Date.now(),
        providerMode: settings.providerMode,
        model: settings.modelName,
      }),
      title,
      messages: updatedMessages,
      updatedAt: Date.now(),
    };

    const nextConversations = conversations.map((c) => (c.id === updatedConv.id ? updatedConv : c));
    setConversations(nextConversations);
    Storage.saveConversations(nextConversations);

    setIsGenerating(true);

    try {
      let currentContent = '';
      let currentReasoning = '';
      const startTime = performance.now();

      await providerManagerRef.current?.stream(
        {
          messages: updatedMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
          model: settings.modelName,
          temperature: settings.temperature,
          systemPrompt: settings.systemPrompt,
        },
        (token, reasoning) => {
          if (token) currentContent += token;
          if (reasoning) currentReasoning += reasoning;

          // Live update message content in state
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== updatedConv.id) return c;
              return {
                ...c,
                messages: c.messages.map((m) => {
                  if (m.id !== assistantMsgId) return m;
                  return {
                    ...m,
                    content: currentContent,
                    reasoning: currentReasoning || undefined,
                  };
                }),
              };
            })
          );
        }
      );

      const elapsedSec = (performance.now() - startTime) / 1000;
      const tokenCount = currentContent.split(/\s+/).length;
      const tokensPerSec = elapsedSec > 0 ? Number((tokenCount / elapsedSec).toFixed(1)) : 30.6;

      // Log usage metrics
      Storage.logMetric({
        promptTokens: 18,
        completionTokens: tokenCount,
        totalTokens: tokenCount + 18,
        tokensPerSecond: tokensPerSec,
        latencyMs: Math.round(performance.now() - startTime),
        provider: settings.providerMode,
        model: settings.modelName,
      });

      // Update final token stats on assistant message
      setConversations((prev) => {
        const finalConvs = prev.map((c) => {
          if (c.id !== updatedConv.id) return c;
          return {
            ...c,
            messages: c.messages.map((m) => {
              if (m.id !== assistantMsgId) return m;
              return {
                ...m,
                tokensPerSec,
                totalTokens: tokenCount,
              };
            }),
          };
        });
        Storage.saveConversations(finalConvs);
        return finalConvs;
      });
    } catch (err: any) {
      console.error('Inference error', err);
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== updatedConv.id) return c;
          return {
            ...c,
            messages: c.messages.map((m) => {
              if (m.id !== assistantMsgId) return m;
              return {
                ...m,
                content: `⚠️ **Connection Error**: ${err.message || 'Could not reach inference engine.'}\n\nPlease check that your server is running (e.g. \`./start_minicpm.sh\`) or switch to **WebGPU Mode** in Settings.`,
              };
            }),
          };
        })
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStop = () => {
    providerManagerRef.current?.stop();
    setIsGenerating(false);
  };

  const handleRegenerate = () => {
    if (!currentConv || currentConv.messages.length < 2 || isGenerating) return;
    const lastUserMsg = [...currentConv.messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      // Remove last assistant message
      const pruned = currentConv.messages.slice(0, -1);
      const updatedConv = { ...currentConv, messages: pruned };
      const nextConversations = conversations.map((c) => (c.id === updatedConv.id ? updatedConv : c));
      setConversations(nextConversations);
      handleSendMessage(lastUserMsg.content);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleToggleTool = (toolName: string) => {
    const active = settings.enabledTools.includes(toolName);
    const updatedTools = active
      ? settings.enabledTools.filter((t) => t !== toolName)
      : [...settings.enabledTools, toolName];

    const updated = { ...settings, enabledTools: updatedTools };
    setSettings(updated);
    Storage.saveSettings(updated);
  };

  const status: AIStatus = providerManagerRef.current?.getStatus() || { state: 'idle' };

  return (
    <div className="app-container">
      {/* Sidebar Drawer */}
      <Sidebar
        conversations={conversations}
        currentId={currentId}
        onSelectConversation={(id) => setCurrentId(id)}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onClearAll={handleClearAll}
        onExportMarkdown={handleExportMarkdown}
        onExportJSON={handleExportJSON}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      {/* Main Canvas */}
      <main className="main-content">
        <TopNav
          mode={settings.providerMode}
          status={status}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onSelectMode={(mode: ProviderMode) => {
            const updated = { ...settings, providerMode: mode };
            setSettings(updated);
            Storage.saveSettings(updated);
          }}
        />

        {/* View Switcher: Chat vs Dashboard */}
        {activeTab !== 'chat' ? (
          <DashboardView activeTab={activeTab} onBackToChat={() => setActiveTab('chat')} />
        ) : (
          <>
            <div className="chat-scroll-area">
              {currentConv && currentConv.messages.length > 0 ? (
                <div className="messages-list">
                  {currentConv.messages.map((msg) => (
                    <div key={msg.id} className={`message-row ${msg.role}`}>
                      <div className={`avatar ${msg.role}`}>
                        {msg.role === 'assistant' ? <Bot size={18} /> : <User size={18} />}
                      </div>

                      <div className="message-bubble">
                        {msg.reasoning && <ReasoningBox reasoning={msg.reasoning} />}

                        <MarkdownRenderer content={msg.content} />

                        {msg.role === 'assistant' && msg.content && (
                          <div className="message-meta">
                            {msg.tokensPerSec && <span>{msg.tokensPerSec} tok/s</span>}
                            {msg.totalTokens && <span>• {msg.totalTokens} tokens</span>}
                            <button
                              className="meta-action-btn"
                              onClick={() => handleCopyMessage(msg.id, msg.content)}
                              title="Copy answer"
                            >
                              {copiedMsgId === msg.id ? (
                                <>
                                  <Check size={12} color="var(--success)" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={12} />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                            <button
                              className="meta-action-btn"
                              onClick={handleRegenerate}
                              title="Regenerate answer"
                            >
                              <RotateCcw size={12} />
                              <span>Regenerate</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="welcome-card">
                  <div className="welcome-logo">
                    <Sparkles size={32} color="white" />
                  </div>
                  <h1 className="welcome-title">Universal MiniCPM AI Platform</h1>
                  <p className="welcome-desc">
                    Your personal, lightweight AI assistant powered by <strong>MiniCPM5-2B</strong>.
                    Runs natively in your browser via <strong>WebGPU</strong> or streams from your local Mac inference server.
                  </p>

                  <div className="quick-prompts-grid">
                    <div
                      className="prompt-chip"
                      onClick={() => handleSendMessage('Explain Java exception handling simply.')}
                    >
                      <span className="prompt-chip-title">Java Exception Handling</span>
                      <span>Learn try, catch, and finally blocks simply with code examples.</span>
                    </div>

                    <div
                      className="prompt-chip"
                      onClick={() => handleSendMessage('Write a Python function to benchmark token generation speed.')}
                    >
                      <span className="prompt-chip-title">Python Benchmark Script</span>
                      <span>Calculate tokens per second and measure memory throughput.</span>
                    </div>

                    <div
                      className="prompt-chip"
                      onClick={() => handleSendMessage('Compare WebGPU in-browser inference with local server inference.')}
                    >
                      <span className="prompt-chip-title">WebGPU vs Server Mode</span>
                      <span>Understand zero-server browser privacy vs server scalability.</span>
                    </div>

                    <div
                      className="prompt-chip"
                      onClick={() => handleSendMessage('How can I connect my Android phone to this MiniCPM model over Wi-Fi?')}
                    >
                      <span className="prompt-chip-title">Mobile Phone Access</span>
                      <span>Configure your phone app using Base URL and OpenAI format.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Composer */}
            <Composer
              input={input}
              setInput={setInput}
              onSend={() => handleSendMessage()}
              onStop={handleStop}
              isGenerating={isGenerating}
              enabledTools={settings.enabledTools}
              onToggleTool={handleToggleTool}
            />
          </>
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={(newSettings) => {
          setSettings(newSettings);
          Storage.saveSettings(newSettings);
        }}
      />
    </div>
  );
};

export default App;

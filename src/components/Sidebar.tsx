import React from 'react';
import {
  Plus,
  MessageSquare,
  Key,
  Wrench,
  BarChart3,
  Trash2,
  Download,
  X,
  Cpu,
} from 'lucide-react';
import { Conversation } from '../lib/storage';

export type ActiveTab = 'chat' | 'applications' | 'tools' | 'analytics';

interface SidebarProps {
  conversations: Conversation[];
  currentId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onClearAll: () => void;
  onExportMarkdown: () => void;
  onExportJSON: () => void;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  currentId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onClearAll,
  onExportMarkdown,
  onExportJSON,
  activeTab,
  onSelectTab,
  isOpen,
  onCloseMobile,
}) => {
  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onCloseMobile} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-badge">
            <div className="brand-icon">
              <Cpu size={20} color="white" />
            </div>
            <div>
              <div className="brand-title">Universal AI</div>
              <div className="brand-sub">MiniCPM5-2B Platform</div>
            </div>
          </div>
          <button className="conv-action-btn mobile-only" onClick={onCloseMobile} style={{ display: 'md:none' }}>
            <X size={18} />
          </button>
        </div>

        <button className="new-chat-btn" onClick={onNewChat} id="btn-new-chat">
          <Plus size={16} />
          <span>New Chat</span>
        </button>

        <div className="conversations-list">
          <div style={{ padding: '6px 8px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Recents ({conversations.length})
          </div>
          {conversations.length === 0 ? (
            <div style={{ padding: '16px 12px', fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              No conversations yet.
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`conv-item ${conv.id === currentId && activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => {
                  onSelectConversation(conv.id);
                  onSelectTab('chat');
                  onCloseMobile();
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <MessageSquare size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
                  <span className="conv-title">{conv.title || 'Untitled Chat'}</span>
                </div>
                <div className="conv-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="conv-action-btn"
                    title="Delete chat"
                    onClick={() => onDeleteConversation(conv.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="sidebar-footer">
          <div style={{ padding: '0 4px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Platform Modules
          </div>

          <button
            className={`nav-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => { onSelectTab('chat'); onCloseMobile(); }}
          >
            <MessageSquare size={16} />
            <span>Chat Interface</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'applications' ? 'active' : ''}`}
            onClick={() => { onSelectTab('applications'); onCloseMobile(); }}
          >
            <Key size={16} />
            <span>Apps & API Keys</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'tools' ? 'active' : ''}`}
            onClick={() => { onSelectTab('tools'); onCloseMobile(); }}
          >
            <Wrench size={16} />
            <span>Tools Hub</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => { onSelectTab('analytics'); onCloseMobile(); }}
          >
            <BarChart3 size={16} />
            <span>Usage Metrics</span>
          </button>

          {conversations.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              <button
                className="btn-secondary"
                style={{ flex: 1, padding: '6px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                onClick={onExportMarkdown}
                title="Export as Markdown"
              >
                <Download size={13} />
                <span>Export MD</span>
              </button>
              <button
                className="btn-secondary"
                style={{ flex: 1, padding: '6px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                onClick={onExportJSON}
                title="Export as JSON"
              >
                <Download size={13} />
                <span>JSON</span>
              </button>
              <button
                className="btn-secondary"
                style={{ padding: '6px 8px', fontSize: '0.75rem' }}
                onClick={onClearAll}
                title="Clear all conversations"
              >
                <Trash2 size={13} color="var(--error)" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

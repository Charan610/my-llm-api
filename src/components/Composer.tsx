import React, { useRef, useEffect } from 'react';
import { ArrowUp, Square, Calculator, Globe, Clock, Sparkles } from 'lucide-react';

interface ComposerProps {
  input: string;
  setInput: (val: string) => void;
  onSend: () => void;
  onStop: () => void;
  isGenerating: boolean;
  enabledTools: string[];
  onToggleTool: (toolName: string) => void;
}

export const Composer: React.FC<ComposerProps> = ({
  input,
  setInput,
  onSend,
  onStop,
  isGenerating,
  enabledTools,
  onToggleTool,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isGenerating && input.trim()) {
        onSend();
      }
    }
  };

  return (
    <div className="composer-dock">
      <div className="composer-box">
        <textarea
          ref={textareaRef}
          className="composer-textarea"
          placeholder="Ask MiniCPM anything (e.g., 'Explain Java exception handling' or 'Calculate 2^16')..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          id="composer-input"
        />

        <div className="composer-footer">
          <div className="composer-tools">
            <button
              className={`tool-pill ${enabledTools.includes('web_search') ? 'active' : ''}`}
              onClick={() => onToggleTool('web_search')}
              type="button"
              title="Search the web"
            >
              <Globe size={13} />
              <span>Web Search</span>
            </button>

            <button
              className={`tool-pill ${enabledTools.includes('calculator') ? 'active' : ''}`}
              onClick={() => onToggleTool('calculator')}
              type="button"
              title="Math calculator"
            >
              <Calculator size={13} />
              <span>Calculator</span>
            </button>

            <button
              className={`tool-pill ${enabledTools.includes('datetime') ? 'active' : ''}`}
              onClick={() => onToggleTool('datetime')}
              type="button"
              title="Current time & date"
            >
              <Clock size={13} />
              <span>DateTime</span>
            </button>
          </div>

          <div>
            {isGenerating ? (
              <button className="stop-btn" onClick={onStop} id="btn-stop-generation" title="Stop generation">
                <Square size={16} fill="currentColor" />
              </button>
            ) : (
              <button
                className="send-btn"
                onClick={onSend}
                disabled={!input.trim()}
                id="btn-send-message"
                title="Send prompt (Enter)"
              >
                <ArrowUp size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="composer-hint">
        MiniCPM5-2B (Q4_K_M) — Press Enter to send, Shift + Enter for new line
      </div>
    </div>
  );
};

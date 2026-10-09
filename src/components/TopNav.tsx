import React from 'react';
import { Menu, Settings, Sparkles, Server, Zap, ShieldCheck } from 'lucide-react';
import { ProviderMode, AIStatus } from '../lib/ai/types';

interface TopNavProps {
  mode: ProviderMode;
  status: AIStatus;
  deviceName?: string;
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
  onSelectMode: (mode: ProviderMode) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  mode,
  status,
  deviceName,
  onOpenSettings,
  onToggleSidebar,
  onSelectMode,
}) => {
  return (
    <header className="top-nav">
      <div className="top-nav-left">
        <button
          className="conv-action-btn"
          onClick={onToggleSidebar}
          style={{ padding: '8px', color: 'var(--text-secondary)' }}
          id="btn-sidebar-toggle"
          title="Toggle Sidebar"
        >
          <Menu size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.92rem', fontWeight: 600 }}>MiniCPM5-2B</span>
          <span style={{ fontSize: '0.74rem', background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            2.5B Q4
          </span>
        </div>
      </div>

      <div className="top-nav-right">
        {/* Mode Selector Pill */}
        <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '3px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-medium)' }}>
          <button
            onClick={() => onSelectMode('auto')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.76rem',
              fontWeight: 500,
              background: mode === 'auto' ? 'var(--accent-gradient)' : 'transparent',
              color: mode === 'auto' ? 'white' : 'var(--text-secondary)',
            }}
            title="Automatic Mode: Uses WebGPU if supported, else falls back to API"
          >
            <Zap size={12} />
            <span>Auto</span>
          </button>

          <button
            onClick={() => onSelectMode('webgpu')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.76rem',
              fontWeight: 500,
              background: mode === 'webgpu' ? 'var(--accent-gradient)' : 'transparent',
              color: mode === 'webgpu' ? 'white' : 'var(--text-secondary)',
            }}
            title="WebGPU: Zero-server, runs completely in browser memory"
          >
            <Sparkles size={12} />
            <span>WebGPU</span>
          </button>

          <button
            onClick={() => onSelectMode('api')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.76rem',
              fontWeight: 500,
              background: mode === 'api' ? 'var(--accent-gradient)' : 'transparent',
              color: mode === 'api' ? 'white' : 'var(--text-secondary)',
            }}
            title="API Mode: Connects to local Mac / remote OpenAI-compatible server"
          >
            <Server size={12} />
            <span>API Server</span>
          </button>
        </div>

        {/* Hardware / Engine Status Indicator */}
        <div className="mode-badge" onClick={onOpenSettings} title="Click to view server / WebGPU settings">
          <div className={`status-dot ${status.state === 'generating' || status.state === 'loading' ? 'loading' : status.state === 'error' ? 'error' : ''}`} />
          <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
            {status.state === 'generating'
              ? 'Generating...'
              : status.state === 'loading'
              ? status.statusText || 'Loading...'
              : status.state === 'error'
              ? 'Error'
              : mode === 'webgpu'
              ? 'WebGPU Active'
              : mode === 'api'
              ? 'API Active'
              : 'Auto Router Active'}
          </span>
        </div>

        {/* Settings Button */}
        <button
          className="conv-action-btn"
          onClick={onOpenSettings}
          style={{ padding: '8px', color: 'var(--text-secondary)' }}
          id="btn-settings-open"
          title="Open Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
};

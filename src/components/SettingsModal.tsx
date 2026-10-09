import React, { useState } from 'react';
import { X, Server, Sparkles, Zap, Shield, RotateCcw } from 'lucide-react';
import { AppSettings } from '../lib/storage';
import { ProviderMode } from '../lib/ai/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  if (!isOpen) return null;

  const handleModeChange = (mode: ProviderMode) => {
    setLocalSettings({ ...localSettings, providerMode: mode });
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 className="modal-title">Platform & Inference Settings</h3>
          </div>
          <button className="conv-action-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* AI Engine Selection */}
          <div className="setting-group">
            <label className="setting-label">AI Execution Engine</label>
            <div className="setting-desc">Choose whether inference runs in the browser or via API.</div>
            <div className="radio-group">
              <div
                className={`radio-card ${localSettings.providerMode === 'auto' ? 'selected' : ''}`}
                onClick={() => handleModeChange('auto')}
              >
                <Zap size={20} color="#6366f1" style={{ marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Automatic Mode (Recommended)</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Uses client-side WebGPU when supported; automatically falls back to your API Server.
                  </div>
                </div>
              </div>

              <div
                className={`radio-card ${localSettings.providerMode === 'webgpu' ? 'selected' : ''}`}
                onClick={() => handleModeChange('webgpu')}
              >
                <Sparkles size={20} color="#a855f7" style={{ marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Local WebGPU (Browser Memory)</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Runs 100% on the user device via WebGPU. Zero server costs and zero data egress.
                  </div>
                </div>
              </div>

              <div
                className={`radio-card ${localSettings.providerMode === 'api' ? 'selected' : ''}`}
                onClick={() => handleModeChange('api')}
              >
                <Server size={20} color="#10b981" style={{ marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>API Server Mode (Local Mac / Remote Gateway)</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Connects to your Mac's MiniCPM inference server (`0.0.0.0:11434`) or cloud gateway.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* API Server Configuration */}
          <div className="setting-group">
            <label className="setting-label">API Base URL</label>
            <div className="setting-desc">OpenAI-compatible `/v1` endpoint.</div>
            <input
              type="text"
              className="setting-input"
              value={localSettings.apiBaseUrl}
              onChange={(e) => setLocalSettings({ ...localSettings, apiBaseUrl: e.target.value })}
              placeholder="http://127.0.0.1:11434/v1"
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                onClick={() => setLocalSettings({ ...localSettings, apiBaseUrl: 'http://127.0.0.1:11434/v1' })}
              >
                Preset: Localhost (127.0.0.1)
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                onClick={() => setLocalSettings({ ...localSettings, apiBaseUrl: 'http://192.168.1.50:11434/v1' })}
              >
                Preset: Mac LAN (192.168.1.50)
              </button>
            </div>
          </div>

          <div className="setting-group">
            <label className="setting-label">API Key</label>
            <div className="setting-desc">Required by OpenAI format (use 'ollama' or your application token).</div>
            <input
              type="password"
              className="setting-input"
              value={localSettings.apiKey}
              onChange={(e) => setLocalSettings({ ...localSettings, apiKey: e.target.value })}
              placeholder="ollama"
            />
          </div>

          <div className="setting-group">
            <label className="setting-label">Model Identifier</label>
            <input
              type="text"
              className="setting-input"
              value={localSettings.modelName}
              onChange={(e) => setLocalSettings({ ...localSettings, modelName: e.target.value })}
              placeholder="minicpm5-2b"
            />
          </div>

          {/* Temperature */}
          <div className="setting-group">
            <div className="setting-label">
              <span>Sampling Temperature: {localSettings.temperature}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.5"
              step="0.05"
              value={localSettings.temperature}
              onChange={(e) => setLocalSettings({ ...localSettings, temperature: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
            />
          </div>

          {/* System Prompt */}
          <div className="setting-group">
            <label className="setting-label">System Instructions</label>
            <textarea
              className="setting-input"
              rows={3}
              value={localSettings.systemPrompt}
              onChange={(e) => setLocalSettings({ ...localSettings, systemPrompt: e.target.value })}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} id="btn-save-settings">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

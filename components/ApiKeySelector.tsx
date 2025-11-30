import React, { useState, useEffect } from 'react';
import { Key, ArrowRight, Save, X, Trash2, Video } from 'lucide-react';
import { openApiKeySelector } from '../services/geminiService';

interface ApiKeySelectorProps {
  onKeySelected: () => void;
  onClose?: () => void; // Optional: If provided, shows a close button
}

type KeyType = 'gemini' | 'veo';

const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ onKeySelected, onClose }) => {
  const [activeTab, setActiveTab] = useState<KeyType>('gemini');
  const [useManualInput, setUseManualInput] = useState(false);
  const [manualKey, setManualKey] = useState('');
  const [error, setError] = useState('');
  const [savedKeyMask, setSavedKeyMask] = useState('');

  const getStorageKey = (type: KeyType) => {
    return type === 'gemini' ? 'gemini_api_key' : 'veo_api_key';
  };

  const updateSavedKeyMask = (type: KeyType) => {
    const stored = localStorage.getItem(getStorageKey(type));
    if (stored) {
      const mask = stored.substring(0, 4) + '...' + stored.substring(stored.length - 4);
      setSavedKeyMask(mask);
      setUseManualInput(true);
    } else {
      setSavedKeyMask('');
    }
  };

  useEffect(() => {
    // Check if AI Studio integration is available (only for Gemini)
    const win = window as any;
    if (activeTab === 'gemini' && (!win.aistudio || !win.aistudio.openSelectKey)) {
      setUseManualInput(true);
    } else if (activeTab === 'veo') {
      setUseManualInput(true);
    }

    // Check if a manual key is already saved for current tab
    updateSavedKeyMask(activeTab);
    setManualKey('');
    setError('');
  }, [activeTab]);

  const handleSelectKey = async () => {
    if (activeTab === 'veo') {
      setUseManualInput(true);
      return;
    }
    
    try {
      await openApiKeySelector();
      updateSavedKeyMask('gemini');
      onKeySelected();
    } catch (error) {
      console.error("Failed to select key via studio", error);
      // Fallback to manual input if automatic fails
      setUseManualInput(true);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualKey.trim()) {
      setError('请输入有效的 API Key');
      return;
    }
    
    // Save to local storage for persistence in this browser
    localStorage.setItem(getStorageKey(activeTab), manualKey.trim());
    updateSavedKeyMask(activeTab);
    setManualKey('');
    onKeySelected();
  };

  const handleClearKey = () => {
    localStorage.removeItem(getStorageKey(activeTab));
    setSavedKeyMask('');
    setManualKey('');
    setError('');
  };

  return (
    <div className="api-key-selector-overlay">
      <div className="api-key-selector-modal">
        {/* Decorative background */}
        <div className="api-key-selector-top-bar"></div>
        <div className="api-key-selector-bg"></div>

        {/* Close Button */}
        {onClose && (
          <button 
            onClick={onClose}
            className="api-key-selector-close"
          >
            <X />
          </button>
        )}

        <div className="api-key-selector-content">
          <div className="api-key-selector-icon">
            {activeTab === 'gemini' ? <Key /> : <Video />}
          </div>
          
          <h2 className="api-key-selector-title">
            {savedKeyMask ? '配置 API Key' : '欢迎使用 StoryBoard AI'}
          </h2>
          
          {/* Tab Selector */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => setActiveTab('gemini')}
              style={{
                flex: 1,
                padding: '8px 16px',
                background: activeTab === 'gemini' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === 'gemini' ? '2px solid rgb(99, 102, 241)' : '2px solid transparent',
                color: activeTab === 'gemini' ? 'white' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '14px',
                fontWeight: activeTab === 'gemini' ? '600' : '400'
              }}
            >
              Gemini API
            </button>
            <button
              onClick={() => setActiveTab('veo')}
              style={{
                flex: 1,
                padding: '8px 16px',
                background: activeTab === 'veo' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === 'veo' ? '2px solid rgb(99, 102, 241)' : '2px solid transparent',
                color: activeTab === 'veo' ? 'white' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '14px',
                fontWeight: activeTab === 'veo' ? '600' : '400'
              }}
            >
              VEO API
            </button>
          </div>

          <p className="api-key-selector-description">
            {savedKeyMask 
              ? `您可以更新或清除已保存的 ${activeTab === 'gemini' ? 'Gemini' : 'VEO'} API Key。` 
              : activeTab === 'gemini'
                ? '为了开始创作，请输入您的 Google Gemini API Key。您的密钥仅存储在本地浏览器中。'
                : '为了生成视频，请输入您的第三方 VEO API Key（来自 ai.t8star.cn）。您的密钥仅存储在本地浏览器中。'}
          </p>
          
          {savedKeyMask ? (
            <div className="api-key-selector-saved">
              <p className="api-key-selector-saved-label">当前正在使用自定义 Key</p>
              <p className="api-key-selector-saved-key">{savedKeyMask}</p>
              <button 
                onClick={handleClearKey}
                className="api-key-selector-clear-button"
              >
                <Trash2 /> 清除并重新输入
              </button>
            </div>
          ) : null}

          {useManualInput ? (
            <form onSubmit={handleManualSubmit} className="api-key-selector-form">
              <div className="api-key-selector-field">
                <label className="api-key-selector-field-label">
                  {savedKeyMask ? '更新 Key' : '输入新的 Key'}
                </label>
                <input
                  type="password"
                  value={manualKey}
                  onChange={(e) => {
                    setManualKey(e.target.value);
                    setError('');
                  }}
                  placeholder={activeTab === 'gemini' ? "AIzaSy..." : "输入VEO API Key"}
                  className="api-key-selector-input"
                  autoFocus={!savedKeyMask}
                />
                {error && <p className="api-key-selector-error">{error}</p>}
              </div>

              <button
                type="submit"
                className="api-key-selector-submit-button"
              >
                <Save />
                {savedKeyMask ? '更新设置' : '开始使用'}
              </button>
            </form>
          ) : (
            <div className="api-key-selector-alternatives">
              <button
                onClick={handleSelectKey}
                className="api-key-selector-studio-button"
              >
                连接 Google AI Studio
                <ArrowRight />
              </button>
              
              <button 
                onClick={() => setUseManualInput(true)}
                className="api-key-selector-manual-link"
              >
                或者手动输入 API Key
              </button>
            </div>
          )}
          
          <div className="api-key-selector-footer">
             <p className="api-key-selector-footer-text">
                {activeTab === 'gemini' ? (
                  <>没有 Key? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="api-key-selector-footer-link">在此处免费获取</a></>
                ) : (
                  <>VEO API Key 需要从第三方服务商获取</>
                )}
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySelector;
import React, { useState, useEffect } from 'react';
import { Key, ArrowRight, Save, X, Trash2 } from 'lucide-react';
import { openApiKeySelector } from '../services/geminiService';

interface ApiKeySelectorProps {
  onKeySelected: () => void;
  onClose?: () => void; // Optional: If provided, shows a close button
}

const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ onKeySelected, onClose }) => {
  const [useManualInput, setUseManualInput] = useState(false);
  const [manualKey, setManualKey] = useState('');
  const [error, setError] = useState('');
  const [savedKeyMask, setSavedKeyMask] = useState('');

  useEffect(() => {
    // Check if AI Studio integration is available
    const win = window as any;
    if (!win.aistudio || !win.aistudio.openSelectKey) {
      setUseManualInput(true);
    }

    // Check if a manual key is already saved
    const stored = localStorage.getItem("gemini_api_key");
    if (stored) {
      const mask = stored.substring(0, 4) + '...' + stored.substring(stored.length - 4);
      setSavedKeyMask(mask);
      setUseManualInput(true);
    }
  }, []);

  const handleSelectKey = async () => {
    try {
      await openApiKeySelector();
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
    localStorage.setItem("gemini_api_key", manualKey.trim());
    onKeySelected();
  };

  const handleClearKey = () => {
    localStorage.removeItem("gemini_api_key");
    setSavedKeyMask('');
    setManualKey('');
    // If we can close, we might want to refresh state, but simple clear is UI update
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-[#1A1E29] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
        <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none"></div>

        {/* Close Button */}
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors z-20"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="relative z-10">
          <div className="mx-auto bg-indigo-500/20 w-16 h-16 rounded-full flex items-center justify-center mb-6 ring-1 ring-indigo-500/50">
            <Key className="w-8 h-8 text-indigo-400" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-3">
            {savedKeyMask ? '配置 API Key' : '欢迎使用 StoryBoard AI'}
          </h2>
          <p className="text-slate-400 mb-8 text-sm leading-relaxed">
            {savedKeyMask 
              ? '您可以更新或清除已保存的 API Key。' 
              : '为了开始创作，请输入您的 Google Gemini API Key。您的密钥仅存储在本地浏览器中。'}
          </p>
          
          {savedKeyMask ? (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
              <p className="text-xs text-green-400 font-bold uppercase tracking-wider mb-1">当前正在使用自定义 Key</p>
              <p className="text-white font-mono">{savedKeyMask}</p>
              <button 
                onClick={handleClearKey}
                className="mt-3 text-xs text-red-400 hover:text-red-300 flex items-center justify-center gap-1 mx-auto hover:underline"
              >
                <Trash2 className="w-3 h-3" /> 清除并重新输入
              </button>
            </div>
          ) : null}

          {useManualInput ? (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="text-left">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  {savedKeyMask ? '更新 Key' : '输入新的 Key'}
                </label>
                <input
                  type="password"
                  value={manualKey}
                  onChange={(e) => {
                    setManualKey(e.target.value);
                    setError('');
                  }}
                  placeholder="AIzaSy..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono text-sm"
                  autoFocus={!savedKeyMask}
                />
                {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {savedKeyMask ? '更新设置' : '开始使用'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <button
                onClick={handleSelectKey}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
              >
                连接 Google AI Studio
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <button 
                onClick={() => setUseManualInput(true)}
                className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2"
              >
                或者手动输入 API Key
              </button>
            </div>
          )}
          
          <div className="mt-8 pt-6 border-t border-white/5">
             <p className="text-xs text-slate-500">
                没有 Key? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 hover:underline">在此处免费获取</a>
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySelector;
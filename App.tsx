import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ScriptEditor } from './components/ScriptEditor';
import { CharacterLibrary } from './components/CharacterLibrary';
import { StoryboardView } from './components/StoryboardView';
import { TimelineView } from './components/TimelineView';
import { useAppStore } from './store/useAppStore';
import { Key, ChevronRight } from 'lucide-react';

export default function App() {
  const { isApiKeyValid, setIsApiKeyValid } = useAppStore();
  const [isCheckingKey, setIsCheckingKey] = useState(true);

  useEffect(() => {
    const checkKey = async () => {
      try {
        if ((window as any).aistudio) {
          const hasKey = await (window as any).aistudio.hasSelectedApiKey();
          setIsApiKeyValid(hasKey);
        } else {
          // Dev fallback
          setIsApiKeyValid(true);
        }
      } catch (e) {
        console.error("Failed to check API key", e);
        setIsApiKeyValid(false);
      } finally {
        setIsCheckingKey(false);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setIsApiKeyValid(true);
    }
  };

  if (isCheckingKey) {
    return <div className="h-screen w-screen bg-app-bg flex items-center justify-center text-gray-500">Checking permissions...</div>;
  }

  if (!isApiKeyValid) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0E14]">
        <div className="bg-[#151923] p-8 rounded-xl border border-gray-700 max-w-md text-center shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-app-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Key className="text-app-accent" size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-4">需要连接 API 密钥</h2>
          <p className="text-gray-400 mb-6 text-sm leading-relaxed">
            本应用使用 <strong>Gemini 3 Pro</strong> 高级模型进行剧本分析和图像生成。请连接您的 Google Cloud 项目 API 密钥以继续。
            <br/>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline text-xs mt-3 inline-block">
              查看计费和配额说明
            </a>
          </p>
          <button
            onClick={handleSelectKey}
            className="bg-app-accent hover:bg-app-accentHover text-white px-8 py-3 rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg shadow-purple-900/30 w-full flex items-center justify-center gap-2"
          >
            连接 API 密钥 <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/script" replace />} />
          <Route path="script" element={<ScriptEditor />} />
          <Route path="characters" element={<CharacterLibrary />} />
          <Route path="storyboard" element={<StoryboardView />} />
          <Route path="timeline" element={<TimelineView />} />
          <Route path="assets" element={<div className="flex-1 flex items-center justify-center text-gray-500">素材库开发中...</div>} />
          <Route path="subscription" element={<div className="flex-1 flex items-center justify-center text-gray-500">订阅服务开发中...</div>} />
        </Route>
      </Routes>
    </Router>
  );
}
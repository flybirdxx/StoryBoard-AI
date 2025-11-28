import React from 'react';
import { BookOpen, Sparkles, Save, Palette, Loader2 } from 'lucide-react';
import { ImageStyle } from '../types';
import { useAppStore } from '../store/useAppStore';
import { useProjectActions } from '../hooks/useProjectActions';

export const ScriptEditor: React.FC = () => {
  const { scriptContent, setScriptContent, selectedStyle, setSelectedStyle, isAnalyzing } = useAppStore();
  const { handleAnalyzeScript } = useProjectActions();
  
  const styleMap: Record<ImageStyle, string> = {
    'Cinematic': '电影质感',
    'Anime': '日式动漫',
    '3D Render': '3D 渲染',
    'Watercolor': '水彩画',
    'Cyberpunk': '赛博朋克',
    'Sketch': '素描手绘',
    'Film Noir': '黑色电影',
    'Wes Anderson': '韦斯·安德森',
    'Studio Ghibli': '吉卜力风格',
    'Retro Sci-Fi': '复古科幻',
    'Comic Book': '美漫风格'
  };

  const styles = Object.keys(styleMap) as ImageStyle[];

  return (
    <div className="flex-1 p-8 flex flex-col h-full max-w-5xl mx-auto w-full animate-in fade-in duration-500 relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <BookOpen className="text-cyan-400" />
            剧本编辑
          </h2>
          <p className="text-gray-500 text-sm mt-1">撰写或粘贴你的故事大纲，AI将自动进行深度分析、角色提取和场景拆解。</p>
        </div>
        <div className="flex gap-3 items-center">
            {/* Style Selector */}
            <div className="flex items-center gap-2 mr-4 bg-app-card border border-app-border rounded-lg px-3 py-1.5">
               <Palette size={14} className="text-purple-400" />
               <select 
                 value={selectedStyle} 
                 onChange={(e) => setSelectedStyle(e.target.value as ImageStyle)}
                 className="bg-transparent text-sm text-gray-200 focus:outline-none cursor-pointer"
               >
                 {styles.map(s => <option key={s} value={s} className="bg-app-card">{styleMap[s]}</option>)}
               </select>
            </div>

            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors text-sm font-medium">
                <Save size={16} /> 保存草稿
            </button>
            <button 
                onClick={handleAnalyzeScript}
                disabled={isAnalyzing || !scriptContent.trim()}
                className="flex items-center gap-2 px-6 py-2 rounded-lg bg-app-accent hover:bg-app-accentHover text-white shadow-lg shadow-purple-900/20 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} 
                {isAnalyzing ? '正在分析剧本...' : '分析剧本'}
            </button>
        </div>
      </div>

      <div className="flex-1 bg-app-card border border-app-border rounded-xl p-8 shadow-inner relative overflow-hidden group focus-within:ring-1 ring-app-accent/50 transition-all">
        <textarea
            className="w-full h-full bg-transparent border-none focus:ring-0 text-gray-200 text-lg leading-relaxed resize-none placeholder-gray-600 font-serif"
            placeholder="输入你的故事大纲 (例如：一个关于时间旅行者回到过去试图拯救泰坦尼克号的故事...)"
            value={scriptContent}
            onChange={(e) => setScriptContent(e.target.value)}
            spellCheck={false}
        />
        <div className="absolute bottom-4 right-6 text-gray-600 text-xs bg-black/40 px-2 py-1 rounded">
            {scriptContent.length} 字
        </div>
      </div>

      {/* Footer Action - Context Aware */}
      <div className="fixed bottom-6 right-8 z-30">
        <button 
            onClick={handleAnalyzeScript}
            disabled={isAnalyzing}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white pl-6 pr-4 py-3 rounded-full shadow-2xl shadow-purple-900/40 font-semibold flex items-center gap-2 transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50"
        >
            {isAnalyzing ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
            下一步: 分析与角色
        </button>
      </div>
    </div>
  );
};
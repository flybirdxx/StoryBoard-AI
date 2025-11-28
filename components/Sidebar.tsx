import React from 'react';
import { Sparkles, Users, Clapperboard, LayoutGrid } from 'lucide-react';

export type ViewType = 'create' | 'characters' | 'editor';

interface SidebarProps {
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  hasActiveStory: boolean;
  onOpenSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, hasActiveStory, onOpenSettings }) => {
  return (
    <aside className="w-20 lg:w-64 h-screen bg-[#0B0F19] border-r border-white/5 flex flex-col justify-between z-30 flex-shrink-0 transition-all duration-300">
      {/* Logo Area */}
      <div className="p-6 flex items-center justify-center lg:justify-start gap-3 border-b border-white/5 h-20">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20 flex-shrink-0">
          <LayoutGrid className="w-6 h-6 text-white" />
        </div>
        <div className="hidden lg:block overflow-hidden">
          <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 whitespace-nowrap">
            StoryBoard
          </h1>
          <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold whitespace-nowrap">AI Studio</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-2">
        <button
          onClick={() => onChangeView('create')}
          className={`w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-3.5 rounded-xl transition-all duration-200 group relative
            ${currentView === 'create' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' 
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }
          `}
          title="创作中心"
        >
          <Sparkles className="w-5 h-5 flex-shrink-0" />
          <span className="hidden lg:block font-medium text-sm">创作中心</span>
          {currentView === 'create' && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/20 rounded-l-full hidden lg:block"></div>}
        </button>

        <button
          onClick={() => onChangeView('characters')}
          className={`w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-3.5 rounded-xl transition-all duration-200 group relative
            ${currentView === 'characters' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' 
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }
          `}
          title="角色库"
        >
          <Users className="w-5 h-5 flex-shrink-0" />
          <span className="hidden lg:block font-medium text-sm">角色库</span>
        </button>

        <div className="my-2 border-t border-white/5 lg:mx-2"></div>

        <button
          onClick={() => hasActiveStory && onChangeView('editor')}
          disabled={!hasActiveStory}
          className={`w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-3.5 rounded-xl transition-all duration-200 group relative
            ${currentView === 'editor' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' 
              : !hasActiveStory 
                ? 'opacity-40 cursor-not-allowed text-slate-600' 
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }
          `}
          title={hasActiveStory ? "分镜编辑器" : "暂无活跃项目"}
        >
          <Clapperboard className="w-5 h-5 flex-shrink-0" />
          <span className="hidden lg:block font-medium text-sm">分镜编辑器</span>
        </button>
      </nav>

      {/* Footer Settings */}
      <div className="p-4 border-t border-white/5">
        <button 
          onClick={onOpenSettings}
          className="w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-colors"
          title="设置"
        >
           <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center border border-white/10">
              <span className="text-xs font-bold text-white">G3</span>
           </div>
           <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-slate-300">Gemini 3 Pro</p>
              <p className="text-[10px] text-slate-600">API Configured</p>
           </div>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useProjectActions } from '../hooks/useProjectActions';
import { AssetPanel } from './AssetPanel';
import { ShotCard } from './ShotCard';
import { LayoutGrid, PenTool, Images, Loader2, Sparkles, Monitor, Box, Share2, X } from 'lucide-react';
import { GenerationStatus } from '../types';

export const StoryboardView: React.FC = () => {
  const { scenes, assets, scriptContent, setScriptContent, generationStatus, setPreviewImage } = useAppStore();
  const { handleGenerateStoryboardImages, handleBatchGenerateImages, handleRegenerateShot } = useProjectActions();
  
  const [isInputVisible, setIsInputVisible] = useState(false);
  const ungeneratedCount = scenes.reduce((acc, s) => acc + s.shots.filter(sh => !sh.imageUrl && !sh.isLoading).length, 0);

  const handleUpdateShot = (sceneId: number, shotId: number, updates: any) => {
    // We can use the store action here directly
    const store = useAppStore.getState();
    store.updateSceneShot(sceneId, shotId, updates);
  };

  return (
    <>
    {/* Asset Panel (Left) */}
    <AssetPanel />

    {/* Storyboard Canvas (Right) */}
    <main className="flex-1 overflow-y-auto p-8 relative scroll-smooth">
      
      {/* Toolbar */}
      <div className="flex flex-col gap-4 mb-8 sticky top-0 z-20 bg-app-bg/95 py-4 -mt-4 border-b border-app-border/50 backdrop-blur">
         <div className="flex items-center justify-between">
           <div>
             <h1 className="text-xl font-bold text-white flex items-center gap-3">
               <LayoutGrid size={24} className="text-cyan-400" />
               故事板
               <button 
                onClick={() => setIsInputVisible(!isInputVisible)}
                className="ml-2 p-1.5 rounded-md hover:bg-gray-800 text-gray-500 hover:text-cyan-400 transition-colors"
                title="编辑剧本上下文"
               >
                 <PenTool size={14} />
               </button>
             </h1>
             <p className="text-xs text-gray-500 mt-1 ml-9">
               {scenes.length} 场景中的 {scenes.reduce((acc, s) => acc + s.shots.length, 0)} 个镜头
             </p>
           </div>

           <div className="flex items-center gap-3">
             
             <button
              onClick={handleBatchGenerateImages}
              disabled={ungeneratedCount === 0}
              className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
             >
               <Images size={16} />
               批量生成图片 {ungeneratedCount > 0 && `(${ungeneratedCount})`}
             </button>

             <button 
              onClick={handleGenerateStoryboardImages}
              disabled={generationStatus === GenerationStatus.LOADING}
              className="bg-app-accent hover:bg-app-accentHover text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-900/20 active:scale-95"
             >
               {generationStatus === GenerationStatus.LOADING ? (
                 <Loader2 size={16} className="animate-spin" />
               ) : (
                 <Sparkles size={16} />
               )}
               {generationStatus === GenerationStatus.LOADING ? '正在构思...' : '重构故事板'}
             </button>
             
             <div className="h-9 px-3 rounded-lg border border-app-border bg-app-card flex items-center gap-2 text-sm text-gray-300">
                <Monitor size={16} />
                <span className="hidden sm:inline">16:9</span>
             </div>
             
             <button className="h-9 w-9 rounded-lg border border-app-border bg-app-card flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                <Box size={18} />
             </button>
             <button className="h-9 w-9 rounded-lg border border-app-border bg-app-card flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                <Share2 size={18} />
             </button>
           </div>
         </div>
         
         {/* Script Context Input (Floating) */}
         {isInputVisible && (
           <div className="bg-app-card border border-app-border rounded-lg p-4 animate-in slide-in-from-top-2 fade-in">
              <div className="flex justify-between items-center mb-2">
                 <label className="text-xs font-semibold text-gray-400">当前参考剧本</label>
                 <button onClick={() => setIsInputVisible(false)}><X size={14} className="text-gray-500 hover:text-white"/></button>
              </div>
              <textarea 
                className="w-full bg-app-bg border border-app-border rounded-md p-3 text-sm text-gray-200 focus:outline-none focus:border-app-accent focus:ring-1 focus:ring-app-accent resize-y min-h-[80px]"
                value={scriptContent}
                onChange={(e) => setScriptContent(e.target.value)}
              />
           </div>
         )}
      </div>

      {/* Scenes List */}
      <div className="space-y-12 pb-24">
        {scenes.length > 0 ? scenes.map((scene) => (
          <div key={scene.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row gap-6 mb-6">
              <div className="flex-1">
                <div className="flex items-baseline gap-3 mb-2">
                   <span className="px-2 py-1 bg-purple-900/40 border border-purple-500/20 rounded text-xs font-bold text-purple-300">
                     场景 {scene.id}
                   </span>
                   <h2 className="text-lg font-bold text-white tracking-wide">
                     {scene.title}
                   </h2>
                </div>
                
                <div className="pl-3 border-l-2 border-gray-700">
                   <p className="text-sm text-gray-400 italic">
                     "{scene.description}"
                   </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
              {scene.shots.map((shot) => (
                <ShotCard 
                  key={shot.id} 
                  shot={shot} 
                  onRegenerate={() => handleRegenerateShot(scene.id, shot.id, shot.visualPrompt)}
                  onUpdate={(id, updates) => handleUpdateShot(scene.id, id, updates)}
                  onMaximize={(url) => setPreviewImage(url)}
                />
              ))}
            </div>

          </div>
        )) : (
          <div className="flex flex-col items-center justify-center h-96 text-gray-500">
             <LayoutGrid size={48} className="opacity-20 mb-4" />
             <p className="text-sm">暂无故事板，请从第一步开始创作</p>
          </div>
        )}
      </div>

    </main>
    </>
  );
};
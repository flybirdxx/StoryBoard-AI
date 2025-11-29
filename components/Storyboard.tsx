
import React, { useState, useEffect, useRef } from 'react';
import { ExportConfig } from '../types';
import { Loader2, ArrowRight, Download, CheckSquare, Square, PlayCircle, Sparkles, RotateCcw, RotateCw, History, Type, Plus } from 'lucide-react';
import FullScreenViewer from './FullScreenViewer';
import { SceneThumbnail, SceneStage, ComicPanel } from './SceneCard';
import InspectorPanel from './InspectorPanel';

// Store & Hooks
import { useStoryStore } from '../store/useStoryStore';
import { useStoryGeneration } from '../hooks/useStoryGeneration';
import { useImageGeneration } from '../hooks/useImageGeneration';
import { useMediaGeneration } from '../hooks/useMediaGeneration';
import { generateStylePreview } from '../services/geminiService';
import { ART_STYLE_OPTIONS } from '../constants';
import { toast } from 'sonner';

interface StoryboardProps {
  onExport: (selectedSceneIds: number[], config: ExportConfig) => void;
}

const Storyboard: React.FC<StoryboardProps> = ({ onExport }) => {
  // Store
  const { 
    story, 
    settings,
    history, 
    historyIndex, 
    plotOptions, 
    setPlotOptions,
    undo, 
    redo, 
    jumpToHistory,
    updateScene
  } = useStoryStore();

  // Logic Hooks
  const { 
    isExtendingStory, 
    isOptimizingStory, 
    isLoadingOptions,
    handleGetOptions, 
    handleExtendStory,
    handleOptimizeStory
  } = useStoryGeneration();

  const { handleRetryImage, handleModifyImage } = useImageGeneration();
  const { handleGenerateAudio, handleGenerateVideo } = useMediaGeneration();

  // Local State
  const [activeSceneId, setActiveSceneId] = useState<number>(0);
  const [selectedScenes, setSelectedScenes] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'zip' | 'long-image'>('pdf');
  const [exportWithText, setExportWithText] = useState(false);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);

  // Initialize active scene
  useEffect(() => {
    if (story && story.scenes.length > 0 && !story.scenes.find(s => s.id === activeSceneId)) {
       setActiveSceneId(story.scenes[0].id);
    }
  }, [story?.scenes.length]);

  if (!story) return null;

  // -- Handlers --

  const toggleSelectScene = (id: number) => {
    if (selectedScenes.includes(id)) {
      setSelectedScenes(prev => prev.filter(sid => sid !== id));
    } else {
      setSelectedScenes(prev => [...prev, id]);
    }
  };

  const handleExportClick = () => {
    onExport(selectedScenes.length > 0 ? selectedScenes : story.scenes.map(s => s.id), {
      format: exportFormat,
      resolution: 'original',
      withText: exportWithText
    });
  };

  const handleUpdateSceneText = async (narrative: string, visualPrompt: string, shouldRegenerate: boolean) => {
      updateScene(activeSceneId, { narrative, visual_prompt: visualPrompt });
      if (shouldRegenerate) handleRetryImage(activeSceneId);
  };

  const handleUpdateTags = (tags: string[]) => {
      updateScene(activeSceneId, { tags });
  };
  
  const handleGenerateStylePreview = async () => {
      updateScene(activeSceneId, { isLoadingStylePreview: true }, false);
      try {
          const currentStyle = settings.artStyle;
          const styleOption = ART_STYLE_OPTIONS.find(opt => opt.id === currentStyle);
          const styleDesc = styleOption ? styleOption.desc : currentStyle;
          const scene = story.scenes.find(s => s.id === activeSceneId);
          if (!scene) return;
          const previewUrl = await generateStylePreview(currentStyle, `${styleDesc}. Scene context: ${scene.visual_prompt}`);
          updateScene(activeSceneId, { isLoadingStylePreview: false, stylePreviewUrl: previewUrl }, false);
          toast.success("Style preview generated");
      } catch (error) {
          toast.error("Failed to generate style preview");
          updateScene(activeSceneId, { isLoadingStylePreview: false }, false);
      }
  };

  const activeScene = story.scenes.find(s => s.id === activeSceneId);
  const isComicMode = story.mode === 'comic';
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // -- Renders --

  const renderPlotOptionsOverlay = () => {
     // In Comic Mode, we show controls inline at the bottom, so hide overlay
     if (isComicMode) return null;

     if (isExtendingStory) return <div className="p-8 text-center bg-[#13161f] rounded-2xl border border-white/5 shadow-2xl animate-pulse flex flex-col items-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-2"/><p className="text-white font-bold">Dreaming new scenes...</p></div>;
     
     if (plotOptions.length > 0) {
        return (
           <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-8 animate-in fade-in">
              <div className="max-w-2xl w-full space-y-6">
                 <h3 className="text-2xl font-bold text-white text-center">Choose the Next Path</h3>
                 <div className="grid gap-4">
                    {plotOptions.map(opt => (
                       <button key={opt.id} onClick={() => handleExtendStory(opt.description)} className="text-left p-6 bg-[#1A1E29] hover:bg-indigo-900/30 border border-white/10 hover:border-indigo-500 rounded-xl transition-all group">
                          <h4 className="font-bold text-white mb-2 group-hover:text-indigo-300">{opt.title}</h4>
                          <p className="text-sm text-slate-400">{opt.description}</p>
                       </button>
                    ))}
                 </div>
                 <button onClick={() => setPlotOptions([])} className="text-slate-500 hover:text-white underline text-sm block mx-auto">Cancel</button>
              </div>
           </div>
        );
     }
     return null;
  };

  // Comic Page Chunking
  const SCENES_PER_PAGE = 6;
  const chunkedScenes = [];
  if (isComicMode) {
     for (let i = 0; i < story.scenes.length; i += SCENES_PER_PAGE) {
        chunkedScenes.push(story.scenes.slice(i, i + SCENES_PER_PAGE));
     }
  }

  const getComicSpanClass = (index: number) => {
      const patternIndex = index % 6;
      if (patternIndex === 0) return 'col-span-12 md:row-span-2 min-h-[400px]';
      if (patternIndex === 1 || patternIndex === 2) return 'col-span-12 md:col-span-6 min-h-[300px]';
      return 'col-span-12 md:col-span-4 min-h-[250px]';
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0F19] overflow-hidden">
      
      {/* 1. TOP HEADER BAR */}
      <div className="h-16 border-b border-white/5 bg-[#0f111a] flex items-center justify-between px-6 z-20 flex-shrink-0">
         <div className="flex items-center gap-4">
            <h2 className="font-bold text-white truncate max-w-[200px]">{story.title}</h2>
            <div className="h-4 w-px bg-white/10"></div>
            <div className="flex items-center bg-black/40 rounded-lg p-1">
               <button onClick={undo} disabled={!canUndo} className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white disabled:opacity-30"><RotateCcw className="w-4 h-4" /></button>
               <button onClick={redo} disabled={!canRedo} className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white disabled:opacity-30"><RotateCw className="w-4 h-4" /></button>
               <button onClick={() => setShowHistoryDropdown(!showHistoryDropdown)} className={`p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors ${showHistoryDropdown ? 'bg-white/10 text-white' : ''}`}><History className="w-4 h-4" /></button>
            </div>
            {showHistoryDropdown && (
               <div className="absolute top-14 left-40 w-64 bg-[#151921] border border-white/10 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto custom-scrollbar">
                  {history.map((h, i) => (
                     <button key={i} onClick={() => { jumpToHistory(i); setShowHistoryDropdown(false); }} className={`w-full text-left px-4 py-3 text-xs border-b border-white/5 hover:bg-white/5 ${i === historyIndex ? 'bg-indigo-500/10 text-indigo-300' : 'text-slate-400'}`}>
                        {h.actionType} <span className="opacity-50 ml-2">{new Date(h.lastModified || 0).toLocaleTimeString()}</span>
                     </button>
                  ))}
               </div>
            )}
         </div>

         <div className="flex items-center gap-3">
             <button onClick={handleOptimizeStory} disabled={isOptimizingStory} className="flex items-center gap-2 px-3 py-1.5 hover:bg-purple-500/10 text-purple-300 text-xs font-bold rounded-lg border border-transparent hover:border-purple-500/30 transition-all">
                {isOptimizingStory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Optimize
             </button>
             <button onClick={() => setShowFullScreen(true)} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 text-slate-300 text-xs font-medium rounded-lg transition-all"><PlayCircle className="w-4 h-4" /> Slideshow</button>
             <div className="h-4 w-px bg-white/10"></div>
             <div className="flex items-center gap-2">
                 <button onClick={() => setExportWithText(!exportWithText)} className={`p-1.5 rounded transition-colors ${exportWithText ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-500 hover:text-white'}`} title="Embed Text"><Type className="w-4 h-4" /></button>
                 <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as any)} className="bg-black/40 text-slate-300 text-xs px-2 py-1.5 rounded border border-white/10 outline-none"><option value="pdf">PDF</option><option value="zip">ZIP</option><option value="long-image">Image</option></select>
                 <button onClick={handleExportClick} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-lg"><Download className="w-4 h-4" /> Export</button>
             </div>
         </div>
      </div>

      {/* 2. WORKBENCH GRID */}
      <div className="flex-1 grid grid-cols-[240px_1fr_400px] overflow-hidden">
         
         {/* A. LEFT NAVIGATION (SCENES) */}
         <div className="border-r border-white/5 overflow-y-auto custom-scrollbar bg-[#0f111a] flex flex-col">
            <div className="p-3 space-y-2 flex-1">
               {story.scenes.map((scene, idx) => (
                  <SceneThumbnail 
                     key={scene.id} 
                     scene={scene} 
                     index={idx} 
                     isActive={activeSceneId === scene.id} 
                     onClick={() => setActiveSceneId(scene.id)} 
                  />
               ))}
            </div>
            
            {/* Storyboard Mode Add Button (Comic Mode has inline) */}
            {!isComicMode && (
              <div className="p-3 border-t border-white/5 bg-black/20 sticky bottom-0">
                <button 
                    onClick={isLoadingOptions ? undefined : handleGetOptions} 
                    disabled={isLoadingOptions}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-indigo-500/50 rounded-xl text-slate-400 hover:text-indigo-300 transition-all flex flex-col items-center justify-center gap-1 group"
                >
                    {isLoadingOptions ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                    <span className="text-xs font-bold uppercase tracking-wider">Extend Story</span>
                </button>
              </div>
            )}
         </div>

         {/* B. CENTER STAGE (PREVIEW) */}
         <div className="bg-[#0B0F19] overflow-y-auto custom-scrollbar relative flex flex-col">
            {/* Plot Options Overlay (Storyboard Mode Only) */}
            {!isComicMode && renderPlotOptionsOverlay()}

            {isComicMode ? (
               <div className="p-8 pb-32 max-w-4xl mx-auto w-full space-y-12">
                   {chunkedScenes.map((pageScenes, pageIndex) => (
                       <div key={pageIndex} className="bg-white p-6 md:p-8 shadow-2xl relative">
                           {/* Page Header (Issue 1) */}
                           {pageIndex === 0 && (
                                <div className="mb-8 pb-6 text-center border-b-4 border-black">
                                   <h2 className="text-4xl font-black text-black uppercase tracking-tighter mb-2">{story.title}</h2>
                                   <div className="text-xs font-bold font-mono text-slate-600 uppercase tracking-widest">ISSUE #01 • {new Date().toLocaleDateString()}</div>
                                </div>
                           )}
                           <div className="grid grid-cols-12 gap-4">
                               {pageScenes.map((scene, index) => {
                                  const spanClass = getComicSpanClass(pageIndex * SCENES_PER_PAGE + index);
                                  return (
                                     <div key={scene.id} className={spanClass}>
                                        <ComicPanel 
                                           scene={scene} 
                                           index={pageIndex * SCENES_PER_PAGE + index} 
                                           isActive={activeSceneId === scene.id}
                                           onClick={() => setActiveSceneId(scene.id)}
                                        />
                                     </div>
                                  );
                               })}
                           </div>
                           <div className="mt-8 text-center"><span className="text-xs font-black bg-black text-white px-2 py-1">PAGE {pageIndex + 1}</span></div>
                       </div>
                   ))}

                   {/* Inline Story Extension for Comic Mode */}
                   <div className="max-w-4xl mx-auto w-full pb-20">
                      {isExtendingStory ? (
                          <div className="p-8 bg-white border-2 border-black flex flex-col items-center justify-center gap-4 animate-pulse">
                              <Loader2 className="w-8 h-8 animate-spin text-black" />
                              <p className="text-black font-bold uppercase tracking-widest">Designing Next Page...</p>
                          </div>
                      ) : plotOptions.length > 0 ? (
                          <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_rgba(0,0,0,1)] animate-in slide-in-from-bottom-4 text-black">
                              <h3 className="text-2xl font-black text-black uppercase mb-6 text-center">To Be Continued...</h3>
                              <p className="text-center text-slate-600 mb-6 font-bold">Choose the next plot development:</p>
                              <div className="grid gap-4">
                                  {plotOptions.map(opt => (
                                      <button key={opt.id} onClick={() => handleExtendStory(opt.description)} className="text-left p-6 border-2 border-black hover:bg-black hover:text-white transition-all group">
                                          <span className="font-bold text-lg block mb-1 group-hover:text-yellow-400">{opt.title}</span>
                                          <span className="text-sm opacity-80">{opt.description}</span>
                                      </button>
                                  ))}
                              </div>
                              <button onClick={() => setPlotOptions([])} className="mt-6 text-xs font-bold underline text-slate-500 hover:text-black w-full text-center">Cancel</button>
                          </div>
                      ) : (
                          <button 
                              onClick={handleGetOptions} 
                              disabled={isLoadingOptions}
                              className="w-full py-12 border-4 border-dashed border-white/10 hover:border-indigo-500/50 hover:bg-white/5 rounded-3xl flex flex-col items-center justify-center gap-4 group transition-all"
                          >
                              <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                  {isLoadingOptions ? <Loader2 className="w-8 h-8 text-white animate-spin" /> : <ArrowRight className="w-8 h-8 text-white" />}
                              </div>
                              <span className="text-white font-bold text-xl uppercase tracking-widest group-hover:text-indigo-400 transition-colors">
                                  {isLoadingOptions ? "Analyzing Story Arc..." : "Create Next Page"}
                              </span>
                          </button>
                      )}
                  </div>
               </div>
            ) : (
               activeScene && <SceneStage scene={activeScene} mode="storyboard" />
            )}
         </div>

         {/* C. RIGHT INSPECTOR (EDIT) */}
         <div className="h-full overflow-hidden">
            <InspectorPanel 
               scene={activeScene} 
               currentArtStyle={settings.artStyle}
               onUpdateText={(n, v, r) => handleUpdateSceneText(n, v, r)}
               onUpdateTags={handleUpdateTags}
               onRetry={() => activeSceneId !== undefined && handleRetryImage(activeSceneId)}
               onModify={(fb) => activeSceneId !== undefined && handleModifyImage(activeSceneId, fb)}
               onGenerateAudio={() => activeScene && handleGenerateAudio(activeScene.id, activeScene.narrative)}
               onGenerateVideo={() => activeSceneId !== undefined && handleGenerateVideo(activeSceneId)}
               onGenerateStylePreview={() => activeSceneId !== undefined && handleGenerateStylePreview()}
            />
         </div>
      </div>

      {showFullScreen && (<FullScreenViewer scenes={story.scenes} initialIndex={story.scenes.findIndex(s => s.id === activeSceneId)} onClose={() => setShowFullScreen(false)} title={story.title} />)}
    </div>
  );
};

export default Storyboard;

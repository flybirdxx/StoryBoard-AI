
import React, { useState, useRef, useEffect } from 'react';
import { ExportConfig, Scene } from '../types';
import { Loader2, RefreshCw, Wand2, ArrowRight, Volume2, Download, CheckSquare, Square, Maximize2, RotateCcw, RotateCw, History, PlayCircle, Type, Film, Sparkles, Tag, Plus, X, Edit3 } from 'lucide-react';
import FullScreenViewer from './FullScreenViewer';
import { SceneCard, SkeletonSceneCard } from './SceneCard';
// @ts-ignore
import { VariableSizeList as List } from 'react-window';
// @ts-ignore
import AutoSizer from 'react-virtualized-auto-sizer';

// Store & Hooks
import { useStoryStore } from '../store/useStoryStore';
import { useStoryGeneration } from '../hooks/useStoryGeneration';
import { useImageGeneration } from '../hooks/useImageGeneration';
import { useMediaGeneration } from '../hooks/useMediaGeneration';

interface StoryboardProps {
  onExport: (selectedSceneIds: number[], config: ExportConfig) => void;
}

const Storyboard: React.FC<StoryboardProps> = ({ onExport }) => {
  // Store State
  const { 
    story, 
    history, 
    historyIndex, 
    plotOptions, 
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

  // Local UI State
  const [selectedScenes, setSelectedScenes] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'zip' | 'long-image'>('pdf');
  const [exportResolution, setExportResolution] = useState<'screen' | 'original'>('original');
  const [exportWithText, setExportWithText] = useState(false);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);

  // Refs for virtualization
  const listRef = useRef<any>(null);

  // Recalculate list layout when story changes (e.g. extension)
  useEffect(() => {
    if (listRef.current) {
      listRef.current.resetAfterIndex(0);
    }
  }, [story?.scenes.length, isExtendingStory, plotOptions.length]);


  if (!story) return null;

  const toggleSelectAll = () => {
    if (selectedScenes.length === story.scenes.length) {
      setSelectedScenes([]);
    } else {
      setSelectedScenes(story.scenes.map(s => s.id));
    }
  };

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
      resolution: exportResolution,
      withText: exportWithText
    });
  };

  const scrollToScene = (id: number) => {
    if (story.mode === 'comic') {
        const element = document.getElementById(`scene-${id}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    } else {
        // For virtualized list, use the ref to scroll
        const index = story.scenes.findIndex(s => s.id === id);
        if (index !== -1 && listRef.current) {
            listRef.current.scrollToItem(index, 'center');
        }
    }
  };

  const handleUpdateSceneText = async (sceneId: number, narrative: string, visualPrompt: string, shouldRegenerate: boolean) => {
      updateScene(sceneId, { narrative, visual_prompt: visualPrompt });
      if (shouldRegenerate) {
          handleRetryImage(sceneId);
      }
  };

  const handleUpdateTags = (sceneId: number, tags: string[]) => {
      updateScene(sceneId, { tags });
  };

  const isComicMode = story.mode === 'comic';
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Helper for Comic Grid Layout logic
  const getComicSpanClass = (index: number) => {
     // A repeated pattern for visual variety in comic grid
     // Based on 12-column grid
     const pattern = index % 5;
     
     // Significantly increased min-heights for better large screen experience
     if (index === 0) return 'col-span-12 md:row-span-2 min-h-[500px] lg:min-h-[600px]'; // Hero Panel
     
     switch (pattern) {
        case 1: return 'col-span-6 md:col-span-7 min-h-[400px] lg:min-h-[500px]'; // Wide
        case 2: return 'col-span-6 md:col-span-5 min-h-[400px] lg:min-h-[500px]'; // Narrow
        case 3: return 'col-span-6 md:col-span-4 min-h-[400px] lg:min-h-[500px]'; // Small
        case 4: return 'col-span-6 md:col-span-8 min-h-[400px] lg:min-h-[500px]'; // Wide
        default: return 'col-span-12 md:col-span-6 min-h-[400px] lg:min-h-[500px]'; // Half
     }
  };

  // Reusable component for Story Extension UI (Continue/Options)
  const renderStoryExtensionControls = () => (
    <div className="pb-32 pt-10">
      {isExtendingStory ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 bg-[#13161f] rounded-3xl border border-white/5 backdrop-blur-sm animate-pulse shadow-2xl mx-auto max-w-4xl">
            <div className="relative mb-6"><div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 animate-pulse"></div><Loader2 className="relative w-12 h-12 text-indigo-400 animate-spin" /></div>
            <h3 className="text-2xl font-bold text-white mb-2">Dreaming up the next chapter...</h3><p className="text-sm text-slate-400 font-light">Gemini 3 Pro is crafting scenes & rendering visuals</p>
          </div>
      ) : plotOptions.length > 0 ? (
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-3">
              <h3 className="text-3xl font-bold text-white flex items-center justify-center gap-3"><Sparkles className="w-6 h-6 text-indigo-400" /> Choose the Next Path</h3>
              <p className="text-slate-400 text-base font-light">Where should the story go from here?</p>
          </div>
          <div className="grid grid-cols-1 gap-5">
              {plotOptions.map((opt) => (
                <button key={opt.id} onClick={() => handleExtendStory(opt.description)} className="relative group overflow-hidden p-8 bg-[#13161f] hover:bg-[#1A1E29] border border-white/5 hover:border-indigo-500/30 rounded-3xl text-left transition-all duration-300 hover:-translate-y-1 shadow-xl hover:shadow-indigo-500/10">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <h4 className="font-bold text-xl text-slate-200 mb-3 group-hover:text-indigo-300 transition-colors">{opt.title}</h4>
                    <p className="text-slate-400 group-hover:text-slate-300 leading-relaxed font-light">{opt.description}</p>
                    <div className="absolute right-6 bottom-6 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0"><ArrowRight className="w-6 h-6 text-indigo-400" /></div>
                </button>
              ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-20 max-w-4xl mx-auto">
            <div className="inline-block relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 blur-2xl rounded-full opacity-20 group-hover:opacity-40 transition-opacity duration-700"></div>
              <button onClick={handleGetOptions} disabled={isLoadingOptions} className="relative z-10 flex items-center justify-center gap-3 px-12 py-6 font-bold text-white transition-all duration-300 bg-[#1A1E29] border border-white/10 text-lg rounded-full hover:bg-[#202533] hover:border-indigo-500/30 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none shadow-2xl">
                  {isLoadingOptions ? (<><Loader2 className="w-5 h-5 animate-spin relative" /><span className="relative">Brainstorming...</span></>) : (<><span>Continue Story</span><ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>)}
              </button>
            </div>
            <p className="mt-6 text-sm text-slate-500 font-medium tracking-wide uppercase">AI-Powered Plot Extension</p>
        </div>
      )}
    </div>
  );

  // Virtualized List Row Renderer
  const VirtualRow = ({ index, style, data }: any) => {
    const { scenes } = data;
    
    // Render footer at the end
    if (index === scenes.length) {
       return (
          <div style={style}>
             {renderStoryExtensionControls()}
          </div>
       );
    }

    const scene = scenes[index];
    return (
       <div style={style} className="px-4">
           <div className="max-w-screen-2xl mx-auto pb-12 h-full">
              <SceneCard 
                scene={scene} 
                index={index}
                mode="storyboard"
                isSelected={selectedScenes.includes(scene.id)}
                onToggleSelect={() => toggleSelectScene(scene.id)}
                onRetry={() => handleRetryImage(scene.id)}
                onModify={(feedback) => handleModifyImage(scene.id, feedback)}
                onUpdate={(narrative, visual, regen) => handleUpdateSceneText(scene.id, narrative, visual, regen)}
                onUpdateTags={(tags) => handleUpdateTags(scene.id, tags)}
                onGenerateAudio={() => handleGenerateAudio(scene.id, scene.narrative)}
                onGenerateVideo={() => handleGenerateVideo(scene.id)}
              />
           </div>
       </div>
    );
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-700 relative">
      
      {/* Header & Controls Container (Non-scrolling part) */}
      <div className="flex-shrink-0 px-8 pt-8 pb-4">
        {/* Sticky Thumbnail Navigation (Horizontal Scroll) */}
        <div className="mb-6 relative group">
           <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2 items-center">
              {story.scenes.map((scene, idx) => (
                 <button
                   key={scene.id}
                   onClick={() => scrollToScene(scene.id)}
                   className={`relative flex-shrink-0 w-16 aspect-video rounded-md overflow-hidden border transition-all ${selectedScenes.includes(scene.id) ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-white/10 hover:border-white/30'}`}
                 >
                    {scene.imageUrl ? (
                      <img src={scene.imageUrl} className="w-full h-full object-cover opacity-80 hover:opacity-100" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#1A1E29] text-slate-600">
                        <span className="text-[10px] font-bold font-mono">{idx + 1}</span>
                      </div>
                    )}
                 </button>
              ))}
           </div>
        </div>

        {/* Main Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 w-full">
             <div className="space-y-2">
               <div className="flex items-center gap-3">
                  <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter drop-shadow-2xl">
                    {story.title}
                  </h2>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm border ${isComicMode ? 'bg-yellow-400 text-black border-yellow-500' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                    {isComicMode ? 'Comic Mode' : 'Storyboard Mode'}
                  </span>
               </div>
               <p className="text-indigo-300/80 font-medium text-xs flex items-center gap-2">
                 <Sparkles className="w-3 h-3 text-indigo-500" />
                 Generated with Gemini 3 Pro
               </p>
             </div>
             
             {/* History Controls */}
             <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 shadow-inner">
                <button onClick={undo} disabled={!canUndo} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="撤销"><RotateCcw className="w-4 h-4" /></button>
                <button onClick={redo} disabled={!canRedo} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="重做"><RotateCw className="w-4 h-4" /></button>
                <div className="w-px h-5 bg-white/10 mx-1"></div>
                <button onClick={() => setShowHistoryDropdown(!showHistoryDropdown)} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium transition-colors"><History className="w-4 h-4" /><span>History</span></button>
                
                {showHistoryDropdown && (
                  <div className="absolute top-20 right-8 mt-2 w-72 bg-[#151921] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                     <div className="p-3 border-b border-white/5 bg-black/20"><h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Version History</h4></div>
                     <div className="max-h-80 overflow-y-auto custom-scrollbar">
                        {history.map((hist, idx) => (
                           <button key={idx} onClick={() => { jumpToHistory(idx); setShowHistoryDropdown(false); }} className={`w-full text-left px-4 py-3 text-xs border-b border-white/5 hover:bg-white/5 transition-colors flex items-center justify-between group ${idx === historyIndex ? 'bg-indigo-500/10' : ''}`}>
                              <div>
                                 <p className={`font-medium mb-1 ${idx === historyIndex ? 'text-indigo-400' : 'text-slate-300'}`}>{hist.actionType || 'Unknown Action'}</p>
                                 <p className="text-[10px] text-slate-500 font-mono">{hist.lastModified ? new Date(hist.lastModified).toLocaleTimeString() : '--:--'}</p>
                              </div>
                              {idx === historyIndex && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>}
                           </button>
                        ))}
                     </div>
                  </div>
                )}
             </div>
          </div>
        </div>
        
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-white/[0.02] border border-white/5 rounded-xl backdrop-blur-sm mt-4">
            <div className="flex items-center gap-2">
               <button onClick={toggleSelectAll} className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">{selectedScenes.length === story.scenes.length ? <CheckSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4" />} Select All</button>
               <div className="h-4 w-px bg-white/10 hidden md:block"></div>
               <button onClick={() => setShowFullScreen(true)} className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-slate-300 hover:text-white text-xs font-medium rounded-lg transition-all"><PlayCircle className="w-4 h-4" /> Slideshow</button>
               <button onClick={handleOptimizeStory} disabled={isOptimizingStory} className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-purple-300 hover:text-purple-200 text-xs font-medium rounded-lg transition-all">{isOptimizingStory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Optimize Script</button>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => setExportWithText(!exportWithText)} className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg transition-colors border border-transparent ${exportWithText ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><Type className="w-3 h-3" /><span>Embed Text</span></button>
              <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/10">
                 <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as any)} className="bg-transparent text-slate-300 text-xs font-medium px-2 py-1.5 outline-none cursor-pointer hover:text-white"><option value="pdf">Export PDF</option><option value="zip">Export ZIP</option><option value="long-image">Export Image</option></select>
              </div>
              <button onClick={handleExportClick} disabled={story.scenes.length === 0} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-indigo-500/20 active:scale-95"><Download className="w-4 h-4" /> Export</button>
            </div>
        </div>
      </div>

      {/* VIEW MODE: COMIC PAGE VS STORYBOARD LIST */}
      {isComicMode ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-32">
           {/* COMIC SHEET CONTAINER */}
           {/* Increased max-width significantly for better full screen experience */}
           <div className="w-full max-w-[95%] 2xl:max-w-screen-2xl mx-auto bg-[#fdfbf7] p-4 md:p-12 shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-slate-300 relative mt-4">
               {/* Paper Texture Overlay */}
               <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none mix-blend-multiply"></div>
               
               {/* Header Area */}
               <div className="relative z-10 mb-10 pb-8 text-center border-b-4 border-black">
                  <h2 className="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter text-black mb-4 leading-none">{story.title}</h2>
                  <div className="flex items-center justify-center gap-6 text-sm font-bold font-mono text-slate-600 uppercase tracking-widest">
                     <span>Issue #01</span>
                     <span>•</span>
                     <span>{new Date().toLocaleDateString()}</span>
                     <span>•</span>
                     <span>By Gemini 3 Pro</span>
                  </div>
               </div>

               {/* Dynamic Grid Layout */}
               <div className="grid grid-cols-12 gap-4 md:gap-6 relative z-10 auto-rows-min">
                  {story.scenes.map((scene, index) => (
                     <div 
                        key={scene.id} 
                        id={`scene-${scene.id}`} 
                        className={`scroll-mt-32 ${getComicSpanClass(index)}`}
                     >
                       <SceneCard 
                         scene={scene} 
                         index={index}
                         mode="comic"
                         isSelected={selectedScenes.includes(scene.id)}
                         onToggleSelect={() => toggleSelectScene(scene.id)}
                         onRetry={() => handleRetryImage(scene.id)}
                         onModify={(feedback) => handleModifyImage(scene.id, feedback)}
                         onUpdate={(narrative, visual, regen) => handleUpdateSceneText(scene.id, narrative, visual, regen)}
                         onUpdateTags={(tags) => handleUpdateTags(scene.id, tags)}
                         onGenerateAudio={() => handleGenerateAudio(scene.id, scene.narrative)}
                         onGenerateVideo={() => handleGenerateVideo(scene.id)}
                       />
                     </div>
                  ))}
               </div>

               <div className="relative z-10 mt-16 text-center">
                   <span className="text-sm font-black text-black border-2 border-black px-4 py-1.5 bg-white tracking-widest">PAGE 1</span>
               </div>
           </div>
           
           {/* Story Extension */}
           <div className="max-w-4xl mx-auto">
             {renderStoryExtensionControls()}
           </div>
        </div>
      ) : (
        /* VIRTUALIZED STORYBOARD LIST VIEW */
        <div className="flex-1 overflow-hidden px-4 md:px-8">
           <AutoSizer>
             {({ height, width }: { height: number, width: number }) => (
                <List
                  ref={listRef}
                  height={height}
                  width={width}
                  itemCount={story.scenes.length + 1} // +1 for Footer
                  itemSize={(index: number) => index === story.scenes.length ? 500 : 700} // Dynamic height: Cards vs Footer
                  itemData={{
                     scenes: story.scenes,
                     selectedScenes,
                  }}
                >
                  {VirtualRow}
                </List>
             )}
           </AutoSizer>
        </div>
      )}
      
      {showFullScreen && (<FullScreenViewer scenes={story.scenes} initialIndex={0} onClose={() => setShowFullScreen(false)} title={story.title} />)}
    </div>
  );
};

export default Storyboard;

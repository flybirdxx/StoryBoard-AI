
import React, { useState, useRef, useEffect } from 'react';
import { StoryData, Scene, PlotOption, ExportConfig, GenerationMode } from '../types';
import { Loader2, Image as ImageIcon, RefreshCw, Wand2, ArrowRight, MessageSquarePlus, Volume2, Save, Download, FileType, CheckSquare, Square, Maximize2, MoreHorizontal, RotateCcw, RotateCw, History, PlayCircle, Type, Film, Sparkles, Tag, Plus, X, Edit3 } from 'lucide-react';
import FullScreenViewer from './FullScreenViewer';

// ... (Existing interfaces and imports remain same)

interface StoryboardProps {
  story: StoryData;
  onRetryImage: (sceneId: number) => void;
  onModifyImage: (sceneId: number, feedback: string) => void;
  onUpdateScene: (sceneId: number, narrative: string, visualPrompt: string, shouldRegenerate: boolean) => void;
  onRequestOptions: () => void;
  onSelectOption: (option: string) => void;
  onGenerateAudio: (sceneId: number, text: string) => void;
  onGenerateVideo: (sceneId: number) => void;
  onPolishText: (text: string, type: 'narrative' | 'visual') => Promise<string>;
  onExport: (selectedSceneIds: number[], config: ExportConfig) => void;
  onOptimizeStory: () => void;
  onUpdateTags: (sceneId: number, tags: string[]) => void;
  plotOptions: PlotOption[];
  isLoadingOptions: boolean;
  isExtendingStory: boolean;
  isOptimizingStory: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  historyList: StoryData[];
  currentHistoryIndex: number;
  onJumpToHistory: (index: number) => void;
}

const Storyboard: React.FC<StoryboardProps> = ({ 
  story, 
  onRetryImage, 
  onModifyImage,
  onUpdateScene,
  onRequestOptions,
  onSelectOption,
  onGenerateAudio,
  onGenerateVideo,
  onPolishText,
  onExport,
  onOptimizeStory,
  onUpdateTags,
  plotOptions,
  isLoadingOptions,
  isExtendingStory,
  isOptimizingStory,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  historyList,
  currentHistoryIndex,
  onJumpToHistory
}) => {
  const [selectedScenes, setSelectedScenes] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'zip' | 'long-image'>('pdf');
  const [exportResolution, setExportResolution] = useState<'screen' | 'original'>('original');
  const [exportWithText, setExportWithText] = useState(false);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);

  // ... (Existing helper functions: toggleSelectAll, toggleSelectScene, handleExport, scrollToScene)
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

  const handleExport = () => {
    onExport(selectedScenes.length > 0 ? selectedScenes : story.scenes.map(s => s.id), {
      format: exportFormat,
      resolution: exportResolution,
      withText: exportWithText
    });
  };

  const scrollToScene = (id: number) => {
    const element = document.getElementById(`scene-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const isComicMode = story.mode === 'comic';

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-32 max-w-7xl mx-auto relative">
      
      {/* Sticky Thumbnail Navigation - Refined */}
      <div className="sticky top-0 z-50 bg-[#0f111a]/80 backdrop-blur-xl border-b border-white/5 -mx-8 px-8 py-4 mb-8 shadow-2xl transition-all">
         <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-1 snap-x items-center">
            {story.scenes.map((scene, idx) => (
               <button
                 key={scene.id}
                 onClick={() => scrollToScene(scene.id)}
                 className={`relative flex-shrink-0 w-20 aspect-video rounded-lg overflow-hidden border transition-all snap-center group shadow-md ${selectedScenes.includes(scene.id) ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-white/10 hover:border-white/30'}`}
               >
                  {scene.imageUrl ? (
                    <img src={scene.imageUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#1A1E29] text-slate-600">
                      <span className="text-xs font-bold font-mono">{String(idx + 1).padStart(2,'0')}</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent text-[8px] text-white text-center py-0.5 font-medium">
                     {idx + 1}
                  </div>
               </button>
            ))}
         </div>
      </div>

      {/* Header & Controls */}
      <div className="flex flex-col gap-8 pb-8 border-b border-white/5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
           <div className="space-y-3">
             <div className="flex items-center gap-3">
                <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter drop-shadow-2xl">
                  {story.title}
                </h2>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm border ${isComicMode ? 'bg-yellow-400 text-black border-yellow-500' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                  {isComicMode ? 'Comic Strip Mode' : 'Cinematic Storyboard'}
                </span>
             </div>
             <p className="text-indigo-300/80 font-medium tracking-wide text-sm flex items-center gap-2">
               <Sparkles className="w-4 h-4 text-indigo-500" />
               Generated with Gemini 3 Pro
             </p>
           </div>
           
           {/* History Controls */}
           <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 shadow-inner">
              <button onClick={onUndo} disabled={!canUndo} className="p-2.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="撤销"><RotateCcw className="w-4 h-4" /></button>
              <button onClick={onRedo} disabled={!canRedo} className="p-2.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="重做"><RotateCw className="w-4 h-4" /></button>
              <div className="w-px h-5 bg-white/10 mx-1"></div>
              <button onClick={() => setShowHistoryDropdown(!showHistoryDropdown)} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium transition-colors"><History className="w-4 h-4" /><span>History</span></button>
              
              {showHistoryDropdown && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-[#151921] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                   <div className="p-3 border-b border-white/5 bg-black/20"><h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Version History</h4></div>
                   <div className="max-h-80 overflow-y-auto custom-scrollbar">
                      {historyList.map((hist, idx) => (
                         <button key={idx} onClick={() => { onJumpToHistory(idx); setShowHistoryDropdown(false); }} className={`w-full text-left px-4 py-3 text-xs border-b border-white/5 hover:bg-white/5 transition-colors flex items-center justify-between group ${idx === currentHistoryIndex ? 'bg-indigo-500/10' : ''}`}>
                            <div>
                               <p className={`font-medium mb-1 ${idx === currentHistoryIndex ? 'text-indigo-400' : 'text-slate-300'}`}>{hist.actionType || 'Unknown Action'}</p>
                               <p className="text-[10px] text-slate-500 font-mono">{hist.lastModified ? new Date(hist.lastModified).toLocaleTimeString() : '--:--'}</p>
                            </div>
                            {idx === currentHistoryIndex && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>}
                         </button>
                      ))}
                   </div>
                </div>
              )}
           </div>
        </div>
        
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center gap-3">
             <button onClick={toggleSelectAll} className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">{selectedScenes.length === story.scenes.length ? <CheckSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4" />} Select All</button>
             <div className="h-5 w-px bg-white/10 hidden md:block"></div>
             <button onClick={() => setShowFullScreen(true)} className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-slate-300 hover:text-white text-xs font-medium rounded-lg transition-all"><PlayCircle className="w-4 h-4" /> Slideshow</button>
             <button onClick={onOptimizeStory} disabled={isOptimizingStory} className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-purple-300 hover:text-purple-200 text-xs font-medium rounded-lg transition-all">{isOptimizingStory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Optimize Script</button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setExportWithText(!exportWithText)} className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg transition-colors border border-transparent ${exportWithText ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><Type className="w-3 h-3" /><span>Embed Text</span></button>
            <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/10">
               <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as any)} className="bg-transparent text-slate-300 text-xs font-medium px-2 py-1.5 outline-none cursor-pointer hover:text-white"><option value="pdf">Export PDF</option><option value="zip">Export ZIP</option><option value="long-image">Export Image</option></select>
            </div>
            <button onClick={handleExport} disabled={story.scenes.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-indigo-500/20 active:scale-95"><Download className="w-4 h-4" /> Export</button>
          </div>
        </div>
      </div>

      {/* VIEW MODE: COMIC PAGE VS STORYBOARD LIST */}
      {isComicMode ? (
        <div className="animate-in zoom-in-95 duration-500">
           {/* COMIC SHEET CONTAINER */}
           <div className="max-w-6xl mx-auto bg-[#fdfbf7] p-6 md:p-12 shadow-[0_0_80px_rgba(0,0,0,0.5)] border border-slate-300 relative">
               {/* Paper Texture Overlay */}
               <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none mix-blend-multiply"></div>
               
               {/* Comic Header */}
               <div className="relative z-10 mb-10 border-b-4 border-black pb-6 text-center">
                  <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-black mb-2">{story.title}</h2>
                  <div className="flex items-center justify-center gap-4 text-xs font-bold font-mono text-slate-600 uppercase tracking-widest">
                     <span>Issue #01</span>
                     <span>•</span>
                     <span>{new Date().toLocaleDateString()}</span>
                     <span>•</span>
                     <span>By Gemini 3 Pro</span>
                  </div>
               </div>

               {/* Comic Grid - Tighter, more panel-like */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10 auto-rows-fr">
                  {story.scenes.map((scene, index) => (
                     <div key={scene.id} id={`scene-${scene.id}`} className="scroll-mt-32 h-full">
                       <SceneCard 
                         scene={scene} 
                         index={index}
                         mode="comic"
                         isSelected={selectedScenes.includes(scene.id)}
                         onToggleSelect={() => toggleSelectScene(scene.id)}
                         onRetry={() => onRetryImage(scene.id)}
                         onModify={(feedback) => onModifyImage(scene.id, feedback)}
                         onUpdate={(narrative, visual, regen) => onUpdateScene(scene.id, narrative, visual, regen)}
                         onUpdateTags={(tags) => onUpdateTags(scene.id, tags)}
                         onGenerateAudio={() => onGenerateAudio(scene.id, scene.narrative)}
                         onGenerateVideo={() => onGenerateVideo(scene.id)}
                         onPolishText={onPolishText}
                       />
                     </div>
                  ))}
               </div>

               {/* Comic Footer */}
               <div className="relative z-10 mt-12 text-center">
                   <span className="text-xs font-bold text-black border-2 border-black px-3 py-1 bg-white">PAGE 1</span>
               </div>
           </div>
        </div>
      ) : (
        /* STORYBOARD LIST VIEW */
        <div className="grid grid-cols-1 gap-12">
          {story.scenes.map((scene, index) => (
            <ScrollReveal key={scene.id}>
              <div id={`scene-${scene.id}`} className="scroll-mt-32">
                <SceneCard 
                  scene={scene} 
                  index={index}
                  mode="storyboard"
                  isSelected={selectedScenes.includes(scene.id)}
                  onToggleSelect={() => toggleSelectScene(scene.id)}
                  onRetry={() => onRetryImage(scene.id)}
                  onModify={(feedback) => onModifyImage(scene.id, feedback)}
                  onUpdate={(narrative, visual, regen) => onUpdateScene(scene.id, narrative, visual, regen)}
                  onUpdateTags={(tags) => onUpdateTags(scene.id, tags)}
                  onGenerateAudio={() => onGenerateAudio(scene.id, scene.narrative)}
                  onGenerateVideo={() => onGenerateVideo(scene.id)}
                  onPolishText={onPolishText}
                />
              </div>
            </ScrollReveal>
          ))}
        </div>
      )}
      
      {/* Footer Options */}
      <div className="py-16 mt-16 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          {isExtendingStory ? (
             <div className="flex flex-col items-center justify-center py-16 px-6 bg-[#13161f] rounded-3xl border border-white/5 backdrop-blur-sm animate-pulse shadow-2xl">
                <div className="relative mb-6"><div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 animate-pulse"></div><Loader2 className="relative w-12 h-12 text-indigo-400 animate-spin" /></div>
                <h3 className="text-2xl font-bold text-white mb-2">Dreaming up the next chapter...</h3><p className="text-sm text-slate-400 font-light">Gemini 3 Pro is crafting scenes & rendering visuals</p>
             </div>
          ) : plotOptions.length > 0 ? (
            <div className="space-y-10 animate-in slide-in-from-bottom-8 fade-in duration-700">
              <div className="text-center space-y-3">
                 <h3 className="text-3xl font-bold text-white flex items-center justify-center gap-3"><Sparkles className="w-6 h-6 text-indigo-400" /> Choose the Next Path</h3>
                 <p className="text-slate-400 text-base font-light">Where should the story go from here?</p>
              </div>
              <div className="grid grid-cols-1 gap-5">
                 {plotOptions.map((opt) => (
                    <button key={opt.id} onClick={() => onSelectOption(opt.description)} className="relative group overflow-hidden p-8 bg-[#13161f] hover:bg-[#1A1E29] border border-white/5 hover:border-indigo-500/30 rounded-3xl text-left transition-all duration-300 hover:-translate-y-1 shadow-xl hover:shadow-indigo-500/10">
                       <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                       <h4 className="font-bold text-xl text-slate-200 mb-3 group-hover:text-indigo-300 transition-colors">{opt.title}</h4>
                       <p className="text-slate-400 group-hover:text-slate-300 leading-relaxed font-light">{opt.description}</p>
                       <div className="absolute right-6 bottom-6 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0"><ArrowRight className="w-6 h-6 text-indigo-400" /></div>
                    </button>
                 ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-20">
               <div className="inline-block relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 blur-2xl rounded-full opacity-20 group-hover:opacity-40 transition-opacity duration-700"></div>
                  <button onClick={onRequestOptions} disabled={isLoadingOptions} className="relative z-10 flex items-center justify-center gap-3 px-12 py-6 font-bold text-white transition-all duration-300 bg-[#1A1E29] border border-white/10 text-lg rounded-full hover:bg-[#202533] hover:border-indigo-500/30 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none shadow-2xl">
                     {isLoadingOptions ? (<><Loader2 className="w-5 h-5 animate-spin relative" /><span className="relative">Brainstorming...</span></>) : (<><span>Continue Story</span><ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>)}
                  </button>
               </div>
               <p className="mt-6 text-sm text-slate-500 font-medium tracking-wide uppercase">AI-Powered Plot Extension</p>
            </div>
          )}
        </div>
      </div>
      {showFullScreen && (<FullScreenViewer scenes={story.scenes} initialIndex={0} onClose={() => setShowFullScreen(false)} title={story.title} />)}
    </div>
  );
};

const ScrollReveal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } }, { threshold: 0.1, rootMargin: '50px' });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`transition-all duration-700 ease-out transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>{children}</div>;
};

const SubtitleOverlay: React.FC<{ text: string, mode: GenerationMode }> = ({ text, mode }) => {
  if (mode === 'comic') {
     // Cleaner caption style for grid
    return (
       <div className="absolute bottom-0 left-0 right-0 bg-white border-t-2 border-black p-2 z-20 min-h-[48px] flex items-center justify-center">
          <p className="text-black text-[10px] md:text-xs font-bold leading-tight font-comic text-center line-clamp-3">{text}</p>
       </div>
    );
  }
  return <div className="absolute bottom-0 left-0 right-0 pb-8 pt-16 px-10 text-center z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent"><p className="text-white text-lg font-medium leading-relaxed drop-shadow-lg tracking-wide" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>{text}</p></div>;
};

const SceneCard: React.FC<{ 
  scene: Scene; 
  index: number; 
  mode: GenerationMode;
  isSelected: boolean;
  onToggleSelect: () => void;
  onRetry: () => void;
  onModify: (feedback: string) => void; 
  onUpdate: (narrative: string, visual: string, regen: boolean) => void;
  onUpdateTags: (tags: string[]) => void;
  onGenerateAudio: () => void;
  onGenerateVideo: () => void;
  onPolishText: (text: string, type: 'narrative' | 'visual') => Promise<string>;
}> = ({ scene, index, mode, isSelected, onToggleSelect, onRetry, onModify, onUpdate, onUpdateTags, onGenerateAudio, onGenerateVideo, onPolishText }) => {
  const [isEditingFeedback, setIsEditingFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isEditingText, setIsEditingText] = useState(false);
  const [editNarrative, setEditNarrative] = useState(scene.narrative);
  const [editVisual, setEditVisual] = useState(scene.visual_prompt);
  const [isPolishingNarrative, setIsPolishingNarrative] = useState(false);
  const [isPolishingVisual, setIsPolishingVisual] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);

  React.useEffect(() => {
    setEditNarrative(scene.narrative);
    setEditVisual(scene.visual_prompt);
  }, [scene.narrative, scene.visual_prompt]);

  const handleModifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback.trim()) {
      onModify(feedback);
      setIsEditingFeedback(false);
      setFeedback("");
    }
  };

  const handleTextSave = (regenerate: boolean) => {
    onUpdate(editNarrative, editVisual, regenerate);
    setIsEditingText(false);
  };

  const handlePolish = async (type: 'narrative' | 'visual') => {
    if (type === 'narrative') {
      setIsPolishingNarrative(true);
      try { const result = await onPolishText(editNarrative, 'narrative'); setEditNarrative(result); } finally { setIsPolishingNarrative(false); }
    } else {
      setIsPolishingVisual(true);
      try { const result = await onPolishText(editVisual, 'visual'); setEditVisual(result); } finally { setIsPolishingVisual(false); }
    }
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTag.trim()) {
      const currentTags = scene.tags || [];
      if (!currentTags.includes(newTag.trim())) {
        onUpdateTags([...currentTags, newTag.trim()]);
      }
      setNewTag("");
      setIsAddingTag(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = scene.tags || [];
    onUpdateTags(currentTags.filter(t => t !== tagToRemove));
  };

  const isComicMode = mode === 'comic';

  // COMIC MODE RENDER
  if (isComicMode) {
     return (
        <div className={`group/card h-full flex flex-col relative bg-transparent transition-all duration-300 ${isSelected ? 'ring-4 ring-indigo-500/50' : ''}`}>
           {/* Comic Panel Container */}
           <div className={`flex-1 border-4 bg-white shadow-[8px_8px_0px_rgba(0,0,0,1)] relative overflow-hidden flex flex-col transition-colors duration-300 ${isSelected ? 'border-indigo-600' : 'border-black'}`}>
              
              {/* Image Area */}
              <div className="relative flex-1 bg-slate-100 min-h-[200px] overflow-hidden">
                 {scene.imageUrl ? (
                    <>
                       <img 
                          src={scene.imageUrl} 
                          alt={`Panel ${index + 1}`} 
                          className={`w-full h-full object-cover transition-transform duration-700 ease-out ${isSelected ? 'scale-110' : 'hover:scale-105'}`} 
                        />
                       {!scene.isLoadingImage && !isEditingText && <SubtitleOverlay text={scene.narrative} mode={mode} />}
                    </>
                 ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                       {scene.isLoadingImage ? (
                          <div className="flex flex-col items-center gap-2">
                             <Loader2 className="w-8 h-8 animate-spin text-black" />
                             <span className="text-xs font-bold text-black uppercase">Drawing...</span>
                          </div>
                       ) : (
                          <div className="flex flex-col items-center gap-2">
                             <span className="text-xs font-bold">Image Failed</span>
                             <button onClick={onRetry} className="text-[10px] underline hover:text-black">Retry</button>
                          </div>
                       )}
                    </div>
                 )}

                 {/* Hover Controls (Minimalist for Comic) */}
                 <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity z-30">
                     <button onClick={onRetry} className="p-1.5 bg-white border-2 border-black hover:bg-yellow-300 text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-transform active:translate-y-0.5" title="Regenerate"><RefreshCw className="w-3 h-3" /></button>
                     <button onClick={() => setIsEditingFeedback(true)} className="p-1.5 bg-white border-2 border-black hover:bg-yellow-300 text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-transform active:translate-y-0.5" title="Modify"><Wand2 className="w-3 h-3" /></button>
                     <button onClick={() => setIsEditingText(true)} className="p-1.5 bg-white border-2 border-black hover:bg-yellow-300 text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-transform active:translate-y-0.5" title="Edit Text"><Edit3 className="w-3 h-3" /></button>
                 </div>
                 
                 {/* Selection Checkbox */}
                 <div className="absolute top-2 left-2 z-30 opacity-0 group-hover/card:opacity-100 data-[selected=true]:opacity-100 transition-opacity" data-selected={isSelected}>
                   <button onClick={onToggleSelect} className={`p-1 border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all ${isSelected ? 'bg-indigo-500 text-white' : 'bg-white text-black'}`}>
                      {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                   </button>
                 </div>
              </div>

              {/* Text Editor Overlay (If editing) */}
              {isEditingText && (
                 <div className="absolute inset-0 bg-white z-40 p-3 flex flex-col gap-2 border-4 border-black animate-in fade-in zoom-in-95">
                    <label className="text-[10px] font-bold uppercase">Caption</label>
                    <textarea value={editNarrative} onChange={(e) => setEditNarrative(e.target.value)} className="flex-1 w-full p-2 border-2 border-slate-200 text-xs font-comic focus:border-black outline-none resize-none" autoFocus />
                    <div className="flex gap-2 justify-end">
                       <button onClick={() => setIsEditingText(false)} className="text-[10px] font-bold underline">Cancel</button>
                       <button onClick={() => handleTextSave(false)} className="px-3 py-1 bg-black text-white text-[10px] font-bold hover:bg-slate-800">Save</button>
                    </div>
                 </div>
              )}
              
              {/* Feedback Modal (If editing visual) */}
              {isEditingFeedback && (
                 <div className="absolute inset-0 bg-black/90 z-50 p-4 flex flex-col justify-center text-white">
                    <h5 className="text-xs font-bold mb-2">Modify Panel Visuals</h5>
                    <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} className="w-full h-20 bg-white/10 border border-white/20 p-2 text-xs mb-2" placeholder="Describe changes..." />
                    <div className="flex gap-2 justify-end">
                       <button onClick={() => setIsEditingFeedback(false)} className="text-xs text-slate-400">Cancel</button>
                       <button onClick={handleModifySubmit} className="text-xs font-bold text-yellow-400">Apply</button>
                    </div>
                 </div>
              )}
           </div>
           
           {/* Panel Number */}
           <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm border-2 shadow-lg z-20 transition-colors ${isSelected ? 'bg-indigo-600 text-white border-white' : 'bg-black text-white border-white'}`}>
              {index + 1}
           </div>
        </div>
     );
  }

  // STANDARD STORYBOARD CARD RENDER
  return (
    <div className={`group/card relative bg-[#13161f] overflow-hidden border transition-all duration-500 shadow-2xl rounded-3xl border-white/5 hover:border-white/10 ${isSelected ? 'ring-4 ring-indigo-500' : ''}`}>
      
      {/* Layout Container */}
      <div className="flex flex-col xl:flex-row">
        
        {/* MEDIA SECTION */}
        <div className="relative bg-black/50 overflow-hidden xl:w-2/3">
           {/* Aspect Ratio Container */}
           <div className="relative w-full aspect-video">
             
             {scene.videoUrl ? (
               <video src={scene.videoUrl} controls className="w-full h-full object-cover" autoPlay muted loop />
             ) : scene.imageUrl ? (
               <>
                 <img src={scene.imageUrl} alt={`Scene ${index + 1}`} className={`w-full h-full object-cover transition-all duration-700 ${scene.isLoadingImage || scene.isLoadingVideo ? 'opacity-30 scale-105 blur-lg' : 'scale-100 group-hover/card:scale-[1.01]'}`} />
                 {!scene.isLoadingImage && !isEditingText && <SubtitleOverlay text={scene.narrative} mode={mode} />}
               </>
             ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-[#0c0e14]">
                   {!scene.isLoadingImage && (
                      <>
                        <ImageIcon className="w-16 h-16 mb-4 opacity-10" />
                        <p className="text-sm font-medium opacity-50 mb-6">Image Generation Failed</p>
                        <button onClick={onRetry} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-xs text-slate-300 flex items-center gap-2 transition-all hover:scale-105 font-bold"><RefreshCw className="w-3.5 h-3.5" /> Regenerate Scene</button>
                      </>
                   )}
                </div>
             )}

             {/* Loading Overlay */}
             {(scene.isLoadingImage || scene.isLoadingVideo) && (
               <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md">
                 <div className="relative"><div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-30 animate-pulse"></div><Loader2 className="relative w-12 h-12 animate-spin text-indigo-400 mb-4" /></div>
                 <p className="text-xs font-bold uppercase tracking-widest text-indigo-300 animate-pulse bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm border border-white/5">{scene.isLoadingVideo ? 'Rendering Video (Veo)...' : 'Rendering Image...'}</p>
               </div>
             )}

             {/* Overlay Controls (Top Right) */}
             <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 z-40">
                {!scene.isLoadingImage && (
                   <>
                      <button onClick={onRetry} className="p-2.5 bg-black/60 hover:bg-indigo-600 text-white rounded-xl backdrop-blur-md border border-white/10 transition-all shadow-lg hover:shadow-indigo-500/20" title="Regenerate"><RefreshCw className="w-4 h-4" /></button>
                      <button onClick={() => setIsEditingFeedback(true)} className="p-2.5 bg-black/60 hover:bg-purple-600 text-white rounded-xl backdrop-blur-md border border-white/10 transition-all shadow-lg hover:shadow-purple-500/20" title="Modify Visuals"><Wand2 className="w-4 h-4" /></button>
                   </>
                )}
             </div>

             {/* Selection Checkbox (Top Left) */}
             <div className="absolute top-4 left-4 z-40 opacity-0 group-hover/card:opacity-100 data-[selected=true]:opacity-100 transition-opacity" data-selected={isSelected}>
                <button onClick={onToggleSelect} className={`p-2 rounded-xl backdrop-blur-md border shadow-lg transition-all ${isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-black/60 border-white/10 text-slate-300 hover:text-white'}`}>
                   {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                </button>
             </div>

             {/* Feedback Modal Overlay */}
             {isEditingFeedback && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md p-8 flex flex-col justify-center animate-in fade-in zoom-in-95 duration-200 z-50">
                   <h4 className="text-white font-bold mb-4 flex items-center gap-2 text-lg"><Wand2 className="w-5 h-5 text-purple-400" /> Modify this Shot</h4>
                   <form onSubmit={handleModifySubmit} className="space-y-4">
                      <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="E.g., Make the lighting darker, change the angle to low shot..." className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none h-32 placeholder-slate-500 shadow-inner" autoFocus />
                      <div className="flex gap-3 justify-end">
                         <button type="button" onClick={() => setIsEditingFeedback(false)} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">Cancel</button>
                         <button type="submit" disabled={!feedback.trim()} className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed">Apply Changes</button>
                      </div>
                   </form>
                </div>
             )}
           </div>
        </div>

        {/* DETAILS SECTION */}
        <div className="flex flex-col justify-between border-t border-white/5 bg-gradient-to-b from-[#13161f] to-[#0f111a] flex-1 p-6 xl:p-8 xl:border-t-0 xl:border-l">
           
           <div className="space-y-4">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <span className="text-xl font-black text-white/10 select-none">{String(index + 1).padStart(2, '0')}</span>
                    <span className="px-2 py-0.5 rounded border border-white/5 bg-white/5 text-[10px] font-bold text-indigo-300 uppercase tracking-widest">SCENE</span>
                 </div>
                 {!isEditingText && (
                    <button onClick={() => setIsEditingText(true)} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors" title="Edit Script"><Edit3 className="w-4 h-4" /></button>
                 )}
              </div>

              {isEditingText ? (
                  <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">Narrative <button onClick={() => handlePolish('narrative')} disabled={isPolishingNarrative} className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1">{isPolishingNarrative ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} AI Polish</button></label>
                        <textarea value={editNarrative} onChange={(e) => setEditNarrative(e.target.value)} className="w-full h-24 bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none resize-none" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">Visual Prompt <button onClick={() => handlePolish('visual')} disabled={isPolishingVisual} className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1">{isPolishingVisual ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} AI Polish</button></label>
                        <textarea value={editVisual} onChange={(e) => setEditVisual(e.target.value)} className="w-full h-24 bg-black/20 border border-white/10 rounded-xl p-3 text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none resize-none font-mono" />
                     </div>
                     <div className="flex items-center justify-end gap-3 pt-2">
                        <button onClick={() => setIsEditingText(false)} className="text-xs text-slate-500 hover:text-white font-medium px-2">Cancel</button>
                        <button onClick={() => handleTextSave(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors">Save Text</button>
                        <button onClick={() => handleTextSave(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-indigo-500/20">Save & Redraw</button>
                     </div>
                  </div>
              ) : (
                 <div className="space-y-3">
                    <p className="text-slate-300 text-lg font-light leading-relaxed">{scene.narrative}</p>
                    <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                        <h5 className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-2 flex items-center gap-2"><Maximize2 className="w-3 h-3" /> Visual Prompt</h5>
                        <p className="text-xs text-slate-500 font-mono italic leading-relaxed line-clamp-3 hover:line-clamp-none transition-all cursor-text select-all">{scene.visual_prompt}</p>
                    </div>
                 </div>
              )}

              {/* Tags */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                  {(scene.tags || []).map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/50 border border-white/5 text-[10px] text-slate-400 font-medium group/tag hover:border-indigo-500/30 transition-colors">
                      <Tag className="w-3 h-3 opacity-50" />
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-red-400 hidden group-hover/tag:block ml-1"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                  {isAddingTag ? (
                    <form onSubmit={handleAddTag} className="inline-block">
                      <input autoFocus className="bg-black/30 border border-indigo-500/50 rounded-md text-[10px] text-white px-2 py-1 outline-none w-20" value={newTag} onChange={e => setNewTag(e.target.value)} onBlur={() => setIsAddingTag(false)} placeholder="New Tag..." />
                    </form>
                  ) : (
                    <button onClick={() => setIsAddingTag(true)} className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[10px] text-slate-500 hover:text-indigo-400 transition-colors border border-dashed border-white/10 hover:border-indigo-500/30 flex items-center gap-1"><Plus className="w-3 h-3" /> Add Tag</button>
                  )}
              </div>
           </div>

           {/* Footer Actions */}
           <div className="mt-4 border-t border-white/5 flex flex-wrap gap-3 pt-6">
              <div className="flex items-center gap-2">
                {scene.audioUrl ? (
                   <div className="flex items-center gap-2 bg-slate-800/80 rounded-full pl-3 pr-1 py-1.5 border border-white/5 shadow-sm"><Volume2 className="w-3.5 h-3.5 text-indigo-400" /><audio src={scene.audioUrl} controls className="h-6 w-24 opacity-80 hover:opacity-100 transition-opacity" /></div>
                ) : (
                   <button onClick={onGenerateAudio} disabled={scene.isLoadingAudio} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-400 hover:text-white transition-colors border border-white/5">{scene.isLoadingAudio ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />} Audio</button>
                )}
              </div>

              {scene.videoUrl ? (
                  <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/10 text-indigo-300 text-xs font-bold border border-indigo-500/20 cursor-default"><Film className="w-3.5 h-3.5" /> Video Ready</button>
              ) : (
                  <button onClick={onGenerateVideo} disabled={scene.isLoadingVideo || !scene.imageUrl} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-400 hover:text-purple-300 transition-colors border border-white/5 disabled:opacity-50">{scene.isLoadingVideo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Film className="w-3.5 h-3.5" />} Generate Video (Veo)</button>
              )}
           </div>
        </div>

      </div>
    </div>
  );
};

export default Storyboard;


import React, { useState, useRef, useEffect } from 'react';
import { StoryData, Scene, PlotOption, ExportConfig, GenerationMode, ImageFeedback, VisualAnchor } from '../types';
import { Loader2, Image as ImageIcon, RefreshCw, Wand2, ArrowRight, Volume2, Download, CheckSquare, Square, Maximize2, RotateCcw, RotateCw, History, PlayCircle, Type, Film, Sparkles, Tag, Plus, X, Edit3, Filter, ChevronDown, Layout, Users, UserCheck, Info } from 'lucide-react';
import FullScreenViewer from './FullScreenViewer';

interface StoryboardProps {
  story: StoryData;
  characterImages: string[];
  onRetryImage: (sceneId: number) => void;
  onModifyImage: (sceneId: number, feedback: ImageFeedback) => void;
  onUpdateScene: (sceneId: number, narrative: string, visualPrompt: string, shouldRegenerate: boolean) => void;
  onUpdateTags: (sceneId: number, tags: string[]) => void;
  onUpdateCharacters: (sceneId: number, chars: string[]) => void;
  onRequestOptions: () => void;
  onSelectOption: (option: string) => void;
  onGenerateAudio: (sceneId: number, text: string) => void;
  onGenerateVideo: (sceneId: number) => void;
  onPolishText: (text: string, type: 'narrative' | 'visual') => Promise<string>;
  onExport: (selectedSceneIds: number[], config: ExportConfig) => void;
  onOptimizeStory: () => void;
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
  characterImages,
  onRetryImage, 
  onModifyImage,
  onUpdateScene,
  onUpdateTags,
  onUpdateCharacters,
  onRequestOptions,
  onSelectOption,
  onGenerateAudio,
  onGenerateVideo,
  onPolishText,
  onExport,
  onOptimizeStory,
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
  const [exportWithText, setExportWithText] = useState(false);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [filterTag, setFilterTag] = useState<string | null>(null);

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
      resolution: 'original',
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
  const allTags = Array.from(new Set(story.scenes.flatMap(s => s.tags || []))).sort();
  const filteredScenes = filterTag 
      ? story.scenes.filter(s => (s.tags || []).includes(filterTag)) 
      : story.scenes;

  return (
    <div className="relative min-h-screen pb-40">
      
      {/* 1. STICKY HEADER & NAVIGATION */}
      <div className="sticky top-0 z-40 bg-[#0f111a]/90 backdrop-blur-xl border-b border-white/5 transition-all shadow-xl -mx-8 px-8">
         {/* Top Bar: Title & Global Controls */}
         <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <h2 className="text-xl font-bold text-white tracking-tight truncate max-w-[200px] md:max-w-md" title={story.title}>
                  {story.title}
               </h2>
               <div className={`hidden md:flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${isComicMode ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                  {isComicMode ? <Layout className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                  {isComicMode ? 'Comic Mode' : 'Storyboard'}
               </div>
            </div>

            <div className="flex items-center gap-3">
               {/* History Group */}
               <div className="flex items-center gap-0.5 bg-black/40 p-1 rounded-lg border border-white/10">
                  <button onClick={onUndo} disabled={!canUndo} className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="Undo"><RotateCcw className="w-3.5 h-3.5" /></button>
                  <button onClick={onRedo} disabled={!canRedo} className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="Redo"><RotateCw className="w-3.5 h-3.5" /></button>
                  <div className="w-px h-4 bg-white/10 mx-1"></div>
                  <div className="relative">
                    <button onClick={() => setShowHistoryDropdown(!showHistoryDropdown)} className="p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors flex items-center gap-1"><History className="w-3.5 h-3.5" /><ChevronDown className="w-3 h-3" /></button>
                    {showHistoryDropdown && (
                      <div className="absolute top-full right-0 mt-2 w-64 bg-[#1A1E29] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 z-50">
                         <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            {historyList.map((hist, idx) => (
                               <button key={idx} onClick={() => { onJumpToHistory(idx); setShowHistoryDropdown(false); }} className={`w-full text-left px-4 py-2 text-xs border-b border-white/5 hover:bg-white/5 flex items-center justify-between ${idx === currentHistoryIndex ? 'bg-indigo-500/10 text-indigo-300' : 'text-slate-400'}`}>
                                  <span className="truncate">{hist.actionType || 'Edit'}</span>
                                  {idx === currentHistoryIndex && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>}
                               </button>
                            ))}
                         </div>
                      </div>
                    )}
                  </div>
               </div>
               
               {/* Export Button */}
               <button onClick={handleExport} disabled={story.scenes.length === 0} className="hidden md:flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-indigo-500/20 active:scale-95">
                  <Download className="w-3.5 h-3.5" /> Export
               </button>
            </div>
         </div>

         {/* Sequence Timeline Strip */}
         <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-3 snap-x">
            {filteredScenes.map((scene) => (
               <button
                 key={scene.id}
                 onClick={() => scrollToScene(scene.id)}
                 className={`relative flex-shrink-0 w-16 h-10 rounded-md overflow-hidden border transition-all snap-start ${selectedScenes.includes(scene.id) ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'}`}
               >
                  {scene.imageUrl ? (
                    <img src={scene.imageUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#1A1E29] flex items-center justify-center text-[10px] text-slate-500 font-mono">{String(scene.id + 1).padStart(2, '0')}</div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 opacity-0 transition-opacity" style={{ opacity: selectedScenes.includes(scene.id) ? 1 : 0 }}></div>
               </button>
            ))}
         </div>
      </div>

      {/* 2. TOOLBAR */}
      <div className="max-w-[1600px] mx-auto py-6 flex flex-wrap items-center justify-between gap-4">
         <div className="flex items-center gap-4">
            {/* Selection */}
            <button onClick={toggleSelectAll} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors group">
               <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedScenes.length === story.scenes.length ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-600 group-hover:border-slate-400'}`}>
                  {selectedScenes.length === story.scenes.length && <CheckSquare className="w-3 h-3" />}
               </div>
               Select All
            </button>

            <div className="h-4 w-px bg-white/10"></div>

            {/* Tag Filter */}
            {allTags.length > 0 && (
               <div className="flex items-center gap-2 relative group">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <select 
                     value={filterTag || ""} 
                     onChange={(e) => setFilterTag(e.target.value || null)}
                     className="bg-transparent text-slate-400 hover:text-white text-xs font-medium outline-none cursor-pointer appearance-none pr-4"
                  >
                     <option value="">All Scenes</option>
                     {allTags.map(tag => <option key={tag} value={tag}>#{tag}</option>)}
                  </select>
               </div>
            )}
         </div>

         <div className="flex items-center gap-3">
            <div className="flex items-center bg-black/30 rounded-lg p-0.5 border border-white/10">
               <button onClick={() => setShowFullScreen(true)} className="px-3 py-1.5 rounded-md hover:bg-white/5 text-slate-400 hover:text-white text-xs font-medium flex items-center gap-2 transition-colors"><PlayCircle className="w-3.5 h-3.5" /> Present</button>
               <button onClick={onOptimizeStory} disabled={isOptimizingStory} className="px-3 py-1.5 rounded-md hover:bg-white/5 text-purple-400 hover:text-purple-300 text-xs font-medium flex items-center gap-2 transition-colors border-l border-white/5">
                  {isOptimizingStory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Polish Script
               </button>
            </div>

            <div className="h-4 w-px bg-white/10 hidden md:block"></div>
            
            {/* Export Config (Inline) */}
            <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-1.5 border border-white/10">
               <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-white select-none">
                  <div className={`w-3 h-3 rounded border flex items-center justify-center ${exportWithText ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'}`}>
                     {exportWithText && <CheckSquare className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <input type="checkbox" checked={exportWithText} onChange={() => setExportWithText(!exportWithText)} className="hidden" />
                  Embed Text
               </label>
               <div className="w-px h-3 bg-white/10 mx-2"></div>
               <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as any)} className="bg-transparent text-xs text-slate-300 outline-none cursor-pointer hover:text-white font-medium">
                  <option value="pdf">PDF</option>
                  <option value="zip">ZIP</option>
                  <option value="long-image">Image Strip</option>
               </select>
            </div>
         </div>
      </div>

      {/* 3. MAIN CONTENT: SCENE EDITOR */}
      <div className="max-w-[1600px] mx-auto">
         {isComicMode ? (
            /* COMIC GRID LAYOUT */
            <div className="bg-[#E5E5E5] p-8 md:p-12 shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-400 min-h-[800px] relative mb-12">
               <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-multiply"></div>
               
               {/* Header */}
               <div className="relative z-10 text-center mb-12">
                  <h1 className="text-5xl font-black uppercase text-black mb-2 tracking-tighter">{story.title}</h1>
                  <div className="inline-flex items-center gap-4 text-xs font-bold text-slate-600 uppercase tracking-widest border-t-2 border-b-2 border-black py-2 px-6">
                     <span>Issue #1</span><span>•</span><span>{new Date().toLocaleDateString()}</span><span>•</span><span>Gemini Studio</span>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                  {filteredScenes.map((scene) => (
                     <div key={scene.id} id={`scene-${scene.id}`} className="h-full">
                       <SceneCard 
                         scene={scene} 
                         index={scene.id}
                         mode="comic"
                         isSelected={selectedScenes.includes(scene.id)}
                         allAnchors={story.visualAnchors || []}
                         characterImages={characterImages}
                         onToggleSelect={() => toggleSelectScene(scene.id)}
                         onRetry={() => onRetryImage(scene.id)}
                         onModify={(feedback) => onModifyImage(scene.id, feedback)}
                         onUpdate={(narrative, visual, regen) => onUpdateScene(scene.id, narrative, visual, regen)}
                         onUpdateTags={(tags) => onUpdateTags(scene.id, tags)}
                         onUpdateCharacters={(chars) => onUpdateCharacters(scene.id, chars)}
                         onGenerateAudio={() => onGenerateAudio(scene.id, scene.narrative)}
                         onGenerateVideo={() => onGenerateVideo(scene.id)}
                         onPolishText={onPolishText}
                       />
                     </div>
                  ))}
               </div>
               
               <div className="text-center mt-12 relative z-10">
                  <span className="text-xs font-black text-black border-2 border-black px-3 py-1 bg-white">1</span>
               </div>
            </div>
         ) : (
            /* STORYBOARD EDITOR LAYOUT - UPDATED GRID FOR RESPONSIVENESS */
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
               {filteredScenes.map((scene) => (
                  <div key={scene.id} id={`scene-${scene.id}`} className="scroll-mt-40">
                    <SceneCard 
                      scene={scene} 
                      index={scene.id}
                      mode="storyboard"
                      isSelected={selectedScenes.includes(scene.id)}
                      allAnchors={story.visualAnchors || []}
                      characterImages={characterImages}
                      onToggleSelect={() => toggleSelectScene(scene.id)}
                      onRetry={() => onRetryImage(scene.id)}
                      onModify={(feedback) => onModifyImage(scene.id, feedback)}
                      onUpdate={(narrative, visual, regen) => onUpdateScene(scene.id, narrative, visual, regen)}
                      onUpdateTags={(tags) => onUpdateTags(scene.id, tags)}
                      onUpdateCharacters={(chars) => onUpdateCharacters(scene.id, chars)}
                      onGenerateAudio={() => onGenerateAudio(scene.id, scene.narrative)}
                      onGenerateVideo={() => onGenerateVideo(scene.id)}
                      onPolishText={onPolishText}
                    />
                  </div>
               ))}
            </div>
         )}
      </div>

      {/* 4. FOOTER OPTIONS */}
      <div className="max-w-[1600px] mx-auto mt-16 pb-20">
         {isExtendingStory ? (
             <div className="flex flex-col items-center justify-center py-20 bg-[#13161f]/50 border border-white/5 rounded-3xl animate-pulse">
                <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
                <h3 className="text-xl font-bold text-white">Generating Next Chapter...</h3>
             </div>
         ) : plotOptions.length > 0 ? (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2"><Sparkles className="w-6 h-6 text-indigo-400" /> Continue the Story</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {plotOptions.map((opt) => (
                    <button key={opt.id} onClick={() => onSelectOption(opt.description)} className="group text-left p-6 bg-[#13161f] border border-white/5 hover:border-indigo-500/50 rounded-2xl transition-all hover:-translate-y-1 shadow-lg hover:shadow-indigo-500/10">
                       <h4 className="font-bold text-lg text-slate-200 mb-2 group-hover:text-indigo-400 transition-colors">{opt.title}</h4>
                       <p className="text-sm text-slate-400 leading-relaxed">{opt.description}</p>
                       <div className="mt-4 flex items-center text-xs font-bold text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">Select Path <ArrowRight className="w-3 h-3 ml-1" /></div>
                    </button>
                 ))}
              </div>
            </div>
         ) : (
            <div className="text-center py-10">
               <button onClick={onRequestOptions} disabled={isLoadingOptions} className="inline-flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-slate-300 hover:text-white font-bold transition-all disabled:opacity-50">
                  {isLoadingOptions ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  <span>Generate Plot Extensions</span>
               </button>
            </div>
         )}
      </div>

      {showFullScreen && (<FullScreenViewer scenes={story.scenes} initialIndex={0} onClose={() => setShowFullScreen(false)} title={story.title} />)}
    </div>
  );
};

const SubtitleOverlay: React.FC<{ text: string, mode: GenerationMode }> = ({ text, mode }) => {
  if (mode === 'comic') return null; // Handled differently in comic mode
  return (
    <div className="absolute bottom-0 left-0 right-0 p-6 pt-12 bg-gradient-to-t from-black/90 to-transparent z-20 pointer-events-none">
       <p className="text-white text-sm md:text-base font-medium leading-relaxed drop-shadow-md text-center">{text}</p>
    </div>
  );
};

const SceneCard: React.FC<{ 
  scene: Scene; 
  index: number; 
  mode: GenerationMode;
  isSelected: boolean;
  allAnchors: VisualAnchor[];
  characterImages: string[];
  onToggleSelect: () => void;
  onRetry: () => void;
  onModify: (feedback: ImageFeedback) => void; 
  onUpdate: (narrative: string, visual: string, regen: boolean) => void;
  onUpdateTags: (tags: string[]) => void;
  onUpdateCharacters: (chars: string[]) => void;
  onGenerateAudio: () => void;
  onGenerateVideo: () => void;
  onPolishText: (text: string, type: 'narrative' | 'visual') => Promise<string>;
}> = ({ scene, index, mode, isSelected, allAnchors, characterImages, onToggleSelect, onRetry, onModify, onUpdate, onUpdateTags, onUpdateCharacters, onGenerateAudio, onGenerateVideo, onPolishText }) => {
  const [isEditingFeedback, setIsEditingFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<ImageFeedback['type']>('general');
  const [editNarrative, setEditNarrative] = useState(scene.narrative);
  const [editVisual, setEditVisual] = useState(scene.visual_prompt);
  const [isPolishingNarrative, setIsPolishingNarrative] = useState(false);
  const [isPolishingVisual, setIsPolishingVisual] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Auto-save buffer
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setEditNarrative(scene.narrative);
    setEditVisual(scene.visual_prompt);
  }, [scene.narrative, scene.visual_prompt]);

  const handleModifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback.trim()) {
      onModify({ type: feedbackType, text: feedback });
      setIsEditingFeedback(false);
      setFeedback("");
    }
  };

  const handleBlurSave = () => {
     if (hasUnsavedChanges) {
        onUpdate(editNarrative, editVisual, false);
        setHasUnsavedChanges(false);
     }
  };

  const handleRegenerateVisual = () => {
     onUpdate(editNarrative, editVisual, true);
     setHasUnsavedChanges(false);
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

  const handlePolish = async (type: 'narrative' | 'visual') => {
    if (type === 'narrative') {
      setIsPolishingNarrative(true);
      try { const result = await onPolishText(editNarrative, 'narrative'); setEditNarrative(result); setHasUnsavedChanges(true); } finally { setIsPolishingNarrative(false); }
    } else {
      setIsPolishingVisual(true);
      try { const result = await onPolishText(editVisual, 'visual'); setEditVisual(result); setHasUnsavedChanges(true); } finally { setIsPolishingVisual(false); }
    }
  };

  // --- COMIC CARD RENDER ---
  if (mode === 'comic') {
     return (
        <div className={`relative flex flex-col h-full bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1 duration-200 group ${isSelected ? 'ring-4 ring-indigo-500/50' : ''}`}>
           {/* Image Area */}
           <div className="relative flex-1 bg-slate-100 min-h-[250px] overflow-hidden border-b-4 border-black group/img">
              {scene.imageUrl ? (
                 <img src={scene.imageUrl} className="w-full h-full object-cover" />
              ) : (
                 <div className="w-full h-full flex items-center justify-center bg-white">
                    {scene.isLoadingImage ? <Loader2 className="w-8 h-8 animate-spin text-black" /> : <ImageIcon className="w-8 h-8 text-slate-300" />}
                 </div>
              )}
              
              {/* Comic Number */}
              <div className="absolute top-0 left-0 bg-black text-white px-3 py-1 text-sm font-black border-r-4 border-b-4 border-white z-20">
                 {index + 1}
              </div>

              {/* Hover Actions */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity z-30">
                  <button onClick={onRetry} className="p-1.5 bg-white border-2 border-black hover:bg-yellow-300 text-black shadow-sm" title="Redraw"><RefreshCw className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setIsEditingFeedback(true)} className="p-1.5 bg-white border-2 border-black hover:bg-yellow-300 text-black shadow-sm" title="Modify"><Wand2 className="w-3.5 h-3.5" /></button>
                  <button onClick={onToggleSelect} className={`p-1.5 border-2 border-black shadow-sm ${isSelected ? 'bg-indigo-500 text-white' : 'bg-white text-black hover:bg-slate-100'}`}>
                      {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  </button>
              </div>

              {/* Modify Modal Overlay */}
              {isEditingFeedback && (
                 <div className="absolute inset-0 bg-white z-40 p-4 flex flex-col border-4 border-black">
                    <h5 className="text-xs font-black uppercase mb-2">Modify Panel</h5>
                    <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} className="flex-1 bg-slate-50 border-2 border-slate-200 p-2 text-xs mb-2 outline-none focus:border-black font-bold" placeholder="Change lighting, angle..." autoFocus />
                    <div className="flex justify-end gap-2">
                       <button onClick={() => setIsEditingFeedback(false)} className="text-xs font-bold underline">Cancel</button>
                       <button onClick={handleModifySubmit} className="px-3 py-1 bg-black text-white text-xs font-bold hover:bg-slate-800">Apply</button>
                    </div>
                 </div>
              )}
           </div>

           {/* Caption Area (Editable) */}
           <div className="p-3 bg-white min-h-[100px] flex flex-col">
              <textarea 
                value={editNarrative} 
                onChange={(e) => { setEditNarrative(e.target.value); setHasUnsavedChanges(true); }}
                onBlur={handleBlurSave}
                className="w-full h-full resize-none outline-none text-xs md:text-sm font-bold font-comic bg-transparent placeholder-slate-300"
                placeholder="Write caption..."
              />
           </div>
        </div>
     );
  }

  // --- STORYBOARD CARD RENDER (EDITOR STYLE) ---
  return (
    <div className={`flex flex-col md:flex-row bg-[#13161f] border border-white/5 rounded-xl overflow-hidden shadow-xl transition-all hover:border-white/10 ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}>
      
      {/* 1. VISUAL CONTAINER (Left/Top) */}
      <div className="relative w-full md:w-[45%] xl:w-[40%] bg-black group/visual">
         <div className="relative aspect-video">
            {scene.videoUrl ? (
               <video src={scene.videoUrl} controls className="w-full h-full object-cover" />
            ) : scene.imageUrl ? (
               <img src={scene.imageUrl} className={`w-full h-full object-cover transition-opacity ${scene.isLoadingImage ? 'opacity-50' : 'opacity-100'}`} />
            ) : (
               <div className="w-full h-full flex flex-col items-center justify-center bg-[#0B0F19] text-slate-600">
                  {scene.isLoadingImage ? (
                     <div className="flex flex-col items-center gap-2"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /><span className="text-xs font-medium text-indigo-400">Generating...</span></div>
                  ) : (
                     <div className="flex flex-col items-center gap-2"><ImageIcon className="w-10 h-10 opacity-20" /><button onClick={onRetry} className="text-xs underline hover:text-white">Generate Image</button></div>
                  )}
               </div>
            )}

            {/* Hover Overlays */}
            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover/visual:opacity-100 transition-opacity z-20">
               {!scene.isLoadingImage && scene.imageUrl && (
                  <>
                     <button onClick={onRetry} className="p-2 bg-black/60 hover:bg-indigo-600 text-white rounded-lg backdrop-blur-md border border-white/10 transition-colors" title="Regenerate"><RefreshCw className="w-3.5 h-3.5" /></button>
                     <button onClick={() => setIsEditingFeedback(true)} className="p-2 bg-black/60 hover:bg-purple-600 text-white rounded-lg backdrop-blur-md border border-white/10 transition-colors" title="Modify with AI"><Wand2 className="w-3.5 h-3.5" /></button>
                     <button onClick={onToggleSelect} className={`p-2 rounded-lg border backdrop-blur-md transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-black/60 border-white/10 text-slate-300 hover:text-white'}`}>
                        {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                     </button>
                  </>
               )}
            </div>
            
            {/* Status Badges */}
            <div className="absolute bottom-3 left-3 flex gap-2">
               <span className="bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono text-white border border-white/10">SCENE {String(index + 1).padStart(2,'0')}</span>
               {scene.videoUrl && <span className="bg-indigo-500/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold text-white flex items-center gap-1"><Film className="w-2.5 h-2.5" /> VIDEO</span>}
            </div>

            {/* Feedback Modal */}
            {isEditingFeedback && (
               <div className="absolute inset-0 bg-black/90 z-30 p-6 flex flex-col justify-center animate-in fade-in">
                  <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Wand2 className="w-4 h-4 text-purple-400" /> AI Modification</h4>
                  <div className="flex gap-2 mb-3">
                     {(['general', 'lighting', 'composition', 'character'] as const).map(t => (
                        <button key={t} onClick={() => setFeedbackType(t)} className={`px-2 py-1 text-[10px] font-bold uppercase rounded border ${feedbackType === t ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 border-white/10 text-slate-400'}`}>{t}</button>
                     ))}
                  </div>
                  <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-xs text-white focus:ring-1 focus:ring-purple-500 outline-none resize-none h-24 mb-3" placeholder="Describe the change..." autoFocus />
                  <div className="flex justify-end gap-2">
                     <button onClick={() => setIsEditingFeedback(false)} className="text-xs text-slate-400 hover:text-white px-2">Cancel</button>
                     <button onClick={handleModifySubmit} className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-colors">Apply</button>
                  </div>
               </div>
            )}
         </div>
      </div>

      {/* 2. EDITOR CONTAINER (Right/Bottom) */}
      <div className="flex-1 flex flex-col bg-[#13161f]">
         
         {/* Upper: Script Editor */}
         <div className="flex-1 p-4 md:p-5 flex flex-col gap-4">
             <div className="space-y-1 group/narrative">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                   Narrative Script
                   <button onClick={() => handlePolish('narrative')} disabled={isPolishingNarrative} className="opacity-0 group-hover/narrative:opacity-100 transition-opacity text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                      {isPolishingNarrative ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Polish
                   </button>
                </label>
                <textarea 
                   value={editNarrative} 
                   onChange={(e) => { setEditNarrative(e.target.value); setHasUnsavedChanges(true); }}
                   onBlur={handleBlurSave}
                   className="w-full bg-transparent border-0 p-0 text-sm text-slate-200 focus:ring-0 placeholder-slate-600 resize-none leading-relaxed field-sizing-content min-h-[60px]"
                   placeholder="Enter story narrative here..."
                />
             </div>

             <div className="space-y-1 group/visual pt-4 border-t border-white/5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                   Visual Prompt
                   <button onClick={() => handlePolish('visual')} disabled={isPolishingVisual} className="opacity-0 group-hover/visual:opacity-100 transition-opacity text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                      {isPolishingVisual ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Polish
                   </button>
                </label>
                <textarea 
                   value={editVisual} 
                   onChange={(e) => { setEditVisual(e.target.value); setHasUnsavedChanges(true); }}
                   onBlur={handleBlurSave}
                   className="w-full bg-transparent border-0 p-0 text-xs text-slate-400 font-mono focus:ring-0 placeholder-slate-700 resize-none leading-relaxed min-h-[40px]"
                   placeholder="Enter visual description..."
                />
             </div>
         </div>

         {/* Middle: Character Selector */}
         {allAnchors.length > 0 && (
            <div className="px-5 py-4 border-t border-white/5 bg-black/10">
                <div className="flex items-center gap-2 mb-3">
                   <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                   <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Visual References: Select Active Characters</span>
                </div>
                <div className="flex flex-wrap gap-2">
                   {allAnchors.map(anchor => {
                      const isActive = (scene.characters || []).includes(anchor.name);
                      // Safe check for image index
                      const imgSrc = (anchor.previewImageIndex !== undefined && anchor.previewImageIndex >= 0 && characterImages[anchor.previewImageIndex]) 
                         ? characterImages[anchor.previewImageIndex] 
                         : null;
                      
                      // SAFE NAME ACCESS
                      const safeInitial = anchor.name && anchor.name.length > 0 ? anchor.name[0] : '?';

                      return (
                         <button
                            key={anchor.id}
                            onClick={() => {
                                const newChars = isActive 
                                 ? (scene.characters || []).filter(c => c !== anchor.name)
                                 : [...(scene.characters || []), anchor.name];
                               onUpdateCharacters(newChars);
                            }}
                            className={`group relative flex items-center gap-2 pr-3 pl-1 py-1 rounded-full border transition-all duration-200 ${isActive ? 'bg-indigo-600/20 border-indigo-500/60 text-indigo-200 shadow-[0_0_10px_rgba(99,102,241,0.2)]' : 'bg-black/20 border-white/5 text-slate-500 hover:border-white/20 hover:bg-white/5'}`}
                            title={`Include reference image for ${anchor.name}`}
                         >
                            <div className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-colors ${isActive ? 'border-indigo-400' : 'border-white/10 group-hover:border-white/30'}`}>
                               {imgSrc ? <img src={imgSrc} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-800 flex items-center justify-center text-[8px]">{safeInitial}</div>}
                            </div>
                            <span className={`text-[11px] font-bold ${isActive ? 'text-white' : ''}`}>{anchor.name || 'Unknown'}</span>
                            {isActive && <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full border-2 border-[#13161f] flex items-center justify-center"><CheckSquare className="w-2 h-2 text-white" /></div>}
                         </button>
                      );
                   })}
                </div>
            </div>
         )}

         {/* Lower: Metadata & Actions */}
         <div className="px-5 py-3 bg-[#0f111a] border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
             
             {/* Tags */}
             <div className="flex flex-wrap items-center gap-2">
                 {(scene.tags || []).map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 border border-white/5 group/tag">
                       {tag} <button onClick={() => onUpdateTags((scene.tags || []).filter(t => t !== tag))} className="hover:text-red-400 hidden group-hover/tag:block"><X className="w-2.5 h-2.5" /></button>
                    </span>
                 ))}
                 {isAddingTag ? (
                    <form onSubmit={handleAddTag}>
                       <input autoFocus className="w-16 bg-transparent border-b border-indigo-500 text-[10px] text-white outline-none" value={newTag} onChange={e => setNewTag(e.target.value)} onBlur={() => { if(!newTag) setIsAddingTag(false); }} placeholder="Tag..." />
                    </form>
                 ) : (
                    <button onClick={() => setIsAddingTag(true)} className="text-[10px] text-slate-600 hover:text-indigo-400 flex items-center gap-1 transition-colors"><Plus className="w-3 h-3" /> Tag</button>
                 )}
             </div>

             {/* Action Buttons */}
             <div className="flex items-center gap-3">
                 {hasUnsavedChanges && (
                    <span className="text-[10px] text-amber-500 font-medium animate-pulse">Saving...</span>
                 )}
                 {hasUnsavedChanges && (
                    <button onClick={handleRegenerateVisual} className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20 transition-colors">Apply & Redraw</button>
                 )}

                 <div className="h-3 w-px bg-white/10 mx-1"></div>

                 {/* Audio */}
                 {scene.audioUrl ? (
                    <div className="flex items-center gap-2">
                       <audio src={scene.audioUrl} className="h-5 w-20" controls />
                    </div>
                 ) : (
                    <button onClick={onGenerateAudio} disabled={scene.isLoadingAudio} className="text-slate-500 hover:text-white transition-colors" title="Generate Audio">
                       {scene.isLoadingAudio ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                 )}

                 {/* Video */}
                 {scene.videoUrl ? (
                    <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1"><Film className="w-3 h-3" /> Ready</span>
                 ) : (
                    <button onClick={onGenerateVideo} disabled={scene.isLoadingVideo || !scene.imageUrl} className={`transition-colors ${scene.imageUrl ? 'text-slate-500 hover:text-white' : 'text-slate-700 cursor-not-allowed'}`} title="Generate Video">
                       {scene.isLoadingVideo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Film className="w-3.5 h-3.5" />}
                    </button>
                 )}
             </div>
         </div>
      </div>

    </div>
  );
};

export default Storyboard;

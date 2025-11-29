
import React, { useState, useEffect } from 'react';
import { Scene, GenerationMode } from '../types';
import { Loader2, Image as ImageIcon, RefreshCw, Wand2, Volume2, Film, Edit3, CheckSquare, Square, Maximize2, Tag, Plus, X, Sparkles, PenTool } from 'lucide-react';
import { polishText } from '../services/geminiService';

export const SubtitleOverlay: React.FC<{ text: string, mode: GenerationMode }> = ({ text, mode }) => {
  if (mode === 'comic') {
    return (
       <div className="absolute bottom-0 left-0 right-0 bg-white border-t-2 border-black p-2 z-20 min-h-[48px] flex items-center justify-center">
          <p className="text-black text-[10px] md:text-xs font-bold leading-tight font-comic text-center line-clamp-3">{text}</p>
       </div>
    );
  }
  return <div className="absolute bottom-0 left-0 right-0 pb-8 pt-16 px-10 text-center z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent"><p className="text-white text-lg font-medium leading-relaxed drop-shadow-lg tracking-wide" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>{text}</p></div>;
};

// Enhanced Loading State
export const SkeletonSceneCard: React.FC<{ isComic: boolean }> = ({ isComic }) => {
   const [loadingText, setLoadingText] = useState("Drafting sketch...");
   
   useEffect(() => {
      const texts = ["Analyzing composition...", "Inking lines...", "Applying shading...", "Adding details...", "Finalizing render..."];
      let i = 0;
      const interval = setInterval(() => {
         setLoadingText(texts[i % texts.length]);
         i++;
      }, 2000);
      return () => clearInterval(interval);
   }, []);

   if (isComic) {
      return (
         <div className="flex-1 bg-white border-2 border-black relative h-full min-h-[400px] overflow-hidden group">
            {/* Paper Texture Background */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
            
            {/* Animated Scanning Line */}
            <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent via-indigo-500/10 to-transparent -translate-y-full animate-[shimmer_2s_infinite]"></div>

            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20">
               <div className="relative">
                  <div className="absolute inset-0 bg-indigo-400 blur-xl opacity-20 animate-pulse"></div>
                  <PenTool className="w-8 h-8 text-slate-800 animate-bounce" />
               </div>
               <div className="flex flex-col items-center">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">{loadingText}</p>
                  <div className="flex gap-1 mt-2">
                     <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse delay-75"></div>
                     <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse delay-150"></div>
                     <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse delay-300"></div>
                  </div>
               </div>
            </div>
            
            {/* Placeholder Layout Lines */}
            <div className="absolute inset-0 border-[10px] border-transparent opacity-10">
               <div className="w-full h-full border border-dashed border-black"></div>
               <div className="absolute top-1/2 left-0 right-0 h-px bg-black border-dashed"></div>
               <div className="absolute left-1/2 top-0 bottom-0 w-px bg-black border-dashed"></div>
            </div>
         </div>
      );
   }

   // Storyboard Skeleton
   return (
      <div className="relative bg-[#13161f] overflow-hidden border border-white/5 rounded-3xl shadow-2xl h-[550px] flex flex-col xl:flex-row">
         <div className="xl:w-2/3 bg-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
            <div className="absolute inset-0 flex items-center justify-center">
               <Loader2 className="w-10 h-10 text-white/20 animate-spin" />
            </div>
         </div>
         <div className="flex-1 border-l border-white/5 p-8 space-y-4">
             <div className="h-6 w-12 bg-white/10 rounded animate-pulse"></div>
             <div className="h-4 w-full bg-white/10 rounded animate-pulse delay-75"></div>
             <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse delay-150"></div>
             <div className="h-32 w-full bg-white/5 rounded-xl mt-6 animate-pulse delay-200"></div>
         </div>
      </div>
   );
};

export const SceneCard: React.FC<{ 
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
}> = ({ scene, index, mode, isSelected, onToggleSelect, onRetry, onModify, onUpdate, onUpdateTags, onGenerateAudio, onGenerateVideo }) => {
  const [isEditingFeedback, setIsEditingFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isEditingText, setIsEditingText] = useState(false);
  const [editNarrative, setEditNarrative] = useState(scene.narrative);
  const [editVisual, setEditVisual] = useState(scene.visual_prompt);
  const [isPolishingNarrative, setIsPolishingNarrative] = useState(false);
  const [isPolishingVisual, setIsPolishingVisual] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);

  useEffect(() => {
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
      try { const result = await polishText(editNarrative, 'narrative'); setEditNarrative(result); } finally { setIsPolishingNarrative(false); }
    } else {
      setIsPolishingVisual(true);
      try { const result = await polishText(editVisual, 'visual'); setEditVisual(result); } finally { setIsPolishingVisual(false); }
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

  if (isComicMode) {
     return (
        <div className={`group/card relative h-full w-full flex flex-col bg-transparent transition-all duration-300 ${isSelected ? 'ring-4 ring-indigo-500/50 z-10' : ''}`}>
           {/* Comic Panel Container - Takes full height of grid cell */}
           <div className={`flex-1 w-full h-full border-4 bg-white shadow-[4px_4px_0px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col transition-colors duration-300 ${isSelected ? 'border-indigo-600' : 'border-black'}`}>
              
              <div className="relative w-full h-full flex-1 bg-slate-100 overflow-hidden">
                 {scene.isLoadingImage ? (
                    <SkeletonSceneCard isComic={true} />
                 ) : scene.imageUrl ? (
                    <>
                       <img 
                          src={scene.imageUrl} 
                          alt={`Panel ${index + 1}`} 
                          className={`w-full h-full object-cover transition-transform duration-700 ease-out ${isSelected ? 'scale-110' : 'hover:scale-105'}`} 
                       />
                       {!isEditingText && <SubtitleOverlay text={scene.narrative} mode={mode} />}
                    </>
                 ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center bg-slate-50">
                       <ImageIcon className="w-8 h-8 mb-2 opacity-20" />
                       <span className="text-[10px] font-bold">Generation Failed</span>
                       <button onClick={onRetry} className="mt-2 text-[10px] underline hover:text-black">Retry</button>
                    </div>
                 )}

                 {/* Hover Actions */}
                 {!scene.isLoadingImage && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity z-30">
                        <button onClick={onRetry} className="p-1.5 bg-white border-2 border-black hover:bg-yellow-300 text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-transform active:translate-y-0.5" title="Regenerate"><RefreshCw className="w-3 h-3" /></button>
                        <button onClick={() => setIsEditingFeedback(true)} className="p-1.5 bg-white border-2 border-black hover:bg-yellow-300 text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-transform active:translate-y-0.5" title="Modify"><Wand2 className="w-3 h-3" /></button>
                        <button onClick={() => setIsEditingText(true)} className="p-1.5 bg-white border-2 border-black hover:bg-yellow-300 text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-transform active:translate-y-0.5" title="Edit Text"><Edit3 className="w-3 h-3" /></button>
                    </div>
                 )}
                 
                 {/* Selection Checkbox */}
                 <div className="absolute top-2 left-2 z-30 opacity-0 group-hover/card:opacity-100 data-[selected=true]:opacity-100 transition-opacity" data-selected={isSelected}>
                   <button onClick={onToggleSelect} className={`p-1 border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all ${isSelected ? 'bg-indigo-500 text-white' : 'bg-white text-black'}`}>{isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}</button>
                 </div>
              </div>

              {/* Text Editor Overlay */}
              {isEditingText && (
                 <div className="absolute inset-0 bg-white z-40 p-3 flex flex-col gap-2 border-4 border-black animate-in fade-in zoom-in-95">
                    <label className="text-[10px] font-bold uppercase">Caption</label>
                    <textarea value={editNarrative} onChange={(e) => setEditNarrative(e.target.value)} className="flex-1 w-full p-2 border-2 border-slate-200 text-xs font-comic focus:border-black outline-none resize-none" autoFocus />
                    <div className="flex gap-2 justify-end"><button onClick={() => setIsEditingText(false)} className="text-[10px] font-bold underline">Cancel</button><button onClick={() => handleTextSave(false)} className="px-3 py-1 bg-black text-white text-[10px] font-bold hover:bg-slate-800">Save</button></div>
                 </div>
              )}

              {/* Modify Visuals Overlay */}
              {isEditingFeedback && (
                 <div className="absolute inset-0 bg-black/90 z-50 p-4 flex flex-col justify-center text-white">
                    <h5 className="text-xs font-bold mb-2">Modify Panel Visuals</h5>
                    <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} className="w-full h-20 bg-white/10 border border-white/20 p-2 text-xs mb-2" placeholder="Describe changes..." />
                    <div className="flex gap-2 justify-end"><button onClick={() => setIsEditingFeedback(false)} className="text-xs text-slate-400">Cancel</button><button onClick={handleModifySubmit} className="text-xs font-bold text-yellow-400">Apply</button></div>
                 </div>
              )}
           </div>
           
           {/* Panel Number Badge */}
           <div className={`absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center font-black text-xs border-2 shadow-md z-20 transition-colors pointer-events-none ${isSelected ? 'bg-indigo-600 text-white border-white' : 'bg-white text-black border-black'}`}>{index + 1}</div>
        </div>
     );
  }

  // STANDARD STORYBOARD VIEW
  return (
    <div className={`group/card relative bg-[#13161f] overflow-hidden border transition-all duration-500 shadow-2xl rounded-3xl border-white/5 hover:border-white/10 ${isSelected ? 'ring-4 ring-indigo-500' : ''}`}>
      <div className="flex flex-col xl:flex-row h-[650px] xl:h-auto"> 
        <div className="relative bg-black/50 overflow-hidden xl:w-2/3 flex-shrink-0 min-h-[300px] xl:min-h-[500px]">
           <div className="relative w-full h-full">
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
             {(scene.isLoadingImage || scene.isLoadingVideo) && (
               <div className="absolute inset-0 z-30 bg-black/40 backdrop-blur-md">
                 <SkeletonSceneCard isComic={false} />
                 <div className="absolute bottom-10 left-10 flex items-center gap-3 bg-black/60 p-3 rounded-xl backdrop-blur-xl border border-white/10">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                    <p className="text-xs font-bold uppercase tracking-widest text-indigo-100">{scene.isLoadingVideo ? 'Rendering Video (Veo)...' : 'AI Drawing Scene...'}</p>
                 </div>
               </div>
             )}
             <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 z-40">
                {!scene.isLoadingImage && (
                   <>
                      <button onClick={onRetry} className="p-2.5 bg-black/60 hover:bg-indigo-600 text-white rounded-xl backdrop-blur-md border border-white/10 transition-all shadow-lg hover:shadow-indigo-500/20" title="Regenerate"><RefreshCw className="w-4 h-4" /></button>
                      <button onClick={() => setIsEditingFeedback(true)} className="p-2.5 bg-black/60 hover:bg-purple-600 text-white rounded-xl backdrop-blur-md border border-white/10 transition-all shadow-lg hover:shadow-purple-500/20" title="Modify Visuals"><Wand2 className="w-4 h-4" /></button>
                   </>
                )}
             </div>
             <div className="absolute top-4 left-4 z-40 opacity-0 group-hover/card:opacity-100 data-[selected=true]:opacity-100 transition-opacity" data-selected={isSelected}>
                <button onClick={onToggleSelect} className={`p-2 rounded-xl backdrop-blur-md border shadow-lg transition-all ${isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-black/60 border-white/10 text-slate-300 hover:text-white'}`}>{isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}</button>
             </div>
             {isEditingFeedback && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md p-8 flex flex-col justify-center animate-in fade-in zoom-in-95 duration-200 z-50">
                   <h4 className="text-white font-bold mb-4 flex items-center gap-2 text-lg"><Wand2 className="w-5 h-5 text-purple-400" /> Modify this Shot</h4>
                   <form onSubmit={handleModifySubmit} className="space-y-4">
                      <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="E.g., Make the lighting darker, change the angle to low shot..." className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none h-32 placeholder-slate-500 shadow-inner" autoFocus />
                      <div className="flex gap-3 justify-end"><button type="button" onClick={() => setIsEditingFeedback(false)} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">Cancel</button><button type="submit" disabled={!feedback.trim()} className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed">Apply Changes</button></div>
                   </form>
                </div>
             )}
           </div>
        </div>
        {/* Right side panel */}
        <div className="flex flex-col border-t border-white/5 bg-gradient-to-b from-[#13161f] to-[#0f111a] flex-1 xl:border-t-0 xl:border-l h-full overflow-hidden xl:w-[400px] flex-shrink-0">
           {/* 1. Fixed Header */}
           <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
              <div className="flex items-center gap-4">
                 <span className="text-xl font-black text-white/10 select-none">{String(index + 1).padStart(2, '0')}</span>
                 <span className="px-2 py-0.5 rounded border border-white/5 bg-white/5 text-[10px] font-bold text-indigo-300 uppercase tracking-widest">SCENE</span>
              </div>
              {!isEditingText && (
                 <button onClick={() => setIsEditingText(true)} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors" title="Edit Script">
                    <Edit3 className="w-4 h-4" />
                 </button>
              )}
           </div>

           {/* 2. Scrollable Content */}
           <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              {isEditingText ? (
                  <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
                     <div className="space-y-2"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">Narrative <button onClick={() => handlePolish('narrative')} disabled={isPolishingNarrative} className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1">{isPolishingNarrative ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} AI Polish</button></label><textarea value={editNarrative} onChange={(e) => setEditNarrative(e.target.value)} className="w-full h-32 bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none resize-none" /></div>
                     <div className="space-y-2"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">Visual Prompt <button onClick={() => handlePolish('visual')} disabled={isPolishingVisual} className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1">{isPolishingVisual ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} AI Polish</button></label><textarea value={editVisual} onChange={(e) => setEditVisual(e.target.value)} className="w-full h-32 bg-black/20 border border-white/10 rounded-xl p-3 text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none resize-none font-mono" /></div>
                     <div className="flex items-center justify-end gap-3 pt-2"><button onClick={() => setIsEditingText(false)} className="text-xs text-slate-500 hover:text-white font-medium px-2">Cancel</button><button onClick={() => handleTextSave(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors">Save Text</button><button onClick={() => handleTextSave(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-indigo-500/20">Save & Redraw</button></div>
                  </div>
              ) : (
                 <div className="space-y-6 flex flex-col h-full">
                    {/* Narrative Section - Large Text */}
                    <p className="text-slate-200 text-lg font-light leading-relaxed">{scene.narrative}</p>
                    
                    {/* Visual Prompt Section - Dashboard Style Box - Fills remaining space */}
                    <div className="flex-1 min-h-[150px] bg-black/20 rounded-xl p-4 border border-white/5 flex flex-col">
                       <h5 className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Maximize2 className="w-3 h-3" /> Visual Prompt
                       </h5>
                       <p className="text-xs text-slate-400 font-mono italic leading-relaxed hover:text-slate-300 transition-colors cursor-text select-all flex-1">
                          {scene.visual_prompt}
                       </p>
                    </div>

                    {/* Tags Section */}
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                        {(scene.tags || []).map(tag => (
                          <span key={tag} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/50 border border-white/5 text-[10px] text-slate-400 font-medium group/tag hover:border-indigo-500/30 transition-colors">
                            <Tag className="w-3 h-3 opacity-50" /> {tag} <button onClick={() => removeTag(tag)} className="hover:text-red-400 hidden group-hover/tag:block ml-1"><X className="w-3 h-3" /></button>
                          </span>
                        ))}
                        {isAddingTag ? (
                          <form onSubmit={handleAddTag} className="inline-block"><input autoFocus className="bg-black/30 border border-indigo-500/50 rounded-md text-[10px] text-white px-2 py-1 outline-none w-20" value={newTag} onChange={e => setNewTag(e.target.value)} onBlur={() => setIsAddingTag(false)} placeholder="New Tag..." /></form>
                        ) : (
                          <button onClick={() => setIsAddingTag(true)} className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[10px] text-slate-500 hover:text-indigo-400 transition-colors border border-dashed border-white/10 hover:border-indigo-500/30 flex items-center gap-1"><Plus className="w-3 h-3" /> Add Tag</button>
                        )}
                    </div>
                 </div>
              )}
           </div>

           {/* 3. Fixed Footer Actions */}
           <div className="p-6 border-t border-white/5 bg-black/20">
              <div className="flex flex-wrap gap-3">
                 <div className="flex items-center gap-2">
                    {scene.audioUrl ? (
                       <div className="flex items-center gap-2 bg-slate-800/80 rounded-full pl-3 pr-1 py-1.5 border border-white/5 shadow-sm">
                          <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                          <audio src={scene.audioUrl} controls className="h-6 w-24 opacity-80 hover:opacity-100 transition-opacity" />
                       </div>
                    ) : (
                       <button onClick={onGenerateAudio} disabled={scene.isLoadingAudio} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-400 hover:text-white transition-colors border border-white/5">
                          {scene.isLoadingAudio ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />} Audio
                       </button>
                    )}
                 </div>
                 {scene.videoUrl ? (
                    <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/10 text-indigo-300 text-xs font-bold border border-indigo-500/20 cursor-default">
                       <Film className="w-3.5 h-3.5" /> Video Ready
                    </button>
                 ) : (
                    <button onClick={onGenerateVideo} disabled={scene.isLoadingVideo || !scene.imageUrl} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-400 hover:text-purple-300 transition-colors border border-white/5 disabled:opacity-50">
                       {scene.isLoadingVideo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Film className="w-3.5 h-3.5" />} Generate Video (Veo)
                    </button>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

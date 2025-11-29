
import React, { useState, useEffect } from 'react';
import { Scene, ArtStyle } from '../types';
import { Loader2, Sparkles, Wand2, Volume2, Film, Palette, Maximize2, Tag, Plus, X, RefreshCw } from 'lucide-react';
import { polishText } from '../services/geminiService';
import { toast } from 'sonner';

interface InspectorPanelProps {
  scene: Scene | undefined;
  currentArtStyle: ArtStyle;
  onUpdateText: (narrative: string, visual: string, regen: boolean) => void;
  onUpdateTags: (tags: string[]) => void;
  onRetry: () => void;
  onModify: (feedback: string) => void;
  onGenerateAudio: () => void;
  onGenerateVideo: () => void;
  onGenerateStylePreview: () => void;
}

const InspectorPanel: React.FC<InspectorPanelProps> = ({
  scene,
  currentArtStyle,
  onUpdateText,
  onUpdateTags,
  onRetry,
  onModify,
  onGenerateAudio,
  onGenerateVideo,
  onGenerateStylePreview
}) => {
  const [narrative, setNarrative] = useState('');
  const [visualPrompt, setVisualPrompt] = useState('');
  const [isPolishingNarrative, setIsPolishingNarrative] = useState(false);
  const [isPolishingVisual, setIsPolishingVisual] = useState(false);
  const [modifyFeedback, setModifyFeedback] = useState('');
  const [isModifying, setIsModifying] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Sync state when scene changes
  useEffect(() => {
    if (scene) {
      setNarrative(scene.narrative);
      setVisualPrompt(scene.visual_prompt);
      setIsModifying(false);
      setModifyFeedback('');
    }
  }, [scene?.id]);

  const handleSaveText = (regenerate: boolean) => {
    onUpdateText(narrative, visualPrompt, regenerate);
    toast.success(regenerate ? "Text updated & regenerating image..." : "Text updated");
  };

  const handlePolish = async (type: 'narrative' | 'visual') => {
    if (type === 'narrative') {
      setIsPolishingNarrative(true);
      try { const res = await polishText(narrative, 'narrative'); setNarrative(res); } finally { setIsPolishingNarrative(false); }
    } else {
      setIsPolishingVisual(true);
      try { const res = await polishText(visualPrompt, 'visual'); setVisualPrompt(res); } finally { setIsPolishingVisual(false); }
    }
  };

  const handleModifySubmit = () => {
    if (modifyFeedback.trim()) {
      onModify(modifyFeedback);
      setModifyFeedback('');
      setIsModifying(false);
    }
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTag.trim() && scene) {
       const current = scene.tags || [];
       if (!current.includes(newTag.trim())) {
          onUpdateTags([...current, newTag.trim()]);
       }
       setNewTag('');
       setIsAddingTag(false);
    }
  };

  if (!scene) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 p-8 text-center bg-[#0f111a] border-l border-white/5">
        <div>
           <p className="mb-2">No Scene Selected</p>
           <p className="text-xs opacity-50">Select a scene from the timeline or stage to edit properties.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0f111a] border-l border-white/5 text-white">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
         <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Properties</h3>
            <p className="text-[10px] text-slate-500 font-mono">SCENE ID: {scene.id + 1}</p>
         </div>
         <div className="flex gap-1">
            <button onClick={onRetry} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors" title="Regenerate Image"><RefreshCw className="w-4 h-4" /></button>
            <button onClick={() => setIsModifying(!isModifying)} className={`p-2 rounded-lg transition-colors ${isModifying ? 'bg-indigo-600 text-white' : 'hover:bg-white/10 text-slate-400 hover:text-white'}`} title="Modify with Prompt"><Wand2 className="w-4 h-4" /></button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8">
         {/* Modification Mode */}
         {isModifying && (
            <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4 animate-in slide-in-from-top-2">
               <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider mb-2 block">Modify Image</label>
               <textarea 
                  value={modifyFeedback} 
                  onChange={(e) => setModifyFeedback(e.target.value)} 
                  placeholder="Describe changes (e.g. 'Make it darker', 'Zoom in')..." 
                  className="w-full h-20 bg-black/40 border border-indigo-500/30 rounded-lg p-2 text-xs text-white focus:outline-none mb-2 resize-none"
               />
               <div className="flex justify-end gap-2">
                  <button onClick={() => setIsModifying(false)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">Cancel</button>
                  <button onClick={handleModifySubmit} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg">Apply</button>
               </div>
            </div>
         )}

         {/* Narrative Edit */}
         <div className="space-y-2">
            <div className="flex items-center justify-between">
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Film className="w-3 h-3" /> Narrative (Chinese)</label>
               <button onClick={() => handlePolish('narrative')} disabled={isPolishingNarrative} className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1">{isPolishingNarrative ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Polish</button>
            </div>
            <textarea 
               value={narrative} 
               onChange={(e) => setNarrative(e.target.value)}
               onBlur={() => handleSaveText(false)}
               className="w-full h-24 bg-black/20 border border-white/10 hover:border-white/20 focus:border-indigo-500 rounded-xl p-3 text-sm text-white placeholder-slate-700 focus:outline-none resize-none transition-colors"
               placeholder="Enter dialogue or scene description..."
            />
         </div>

         {/* Visual Prompt Edit */}
         <div className="space-y-2">
            <div className="flex items-center justify-between">
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Maximize2 className="w-3 h-3" /> Visual Prompt (English)</label>
               <button onClick={() => handlePolish('visual')} disabled={isPolishingVisual} className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1">{isPolishingVisual ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Polish</button>
            </div>
            <textarea 
               value={visualPrompt} 
               onChange={(e) => setVisualPrompt(e.target.value)}
               onBlur={() => handleSaveText(false)}
               className="w-full h-32 bg-black/20 border border-white/10 hover:border-white/20 focus:border-indigo-500 rounded-xl p-3 text-xs font-mono text-slate-300 placeholder-slate-700 focus:outline-none resize-none transition-colors"
               placeholder="Describe the image visuals..."
            />
            <button onClick={() => handleSaveText(true)} className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-xs font-bold text-slate-300 transition-colors flex items-center justify-center gap-2">
               <RefreshCw className="w-3 h-3" /> Update Text & Redraw Image
            </button>
         </div>

         {/* Tags */}
         <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tags</label>
            <div className="flex flex-wrap gap-2">
               {(scene.tags || []).map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 border border-white/5 text-[10px] text-slate-300 group">
                     {tag} <button onClick={() => onUpdateTags((scene.tags || []).filter(t => t !== tag))} className="hover:text-red-400 ml-1 hidden group-hover:block"><X className="w-3 h-3" /></button>
                  </span>
               ))}
               {isAddingTag ? (
                  <form onSubmit={handleAddTag} className="inline-block"><input autoFocus className="bg-black/30 border border-indigo-500/50 rounded-md text-[10px] text-white px-2 py-1 outline-none w-20" value={newTag} onChange={e => setNewTag(e.target.value)} onBlur={() => setIsAddingTag(false)} /></form>
               ) : (
                  <button onClick={() => setIsAddingTag(true)} className="px-2 py-1 rounded-md border border-dashed border-white/10 hover:border-white/30 text-[10px] text-slate-500 hover:text-white transition-colors flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
               )}
            </div>
         </div>
      </div>

      {/* Footer Media Actions */}
      <div className="p-5 border-t border-white/5 bg-black/20 space-y-3">
         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Media Generation</label>
         <div className="grid grid-cols-2 gap-3">
            <button onClick={onGenerateAudio} disabled={scene.isLoadingAudio || !!scene.audioUrl} className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${scene.audioUrl ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300'}`}>
               {scene.isLoadingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
               <span className="text-xs font-bold">{scene.audioUrl ? 'Audio Ready' : 'Generate Audio'}</span>
            </button>
            <button onClick={onGenerateVideo} disabled={scene.isLoadingVideo || !!scene.videoUrl || !scene.imageUrl} className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${scene.videoUrl ? 'bg-purple-500/10 border-purple-500/20 text-purple-300' : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300'}`}>
               {scene.isLoadingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
               <span className="text-xs font-bold">{scene.videoUrl ? 'Video Ready' : 'Generate Video'}</span>
            </button>
         </div>
         <button onClick={onGenerateStylePreview} disabled={scene.isLoadingStylePreview || !!scene.stylePreviewUrl} className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${scene.stylePreviewUrl ? 'bg-pink-500/10 border-pink-500/20 text-pink-300' : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300'}`}>
            {scene.isLoadingStylePreview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Palette className="w-4 h-4" />}
            <span className="text-xs font-bold">{scene.stylePreviewUrl ? 'Style Preview Ready' : 'Generate Style Preview'}</span>
         </button>
      </div>
    </div>
  );
};

export default InspectorPanel;

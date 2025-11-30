
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
  onCancelVideo: () => void;
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
  onCancelVideo,
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
    if (!scene) {
      toast.error("没有选中的场景");
      return;
    }
    
    const textToPolish = type === 'narrative' ? narrative : visualPrompt;
    if (!textToPolish.trim()) {
      toast.error(`请先输入${type === 'narrative' ? '中文叙述' : '视觉提示'}`);
      return;
    }
    
    if (type === 'narrative') {
      setIsPolishingNarrative(true);
      try {
        const res = await polishText(textToPolish, 'narrative');
        setNarrative(res);
        // Automatically save the polished text
        onUpdateText(res, visualPrompt, false);
        toast.success("叙述文本已优化");
      } catch (error: any) {
        console.error("Polish narrative error:", error);
        toast.error(error?.message || "优化失败，请稍后重试");
      } finally {
        setIsPolishingNarrative(false);
      }
    } else {
      setIsPolishingVisual(true);
      try {
        const res = await polishText(textToPolish, 'visual');
        setVisualPrompt(res);
        // Automatically save the polished text
        onUpdateText(narrative, res, false);
        toast.success("视觉提示已优化");
      } catch (error: any) {
        console.error("Polish visual error:", error);
        toast.error(error?.message || "优化失败，请稍后重试");
      } finally {
        setIsPolishingVisual(false);
      }
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
      <div className="inspector-panel-empty">
        <div>
           <p>No Scene Selected</p>
           <p>Select a scene from the timeline or stage to edit properties.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inspector-panel-container">
      {/* Header */}
      <div className="inspector-panel-header">
         <div>
            <h3 className="inspector-panel-header-title">Properties</h3>
            <p className="inspector-panel-header-id">SCENE ID: {scene.id + 1}</p>
         </div>
         <div className="inspector-panel-header-actions">
            <button onClick={onRetry} className="inspector-panel-header-button" title="Regenerate Image"><RefreshCw /></button>
            <button onClick={() => setIsModifying(!isModifying)} className={`inspector-panel-header-button ${isModifying ? 'active' : ''}`} title="Modify with Prompt"><Wand2 /></button>
         </div>
      </div>

      <div className="inspector-panel-content">
         {/* Modification Mode */}
         {isModifying && (
            <div className="inspector-panel-modify-card">
               <label className="inspector-panel-modify-label">Modify Image</label>
               <textarea 
                  value={modifyFeedback} 
                  onChange={(e) => setModifyFeedback(e.target.value)} 
                  placeholder="Describe changes (e.g. 'Make it darker', 'Zoom in')..." 
                  className="inspector-panel-modify-textarea"
               />
               <div className="inspector-panel-modify-actions">
                  <button onClick={() => setIsModifying(false)} className="inspector-panel-modify-cancel">Cancel</button>
                  <button onClick={handleModifySubmit} className="inspector-panel-modify-apply">Apply</button>
               </div>
            </div>
         )}

         {/* Narrative Edit */}
         <div className="inspector-panel-field">
            <div className="inspector-panel-field-header">
               <label className="inspector-panel-field-label"><Film /> Narrative (Chinese)</label>
               <button onClick={() => handlePolish('narrative')} disabled={isPolishingNarrative} className="inspector-panel-polish-button">{isPolishingNarrative ? <Loader2 className="animate-spin" /> : <Sparkles />} Polish</button>
            </div>
            <textarea 
               value={narrative} 
               onChange={(e) => setNarrative(e.target.value)}
               onBlur={() => handleSaveText(false)}
               className="inspector-panel-textarea inspector-panel-textarea-narrative"
               placeholder="Enter dialogue or scene description..."
            />
         </div>

         {/* Visual Prompt Edit */}
         <div className="inspector-panel-field">
            <div className="inspector-panel-field-header">
               <label className="inspector-panel-field-label"><Maximize2 /> Visual Prompt (English)</label>
               <button onClick={() => handlePolish('visual')} disabled={isPolishingVisual} className="inspector-panel-polish-button">{isPolishingVisual ? <Loader2 className="animate-spin" /> : <Sparkles />} Polish</button>
            </div>
            <textarea 
               value={visualPrompt} 
               onChange={(e) => setVisualPrompt(e.target.value)}
               onBlur={() => handleSaveText(false)}
               className="inspector-panel-textarea inspector-panel-textarea-visual"
               placeholder="Describe the image visuals..."
            />
            <button onClick={() => handleSaveText(true)} className="inspector-panel-update-button">
               <RefreshCw /> Update Text & Redraw Image
            </button>
         </div>

         {/* Tags */}
         <div className="inspector-panel-field">
            <label className="inspector-panel-tags-label">Tags</label>
            <div className="inspector-panel-tags-container">
               {(scene.tags || []).map(tag => (
                  <span key={tag} className="inspector-panel-tag">
                     {tag} <button onClick={() => onUpdateTags((scene.tags || []).filter(t => t !== tag))} className="inspector-panel-tag-remove"><X /></button>
                  </span>
               ))}
               {isAddingTag ? (
                  <form onSubmit={handleAddTag} className="inline-block"><input autoFocus className="inspector-panel-tag-input" value={newTag} onChange={e => setNewTag(e.target.value)} onBlur={() => setIsAddingTag(false)} /></form>
               ) : (
                  <button onClick={() => setIsAddingTag(true)} className="inspector-panel-tag-add-button"><Plus /> Add</button>
               )}
            </div>
         </div>
      </div>

      {/* Footer Media Actions */}
      <div className="inspector-panel-footer">
         <label className="inspector-panel-footer-label">Media Generation</label>
         <div className="inspector-panel-media-grid">
            <button onClick={onGenerateAudio} disabled={scene.isLoadingAudio || !!scene.audioUrl} className={`inspector-panel-media-button inspector-panel-media-button-audio ${scene.audioUrl ? 'ready' : ''}`}>
               {scene.isLoadingAudio ? <Loader2 className="animate-spin" /> : <Volume2 />}
               <span>{scene.audioUrl ? 'Audio Ready' : 'Generate Audio'}</span>
            </button>
            <button 
               onClick={scene.isLoadingVideo ? onCancelVideo : onGenerateVideo} 
               disabled={!!scene.videoUrl || !scene.imageUrl} 
               className={`inspector-panel-media-button inspector-panel-media-button-video ${scene.videoUrl ? 'ready' : ''}`}
            >
               {scene.isLoadingVideo ? <X className="w-4 h-4" /> : <Film />}
               <span>{scene.videoUrl ? 'Video Ready' : scene.isLoadingVideo ? 'Cancel Video' : 'Generate Video'}</span>
            </button>
         </div>
         <button onClick={onGenerateStylePreview} disabled={scene.isLoadingStylePreview || !!scene.stylePreviewUrl} className={`inspector-panel-media-button inspector-panel-media-button-style ${scene.stylePreviewUrl ? 'ready' : ''}`}>
            {scene.isLoadingStylePreview ? <Loader2 className="animate-spin" /> : <Palette />}
            <span>{scene.stylePreviewUrl ? 'Style Preview Ready' : 'Generate Style Preview'}</span>
         </button>
      </div>
    </div>
  );
};

export default InspectorPanel;

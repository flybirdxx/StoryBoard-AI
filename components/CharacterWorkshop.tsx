import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, PenTool, Save, Loader2 } from 'lucide-react';
import { generateCharacterDesign } from '../services/geminiService';
import { Character, AspectRatio, ArtStyle } from '../types';
import { toast } from 'sonner';
import CharacterForm from './CharacterWorkshop/CharacterForm';
import SketchCanvas from './CharacterWorkshop/SketchCanvas';
import CharacterPreview from './CharacterWorkshop/CharacterPreview';
import '../styles/character-workshop.css';

interface CharacterWorkshopProps {
  onClose: () => void;
  onSave: (character: Character) => void;
  initialCharacter?: Character; // For edit mode
}

const CharacterWorkshop: React.FC<CharacterWorkshopProps> = ({ onClose, onSave, initialCharacter }) => {
  const [prompt, setPrompt] = useState(initialCharacter?.description || '');
  const [name, setName] = useState(initialCharacter?.name || '');
  const [generatedImage, setGeneratedImage] = useState<string | null>(initialCharacter?.imageUrl || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [artStyle, setArtStyle] = useState<ArtStyle>('电影写实');
  const [customStyle, setCustomStyle] = useState('');
  const [sketchData, setSketchData] = useState<string | null>(null);
  
  const isEditMode = !!initialCharacter;

  // Update state when initialCharacter changes (for edit mode)
  useEffect(() => {
    if (initialCharacter) {
      setPrompt(initialCharacter.description || '');
      setName(initialCharacter.name || '');
      setGeneratedImage(initialCharacter.imageUrl || null);
    }
  }, [initialCharacter?.id]);
  
  // Abort controller to handle cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleCloseInternal = useCallback(() => {
    // Abort pending request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    onClose();
  }, [onClose]);

  const handleGenerate = useCallback(async () => {
    if (!name || !prompt.trim()) {
      toast.error("请填写角色名称和描述");
      return;
    }

    let styleToUse = artStyle;
    if (artStyle === 'custom') {
      if (!customStyle.trim()) {
        toast.error("请输入自定义风格描述");
        return;
      }
      styleToUse = customStyle.trim();
    }

    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsGenerating(true);
    try {
      const imageUrl = await generateCharacterDesign(
        prompt,
        sketchData,
        styleToUse,
        aspectRatio,
        controller.signal
      );
      
      // Only update if this is still the active request
      if (abortControllerRef.current === controller) {
        setGeneratedImage(imageUrl);
        toast.success("生成成功");
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log("Generation aborted");
        return; // Don't show error toast for cancellation
      }
      console.error("Failed to generate character", error);
      const errorMessage = error?.message || "生成失败，请重试";
      toast.error(errorMessage);
    } finally {
      // Only turn off loading if this is still the active request
      if (abortControllerRef.current === controller) {
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
    }
  }, [name, prompt, artStyle, customStyle, aspectRatio, sketchData]);

  const handleSave = useCallback(() => {
    if (name) {
      // In edit mode, use existing image if no new one generated, otherwise use new image
      const imageToSave = generatedImage || initialCharacter?.imageUrl;
      if (!imageToSave) {
        toast.error("请先生成角色图像");
        return;
      }
      
      onSave({
        id: initialCharacter?.id || Date.now().toString(),
        name,
        description: prompt,
        imageUrl: imageToSave
      });
      toast.success(isEditMode ? "角色已更新" : "角色已保存");
      handleCloseInternal();
    }
  }, [generatedImage, name, prompt, onSave, handleCloseInternal, initialCharacter, isEditMode]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return (
    <div className="character-workshop-overlay" onClick={handleCloseInternal}>
      <div className="character-workshop-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="character-workshop-header">
          <div className="character-workshop-header-left">
            <PenTool size={20} />
            <h2 className="character-workshop-header-title">{isEditMode ? '编辑角色' : '角色工坊'}</h2>
          </div>
          <button onClick={handleCloseInternal} className="character-workshop-header-close">
            <X size={20} />
          </button>
        </div>

        <div className="character-workshop-content">
          {/* Left: Input & Sketch */}
          <div className="character-workshop-left">
            <CharacterForm
              name={name}
              prompt={prompt}
              aspectRatio={aspectRatio}
              artStyle={artStyle}
              customStyle={customStyle}
              onNameChange={setName}
              onPromptChange={setPrompt}
              onAspectRatioChange={setAspectRatio}
              onArtStyleChange={setArtStyle}
              onCustomStyleChange={setCustomStyle}
            />

            <SketchCanvas onSketchChange={setSketchData} />

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !name || !prompt.trim()}
              className="character-workshop-generate-button"
            >
              {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
              生成角色定稿
            </button>
          </div>

          {/* Right: Result */}
          <CharacterPreview
            generatedImage={generatedImage}
            isGenerating={isGenerating}
            aspectRatio={aspectRatio}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </div>
  );
};

export default CharacterWorkshop;

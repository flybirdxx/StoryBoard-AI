import { useState, useCallback } from 'react';
import { useStoryStore } from '../store/useStoryStore';
import { generateStoryScript, analyzeCharacterVisuals, extendStoryScript, optimizeFullStory, generatePlotOptions } from '../services/geminiService';
import { useImageGeneration } from './useImageGeneration';
import { ArtStyle, GenerationMode, AspectRatio, VisualAnchor } from '../types';

export const useStoryGeneration = () => {
  const { setSettings, setDetectedAnchors, setStory, setPlotOptions, story, settings, detectedAnchors } = useStoryStore();
  const { generateImagesForScenes } = useImageGeneration();
  
  const [isScriptLoading, setIsScriptLoading] = useState(false);
  const [isAnalyzingAnchors, setIsAnalyzingAnchors] = useState(false);
  const [isExtendingStory, setIsExtendingStory] = useState(false);
  const [isOptimizingStory, setIsOptimizingStory] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  const startAnalysis = useCallback(async (
    theme: string, 
    images: string[], 
    style: ArtStyle, 
    mode: GenerationMode, 
    ratio: AspectRatio,
    onAnalysisComplete: () => void
  ) => {
    setIsScriptLoading(true);
    setIsAnalyzingAnchors(true);
    
    // Update global settings immediately
    setSettings({
      theme,
      originalImages: images,
      artStyle: style,
      mode,
      aspectRatio: ratio
    });

    try {
      const anchors = await analyzeCharacterVisuals(images, theme);
      setDetectedAnchors(anchors);
      onAnalysisComplete();
    } catch (error) {
      console.error("Analysis failed", error);
      alert("角色分析失败，请重试。");
    } finally {
      setIsAnalyzingAnchors(false);
      // Don't turn off isScriptLoading yet if we proceed to review
    }
  }, []);

  const confirmAndGenerateStory = useCallback(async (finalAnchors: VisualAnchor[]) => {
    setDetectedAnchors(finalAnchors);
    setStory(null);
    setPlotOptions([]);
    // Init history is handled by first setStory with description
    
    // Ensure loading state is on
    setIsScriptLoading(true);

    const currentSettings = useStoryStore.getState().settings;

    try {
      const storyData = await generateStoryScript(
        currentSettings.theme,
        currentSettings.originalImages,
        finalAnchors,
        currentSettings.artStyle,
        currentSettings.mode,
        currentSettings.aspectRatio
      );

      const storyWithMode = { ...storyData, mode: currentSettings.mode };
      setStory(storyWithMode, "故事生成"); // Pushes to history
      setIsScriptLoading(false);

      // Trigger image generation
      await generateImagesForScenes(storyData.scenes, storyData.seed);

    } catch (error) {
      console.error("Story generation error:", error);
      alert("生成故事时出错。");
      setIsScriptLoading(false);
    }
  }, [generateImagesForScenes]);

  const handleExtendStory = useCallback(async (option: string) => {
    const state = useStoryStore.getState();
    if (!state.story || state.settings.originalImages.length === 0) return;

    setIsExtendingStory(true);
    setPlotOptions([]);

    try {
      const lastId = state.story.scenes.length > 0 ? Math.max(...state.story.scenes.map(s => s.id)) + 1 : 0;
      
      const newScenes = await extendStoryScript(
        state.settings.theme,
        state.settings.originalImages,
        state.story.scenes,
        option,
        lastId,
        state.settings.artStyle,
        state.settings.mode,
        state.settings.aspectRatio,
        state.detectedAnchors
      );

      // Update story with new scenes and push history
      const extendedStory = {
        ...state.story,
        scenes: [...state.story.scenes, ...newScenes]
      };
      setStory(extendedStory, "续写故事");

      setIsExtendingStory(false);

      // Generate images for new scenes
      await generateImagesForScenes(newScenes, state.story.seed);

    } catch (error) {
      console.error("Extension failed", error);
      alert("续写故事失败。");
      setIsExtendingStory(false);
    }
  }, [generateImagesForScenes]);

  const handleOptimizeStory = useCallback(async () => {
    const state = useStoryStore.getState();
    if (!state.story) return;

    setIsOptimizingStory(true);
    try {
      const optimizedScenes = await optimizeFullStory(state.story, state.settings.theme, state.settings.artStyle);
      const newState = {
        ...state.story,
        scenes: optimizedScenes
      };
      setStory(newState, "优化全篇脚本");
    } catch (error) {
      console.error("Optimization failed", error);
      alert("优化脚本失败，请重试。");
    } finally {
      setIsOptimizingStory(false);
    }
  }, []);

  const handleGetOptions = useCallback(async () => {
    const state = useStoryStore.getState();
    if (!state.story) return;
    setIsLoadingOptions(true);
    try {
      const options = await generatePlotOptions(state.story.scenes, state.settings.theme);
      setPlotOptions(options);
    } catch (error) {
      console.error("Failed to get options", error);
    } finally {
      setIsLoadingOptions(false);
    }
  }, []);

  return {
    isScriptLoading,
    isAnalyzingAnchors,
    isExtendingStory,
    isOptimizingStory,
    isLoadingOptions,
    startAnalysis,
    confirmAndGenerateStory,
    handleExtendStory,
    handleOptimizeStory,
    handleGetOptions
  };
};
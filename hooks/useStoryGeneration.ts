
import { useState, useCallback, useRef } from 'react';
import { useStoryStore } from '../store/useStoryStore';
import { generateStoryScript, analyzeCharacterVisuals, extendStoryScript, optimizeFullStory, generatePlotOptions } from '../services/geminiService';
import { useImageGeneration } from './useImageGeneration';
import { ArtStyle, GenerationMode, AspectRatio, VisualAnchor } from '../types';
import { toast } from 'sonner';

export const useStoryGeneration = () => {
  const { setSettings, setDetectedAnchors, setStory, setPlotOptions, story, settings, detectedAnchors } = useStoryStore();
  const { generateImagesForScenes } = useImageGeneration();
  
  const [isScriptLoading, setIsScriptLoading] = useState(false);
  const [isAnalyzingAnchors, setIsAnalyzingAnchors] = useState(false);
  const [isExtendingStory, setIsExtendingStory] = useState(false);
  const [isOptimizingStory, setIsOptimizingStory] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  // Controller for aborting AI requests
  const analysisAbortControllerRef = useRef<AbortController | null>(null);

  const cancelGeneration = useCallback(() => {
    if (analysisAbortControllerRef.current) {
      analysisAbortControllerRef.current.abort();
      analysisAbortControllerRef.current = null;
    }
    setIsScriptLoading(false);
    setIsAnalyzingAnchors(false);
    toast.info("任务已终止");
  }, []);

  const startAnalysis = useCallback(async (
    theme: string, 
    images: string[], 
    style: ArtStyle, 
    mode: GenerationMode, 
    ratio: AspectRatio,
    onAnalysisComplete: () => void
  ) => {
    // Cancel any existing request
    if (analysisAbortControllerRef.current) {
      analysisAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    analysisAbortControllerRef.current = controller;

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
      const anchors = await analyzeCharacterVisuals(images, theme, controller.signal);
      
      if (controller.signal.aborted) return;

      setDetectedAnchors(anchors);
      onAnalysisComplete();
    } catch (error: any) {
      if (error.name === 'AbortError') {
         console.log('Analysis aborted');
         return;
      }
      console.error("Analysis failed", error);
      toast.error("角色分析失败，请重试");
    } finally {
      // Only reset these if we haven't been aborted (or if we finished successfully)
      // Note: We keep isScriptLoading true if successful to transition to modal->generation
      if (analysisAbortControllerRef.current === controller) {
         setIsAnalyzingAnchors(false);
      }
    }
  }, []);

  const confirmAndGenerateStory = useCallback(async (finalAnchors: VisualAnchor[]) => {
    // Re-initialize controller for the script generation phase
    if (analysisAbortControllerRef.current) analysisAbortControllerRef.current.abort();
    const controller = new AbortController();
    analysisAbortControllerRef.current = controller;

    setDetectedAnchors(finalAnchors);
    setStory(null);
    setPlotOptions([]);
    
    setIsScriptLoading(true);

    const currentSettings = useStoryStore.getState().settings;

    try {
      const storyData = await generateStoryScript(
        currentSettings.theme,
        currentSettings.originalImages,
        finalAnchors,
        currentSettings.artStyle,
        currentSettings.mode,
        currentSettings.aspectRatio,
        controller.signal
      );
      
      if (controller.signal.aborted) return;

      const storyWithMode = { ...storyData, mode: currentSettings.mode };
      setStory(storyWithMode, "故事生成"); 
      setIsScriptLoading(false);
      toast.success("剧本已生成，正在绘制分镜...");

      // Trigger image generation
      await generateImagesForScenes(storyData.scenes, storyData.seed);

    } catch (error: any) {
      if (error.name === 'AbortError') {
         console.log('Script generation aborted');
         return;
      }
      console.error("Story generation error:", error);
      toast.error("生成故事时出错");
      setIsScriptLoading(false);
    } finally {
       if (analysisAbortControllerRef.current === controller) {
          analysisAbortControllerRef.current = null;
       }
    }
  }, [generateImagesForScenes]);

  const handleExtendStory = useCallback(async (option: string) => {
    const state = useStoryStore.getState();
    if (!state.story || state.settings.originalImages.length === 0) return;

    setIsExtendingStory(true);
    setPlotOptions([]); // Clear options immediately so UI switches to loading state

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
      toast.success("故事已续写，正在绘制新场景...");

      // Generate images for new scenes
      await generateImagesForScenes(newScenes, state.story.seed);

    } catch (error) {
      console.error("Extension failed", error);
      toast.error("续写故事失败");
      setIsExtendingStory(false);
    }
  }, [generateImagesForScenes]);

  const handleOptimizeStory = useCallback(async () => {
    const state = useStoryStore.getState();
    if (!state.story) {
      toast.error("没有可优化的故事");
      return;
    }

    // 确认操作
    const confirmed = window.confirm(
      "优化脚本将更新所有场景的文本描述（中文叙述和英文视觉提示），但不会重新生成图片。\n\n是否继续？"
    );
    if (!confirmed) return;

    setIsOptimizingStory(true);
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      // 设置超时（60秒）
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("优化超时，请检查网络连接后重试"));
        }, 60000);
      });

      // 执行优化
      const optimizePromise = optimizeFullStory(
        state.story, 
        state.settings.theme, 
        state.settings.artStyle
      );

      const optimizedScenes = await Promise.race([optimizePromise, timeoutPromise]);

      // 验证返回结果
      if (!optimizedScenes || !Array.isArray(optimizedScenes) || optimizedScenes.length === 0) {
        throw new Error("优化返回的数据格式不正确");
      }

      // 验证场景数量是否匹配
      if (optimizedScenes.length !== state.story.scenes.length) {
        console.warn(`场景数量不匹配: 原始 ${state.story.scenes.length}, 优化后 ${optimizedScenes.length}`);
        toast.warning("优化后的场景数量与原始不匹配，已使用部分结果");
      }

      const newState = {
        ...state.story,
        scenes: optimizedScenes
      };
      setStory(newState, "优化全篇脚本");
      toast.success("剧本优化完成！文本已更新，如需更新图片请手动重新生成");
    } catch (error: any) {
      console.error("Optimization failed", error);
      
      // 清除超时
      if (timeoutId) clearTimeout(timeoutId);

      // 根据错误类型显示不同的提示
      if (error.name === 'AbortError') {
        toast.info("优化已取消");
      } else if (error.message?.includes("超时")) {
        toast.error(error.message);
      } else if (error.message?.includes("API Key")) {
        toast.error("API 密钥未设置，请在设置中配置");
      } else if (error.message?.includes("Safety") || error.message?.includes("Blocked")) {
        toast.error("内容被安全过滤器阻止，请调整内容后重试");
      } else {
        toast.error(`优化脚本失败: ${error.message || "未知错误"}，请重试`);
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setIsOptimizingStory(false);
    }
  }, [setStory]);

  const handleGetOptions = useCallback(async () => {
    const state = useStoryStore.getState();
    if (!state.story) return;
    setIsLoadingOptions(true);
    try {
      const options = await generatePlotOptions(state.story.scenes, state.settings.theme);
      if (options && options.length > 0) {
        setPlotOptions(options);
      } else {
        toast.error("未能生成有效的剧情选项，请重试");
      }
    } catch (error) {
      console.error("Failed to get options", error);
      toast.error("获取剧情选项失败");
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
    cancelGeneration, // Exposed cancel function
    handleExtendStory,
    handleOptimizeStory,
    handleGetOptions
  };
};

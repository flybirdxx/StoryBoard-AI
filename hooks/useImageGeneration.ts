import { useCallback } from 'react';
import { useStoryStore } from '../store/useStoryStore';
import { generateSceneImage } from '../services/geminiService';
import { Scene, VisualAnchor } from '../types';
import pLimit from 'p-limit';
import { toast } from 'sonner';

export const useImageGeneration = () => {
  const { story, settings, detectedAnchors, updateScene, setStory } = useStoryStore();

  const generateImagesForScenes = useCallback(async (
    scenes: Scene[],
    seed?: number
  ) => {
    // Set loading state for all target scenes
    setStory({
      ...useStoryStore.getState().story!, // get fresh state
      scenes: useStoryStore.getState().story!.scenes.map(s => 
        scenes.find(target => target.id === s.id) ? { ...s, isLoadingImage: true } : s
      )
    });

    const currentSettings = useStoryStore.getState().settings;
    const currentStory = useStoryStore.getState().story;
    const currentAnchors = useStoryStore.getState().detectedAnchors;
    
    // Use p-limit to control concurrency (3 concurrent requests)
    const limit = pLimit(3);

    const promises = scenes.map(scene => limit(async () => {
      try {
        const sceneAnchors = currentAnchors.filter(a => scene.characters?.includes(a.name));
        
        const imageUrl = await generateSceneImage(
          scene.visual_prompt,
          currentSettings.originalImages,
          currentSettings.artStyle,
          currentSettings.aspectRatio,
          currentSettings.mode,
          currentStory?.worldAnchor,
          sceneAnchors,
          undefined,
          seed
        );

        updateScene(scene.id, { isLoadingImage: false, imageUrl }, false); 
      } catch (error) {
        console.error(`Failed to generate image for scene ${scene.id}`, error);
        updateScene(scene.id, { isLoadingImage: false }, false);
        toast.error(`场景 ${scene.id + 1} 图片生成失败`);
      }
    }));

    await Promise.all(promises);
  }, []);

  const handleRetryImage = useCallback(async (sceneId: number) => {
    const state = useStoryStore.getState();
    const scene = state.story?.scenes.find(s => s.id === sceneId);
    if (!scene || !state.story) return;

    updateScene(sceneId, { isLoadingImage: true, imageUrl: undefined }, false);

    try {
      const newSeed = Math.floor(Math.random() * 2147483647);
      const sceneAnchors = state.detectedAnchors.filter(a => scene.characters?.includes(a.name));

      const imageUrl = await generateSceneImage(
        scene.visual_prompt,
        state.settings.originalImages,
        state.settings.artStyle,
        state.settings.aspectRatio,
        state.settings.mode,
        state.story.worldAnchor,
        sceneAnchors,
        undefined,
        newSeed
      );

      updateScene(sceneId, { isLoadingImage: false, imageUrl }, false);
      toast.success(`场景 ${sceneId + 1} 重绘完成`);
    } catch (error) {
      updateScene(sceneId, { isLoadingImage: false }, false);
      toast.error(`场景 ${sceneId + 1} 重绘失败`);
    }
  }, []);

  const handleModifyImage = useCallback(async (sceneId: number, feedback: string) => {
    const state = useStoryStore.getState();
    const scene = state.story?.scenes.find(s => s.id === sceneId);
    if (!scene || !state.story) return;

    updateScene(sceneId, { isLoadingImage: true }, false);

    try {
      const sceneAnchors = state.detectedAnchors.filter(a => scene.characters?.includes(a.name));

      const imageUrl = await generateSceneImage(
        scene.visual_prompt,
        state.settings.originalImages,
        state.settings.artStyle,
        state.settings.aspectRatio,
        state.settings.mode,
        state.story.worldAnchor,
        sceneAnchors,
        feedback,
        state.story.seed
      );

      // This is a significant user action, push to history
      useStoryStore.getState().updateScene(sceneId, { isLoadingImage: false, imageUrl }, true);
      toast.success(`场景 ${sceneId + 1} 修改完成`);
    } catch (error) {
      console.error("Modification failed", error);
      updateScene(sceneId, { isLoadingImage: false }, false);
      toast.error("修改图片失败，请重试");
    }
  }, []);

  return {
    generateImagesForScenes,
    handleRetryImage,
    handleModifyImage
  };
};
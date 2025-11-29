import { useCallback } from 'react';
import { useStoryStore } from '../store/useStoryStore';
import { generateSpeech, generateSceneVideo } from '../services/geminiService';

export const useMediaGeneration = () => {
  const { updateScene, story } = useStoryStore();

  const handleGenerateAudio = useCallback(async (sceneId: number, text: string) => {
    updateScene(sceneId, { isLoadingAudio: true }, false);

    try {
      const audioUrl = await generateSpeech(text);
      updateScene(sceneId, { isLoadingAudio: false, audioUrl }, false);
    } catch (error) {
      console.error("Audio generation failed", error);
      alert("生成语音失败。");
      updateScene(sceneId, { isLoadingAudio: false }, false);
    }
  }, []);

  const handleGenerateVideo = useCallback(async (sceneId: number) => {
    const state = useStoryStore.getState();
    const scene = state.story?.scenes.find(s => s.id === sceneId);
    if (!scene || !scene.imageUrl) return;

    updateScene(sceneId, { isLoadingVideo: true }, false);

    try {
      const { url, cost } = await generateSceneVideo(scene.imageUrl, scene.visual_prompt);
      updateScene(sceneId, { 
        isLoadingVideo: false, 
        videoUrl: url,
        videoCost: cost 
      }, false);
    } catch (error) {
      console.error("Video generation failed", error);
      alert("生成视频失败 (Veo)。请重试。");
      updateScene(sceneId, { isLoadingVideo: false }, false);
    }
  }, []);

  return {
    handleGenerateAudio,
    handleGenerateVideo
  };
};
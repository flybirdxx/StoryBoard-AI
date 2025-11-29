import { useCallback } from 'react';
import { useStoryStore } from '../store/useStoryStore';
import { generateSpeech, generateSceneVideo } from '../services/geminiService';
import { toast } from 'sonner';

export const useMediaGeneration = () => {
  const { updateScene, story } = useStoryStore();

  const handleGenerateAudio = useCallback(async (sceneId: number, text: string) => {
    updateScene(sceneId, { isLoadingAudio: true }, false);

    try {
      const audioUrl = await generateSpeech(text);
      updateScene(sceneId, { isLoadingAudio: false, audioUrl }, false);
      toast.success(`场景 ${sceneId + 1} 配音生成成功`);
    } catch (error) {
      console.error("Audio generation failed", error);
      toast.error("生成语音失败");
      updateScene(sceneId, { isLoadingAudio: false }, false);
    }
  }, []);

  const handleGenerateVideo = useCallback(async (sceneId: number) => {
    const state = useStoryStore.getState();
    const scene = state.story?.scenes.find(s => s.id === sceneId);
    if (!scene || !scene.imageUrl) return;

    updateScene(sceneId, { isLoadingVideo: true }, false);
    toast.info("正在使用 Veo 生成视频，这可能需要几分钟...");

    try {
      const { url, cost } = await generateSceneVideo(scene.imageUrl, scene.visual_prompt);
      updateScene(sceneId, { 
        isLoadingVideo: false, 
        videoUrl: url,
        videoCost: cost 
      }, false);
      toast.success(`场景 ${sceneId + 1} 视频生成完成`);
    } catch (error) {
      console.error("Video generation failed", error);
      toast.error("生成视频失败 (Veo)。请重试。");
      updateScene(sceneId, { isLoadingVideo: false }, false);
    }
  }, []);

  return {
    handleGenerateAudio,
    handleGenerateVideo
  };
};
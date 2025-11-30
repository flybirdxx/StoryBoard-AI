import { useCallback, useRef } from 'react';
import { useStoryStore } from '../store/useStoryStore';
import { generateSpeech, generateSceneVideo } from '../services/geminiService';
import { toast } from 'sonner';

export const useMediaGeneration = () => {
  const { updateScene, story } = useStoryStore();
  
  // 存储每个场景的视频生成 AbortController
  const videoAbortControllersRef = useRef<Map<number, AbortController>>(new Map());

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

    // 如果已有正在进行的任务，先取消它
    const existingController = videoAbortControllersRef.current.get(sceneId);
    if (existingController) {
      existingController.abort();
      videoAbortControllersRef.current.delete(sceneId);
    }

    // 创建新的 AbortController
    const controller = new AbortController();
    videoAbortControllersRef.current.set(sceneId, controller);

    updateScene(sceneId, { isLoadingVideo: true }, false);
    toast.info("正在使用第三方 VEO API 生成视频，这可能需要几分钟...");

    try {
      const { url, cost } = await generateSceneVideo(
        scene.imageUrl, 
        scene.visual_prompt,
        scene.narrative,
        scene.characters,
        'veo3.1-components', 
        controller.signal
      );
      
      // 检查是否已取消（可能在请求完成后但在状态更新前被取消）
      if (controller.signal.aborted) {
        return;
      }

      updateScene(sceneId, { 
        isLoadingVideo: false, 
        videoUrl: url,
        videoCost: cost 
      }, false);
      toast.success(`场景 ${sceneId + 1} 视频生成完成`);
    } catch (error: any) {
      // 如果是取消操作，不显示错误
      if (error.name === 'AbortError') {
        console.log('视频生成已取消');
        updateScene(sceneId, { isLoadingVideo: false }, false);
        toast.info('视频生成已取消');
        return;
      }
      console.error("Video generation failed", error);
      toast.error("生成视频失败。请重试。");
      updateScene(sceneId, { isLoadingVideo: false }, false);
    } finally {
      // 清理 AbortController
      if (videoAbortControllersRef.current.get(sceneId) === controller) {
        videoAbortControllersRef.current.delete(sceneId);
      }
    }
  }, []);

  const handleCancelVideo = useCallback((sceneId: number) => {
    const controller = videoAbortControllersRef.current.get(sceneId);
    if (controller) {
      controller.abort();
      videoAbortControllersRef.current.delete(sceneId);
      updateScene(sceneId, { isLoadingVideo: false }, false);
      toast.info('视频生成已取消');
    }
  }, []);

  return {
    handleGenerateAudio,
    handleGenerateVideo,
    handleCancelVideo
  };
};
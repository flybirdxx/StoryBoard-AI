import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { analyzeScriptDeeply, generateStoryboard, generateShotImage } from '../services/geminiService';
import { GenerationStatus } from '../types';

export const useProjectActions = () => {
  const navigate = useNavigate();
  const store = useAppStore();

  const handleAnalyzeScript = async () => {
    store.setIsAnalyzing(true);
    const analysis = await analyzeScriptDeeply(store.scriptContent);
    store.setIsAnalyzing(false);

    if (analysis) {
        store.setScriptContent(analysis.expandedScript);
        store.setDetectedCharacters(analysis.characters || []);
        navigate('/characters');
    } else {
        alert("Script analysis failed. Please try again.");
    }
  };

  const handleGenerateStoryboardImages = async () => {
    store.setGenerationStatus(GenerationStatus.LOADING);
    navigate('/storyboard');

    const result = await generateStoryboard(store.scriptContent);
    
    if (result && result.length > 0) {
      const initializedScenes = result.map(scene => ({
        ...scene,
        shots: scene.shots.map(shot => ({ 
            ...shot, 
            isLoading: true, 
            duration: shot.duration || 4,
            transition: 'CUT' as const
        }))
      }));
      store.setScenes(initializedScenes);
      store.setGenerationStatus(GenerationStatus.SUCCESS);

      // Generate Images in parallel
      for (const scene of result) {
        for (const shot of scene.shots) {
          generateImageForShot(scene.id, shot.id, shot.visualPrompt);
        }
      }
    } else {
      store.setGenerationStatus(GenerationStatus.ERROR);
      setTimeout(() => store.setGenerationStatus(GenerationStatus.IDLE), 2000);
    }
  };

  const generateImageForShot = async (sceneId: number, shotId: number, prompt: string) => {
    store.updateSceneShot(sceneId, shotId, { isLoading: true });

    const imageUrl = await generateShotImage(prompt, store.selectedStyle);

    store.updateSceneShot(sceneId, shotId, { 
        isLoading: false, 
        imageUrl: imageUrl || undefined 
    });
  };

  const handleBatchGenerateImages = () => {
    store.scenes.forEach(scene => {
      scene.shots.forEach(shot => {
        if (!shot.imageUrl && !shot.isLoading) {
          generateImageForShot(scene.id, shot.id, shot.visualPrompt);
        }
      });
    });
  };

  const handleRegenerateShot = (sceneId: number, shotId: number, prompt: string) => {
    generateImageForShot(sceneId, shotId, prompt);
  };

  return {
    handleAnalyzeScript,
    handleGenerateStoryboardImages,
    generateImageForShot,
    handleBatchGenerateImages,
    handleRegenerateShot
  };
};
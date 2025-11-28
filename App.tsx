import React, { useState, useEffect, useCallback, useRef } from 'react';
import { checkApiKey, generateStoryScript, generateSceneImage, generatePlotOptions, extendStoryScript, generateSpeech, polishText, generateSceneVideo, optimizeFullStory, analyzeCharacterVisuals } from './services/geminiService';
import { storageService } from './services/storageService';
import { exportScenes } from './services/exportService';
import StoryForm from './components/StoryForm';
import Storyboard from './components/Storyboard';
import ApiKeySelector from './components/ApiKeySelector';
import AnchorReviewModal from './components/AnchorReviewModal';
import Sidebar, { ViewType } from './components/Sidebar';
import CharacterLibrary from './components/CharacterLibrary';
import { StoryData, Scene, PlotOption, ArtStyle, ExportConfig, GenerationMode, AspectRatio, Character, VisualAnchor } from './types';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Navigation State
  const [currentView, setCurrentView] = useState<ViewType>('create');

  const [story, setStory] = useState<StoryData | null>(null);
  const [isScriptLoading, setIsScriptLoading] = useState(false);
  const [originalImages, setOriginalImages] = useState<string[]>([]);
  const [theme, setTheme] = useState<string>("");
  const [currentStyle, setCurrentStyle] = useState<ArtStyle>('电影写实');
  const [currentMode, setCurrentMode] = useState<GenerationMode>('storyboard');
  const [currentRatio, setCurrentRatio] = useState<AspectRatio>('16:9');
  
  // Anchor Review Logic
  const [showAnchorModal, setShowAnchorModal] = useState(false);
  const [detectedAnchors, setDetectedAnchors] = useState<VisualAnchor[]>([]);
  const [isAnalyzingAnchors, setIsAnalyzingAnchors] = useState(false);

  // Custom Character State
  const [savedCharacters, setSavedCharacters] = useState<Character[]>([]);

  // Branching states
  const [plotOptions, setPlotOptions] = useState<PlotOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isExtendingStory, setIsExtendingStory] = useState(false);
  const [isOptimizingStory, setIsOptimizingStory] = useState(false);

  // History State
  const [history, setHistory] = useState<StoryData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Auto-Save State
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    verifyKey();
    loadDraft();
  }, []);

  useEffect(() => {
    if (story) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      setIsSaving(true);
      saveTimeoutRef.current = setTimeout(async () => {
         await storageService.saveDraft(story);
         setIsSaving(false);
      }, 2000); 
    }
  }, [story]);

  // When story is created/loaded, ensure we can access editor
  useEffect(() => {
    if (story && currentView === 'create') {
      setCurrentView('editor');
    }
  }, [story]);

  const loadDraft = async () => {
    const draft = await storageService.loadDraft();
    if (draft) {
      setStory(draft);
      setHistory([draft]);
      setHistoryIndex(0);
      setTheme(draft.title); 
      setCurrentMode(draft.mode);
      if (draft.visualAnchors) {
         setDetectedAnchors(draft.visualAnchors);
      }
      setCurrentView('editor');
    }
  };

  const verifyKey = async () => {
    const keyExists = await checkApiKey();
    setHasKey(keyExists);
  };

  const handleKeySelected = async () => {
    await verifyKey();
    setShowSettings(false);
  };

  const handleSaveCharacter = (char: Character) => {
    setSavedCharacters(prev => [...prev, char]);
  };

  const pushToHistory = useCallback((newStoryState: StoryData, actionType: string) => {
    setHistory(prev => {
       const newHistory = prev.slice(0, historyIndex + 1);
       const entry = { ...newStoryState, lastModified: Date.now(), actionType };
       return [...newHistory, entry];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const handleUndo = () => {
    if (historyIndex > 0) {
       const prevIndex = historyIndex - 1;
       setHistoryIndex(prevIndex);
       setStory(history[prevIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
       const nextIndex = historyIndex + 1;
       setHistoryIndex(nextIndex);
       setStory(history[nextIndex]);
    }
  };

  const handleJumpToHistory = (index: number) => {
     setHistoryIndex(index);
     setStory(history[index]);
  };

  const generateImagesForScenes = useCallback(async (
      scenes: Scene[], 
      characterImages: string[], 
      style: ArtStyle, 
      mode: GenerationMode, 
      ratio: AspectRatio, 
      seed?: number,
      worldAnchor?: string,
      allAnchors?: VisualAnchor[]
  ) => {
    
    const getSceneAnchors = (sceneChars: string[] | undefined) => {
       if (!sceneChars || !allAnchors) return undefined;
       return allAnchors.filter(a => sceneChars.includes(a.name));
    };

    setStory(prev => prev ? {
        ...prev,
        scenes: prev.scenes.map(s => scenes.find(target => target.id === s.id) ? { ...s, isLoadingImage: true } : s)
      } : null
    );

    const BATCH_SIZE = 2; 
    
    for (let i = 0; i < scenes.length; i += BATCH_SIZE) {
        const batch = scenes.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (scene) => {
            try {
                const sceneAnchors = getSceneAnchors(scene.characters);
                
                const imageUrl = await generateSceneImage(
                    scene.visual_prompt, 
                    characterImages, 
                    style, 
                    ratio, 
                    mode, 
                    worldAnchor, 
                    sceneAnchors, 
                    undefined, 
                    seed
                );

                setStory(prev => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    scenes: prev.scenes.map(s => s.id === scene.id ? { ...s, isLoadingImage: false, imageUrl } : s)
                  };
                });
            } catch (error) {
                console.error(`Failed to generate image for scene ${scene.id}`, error);
                setStory(prev => prev ? {
                     ...prev,
                     scenes: prev.scenes.map(s => s.id === scene.id ? { ...s, isLoadingImage: false } : s)
                   } : null
                );
            }
        }));
    }
  }, []);

  const handleGenerateStoryRequest = async (inputTheme: string, images: string[], style: ArtStyle, mode: GenerationMode, ratio: AspectRatio) => {
    setIsScriptLoading(true);
    setIsAnalyzingAnchors(true);
    setOriginalImages(images);
    setTheme(inputTheme);
    setCurrentStyle(style);
    setCurrentMode(mode);
    setCurrentRatio(ratio);
    
    try {
      const anchors = await analyzeCharacterVisuals(images, inputTheme);
      setDetectedAnchors(anchors);
      setIsAnalyzingAnchors(false);
      setShowAnchorModal(true);
    } catch (error) {
      console.error("Analysis failed", error);
      setIsAnalyzingAnchors(false);
      setIsScriptLoading(false);
      alert("角色分析失败，请重试。");
    }
  };

  const handleConfirmAnchors = async (finalAnchors: VisualAnchor[]) => {
    setShowAnchorModal(false);
    setDetectedAnchors(finalAnchors);
    setStory(null);
    setPlotOptions([]);
    setHistory([]);
    setHistoryIndex(-1);
    setIsScriptLoading(true);
    setCurrentView('editor'); // Switch to editor view to show loading state if preferred, or keep on create until done.

    try {
      const storyData = await generateStoryScript(theme, originalImages, finalAnchors, currentStyle, currentMode, currentRatio);
      
      const storyWithMode = { ...storyData, mode: currentMode };
      setStory(storyWithMode);
      pushToHistory(storyWithMode, "故事生成");
      setIsScriptLoading(false);
      setCurrentView('editor'); // Force switch to editor

      await generateImagesForScenes(
         storyData.scenes, 
         originalImages, 
         currentStyle, 
         currentMode, 
         currentRatio, 
         storyData.seed,
         storyData.worldAnchor,
         finalAnchors
      );

    } catch (error) {
      console.error("Error in story flow:", error);
      alert("生成故事时出错。");
      setIsScriptLoading(false);
      setCurrentView('create'); // Switch back on failure
    }
  };

  const handleRetryImage = async (sceneId: number) => {
     if (!story || originalImages.length === 0) return;
     const scene = story.scenes.find(s => s.id === sceneId);
     if (!scene) return;

     setStory(prev => prev ? {
        ...prev,
        scenes: prev.scenes.map(s => s.id === sceneId ? { ...s, isLoadingImage: true, imageUrl: undefined } : s)
     } : null);

     try {
        const newSeed = Math.floor(Math.random() * 2147483647);
        const sceneAnchors = story.visualAnchors?.filter(a => scene.characters?.includes(a.name));
        
        const imageUrl = await generateSceneImage(
            scene.visual_prompt, 
            originalImages, 
            currentStyle, 
            currentRatio, 
            currentMode, 
            story.worldAnchor,
            sceneAnchors,
            undefined, 
            newSeed
        );
        
        setStory(prev => prev ? {
            ...prev,
            scenes: prev.scenes.map(s => s.id === sceneId ? { ...s, isLoadingImage: false, imageUrl } : s)
        } : null);
     } catch (error) {
        setStory(prev => prev ? {
            ...prev,
            scenes: prev.scenes.map(s => s.id === sceneId ? { ...s, isLoadingImage: false } : s)
        } : null);
     }
  };

  const handleModifyImage = async (sceneId: number, feedback: string) => {
    if (!story || originalImages.length === 0) return;
    const scene = story.scenes.find(s => s.id === sceneId);
    if (!scene) return;

    setStory(prev => prev ? {
       ...prev,
       scenes: prev.scenes.map(s => s.id === sceneId ? { ...s, isLoadingImage: true } : s) 
    } : null);

    try {
       const sceneAnchors = story.visualAnchors?.filter(a => scene.characters?.includes(a.name));

       const imageUrl = await generateSceneImage(
           scene.visual_prompt, 
           originalImages, 
           currentStyle, 
           currentRatio, 
           currentMode, 
           story.worldAnchor,
           sceneAnchors,
           feedback, 
           story.seed
       );

       setStory(prev => {
           if (!prev) return null;
           const newState = {
               ...prev,
               scenes: prev.scenes.map(s => s.id === sceneId ? { ...s, isLoadingImage: false, imageUrl } : s)
           };
           pushToHistory(newState, `修改场景 ${sceneId + 1}`);
           return newState;
       });
    } catch (error) {
       console.error("Modification failed", error);
       setStory(prev => prev ? {
           ...prev,
           scenes: prev.scenes.map(s => s.id === sceneId ? { ...s, isLoadingImage: false } : s)
       } : null);
       alert("修改图片失败，请重试。");
    }
  };

  const handleUpdateScene = async (sceneId: number, narrative: string, visualPrompt: string, shouldRegenerate: boolean) => {
    if (!story) return;
    
    const newState = {
      ...story,
      scenes: story.scenes.map(s => s.id === sceneId ? { ...s, narrative, visual_prompt: visualPrompt } : s)
    };
    
    setStory(newState);
    if (!shouldRegenerate) {
       pushToHistory(newState, `更新场景 ${sceneId + 1} 文本`);
    }

    if (shouldRegenerate && originalImages.length > 0) {
      setStory(prev => prev ? {
        ...prev,
        scenes: prev.scenes.map(s => s.id === sceneId ? { ...s, isLoadingImage: true } : s)
      } : null);

      try {
        const scene = story.scenes.find(s => s.id === sceneId);
        const sceneAnchors = story.visualAnchors?.filter(a => scene?.characters?.includes(a.name));

        const imageUrl = await generateSceneImage(
            visualPrompt, 
            originalImages, 
            currentStyle, 
            currentRatio, 
            currentMode, 
            story.worldAnchor,
            sceneAnchors,
            undefined, 
            story.seed
        );
        
        setStory(prev => {
            if (!prev) return null;
            const updatedState = {
                ...prev,
                scenes: prev.scenes.map(s => s.id === sceneId ? { ...s, isLoadingImage: false, imageUrl } : s)
            };
            pushToHistory(updatedState, `重绘场景 ${sceneId + 1}`);
            return updatedState;
        });
      } catch (error) {
         setStory(prev => prev ? {
            ...prev,
            scenes: prev.scenes.map(s => s.id === sceneId ? { ...s, isLoadingImage: false } : s)
        } : null);
      }
    }
  };

  const handleUpdateTags = (sceneId: number, tags: string[]) => {
    if (!story) return;
    const newState = {
      ...story,
      scenes: story.scenes.map(s => s.id === sceneId ? { ...s, tags } : s)
    };
    setStory(newState);
  };

  const handleGetOptions = async () => {
    if (!story) return;
    setIsLoadingOptions(true);
    try {
      const options = await generatePlotOptions(story.scenes, theme);
      setPlotOptions(options);
    } catch (error) {
      console.error("Failed to get options", error);
      alert("无法生成剧情选项，请重试。");
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const handleExtendStory = async (option: string) => {
    if (!story || originalImages.length === 0) return;
    setIsExtendingStory(true);
    setPlotOptions([]);

    try {
      const lastId = story.scenes.length > 0 ? Math.max(...story.scenes.map(s => s.id)) + 1 : 0;
      const newScenes = await extendStoryScript(theme, originalImages, story.scenes, option, lastId, currentStyle, currentMode, currentRatio, story.visualAnchors);
      
      setStory(prev => {
          if (!prev) return null;
          const extendedState = {
             ...prev,
             scenes: [...prev.scenes, ...newScenes]
          };
          pushToHistory(extendedState, "续写故事");
          return extendedState;
      });

      setIsExtendingStory(false);
      await generateImagesForScenes(
         newScenes, 
         originalImages, 
         currentStyle, 
         currentMode, 
         currentRatio, 
         story.seed,
         story.worldAnchor,
         story.visualAnchors
      );

    } catch (error) {
      console.error("Failed to extend story", error);
      setIsExtendingStory(false);
      alert("续写故事失败。");
    }
  };

  const handleOptimizeStory = async () => {
    if (!story) return;
    setIsOptimizingStory(true);
    try {
      const optimizedScenes = await optimizeFullStory(story, theme, currentStyle);
      const newState = {
        ...story,
        scenes: optimizedScenes
      };
      setStory(newState);
      pushToHistory(newState, "优化全篇脚本");
    } catch (error) {
      console.error("Failed to optimize story", error);
      alert("优化脚本失败，请重试。");
    } finally {
      setIsOptimizingStory(false);
    }
  };

  const handleGenerateAudio = async (sceneId: number, text: string) => {
    if (!story) return;
    setStory(prev => prev ? {
      ...prev,
      scenes: prev.scenes.map(s => s.id === sceneId ? { ...s, isLoadingAudio: true } : s)
    } : null);

    try {
      const audioUrl = await generateSpeech(text);
      setStory(prev => prev ? {
        ...prev,
        scenes: prev.scenes.map(s => s.id === sceneId ? { ...s, isLoadingAudio: false, audioUrl } : s)
      } : null);
    } catch (error) {
      console.error("Failed to generate audio", error);
      alert("生成语音失败。");
      setStory(prev => prev ? {
        ...prev,
        scenes: prev.scenes.map(s => s.id === sceneId ? { ...s, isLoadingAudio: false } : s)
      } : null);
    }
  };

  const handleGenerateVideo = async (sceneId: number) => {
    if (!story) return;
    const scene = story.scenes.find(s => s.id === sceneId);
    if (!scene || !scene.imageUrl) return;

    setStory(prev => prev ? {
      ...prev,
      scenes: prev.scenes.map(s => s.id === sceneId ? { ...s, isLoadingVideo: true } : s)
    } : null);

    try {
      const { url, cost } = await generateSceneVideo(scene.imageUrl, scene.visual_prompt);
      setStory(prev => prev ? {
        ...prev,
        scenes: prev.scenes.map(s => s.id === sceneId ? { 
          ...s, 
          isLoadingVideo: false, 
          videoUrl: url,
          videoCost: cost 
        } : s)
      } : null);
    } catch (error) {
      console.error("Failed to generate video", error);
      alert("生成视频失败 (Veo)。请重试。");
      setStory(prev => prev ? {
        ...prev,
        scenes: prev.scenes.map(s => s.id === sceneId ? { ...s, isLoadingVideo: false } : s)
      } : null);
    }
  };

  const handlePolishText = async (text: string, type: 'narrative' | 'visual'): Promise<string> => {
    try {
      return await polishText(text, type);
    } catch (error) {
      return text;
    }
  };

  const handleExport = (selectedSceneIds: number[], config: ExportConfig) => {
    if (!story) return;
    const scenesToExport = story.scenes.filter(s => selectedSceneIds.includes(s.id));
    exportScenes(scenesToExport, config, story.title, story.mode);
  };

  return (
    <div className="flex h-screen bg-[#0f111a] text-white font-sans overflow-hidden selection:bg-indigo-500/30">
      {(!hasKey || showSettings) && (
        <ApiKeySelector 
          onKeySelected={handleKeySelected} 
          onClose={hasKey ? () => setShowSettings(false) : undefined}
        />
      )}

      {showAnchorModal && (
        <AnchorReviewModal 
          anchors={detectedAnchors}
          referenceImages={originalImages}
          onConfirm={handleConfirmAnchors}
          onCancel={() => { setShowAnchorModal(false); setIsScriptLoading(false); }}
        />
      )}

      {/* LEFT SIDEBAR */}
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        hasActiveStory={!!story}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto relative custom-scrollbar bg-[#0f111a]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-slate-950/40 to-slate-950 pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none mix-blend-overlay"></div>

        <div className="min-h-full relative z-10">
          
          {/* VIEW: CREATE PROJECT */}
          {currentView === 'create' && (
            <StoryForm 
              onSubmit={handleGenerateStoryRequest} 
              isGenerating={isScriptLoading || isAnalyzingAnchors} 
              savedCharacters={savedCharacters}
              onSaveCharacter={handleSaveCharacter}
            />
          )}

          {/* VIEW: CHARACTER LIBRARY */}
          {currentView === 'characters' && (
             <CharacterLibrary 
                characters={savedCharacters} 
                onSaveCharacter={handleSaveCharacter} 
             />
          )}

          {/* VIEW: EDITOR / STORYBOARD */}
          {currentView === 'editor' && story && (
            <div className="p-8 md:p-12">
              <Storyboard 
                story={story} 
                onRetryImage={handleRetryImage}
                onModifyImage={handleModifyImage}
                onUpdateScene={handleUpdateScene}
                onUpdateTags={handleUpdateTags}
                onRequestOptions={handleGetOptions}
                onSelectOption={handleExtendStory}
                onGenerateAudio={handleGenerateAudio}
                onGenerateVideo={handleGenerateVideo}
                onPolishText={handlePolishText}
                onExport={handleExport}
                onOptimizeStory={handleOptimizeStory}
                plotOptions={plotOptions}
                isLoadingOptions={isLoadingOptions}
                isExtendingStory={isExtendingStory}
                isOptimizingStory={isOptimizingStory}
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
                onUndo={handleUndo}
                onRedo={handleRedo}
                historyList={history}
                currentHistoryIndex={historyIndex}
                onJumpToHistory={handleJumpToHistory}
              />
            </div>
          )}

          {/* EMPTY EDITOR STATE */}
          {currentView === 'editor' && !story && (
             <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <Loader2 className="w-10 h-10 mb-4 opacity-20" />
                <p>暂无活跃项目。请前往创作中心生成新故事。</p>
                <button onClick={() => setCurrentView('create')} className="mt-4 text-indigo-400 hover:text-white underline text-sm">去创作</button>
             </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
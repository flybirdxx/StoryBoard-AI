import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { AssetPanel } from './components/AssetPanel';
import { ShotCard } from './components/ShotCard';
import { ScriptEditor } from './components/ScriptEditor';
import { CharacterLibrary } from './components/CharacterLibrary';
import { TimelineView } from './components/TimelineView';
import { generateStoryboard, generateShotImage, analyzeScriptDeeply } from './services/geminiService';
import { NavItem, GenerationStatus, Scene, Asset, Shot, DetectedCharacter, ImageStyle } from './types';
import { 
  Check, 
  ChevronRight, 
  LayoutGrid, 
  Monitor, 
  Box, 
  Share2,
  Sparkles,
  Loader2,
  ChevronLeft,
  PenTool,
  X,
  Key,
  Images
} from 'lucide-react';

const INITIAL_ASSETS: Asset[] = [];

const DEFAULT_SCENE: Scene = {
  id: 1,
  title: "内景. 博物馆 - 白天",
  description: "一个现代博物馆展厅，柔和的灯光照射着玻璃展柜，里面陈列着远古人类使用的石器工具和形状各异的粗糙盐晶石。整体氛围宁静、历史感厚重，无人物。",
  shots: []
};

export default function App() {
  const [activeItem, setActiveItem] = useState<NavItem>(NavItem.SCRIPT);
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [isApiKeyValid, setIsApiKeyValid] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);
  
  // Data State
  const [scenes, setScenes] = useState<Scene[]>([]); // Initialize empty
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [scriptContent, setScriptContent] = useState("一个关于古代文明如何在海边发现盐的故事。场景开始于海浪拍打岩石，阳光暴晒下的白色结晶，原始人好奇地触碰和品尝。");
  const [detectedCharacters, setDetectedCharacters] = useState<DetectedCharacter[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<ImageStyle>('Cinematic');
  
  // UI State
  const [isInputVisible, setIsInputVisible] = useState(false);
  const [isAnalyzingScript, setIsAnalyzingScript] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      try {
        if ((window as any).aistudio) {
          const hasKey = await (window as any).aistudio.hasSelectedApiKey();
          setIsApiKeyValid(hasKey);
        } else {
          setIsApiKeyValid(true);
        }
      } catch (e) {
        console.error("Failed to check API key", e);
        setIsApiKeyValid(false);
      } finally {
        setIsCheckingKey(false);
      }
    };
    checkKey();
  }, []);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const generateImageForShot = async (sceneId: number, shotId: number, prompt: string) => {
    setScenes(prev => prev.map(s => {
      if (s.id !== sceneId) return s;
      return {
        ...s,
        shots: s.shots.map(sh => sh.id === shotId ? { ...sh, isLoading: true } : sh)
      };
    }));

    // Append character context if available
    let enhancedPrompt = prompt;
    const characters = assets.filter(a => a.type === 'Character');
    // Simple logic: add references to all characters. 
    // Ideally, we check which character is in the shot, but for now we provide the style context.
    // Also append the selected global style
    
    const imageUrl = await generateShotImage(enhancedPrompt, selectedStyle);

    setScenes(prev => prev.map(s => {
      if (s.id !== sceneId) return s;
      return {
        ...s,
        shots: s.shots.map(sh => sh.id === shotId ? { 
          ...sh, 
          isLoading: false,
          imageUrl: imageUrl || sh.imageUrl 
        } : sh)
      };
    }));
  };

  // Step 1: Analyze Script & Extract Characters
  const handleAnalyzeScript = async () => {
    setIsAnalyzingScript(true);
    const analysis = await analyzeScriptDeeply(scriptContent);
    setIsAnalyzingScript(false);

    if (analysis) {
        // Update script with better version
        setScriptContent(analysis.expandedScript);
        // Set detected characters for consistency check, safeguard against undefined
        setDetectedCharacters(analysis.characters || []);
        // Move to next step
        setActiveItem(NavItem.CHARACTERS);
    } else {
        alert("Script analysis failed. Please try again.");
    }
  };

  // Step 2: Generate Storyboard (Final)
  const handleGenerateStoryboardImages = async () => {
    setStatus(GenerationStatus.LOADING);
    setActiveItem(NavItem.STORYBOARD);

    const result = await generateStoryboard(scriptContent);
    
    if (result && result.length > 0) {
      const initializedScenes = result.map(scene => ({
        ...scene,
        shots: scene.shots.map(shot => ({ 
            ...shot, 
            isLoading: true, 
            duration: shot.duration || 4,
            transition: 'CUT' 
        }))
      }));
      setScenes(initializedScenes);
      setStatus(GenerationStatus.SUCCESS);
      setIsInputVisible(false);

      // Generate Images in parallel
      for (const scene of result) {
        for (const shot of scene.shots) {
          generateImageForShot(scene.id, shot.id, shot.visualPrompt);
        }
      }
    } else {
      setStatus(GenerationStatus.ERROR);
      setTimeout(() => setStatus(GenerationStatus.IDLE), 2000);
    }
  };

  const handleBatchGenerateImages = () => {
    scenes.forEach(scene => {
      scene.shots.forEach(shot => {
        // Only generate if there is no image and it's not currently loading
        if (!shot.imageUrl && !shot.isLoading) {
          generateImageForShot(scene.id, shot.id, shot.visualPrompt);
        }
      });
    });
  };

  const handleRegenerateShot = (sceneId: number, shot: Shot) => {
    generateImageForShot(sceneId, shot.id, shot.visualPrompt);
  };

  const handleUpdateShot = (sceneId: number, shotId: number, updates: Partial<Shot>) => {
    setScenes(prev => prev.map(s => {
      if (s.id !== sceneId) return s;
      return {
        ...s,
        shots: s.shots.map(sh => sh.id === shotId ? { ...sh, ...updates } : sh)
      };
    }));
  };

  const handleAddCharacter = (asset: Asset) => {
    setAssets([...assets, asset]);
  };

  const handleRemoveCharacter = (id: string) => {
    setAssets(assets.filter(a => a.id !== id));
  };

  const handleNextStep = () => {
      if (activeItem === NavItem.SCRIPT) {
          // If manually clicking next without analysis (optional logic, but forcing analysis is safer)
          handleAnalyzeScript();
      }
      else if (activeItem === NavItem.CHARACTERS) handleGenerateStoryboardImages();
      else if (activeItem === NavItem.STORYBOARD) setActiveItem(NavItem.TIMELINE);
  };

  const handleSelectKey = async () => {
    if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setIsApiKeyValid(true);
    }
  };

  const handleMaximizeImage = (imageUrl: string) => {
    setPreviewImage(imageUrl);
  };

  // ---------------------------------------------------------------------------
  // View Routing
  // ---------------------------------------------------------------------------
  
  if (isCheckingKey) {
    return <div className="h-screen w-screen bg-app-bg flex items-center justify-center text-gray-500">Checking permissions...</div>;
  }

  if (!isApiKeyValid) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0E14]">
        <div className="bg-[#151923] p-8 rounded-xl border border-gray-700 max-w-md text-center shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-app-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Key className="text-app-accent" size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-4">需要连接 API 密钥</h2>
          <p className="text-gray-400 mb-6 text-sm leading-relaxed">
            本应用使用 <strong>Gemini 3 Pro</strong> 高级模型进行剧本分析和图像生成。请连接您的 Google Cloud 项目 API 密钥以继续。
            <br/>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline text-xs mt-3 inline-block">
              查看计费和配额说明
            </a>
          </p>
          <button
            onClick={handleSelectKey}
            className="bg-app-accent hover:bg-app-accentHover text-white px-8 py-3 rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg shadow-purple-900/30 w-full flex items-center justify-center gap-2"
          >
            连接 API 密钥 <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  }
  
  // Calculate ungenerated shots count
  const ungeneratedCount = scenes.reduce((acc, s) => acc + s.shots.filter(sh => !sh.imageUrl && !sh.isLoading).length, 0);

  const renderContent = () => {
    switch (activeItem) {
      case NavItem.SCRIPT:
        return (
            <ScriptEditor 
                content={scriptContent} 
                setContent={setScriptContent} 
                onAnalyze={handleAnalyzeScript}
                selectedStyle={selectedStyle}
                onStyleChange={setSelectedStyle}
                isAnalyzing={isAnalyzingScript}
            />
        );
      case NavItem.CHARACTERS:
        return (
            <CharacterLibrary 
                characters={assets.filter(a => a.type === 'Character')}
                detectedCharacters={detectedCharacters}
                onAddCharacter={handleAddCharacter}
                onRemoveCharacter={handleRemoveCharacter}
                onNext={handleGenerateStoryboardImages}
                selectedStyle={selectedStyle}
                onStyleChange={setSelectedStyle}
            />
        );
      case NavItem.TIMELINE:
        return <TimelineView scenes={scenes} />;
      case NavItem.STORYBOARD:
        return (
          <>
          {/* Asset Panel (Left) */}
          <AssetPanel assets={assets} />

          {/* Storyboard Canvas (Right) */}
          <main className="flex-1 overflow-y-auto p-8 relative scroll-smooth">
            
            {/* Toolbar */}
            <div className="flex flex-col gap-4 mb-8 sticky top-0 z-20 bg-app-bg/95 py-4 -mt-4 border-b border-app-border/50 backdrop-blur">
               <div className="flex items-center justify-between">
                 <div>
                   <h1 className="text-xl font-bold text-white flex items-center gap-3">
                     <LayoutGrid size={24} className="text-cyan-400" />
                     故事板
                     <button 
                      onClick={() => setIsInputVisible(!isInputVisible)}
                      className="ml-2 p-1.5 rounded-md hover:bg-gray-800 text-gray-500 hover:text-cyan-400 transition-colors"
                      title="编辑剧本上下文"
                     >
                       <PenTool size={14} />
                     </button>
                   </h1>
                   <p className="text-xs text-gray-500 mt-1 ml-9">
                     {scenes.length} 场景中的 {scenes.reduce((acc, s) => acc + s.shots.length, 0)} 个镜头
                   </p>
                 </div>

                 <div className="flex items-center gap-3">
                   
                   <button
                    onClick={handleBatchGenerateImages}
                    disabled={ungeneratedCount === 0}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     <Images size={16} />
                     批量生成图片 {ungeneratedCount > 0 && `(${ungeneratedCount})`}
                   </button>

                   <button 
                    onClick={handleGenerateStoryboardImages}
                    disabled={status === GenerationStatus.LOADING}
                    className="bg-app-accent hover:bg-app-accentHover text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-900/20 active:scale-95"
                   >
                     {status === GenerationStatus.LOADING ? (
                       <Loader2 size={16} className="animate-spin" />
                     ) : (
                       <Sparkles size={16} />
                     )}
                     {status === GenerationStatus.LOADING ? '正在构思...' : '重构故事板'}
                   </button>
                   
                   <div className="h-9 px-3 rounded-lg border border-app-border bg-app-card flex items-center gap-2 text-sm text-gray-300">
                      <Monitor size={16} />
                      <span className="hidden sm:inline">16:9</span>
                   </div>
                   
                   <button className="h-9 w-9 rounded-lg border border-app-border bg-app-card flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                      <Box size={18} />
                   </button>
                   <button className="h-9 w-9 rounded-lg border border-app-border bg-app-card flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                      <Share2 size={18} />
                   </button>
                 </div>
               </div>
               
               {/* Script Context Input (Floating) */}
               {isInputVisible && (
                 <div className="bg-app-card border border-app-border rounded-lg p-4 animate-in slide-in-from-top-2 fade-in">
                    <div className="flex justify-between items-center mb-2">
                       <label className="text-xs font-semibold text-gray-400">当前参考剧本</label>
                       <button onClick={() => setIsInputVisible(false)}><X size={14} className="text-gray-500 hover:text-white"/></button>
                    </div>
                    <textarea 
                      className="w-full bg-app-bg border border-app-border rounded-md p-3 text-sm text-gray-200 focus:outline-none focus:border-app-accent focus:ring-1 focus:ring-app-accent resize-y min-h-[80px]"
                      value={scriptContent}
                      onChange={(e) => setScriptContent(e.target.value)}
                    />
                 </div>
               )}
            </div>

            {/* Scenes List */}
            <div className="space-y-12 pb-24">
              {scenes.length > 0 ? scenes.map((scene) => (
                <div key={scene.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex flex-col md:flex-row gap-6 mb-6">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-3 mb-2">
                         <span className="px-2 py-1 bg-purple-900/40 border border-purple-500/20 rounded text-xs font-bold text-purple-300">
                           场景 {scene.id}
                         </span>
                         <h2 className="text-lg font-bold text-white tracking-wide">
                           {scene.title}
                         </h2>
                      </div>
                      
                      <div className="pl-3 border-l-2 border-gray-700">
                         <p className="text-sm text-gray-400 italic">
                           "{scene.description}"
                         </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                    {scene.shots.map((shot) => (
                      <ShotCard 
                        key={shot.id} 
                        shot={shot} 
                        onRegenerate={(s) => handleRegenerateShot(scene.id, s)}
                        onUpdate={(id, updates) => handleUpdateShot(scene.id, id, updates)}
                        onMaximize={handleMaximizeImage}
                      />
                    ))}
                  </div>

                </div>
              )) : (
                <div className="flex flex-col items-center justify-center h-96 text-gray-500">
                   <LayoutGrid size={48} className="opacity-20 mb-4" />
                   <p className="text-sm">暂无故事板，请从第一步开始创作</p>
                </div>
              )}
            </div>

          </main>
          </>
        );
      default:
        return (
          <div className="flex-1 flex items-center justify-center text-gray-500">
             模块开发中...
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen w-screen bg-app-bg text-app-text overflow-hidden font-sans">
      
      {/* Sidebar - Global Navigation */}
      <Sidebar activeItem={activeItem} setActiveItem={setActiveItem} />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Stepper Bar - Workflow Progress */}
        <header className="h-16 border-b border-app-border flex items-center justify-between px-8 bg-app-bg/50 backdrop-blur-sm z-10 shrink-0">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center cursor-pointer hover:bg-gray-700 transition-colors">
               <ChevronLeft className="rotate-180 text-gray-400" size={18} />
             </div>
          </div>

          <div className="flex items-center relative w-1/2 justify-between">
             {/* Step 1: Script */}
             <div className={`flex flex-col items-center gap-1 z-10 transition-opacity cursor-pointer ${activeItem === NavItem.SCRIPT ? 'opacity-100' : 'opacity-70'}`} onClick={() => setActiveItem(NavItem.SCRIPT)}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${activeItem === NavItem.SCRIPT ? 'bg-cyan-500 text-black ring-4 ring-cyan-900/40' : (activeItem === NavItem.CHARACTERS || activeItem === NavItem.STORYBOARD || activeItem === NavItem.TIMELINE) ? 'bg-emerald-500 text-black' : 'bg-gray-700'}`}>
                  {activeItem !== NavItem.SCRIPT && (activeItem === NavItem.CHARACTERS || activeItem === NavItem.STORYBOARD || activeItem === NavItem.TIMELINE) ? <Check size={14} strokeWidth={3} /> : '1'}
                </div>
                <span className={`text-[10px] font-medium hidden md:block ${activeItem === NavItem.SCRIPT ? 'text-cyan-400' : (activeItem === NavItem.CHARACTERS || activeItem === NavItem.STORYBOARD || activeItem === NavItem.TIMELINE) ? 'text-emerald-500' : 'text-gray-600'}`}>剧本拆解</span>
             </div>
             
             {/* Line */}
             <div className="h-[2px] bg-emerald-900/30 absolute top-3 left-8 right-8 z-0">
               <div className={`h-full bg-emerald-500 transition-all duration-500`} style={{ width: activeItem === NavItem.TIMELINE ? '100%' : activeItem === NavItem.STORYBOARD ? '66%' : activeItem === NavItem.CHARACTERS ? '33%' : '0%' }}></div>
             </div>

             {/* Step 2: Characters */}
             <div className={`flex flex-col items-center gap-1 z-10 transition-opacity cursor-pointer ${activeItem === NavItem.CHARACTERS ? 'opacity-100' : 'opacity-70'}`} onClick={() => setActiveItem(NavItem.CHARACTERS)}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${activeItem === NavItem.CHARACTERS ? 'bg-cyan-500 text-black ring-4 ring-cyan-900/40' : (activeItem === NavItem.STORYBOARD || activeItem === NavItem.TIMELINE) ? 'bg-emerald-500 text-black' : 'bg-app-card border border-gray-600 text-gray-500'}`}>
                   {(activeItem === NavItem.STORYBOARD || activeItem === NavItem.TIMELINE) ? <Check size={14} strokeWidth={3} /> : '2'}
                </div>
                <span className={`text-[10px] font-medium hidden md:block ${activeItem === NavItem.CHARACTERS ? 'text-cyan-400' : (activeItem === NavItem.STORYBOARD || activeItem === NavItem.TIMELINE) ? 'text-emerald-500' : 'text-gray-600'}`}>角色一致性</span>
             </div>

             {/* Step 3: Storyboard */}
             <div className={`flex flex-col items-center gap-1 z-10 transition-opacity cursor-pointer ${activeItem === NavItem.STORYBOARD ? 'opacity-100' : 'opacity-70'}`} onClick={() => setActiveItem(NavItem.STORYBOARD)}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${activeItem === NavItem.STORYBOARD ? 'bg-cyan-500 ring-4 ring-cyan-900/40 text-black' : (activeItem === NavItem.TIMELINE) ? 'bg-emerald-500 text-black' : 'bg-app-card border border-gray-600 text-gray-500'}`}>
                   {activeItem === NavItem.TIMELINE ? <Check size={14} strokeWidth={3} /> : '3'}
                </div>
                <span className={`text-[10px] font-medium hidden md:block ${activeItem === NavItem.STORYBOARD ? 'text-cyan-400' : activeItem === NavItem.TIMELINE ? 'text-emerald-500' : 'text-gray-600'}`}>生成故事板</span>
             </div>

             {/* Step 4: Video */}
             <div className={`flex flex-col items-center gap-1 z-10 transition-opacity cursor-pointer ${activeItem === NavItem.TIMELINE ? 'opacity-100' : 'opacity-70'}`} onClick={() => setActiveItem(NavItem.TIMELINE)}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${activeItem === NavItem.TIMELINE ? 'bg-cyan-500 ring-4 ring-cyan-900/40 text-black' : 'bg-app-card border border-gray-600 text-gray-500'}`}>
                   4
                </div>
                <span className={`text-[10px] font-medium hidden md:block ${activeItem === NavItem.TIMELINE ? 'text-cyan-400' : 'text-gray-600'}`}>视频制作</span>
             </div>
          </div>

          <div className="w-8"></div> {/* Spacer */}
        </header>

        {/* Main Content Area (Dynamic based on route) */}
        <div className="flex-1 flex overflow-hidden relative">
          {renderContent()}
        </div>

        {/* Footer Action - Context Aware */}
        {activeItem === NavItem.SCRIPT && (
            <div className="fixed bottom-6 right-8 z-30">
            <button 
                onClick={handleAnalyzeScript}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white pl-6 pr-4 py-3 rounded-full shadow-2xl shadow-purple-900/40 font-semibold flex items-center gap-2 transition-all transform hover:-translate-y-1 active:translate-y-0"
            >
                {isAnalyzingScript ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                下一步: 分析与角色
            </button>
            </div>
        )}
        
        {/* We remove the generic footer for Characters and Storyboard because they have their own specific actions now */}

      </div>
      
      {/* Lightbox Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <button 
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            onClick={() => setPreviewImage(null)}
          >
            <X size={24} />
          </button>
          <img 
            src={previewImage} 
            alt="Full size preview" 
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-50 duration-300"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}

    </div>
  );
}
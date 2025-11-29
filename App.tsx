
import React, { useState, useEffect, useRef } from 'react';
import { checkApiKey } from './services/geminiService';
import { exportScenes } from './services/exportService';
import StoryForm from './components/StoryForm';
import Storyboard from './components/Storyboard';
import ApiKeySelector from './components/ApiKeySelector';
import AnchorReviewModal from './components/AnchorReviewModal';
import Sidebar, { ViewType } from './components/Sidebar';
import CharacterLibrary from './components/CharacterLibrary';
import ProjectList from './components/ProjectList';
import { Loader2 } from 'lucide-react';
import { Toaster, toast } from 'sonner';

// State & Hooks
import { useStoryStore } from './store/useStoryStore';
import { useStoryGeneration } from './hooks/useStoryGeneration';

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('create');
  
  // Anchor Review Logic Local State (Modal visibility)
  const [showAnchorModal, setShowAnchorModal] = useState(false);

  // Global Store Access
  const { 
    story, 
    detectedAnchors,
    settings: { originalImages },
    saveCurrentStory,
    createNewStory
  } = useStoryStore();

  // Custom Hooks
  const { 
    isScriptLoading, 
    isAnalyzingAnchors, 
    startAnalysis, 
    confirmAndGenerateStory 
  } = useStoryGeneration();

  const verifyKey = async () => {
    const keyExists = await checkApiKey();
    setHasKey(keyExists);
  };

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    verifyKey();
    // We no longer auto-load a draft on mount to allow user to choose or create new
    // But we could load the list in the background if needed.
    // Ensure we start fresh for creation
    createNewStory();
  }, []);

  // Auto-Save Effect (Debounced)
  useEffect(() => {
    if (story) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
         await saveCurrentStory();
         // Optional: toast.success('已自动保存'); // Too noisy if frequent
      }, 2000); 
    }
  }, [story]);

  // Navigate to editor when story is ready (e.g. after generation)
  useEffect(() => {
    // Only redirect if we are in 'create' view and a story appears (generation finished)
    if (story && currentView === 'create') {
      setCurrentView('editor');
    }
  }, [story]);

  const handleKeySelected = async () => {
    await verifyKey();
    setShowSettings(false);
    toast.success('API Key 已配置');
  };

  const handleGenerateRequest = (theme: string, images: string[], style: any, mode: any, ratio: any) => {
    startAnalysis(theme, images, style, mode, ratio, () => {
      setShowAnchorModal(true);
    });
  };

  const handleConfirmAnchors = (anchors: any[]) => {
    setShowAnchorModal(false);
    setCurrentView('editor'); // Move to editor to show loading
    confirmAndGenerateStory(anchors);
  };

  const handleExport = (selectedSceneIds: number[], config: any) => {
    if (!story) return;
    const scenesToExport = story.scenes.filter(s => selectedSceneIds.includes(s.id));
    toast.promise(
      exportScenes(scenesToExport, config, story.title, story.mode),
      {
        loading: '正在导出...',
        success: '导出成功！',
        error: '导出失败'
      }
    );
  };

  return (
    <div className="flex h-screen bg-[#0f111a] text-white font-sans overflow-hidden selection:bg-indigo-500/30">
      <Toaster theme="dark" position="top-center" richColors />
      
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
          onCancel={() => { setShowAnchorModal(false); }}
        />
      )}

      {/* LEFT SIDEBAR */}
      <Sidebar 
        currentView={currentView} 
        onChangeView={(view) => {
           if (view === 'create') createNewStory(); // Reset when going to create
           setCurrentView(view);
        }} 
        hasActiveStory={!!story}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto relative custom-scrollbar bg-[#0f111a]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-slate-950/40 to-slate-950 pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none mix-blend-overlay"></div>

        <div className="h-full relative z-10 flex flex-col">
          
          {/* VIEW: CREATE PROJECT */}
          {currentView === 'create' && (
            <StoryForm 
              onSubmit={handleGenerateRequest} 
              isGenerating={isScriptLoading || isAnalyzingAnchors} 
            />
          )}

          {/* VIEW: PROJECTS LIST */}
          {currentView === 'projects' && (
             <ProjectList onOpenProject={() => setCurrentView('editor')} />
          )}

          {/* VIEW: CHARACTER LIBRARY */}
          {currentView === 'characters' && (
             <CharacterLibrary />
          )}

          {/* VIEW: EDITOR / STORYBOARD */}
          {currentView === 'editor' && story && (
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Storyboard container handles its own scroll internally when needed (list view) or naturally */}
              <div className="h-full w-full">
                 <Storyboard onExport={handleExport} />
              </div>
            </div>
          )}

          {/* EMPTY EDITOR STATE */}
          {currentView === 'editor' && !story && !isScriptLoading && (
             <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <Loader2 className="w-10 h-10 mb-4 opacity-20" />
                <p>暂无活跃项目。请前往创作中心生成新故事或打开已有项目。</p>
                <div className="flex gap-4 mt-4">
                   <button onClick={() => setCurrentView('create')} className="text-indigo-400 hover:text-white underline text-sm">去创作</button>
                   <button onClick={() => setCurrentView('projects')} className="text-indigo-400 hover:text-white underline text-sm">打开项目</button>
                </div>
             </div>
          )}
          
          {/* Global Loading Overlay if needed for script generation when in editor view */}
          {currentView === 'editor' && isScriptLoading && !story && (
              <div className="h-full flex flex-col items-center justify-center">
                 <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                 <h3 className="text-xl font-bold text-white">正在创作故事...</h3>
                 <p className="text-slate-400 mt-2">Gemini 3 Pro 正在编写剧本并设计分镜</p>
              </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;

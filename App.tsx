
import React, { useState, useEffect, useRef, lazy, Suspense, useMemo } from 'react';
import { checkApiKey } from './services/geminiService';
import { exportScenes } from './services/exportService';
import { Loader2 } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { useTheme } from './hooks/useTheme';
import './styles/app.css';

// 代码分割：懒加载大型组件
const StoryForm = lazy(() => import('./components/StoryForm'));
const Storyboard = lazy(() => import('./components/Storyboard'));
const ApiKeySelector = lazy(() => import('./components/ApiKeySelector'));
const AnchorReviewModal = lazy(() => import('./components/AnchorReviewModal'));
const Sidebar = lazy(() => import('./components/Sidebar'));
const CharacterLibrary = lazy(() => import('./components/CharacterLibrary'));
const ProjectList = lazy(() => import('./components/ProjectList'));

// 导入 ViewType
import type { ViewType } from './types/view';

// State & Hooks
import { useStoryStore } from './store/useStoryStore';
import { useStoryGeneration } from './hooks/useStoryGeneration';

// 加载中占位符组件
const LoadingFallback: React.FC = () => (
  <div className="loading-fallback">
    <Loader2 className="loading-fallback-spinner" />
  </div>
);

const App: React.FC = () => {
  console.log('App component rendering...');
  const { theme, toggleTheme } = useTheme();
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
    confirmAndGenerateStory,
    cancelGeneration 
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
    <div className="app-container">
      <Toaster theme={theme === 'dark' ? 'dark' : 'light'} position="top-center" richColors />
      
      {(!hasKey || showSettings) && (
        <Suspense fallback={<LoadingFallback />}>
          <ApiKeySelector 
            onKeySelected={handleKeySelected} 
            onClose={hasKey ? () => setShowSettings(false) : undefined}
          />
        </Suspense>
      )}

      {showAnchorModal && (
        <Suspense fallback={<LoadingFallback />}>
          <AnchorReviewModal 
            anchors={detectedAnchors}
            referenceImages={originalImages}
            onConfirm={handleConfirmAnchors}
            onCancel={() => { 
               setShowAnchorModal(false);
               cancelGeneration(); // Ensure we abort the process if user cancels at this stage
            }}
          />
        </Suspense>
      )}

      {/* LEFT SIDEBAR */}
      <Suspense fallback={<LoadingFallback />}>
        <Sidebar 
          currentView={currentView} 
          onChangeView={(view) => {
             // Only reset story if we are going to create view AND not currently generating.
             // This protects the 'settings' in store which are needed during generation.
             if (view === 'create' && !isScriptLoading) createNewStory(); 
             setCurrentView(view);
          }} 
          // Allow navigation to editor if story exists OR if it is currently generating
          hasActiveStory={!!story || isScriptLoading}
          onOpenSettings={() => setShowSettings(true)}
        />
      </Suspense>

      {/* MAIN CONTENT AREA */}
      <main className="app-main custom-scrollbar">
        <div className="app-content">
          
          {/* VIEW: CREATE PROJECT */}
          {currentView === 'create' && (
            <Suspense fallback={<LoadingFallback />}>
              <StoryForm 
                onSubmit={handleGenerateRequest} 
                isGenerating={isScriptLoading || isAnalyzingAnchors} 
                onCancel={cancelGeneration}
              />
            </Suspense>
          )}

          {/* VIEW: PROJECTS LIST */}
          {currentView === 'projects' && (
            <Suspense fallback={<LoadingFallback />}>
              <ProjectList onOpenProject={() => setCurrentView('editor')} />
            </Suspense>
          )}

          {/* VIEW: CHARACTER LIBRARY */}
          {currentView === 'characters' && (
            <Suspense fallback={<LoadingFallback />}>
              <CharacterLibrary />
            </Suspense>
          )}

          {/* VIEW: EDITOR / STORYBOARD */}
          {currentView === 'editor' && story && (
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Storyboard container handles its own scroll internally when needed (list view) or naturally */}
              <div className="h-full w-full">
                <Suspense fallback={<LoadingFallback />}>
                  <Storyboard onExport={handleExport} />
                </Suspense>
              </div>
            </div>
          )}

          {/* EMPTY EDITOR STATE */}
          {currentView === 'editor' && !story && !isScriptLoading && (
             <div className="empty-state">
                <Loader2 className="empty-state-icon" />
                <p className="empty-state-text">暂无活跃项目。请前往创作中心生成新故事或打开已有项目。</p>
                <div className="empty-state-actions">
                   <button onClick={() => setCurrentView('create')} className="empty-state-link">去创作</button>
                   <button onClick={() => setCurrentView('projects')} className="empty-state-link">打开项目</button>
                </div>
             </div>
          )}
          
          {/* Global Loading Overlay if needed for script generation when in editor view */}
          {currentView === 'editor' && isScriptLoading && !story && (
              <div className="global-loading">
                 <Loader2 className="global-loading-spinner" />
                 <h3 className="global-loading-title">正在创作故事...</h3>
                 <p className="global-loading-description">Gemini 3 Pro 正在编写剧本并设计分镜</p>
                 <button onClick={cancelGeneration} className="global-loading-cancel">
                    取消任务
                 </button>
              </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;

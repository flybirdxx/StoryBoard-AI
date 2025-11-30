
import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { ExportConfig } from '../types';
import { Loader2, ArrowRight, Download, CheckSquare, Square, PlayCircle, Sparkles, RotateCcw, RotateCw, History, Type, Plus, Edit, MoreHorizontal, Settings } from 'lucide-react';
import FullScreenViewer from './FullScreenViewer';
import { SceneThumbnail, SceneStage, ComicPanel } from './SceneCard';
import InspectorPanel from './InspectorPanel';
import HistoryTimeline from './HistoryTimeline';
import ExportDialog from './ExportDialog';
import '../styles/storyboard.css';

// Store & Hooks
import { useStoryStore } from '../store/useStoryStore';
import { useStoryGeneration } from '../hooks/useStoryGeneration';
import { useImageGeneration } from '../hooks/useImageGeneration';
import { useMediaGeneration } from '../hooks/useMediaGeneration';
import { generateStylePreview } from '../services/geminiService';
import { ART_STYLE_OPTIONS } from '../constants';
import { toast } from 'sonner';

interface StoryboardProps {
  onExport: (selectedSceneIds: number[], config: ExportConfig) => void;
}

const Storyboard: React.FC<StoryboardProps> = ({ onExport }) => {
  // Store
  const { 
    story, 
    settings,
    history, 
    historyIndex, 
    plotOptions, 
    setPlotOptions,
    undo, 
    redo, 
    jumpToHistory,
    updateScene
  } = useStoryStore();

  // Logic Hooks
  const { 
    isExtendingStory, 
    isOptimizingStory, 
    isLoadingOptions,
    handleGetOptions, 
    handleExtendStory,
    handleOptimizeStory
  } = useStoryGeneration();

  const { handleRetryImage, handleModifyImage } = useImageGeneration();
  const { handleGenerateAudio, handleGenerateVideo, handleCancelVideo } = useMediaGeneration();

  // Local State
  const [activeSceneId, setActiveSceneId] = useState<number>(0);
  const [selectedScenes, setSelectedScenes] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'zip' | 'long-image'>('pdf');
  const [exportWithText, setExportWithText] = useState(false);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [showHistoryTimeline, setShowHistoryTimeline] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Initialize active scene
  useEffect(() => {
    if (story && story.scenes.length > 0 && !story.scenes.find(s => s.id === activeSceneId)) {
       setActiveSceneId(story.scenes[0].id);
    }
  }, [story?.scenes.length]);

  if (!story) return null;

  // -- Handlers --

  const toggleSelectScene = useCallback((id: number) => {
    setSelectedScenes(prev => {
      if (prev.includes(id)) {
        return prev.filter(sid => sid !== id);
    } else {
        return [...prev, id];
    }
    });
  }, []);

  const handleExportClick = useCallback(() => {
    // Open export dialog for advanced configuration
    setShowExportDialog(true);
  }, []);

  const handleQuickExport = useCallback(() => {
    // Quick export with current simple settings
    const sceneIds = selectedScenes.length > 0 ? selectedScenes : story.scenes.map(s => s.id);
    onExport(sceneIds, {
      format: exportFormat,
      resolution: 'original',
      withText: exportWithText
    });
  }, [selectedScenes, story.scenes, exportFormat, exportWithText, onExport]);

  const handleExportWithConfig = useCallback((config: ExportConfig) => {
    const sceneIds = selectedScenes.length > 0 ? selectedScenes : story.scenes.map(s => s.id);
    onExport(sceneIds, config);
  }, [selectedScenes, story.scenes, onExport]);

  const handleUpdateSceneText = useCallback(async (narrative: string, visualPrompt: string, shouldRegenerate: boolean) => {
      const scene = story.scenes.find(s => s.id === activeSceneId);
      const sceneIndex = story.scenes.findIndex(s => s.id === activeSceneId) + 1;
      
      let actionDesc = "编辑场景文本";
      if (narrative !== scene?.narrative && visualPrompt !== scene?.visual_prompt) {
        actionDesc = "编辑场景文本";
      } else if (narrative !== scene?.narrative) {
        actionDesc = "更新中文叙述";
      } else if (visualPrompt !== scene?.visual_prompt) {
        actionDesc = "更新视觉提示";
      }
      
      updateScene(activeSceneId, { narrative, visual_prompt: visualPrompt }, true, actionDesc);
      if (shouldRegenerate) handleRetryImage(activeSceneId);
  }, [activeSceneId, updateScene, handleRetryImage, story.scenes]);

  const handleUpdateTags = useCallback((tags: string[]) => {
      const sceneIndex = story.scenes.findIndex(s => s.id === activeSceneId) + 1;
      updateScene(activeSceneId, { tags }, true, "更新标签");
  }, [activeSceneId, updateScene, story.scenes]);
  
  const handleGenerateStylePreview = async () => {
      updateScene(activeSceneId, { isLoadingStylePreview: true }, false);
      try {
          const currentStyle = settings.artStyle;
          const styleOption = ART_STYLE_OPTIONS.find(opt => opt.id === currentStyle);
          const styleDesc = styleOption ? styleOption.desc : currentStyle;
          const scene = story.scenes.find(s => s.id === activeSceneId);
          if (!scene) return;
          const previewUrl = await generateStylePreview(currentStyle, `${styleDesc}. Scene context: ${scene.visual_prompt}`);
          updateScene(activeSceneId, { isLoadingStylePreview: false, stylePreviewUrl: previewUrl }, false);
          toast.success("Style preview generated");
      } catch (error) {
          toast.error("Failed to generate style preview");
          updateScene(activeSceneId, { isLoadingStylePreview: false }, false);
      }
  };

  const activeScene = useMemo(() => 
    story.scenes.find(s => s.id === activeSceneId),
    [story.scenes, activeSceneId]
  );
  const isComicMode = useMemo(() => story.mode === 'comic', [story.mode]);
  const canUndo = useMemo(() => historyIndex > 0, [historyIndex]);
  const canRedo = useMemo(() => historyIndex < history.length - 1, [historyIndex, history.length]);

  // -- Renders --

  const renderPlotOptionsOverlay = () => {
     // In Comic Mode, we show controls inline at the bottom, so hide overlay
     if (isComicMode) return null;

     if (isExtendingStory) {
       return (
         <div className="storyboard-plot-loading">
           <div className="storyboard-plot-loading-content">
             <Loader2 className="storyboard-plot-loading-spinner" />
             <p className="storyboard-plot-loading-text">Dreaming new scenes...</p>
           </div>
         </div>
       );
     }
     
     if (plotOptions.length > 0) {
        return (
           <div className="storyboard-plot-overlay">
              <div className="storyboard-plot-content">
                 <h3 className="storyboard-plot-title">Choose the Next Path</h3>
                 <div className="storyboard-plot-grid">
                    {plotOptions.map(opt => (
                       <button 
                         key={opt.id} 
                         onClick={() => handleExtendStory(opt.description)} 
                         className="storyboard-plot-option"
                       >
                          <h4 className="storyboard-plot-option-title">{opt.title}</h4>
                          <p className="storyboard-plot-option-desc">{opt.description}</p>
                       </button>
                    ))}
                 </div>
                 <button onClick={() => setPlotOptions([])} className="storyboard-plot-cancel">Cancel</button>
              </div>
           </div>
        );
     }
     return null;
  };

  // Comic Page Chunking - 使用 useMemo 缓存分页结果
  const SCENES_PER_PAGE = 6;
  const chunkedScenes = useMemo(() => {
    if (!isComicMode) return [];
    const chunks = [];
     for (let i = 0; i < story.scenes.length; i += SCENES_PER_PAGE) {
        chunks.push(story.scenes.slice(i, i + SCENES_PER_PAGE));
     }
     return chunks;
  }, [isComicMode, story.scenes]);

  const getComicSpanClass = (index: number) => {
      const patternIndex = index % 6;
      if (patternIndex === 0) return 'storyboard-comic-panel span-12';
      if (patternIndex === 1 || patternIndex === 2) return 'storyboard-comic-panel span-6';
      return 'storyboard-comic-panel span-4';
  };

  return (
    <div className="storyboard-container">
      
      {/* 1. TOP HEADER BAR */}
      <div className="storyboard-header">
         <div className="storyboard-header-left">
            <h2 className="storyboard-title">{story.title}</h2>
            <button className="storyboard-header-edit-button" title="编辑标题">
              <Edit />
            </button>
            <button className="storyboard-header-more-button" title="更多选项">
              <MoreHorizontal />
            </button>
            <div className="storyboard-divider"></div>
            <div className="storyboard-history-controls">
               <button 
                 onClick={undo} 
                 disabled={!canUndo} 
                 className="storyboard-history-button"
               >
                 <RotateCcw />
               </button>
               <button 
                 onClick={redo} 
                 disabled={!canRedo} 
                 className="storyboard-history-button"
               >
                 <RotateCw />
               </button>
               <button 
                 onClick={() => setShowHistoryTimeline(true)} 
                 className={`storyboard-history-button ${showHistoryTimeline ? 'active' : ''}`}
                 title="查看历史时间线"
               >
                 <History />
               </button>
            </div>
         </div>

         <div className="storyboard-header-right">
             <button 
               onClick={handleOptimizeStory} 
               disabled={isOptimizingStory} 
               className="storyboard-action-button optimize"
             >
                {isOptimizingStory ? <Loader2 className="animate-spin" /> : <Sparkles />} Optimize
             </button>
             <button 
               onClick={() => setShowFullScreen(true)} 
               className="storyboard-action-button slideshow"
             >
               <PlayCircle /> Slideshow
             </button>
             <div className="storyboard-divider"></div>
             <div className="storyboard-export-controls">
                 <button 
                   onClick={() => setExportWithText(!exportWithText)} 
                   className={`storyboard-export-toggle ${exportWithText ? 'active' : ''}`} 
                   title="嵌入文本"
                 >
                   <Type />
                 </button>
                 <select 
                   value={exportFormat} 
                   onChange={(e) => setExportFormat(e.target.value as any)} 
                   className="storyboard-export-select"
                 >
                   <option value="pdf">PDF</option>
                   <option value="zip">ZIP</option>
                   <option value="long-image">图片</option>
                 </select>
                 <button 
                   onClick={handleQuickExport} 
                   className="storyboard-export-button"
                   title="快速导出"
                 >
                   <Download /> 导出
                 </button>
                 <button 
                   onClick={handleExportClick} 
                   className="storyboard-export-button settings"
                   title="导出设置"
                 >
                   <Settings size={16} />
                 </button>
             </div>
         </div>
      </div>

      {/* 2. WORKBENCH GRID */}
      <div className="storyboard-workspace">
         
         {/* A. LEFT NAVIGATION (SCENES) */}
         <div className="storyboard-scene-nav custom-scrollbar">
            <div className="storyboard-scene-list">
               {story.scenes.map((scene, idx) => (
                  <SceneThumbnail 
                     key={scene.id} 
                     scene={scene} 
                     index={idx} 
                     isActive={activeSceneId === scene.id} 
                     onClick={() => setActiveSceneId(scene.id)} 
                  />
               ))}
            </div>
            
            {/* Storyboard Mode Add Button (Comic Mode has inline) */}
            {!isComicMode && (
              <div className="storyboard-scene-actions">
                <button 
                    onClick={isLoadingOptions ? undefined : handleGetOptions} 
                    disabled={isLoadingOptions}
                    className="storyboard-extend-button"
                >
                    {isLoadingOptions ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Plus className="animate-scale" />
                    )}
                    <span>Extend Story</span>
                </button>
              </div>
            )}
         </div>

         {/* B. CENTER STAGE (PREVIEW) */}
         <div className="storyboard-preview custom-scrollbar">
            {/* Plot Options Overlay (Storyboard Mode Only) */}
            {!isComicMode && renderPlotOptionsOverlay()}

            {isComicMode ? (
               <div className="storyboard-comic-container">
                   {chunkedScenes.map((pageScenes, pageIndex) => (
                       <div key={pageIndex} className="storyboard-comic-page">
                           {/* Page Header (Issue 1) */}
                           {pageIndex === 0 && (
                                <div className="storyboard-comic-header">
                                   <h2 className="storyboard-comic-header-title">{story.title}</h2>
                                   <div className="storyboard-comic-header-meta">ISSUE #01 • {new Date().toLocaleDateString()}</div>
                                </div>
                           )}
                           <div className="storyboard-comic-grid">
                               {pageScenes.map((scene, index) => {
                                  const spanClass = getComicSpanClass(pageIndex * SCENES_PER_PAGE + index);
                                  return (
                                     <div key={scene.id} className={spanClass}>
                                        <ComicPanel 
                                           scene={scene} 
                                           index={pageIndex * SCENES_PER_PAGE + index} 
                                           isActive={activeSceneId === scene.id}
                                           onClick={() => setActiveSceneId(scene.id)}
                                        />
                                     </div>
                                  );
                               })}
                           </div>
                           <div className="storyboard-comic-footer">
                             <span className="storyboard-comic-page-number">PAGE {pageIndex + 1}</span>
                           </div>
                       </div>
                   ))}

                   {/* Inline Story Extension for Comic Mode */}
                   <div className="storyboard-comic-extend">
                      {isExtendingStory ? (
                          <div className="storyboard-comic-extend-loading">
                              <Loader2 className="storyboard-comic-extend-loading-spinner" />
                              <p className="storyboard-comic-extend-loading-text">Designing Next Page...</p>
                          </div>
                      ) : plotOptions.length > 0 ? (
                          <div className="storyboard-comic-extend-options">
                              <h3 className="storyboard-comic-extend-title">To Be Continued...</h3>
                              <p className="storyboard-comic-extend-subtitle">Choose the next plot development:</p>
                              <div className="storyboard-comic-extend-options-grid">
                                  {plotOptions.map(opt => (
                                      <button 
                                        key={opt.id} 
                                        onClick={() => handleExtendStory(opt.description)} 
                                        className="storyboard-comic-extend-option"
                                      >
                                          <span className="storyboard-comic-extend-option-title">{opt.title}</span>
                                          <span className="storyboard-comic-extend-option-desc">{opt.description}</span>
                                      </button>
                                  ))}
                              </div>
                              <button onClick={() => setPlotOptions([])} className="storyboard-comic-extend-cancel">Cancel</button>
                          </div>
                      ) : (
                          <button 
                              onClick={handleGetOptions} 
                              disabled={isLoadingOptions}
                              className="storyboard-comic-extend-button"
                          >
                              <div className="storyboard-comic-extend-button-icon">
                                  {isLoadingOptions ? (
                                    <Loader2 className="animate-spin" />
                                  ) : (
                                    <ArrowRight />
                                  )}
                              </div>
                              <span className="storyboard-comic-extend-button-text">
                                  {isLoadingOptions ? "Analyzing Story Arc..." : "Create Next Page"}
                              </span>
                          </button>
                      )}
                  </div>
               </div>
            ) : (
               activeScene && <SceneStage scene={activeScene} mode="storyboard" />
            )}
         </div>

         {/* C. RIGHT INSPECTOR (EDIT) */}
         <div className="storyboard-inspector">
            <InspectorPanel 
               scene={activeScene} 
               currentArtStyle={settings.artStyle}
               onUpdateText={(n, v, r) => handleUpdateSceneText(n, v, r)}
               onUpdateTags={handleUpdateTags}
               onRetry={() => activeSceneId !== undefined && handleRetryImage(activeSceneId)}
               onModify={(fb) => activeSceneId !== undefined && handleModifyImage(activeSceneId, fb)}
               onGenerateAudio={() => activeScene && handleGenerateAudio(activeScene.id, activeScene.narrative)}
               onGenerateVideo={() => activeSceneId !== undefined && handleGenerateVideo(activeSceneId)}
               onCancelVideo={() => activeSceneId !== undefined && handleCancelVideo(activeSceneId)}
               onGenerateStylePreview={() => activeSceneId !== undefined && handleGenerateStylePreview()}
            />
         </div>
      </div>

      {showFullScreen && (
        <FullScreenViewer 
          scenes={story.scenes} 
          initialIndex={story.scenes.findIndex(s => s.id === activeSceneId)} 
          onClose={() => setShowFullScreen(false)} 
          title={story.title} 
        />
      )}
      
      {showHistoryTimeline && (
        <HistoryTimeline
          history={history}
          currentIndex={historyIndex}
          onJumpToHistory={(index) => {
            jumpToHistory(index);
            setShowHistoryTimeline(false);
          }}
          onClose={() => setShowHistoryTimeline(false)}
        />
      )}

      {showExportDialog && (
        <ExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          onExport={handleExportWithConfig}
          initialConfig={{
            format: exportFormat,
            withText: exportWithText,
            resolution: 'original',
          }}
          mode={story.mode}
          scenes={story.scenes}
          storyTitle={story.title}
        />
      )}
    </div>
  );
};

export default Storyboard;

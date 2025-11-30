
import React, { memo, useMemo } from 'react';
import { Scene, GenerationMode } from '../types';
import { Loader2, Image as ImageIcon, Video } from 'lucide-react';
import LazyImage from './LazyImage';

export const SubtitleOverlay: React.FC<{ text: string, mode: GenerationMode }> = memo(({ text, mode }) => {
  return (
    <div className="subtitle-overlay">
       <p>{text}</p>
    </div>
  );
});
SubtitleOverlay.displayName = 'SubtitleOverlay';

export const ComicSpeechBubble: React.FC<{ text: string }> = memo(({ text }) => {
  return (
    <div className="comic-speech-bubble-container">
      <div className="comic-speech-bubble">
        <p>{text}</p>
        <div className="comic-speech-bubble-tail-1"></div>
        <div className="comic-speech-bubble-tail-2"></div>
      </div>
    </div>
  );
});
ComicSpeechBubble.displayName = 'ComicSpeechBubble';

// Enhanced Loading State
export const SkeletonSceneCard: React.FC<{ isComic: boolean }> = ({ isComic }) => {
   if (isComic) {
      return (
         <div className="skeleton-scene-card-comic">
            <div className="skeleton-scene-card-comic-content">
               <Loader2 />
               <p>Rendering Panel...</p>
            </div>
         </div>
      );
   }

   return (
      <div className="skeleton-scene-card-normal">
         <Loader2 />
      </div>
   );
};

// 1. Scene Thumbnail (Left Sidebar)
export const SceneThumbnail: React.FC<{
  scene: Scene;
  index: number;
  isActive: boolean;
  onClick: () => void;
}> = memo(({ scene, index, isActive, onClick }) => {
  const hasMedia = useMemo(() => ({
    video: !!scene.videoUrl,
    audio: !!scene.audioUrl
  }), [scene.videoUrl, scene.audioUrl]);

  return (
    <div 
      onClick={onClick}
      className={`scene-thumbnail-container ${isActive ? 'active' : ''}`}
    >
      <div className="scene-thumbnail-content">
         <div className="scene-thumbnail-image-wrapper">
            {scene.imageUrl ? (
              <LazyImage
                src={scene.imageUrl}
                className="scene-thumbnail-image"
                loading="lazy"
                placeholder={
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(30, 41, 59, 0.5)' }}>
                    <ImageIcon style={{ width: '1.5rem', height: '1.5rem', color: '#475569' }} />
                  </div>
                }
              />
            ) : (
              <div className="scene-thumbnail-placeholder">
                <ImageIcon className="scene-thumbnail-placeholder-icon" />
              </div>
            )}
            <div className="scene-thumbnail-index">{index + 1}</div>
         </div>
         <div className="scene-thumbnail-info">
            <p className="scene-thumbnail-title">
               {scene.narrative || "Untitled Scene"}
            </p>
            <div className="scene-thumbnail-media-icons">
               {hasMedia.video && <Video style={{ width: '0.75rem', height: '0.75rem', color: '#818cf8' }} />}
               {hasMedia.audio && <div className="scene-thumbnail-audio-indicator" />}
            </div>
         </div>
      </div>
    </div>
  );
});
SceneThumbnail.displayName = 'SceneThumbnail';

// 2. Scene Stage (Center - Storyboard Mode)
export const SceneStage: React.FC<{
  scene: Scene;
  mode: GenerationMode;
}> = memo(({ scene, mode }) => {
  const isLoading = useMemo(() => scene.isLoadingImage || scene.isLoadingVideo, [scene.isLoadingImage, scene.isLoadingVideo]);
  
  return (
    <div className="scene-stage-container">
       <div className="scene-stage-wrapper">
          {scene.videoUrl ? (
            <video src={scene.videoUrl} controls className="scene-stage-video" />
          ) : scene.imageUrl ? (
            <>
              <LazyImage
                src={scene.imageUrl}
                className="scene-stage-image"
                loading="eager" // 当前激活的场景立即加载
                placeholder={<SkeletonSceneCard isComic={false} />}
              />
              <SubtitleOverlay text={scene.narrative} mode={mode} />
            </>
          ) : (
            <div className="scene-stage-empty">
               {scene.isLoadingImage ? <SkeletonSceneCard isComic={false} /> : <div className="scene-stage-empty-content"><ImageIcon style={{ width: '4rem', height: '4rem', margin: '0 auto 1rem', opacity: 0.2 }}/><p>No Image</p></div>}
            </div>
          )}
          
          {isLoading && (
             <div className="scene-stage-loading-overlay">
                <div className="scene-stage-loading-content">
                   <Loader2 style={{ width: '1.25rem', height: '1.25rem', animation: 'spin 1s linear infinite', color: '#818cf8' }} />
                   <span>{scene.isLoadingVideo ? 'Rendering Video...' : 'Generating Image...'}</span>
                </div>
             </div>
          )}
       </div>
    </div>
  );
});
SceneStage.displayName = 'SceneStage';

// 3. Comic Panel (Center - Comic Mode Grid Item)
export const ComicPanel: React.FC<{
  scene: Scene;
  index: number;
  isActive: boolean;
  onClick: () => void;
}> = memo(({ scene, index, isActive, onClick }) => {
  return (
    <div 
       onClick={onClick}
       className={`comic-panel ${isActive ? 'active' : ''}`}
    >
       <div className="comic-panel-content">
          {scene.isLoadingImage ? (
             <SkeletonSceneCard isComic={true} />
          ) : scene.imageUrl ? (
             <>
                <LazyImage
                  src={scene.imageUrl}
                  className="comic-panel-image"
                  loading={isActive ? 'eager' : 'lazy'} // 激活的面板立即加载
                  placeholder={<SkeletonSceneCard isComic={true} />}
                />
                <ComicSpeechBubble text={scene.narrative} />
             </>
          ) : (
             <div className="comic-panel-empty">
                <ImageIcon style={{ width: '2.5rem', height: '2.5rem', marginBottom: '0.5rem' }} />
                <span>Empty Panel</span>
             </div>
          )}
       </div>
       
       <div className="comic-panel-index">
          {index + 1}
       </div>
    </div>
  );
});
ComicPanel.displayName = 'ComicPanel';

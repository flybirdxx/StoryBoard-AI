import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { Scene } from '../types';

interface FullScreenViewerProps {
  scenes: Scene[];
  initialIndex: number;
  onClose: () => void;
  title: string;
}

const FullScreenViewer: React.FC<FullScreenViewerProps> = ({ scenes, initialIndex, onClose, title }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === ' ') {
          e.preventDefault();
          setIsPlaying(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % scenes.length);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, scenes.length]);

  const nextSlide = () => {
    setCurrentIndex(prev => (prev + 1) % scenes.length);
  };

  const prevSlide = () => {
    setCurrentIndex(prev => (prev - 1 + scenes.length) % scenes.length);
  };

  const currentScene = scenes[currentIndex];

  return (
    <div className="full-screen-viewer">
      {/* Top Controls */}
      <div className="full-screen-viewer-top">
        <div className="full-screen-viewer-top-left">
          <h2>{title}</h2>
          <p>
            {currentIndex + 1} / {scenes.length}
          </p>
        </div>
        <button 
          onClick={onClose}
          className="full-screen-viewer-close"
        >
          <X />
        </button>
      </div>

      {/* Main Content */}
      <div className="full-screen-viewer-content">
        <button onClick={prevSlide} className="full-screen-viewer-nav-button full-screen-viewer-nav-button-left">
           <ChevronLeft />
        </button>
        
        <div className="full-screen-viewer-image-container">
            {currentScene.imageUrl ? (
               <img 
                 src={currentScene.imageUrl} 
                 alt={`Scene ${currentIndex + 1}`} 
                 className="full-screen-viewer-image"
               />
            ) : (
                <div className="full-screen-viewer-empty">No Image Available</div>
            )}
            
            {/* Narrative Overlay */}
            <div className="full-screen-viewer-narrative">
               <div className="full-screen-viewer-narrative-content">
                  <p>
                    {currentScene.narrative}
                  </p>
               </div>
            </div>
        </div>

        <button onClick={nextSlide} className="full-screen-viewer-nav-button full-screen-viewer-nav-button-right">
           <ChevronRight />
        </button>
      </div>

      {/* Bottom Timeline / Controls */}
      <div className="full-screen-viewer-bottom">
         <button 
           onClick={() => setIsPlaying(!isPlaying)}
           className="full-screen-viewer-play-button"
         >
            {isPlaying ? <Pause /> : <Play />}
            {isPlaying ? "暂停播放" : "自动播放"}
         </button>
         
         {/* Simple Timeline dots */}
         <div className="full-screen-viewer-timeline">
            {scenes.map((_, idx) => (
               <button 
                 key={idx}
                 onClick={() => setCurrentIndex(idx)}
                 className={`full-screen-viewer-timeline-dot ${idx === currentIndex ? 'active' : ''}`}
               />
            ))}
         </div>
      </div>
    </div>
  );
};

export default FullScreenViewer;

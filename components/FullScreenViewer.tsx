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
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Top Controls */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div>
          <h2 className="text-2xl font-bold text-white drop-shadow-md">{title}</h2>
          <p className="text-sm text-slate-300">
            {currentIndex + 1} / {scenes.length}
          </p>
        </div>
        <button 
          onClick={onClose}
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-sm"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        <button onClick={prevSlide} className="absolute left-4 p-4 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all z-10">
           <ChevronLeft className="w-8 h-8" />
        </button>
        
        <div className="relative w-full h-full flex items-center justify-center p-4 md:p-12">
            {currentScene.imageUrl ? (
               <img 
                 src={currentScene.imageUrl} 
                 alt={`Scene ${currentIndex + 1}`} 
                 className="max-h-full max-w-full object-contain shadow-2xl"
               />
            ) : (
                <div className="text-slate-500">No Image Available</div>
            )}
            
            {/* Narrative Overlay */}
            <div className="absolute bottom-12 left-0 right-0 flex justify-center px-6">
               <div className="bg-black/70 backdrop-blur-md p-6 rounded-2xl max-w-4xl w-full border border-white/10 shadow-2xl">
                  <p className="text-lg md:text-xl text-white font-light leading-relaxed text-center">
                    {currentScene.narrative}
                  </p>
               </div>
            </div>
        </div>

        <button onClick={nextSlide} className="absolute right-4 p-4 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all z-10">
           <ChevronRight className="w-8 h-8" />
        </button>
      </div>

      {/* Bottom Timeline / Controls */}
      <div className="h-16 bg-black/90 border-t border-white/10 flex items-center justify-center gap-4 z-20">
         <button 
           onClick={() => setIsPlaying(!isPlaying)}
           className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors font-medium text-sm"
         >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? "暂停播放" : "自动播放"}
         </button>
         
         {/* Simple Timeline dots */}
         <div className="hidden md:flex gap-2 ml-4">
            {scenes.map((_, idx) => (
               <button 
                 key={idx}
                 onClick={() => setCurrentIndex(idx)}
                 className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-indigo-500 scale-125' : 'bg-slate-700 hover:bg-slate-500'}`}
               />
            ))}
         </div>
      </div>
    </div>
  );
};

export default FullScreenViewer;

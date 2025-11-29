
import React from 'react';
import { Scene, GenerationMode } from '../types';
import { Loader2, Image as ImageIcon, Video } from 'lucide-react';

export const SubtitleOverlay: React.FC<{ text: string, mode: GenerationMode }> = ({ text, mode }) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 pb-8 pt-16 px-10 text-center z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none">
       <p className="text-white text-lg font-medium leading-relaxed drop-shadow-lg tracking-wide" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
          {text}
       </p>
    </div>
  );
};

export const ComicSpeechBubble: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none">
      <div className="bg-white border-2 border-black rounded-[2rem] rounded-tl-none p-4 shadow-[4px_4px_0px_rgba(0,0,0,0.2)] max-w-[90%] float-left relative animate-in zoom-in-95 duration-300">
        <p className="text-black text-xs md:text-sm font-bold leading-snug font-comic">
          {text}
        </p>
        <div className="absolute -left-[2px] -top-[14px] w-4 h-4 bg-white border-l-2 border-t-2 border-black transform -skew-x-12 rotate-45 z-10"></div>
        <div className="absolute -left-[2px] -top-[12px] w-5 h-5 bg-white transform rotate-45 z-20"></div> 
      </div>
    </div>
  );
};

// Enhanced Loading State
export const SkeletonSceneCard: React.FC<{ isComic: boolean }> = ({ isComic }) => {
   if (isComic) {
      return (
         <div className="flex-1 bg-white border-2 border-black relative h-full min-h-[300px] overflow-hidden group">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
            <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent via-indigo-500/10 to-transparent -translate-y-full animate-[shimmer_2s_infinite]"></div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20">
               <Loader2 className="w-8 h-8 text-slate-800 animate-spin" />
               <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">Rendering Panel...</p>
            </div>
         </div>
      );
   }

   return (
      <div className="relative bg-[#13161f] overflow-hidden rounded-xl h-full flex flex-col items-center justify-center">
         <div className="absolute inset-0 bg-white/5 animate-pulse"></div>
         <Loader2 className="w-10 h-10 text-white/20 animate-spin relative z-10" />
      </div>
   );
};

// 1. Scene Thumbnail (Left Sidebar)
export const SceneThumbnail: React.FC<{
  scene: Scene;
  index: number;
  isActive: boolean;
  onClick: () => void;
}> = ({ scene, index, isActive, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`relative group cursor-pointer p-2 rounded-xl transition-all duration-200 border ${isActive ? 'bg-indigo-600/10 border-indigo-500' : 'hover:bg-white/5 border-transparent hover:border-white/10'}`}
    >
      <div className="flex gap-3">
         <div className="relative w-24 aspect-video rounded-lg overflow-hidden bg-black/40 border border-white/5 flex-shrink-0">
            {scene.imageUrl ? (
              <img src={scene.imageUrl} className={`w-full h-full object-cover transition-all ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`} />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-6 h-6 text-slate-700" /></div>
            )}
            <div className="absolute top-0.5 left-0.5 px-1.5 py-0.5 bg-black/60 rounded text-[9px] font-bold text-white font-mono">{index + 1}</div>
         </div>
         <div className="flex-1 min-w-0 flex flex-col justify-center">
            <p className={`text-xs font-medium truncate mb-1 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
               {scene.narrative || "Untitled Scene"}
            </p>
            <div className="flex items-center gap-2">
               {scene.videoUrl && <Video className="w-3 h-3 text-indigo-400" />}
               {scene.audioUrl && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
            </div>
         </div>
      </div>
    </div>
  );
};

// 2. Scene Stage (Center - Storyboard Mode)
export const SceneStage: React.FC<{
  scene: Scene;
  mode: GenerationMode;
}> = ({ scene, mode }) => {
  return (
    <div className="w-full h-full flex items-center justify-center p-8">
       <div className="relative w-full max-w-5xl aspect-video bg-black rounded-lg overflow-hidden shadow-2xl border border-white/10 ring-1 ring-white/5">
          {scene.videoUrl ? (
            <video src={scene.videoUrl} controls className="w-full h-full object-contain bg-black" />
          ) : scene.imageUrl ? (
            <>
              <img src={scene.imageUrl} className="w-full h-full object-contain" />
              <SubtitleOverlay text={scene.narrative} mode={mode} />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-600">
               {scene.isLoadingImage ? <SkeletonSceneCard isComic={false} /> : <div className="text-center"><ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20"/><p>No Image</p></div>}
            </div>
          )}
          
          {(scene.isLoadingImage || scene.isLoadingVideo) && (
             <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-30">
                <div className="bg-black/80 px-6 py-4 rounded-xl flex items-center gap-3 border border-white/10">
                   <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                   <span className="text-xs font-bold text-white uppercase tracking-wider">{scene.isLoadingVideo ? 'Rendering Video...' : 'Generating Image...'}</span>
                </div>
             </div>
          )}
       </div>
    </div>
  );
};

// 3. Comic Panel (Center - Comic Mode Grid Item)
export const ComicPanel: React.FC<{
  scene: Scene;
  index: number;
  isActive: boolean;
  onClick: () => void;
}> = ({ scene, index, isActive, onClick }) => {
  return (
    <div 
       onClick={onClick}
       className={`relative w-full h-full min-h-[300px] bg-white border-[3px] shadow-[4px_4px_0px_rgba(0,0,0,0.8)] cursor-pointer transition-all duration-200 group overflow-hidden ${isActive ? 'border-indigo-600 ring-4 ring-indigo-500/30 z-10' : 'border-black hover:scale-[1.01]'}`}
    >
       <div className="absolute inset-0 bg-white">
          {scene.isLoadingImage ? (
             <SkeletonSceneCard isComic={true} />
          ) : scene.imageUrl ? (
             <>
                <img src={scene.imageUrl} className="w-full h-full object-cover" />
                <ComicSpeechBubble text={scene.narrative} />
             </>
          ) : (
             <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                <ImageIcon className="w-10 h-10 mb-2" />
                <span className="text-xs font-bold">Empty Panel</span>
             </div>
          )}
       </div>
       
       <div className={`absolute -top-1 -left-1 w-6 h-6 flex items-center justify-center text-[10px] font-black border border-black z-20 ${isActive ? 'bg-indigo-600 text-white' : 'bg-white text-black'}`}>
          {index + 1}
       </div>
    </div>
  );
};

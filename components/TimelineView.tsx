import React from 'react';
import { Film, Play, Clock, Download } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const TimelineView: React.FC = () => {
  const { scenes } = useAppStore();
  const allShots = scenes.flatMap(s => s.shots);
  const totalDuration = allShots.reduce((acc, shot) => acc + (shot.duration || 3), 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0E14] overflow-hidden">
       {/* Preview Area */}
       <div className="flex-1 flex items-center justify-center bg-black/50 border-b border-app-border relative">
            <div className="text-center text-gray-500">
                <Film size={48} className="mx-auto mb-4 opacity-50" />
                <p>选择一个镜头以预览</p>
            </div>
       </div>

       {/* Timeline Controls */}
       <div className="h-12 bg-app-card border-b border-app-border flex items-center justify-between px-4">
            <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-2"><Clock size={14}/> {totalDuration}s Total</span>
                <span className="text-gray-600">|</span>
                <span>{allShots.length} Shots</span>
            </div>
            <div className="flex items-center gap-2">
                 <button className="flex items-center gap-2 px-3 py-1.5 rounded bg-app-accent text-white text-xs hover:bg-app-accentHover transition-colors">
                    <Play size={12} fill="currentColor" /> 播放全片
                 </button>
                 <button className="flex items-center gap-2 px-3 py-1.5 rounded bg-gray-700 text-gray-300 text-xs hover:bg-gray-600 transition-colors">
                    <Download size={12} /> 导出 MP4
                 </button>
            </div>
       </div>

       {/* Tracks */}
       <div className="h-64 bg-[#151923] p-4 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-1 h-full min-w-max">
            {allShots.map((shot, index) => (
                <div 
                    key={`${shot.id}-${index}`} 
                    className="flex flex-col h-full group relative cursor-pointer"
                    style={{ width: `${(shot.duration || 3) * 40}px`, minWidth: '120px' }}
                >
                    {/* Time Marker */}
                    <div className="h-6 border-b border-gray-700 text-[10px] text-gray-500 px-1 mb-2">
                        {index + 1}
                    </div>

                    {/* Thumbnail Strip */}
                    <div className="flex-1 bg-gray-800 rounded-lg overflow-hidden border border-gray-700 group-hover:border-app-accent relative">
                        {shot.imageUrl ? (
                            <img src={shot.imageUrl} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-900 text-xs text-gray-600">
                                No Image
                            </div>
                        )}
                        <div className="absolute bottom-1 right-1 bg-black/60 px-1 rounded text-[10px] text-white">
                            {shot.duration || 3}s
                        </div>
                    </div>

                    {/* Description Track */}
                    <div className="h-8 mt-2 text-[10px] text-gray-500 truncate px-1">
                        {shot.visualPrompt}
                    </div>
                </div>
            ))}
          </div>
       </div>
    </div>
  );
};
import React, { useState } from 'react';
import { Shot, TransitionType } from '../types';
import { Video, Maximize2, RefreshCw, Edit3, Loader2, Save, X, ImageOff, Clock, ArrowRight } from 'lucide-react';

interface ShotCardProps {
  shot: Shot;
  onRegenerate: (shot: Shot) => void;
  onUpdate: (id: number, updates: Partial<Shot>) => void;
  onMaximize: (imageUrl: string) => void;
}

export const ShotCard: React.FC<ShotCardProps> = ({ shot, onRegenerate, onUpdate, onMaximize }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(shot.visualPrompt);
  const [editedDesc, setEditedDesc] = useState(shot.description);
  
  const transitionColors: Record<string, string> = {
      'CUT': 'bg-gray-700 text-gray-300',
      'FADE': 'bg-indigo-900/50 text-indigo-300 border-indigo-500/30',
      'DISSOLVE': 'bg-purple-900/50 text-purple-300 border-purple-500/30',
      'WIPE': 'bg-cyan-900/50 text-cyan-300 border-cyan-500/30',
  };

  const handleSave = () => {
    onUpdate(shot.id, {
      visualPrompt: editedPrompt,
      description: editedDesc
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedPrompt(shot.visualPrompt);
    setEditedDesc(shot.description);
    setIsEditing(false);
  };

  const toggleTransition = () => {
      const types: TransitionType[] = ['CUT', 'FADE', 'DISSOLVE', 'WIPE'];
      const currentIdx = types.indexOf(shot.transition || 'CUT');
      const nextType = types[(currentIdx + 1) % types.length];
      onUpdate(shot.id, { transition: nextType });
  };

  // Format Duration to Timecode-ish 00s
  const formattedDuration = `00:00:${(shot.duration || 4).toString().padStart(2, '0')}`;

  return (
    <div className={`bg-app-card rounded-xl border overflow-visible flex flex-col transition-all duration-300 relative group/card ${isEditing ? 'border-app-accent ring-1 ring-app-accent shadow-2xl scale-[1.02] z-20' : 'border-app-border hover:border-app-accent/50'}`}>
      
      {/* Filmstrip decoration - simulated sprocket holes */}
      <div className="absolute top-10 bottom-24 left-1 w-2 flex flex-col gap-3 z-10 opacity-30 pointer-events-none">
          {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-3 w-1.5 bg-black/50 rounded-sm border border-white/10"></div>
          ))}
      </div>
      <div className="absolute top-10 bottom-24 right-1 w-2 flex flex-col gap-3 z-10 opacity-30 pointer-events-none">
          {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-3 w-1.5 bg-black/50 rounded-sm border border-white/10"></div>
          ))}
      </div>

      {/* Header */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-app-border bg-[#1A1F2B]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400 font-mono">SHOT {shot.shotNumber.toString().padStart(2, '0')}</span>
        </div>
        <div className="flex items-center gap-2">
           <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono bg-black/20 px-1.5 py-0.5 rounded">
             <Clock size={10} /> {formattedDuration}
           </div>
          {isEditing && (
             <span className="text-[10px] text-yellow-500 font-medium animate-pulse">EDITING</span>
          )}
        </div>
      </div>

      {/* Image Area */}
      <div className="aspect-video w-full bg-black relative group overflow-hidden mx-auto border-y border-black">
        {shot.isLoading ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <Loader2 className="animate-spin text-app-accent" size={32} />
          </div>
        ) : shot.imageUrl ? (
          <img 
            src={shot.imageUrl} 
            alt="Shot preview" 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#12141a] border-b border-app-border/50 group-hover:bg-[#1a1f2b] transition-colors cursor-pointer" onClick={() => onRegenerate(shot)}>
             <div className="w-12 h-12 rounded-full bg-gray-800/50 flex items-center justify-center mb-2 group-hover:bg-gray-700 transition-colors">
                <ImageOff size={20} className="text-gray-600 group-hover:text-gray-400" />
             </div>
             <span className="text-xs text-gray-600 group-hover:text-gray-400 font-medium transition-colors">等待生成画面</span>
             <span className="text-[10px] text-app-accent mt-1 opacity-0 group-hover:opacity-100 transition-opacity">点击生成</span>
          </div>
        )}
        
        {/* Camera Move Tag */}
        <div className="absolute top-3 left-4 px-2 py-1 bg-black/70 backdrop-blur-md rounded border border-white/10 flex items-center gap-1.5 z-10 shadow-lg">
          <Video size={12} className="text-purple-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-white">
            {shot.cameraMove}
          </span>
        </div>

        {/* Hover Actions */}
        {!isEditing && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 z-20 pointer-events-none">
             <button 
               onClick={(e) => { e.stopPropagation(); onRegenerate(shot); }}
               className="p-2 rounded-full bg-white/10 hover:bg-app-accent text-white backdrop-blur-sm transition-all transform hover:scale-105 pointer-events-auto"
               title={shot.imageUrl ? "重新生成图片" : "生成图片"}
             >
               <RefreshCw size={18} className={shot.isLoading ? 'animate-spin' : ''} />
             </button>
             {shot.imageUrl && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onMaximize(shot.imageUrl!); }}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all transform hover:scale-105 pointer-events-auto"
                  title="查看大图"
                >
                  <Maximize2 size={18} />
                </button>
             )}
          </div>
        )}
      </div>

      {/* Transition Connector (Floating) */}
      <div 
        onClick={toggleTransition}
        className={`absolute -right-3 bottom-16 z-30 flex items-center gap-1 px-2 py-1 rounded cursor-pointer hover:scale-105 transition-transform border border-app-border shadow-lg ${transitionColors[shot.transition || 'CUT'] || transitionColors['CUT']}`}
        title="点击切换转场效果"
      >
        <span className="text-[9px] font-bold">{shot.transition || 'CUT'}</span>
        <ArrowRight size={10} />
      </div>

      {/* Content Area */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        {isEditing ? (
          <div className="flex flex-col gap-3 h-full">
            <div className="flex-1">
              <label className="text-[10px] text-gray-500 mb-1 block">视觉提示词 (Prompt)</label>
              <textarea 
                className="w-full bg-black/20 border border-app-border rounded p-2 text-xs text-gray-200 focus:border-app-accent focus:outline-none min-h-[80px]"
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">场景描述</label>
              <input 
                className="w-full bg-black/20 border border-app-border rounded p-2 text-xs text-gray-200 focus:border-app-accent focus:outline-none"
                value={editedDesc}
                onChange={(e) => setEditedDesc(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 pt-2 mt-auto">
              <button onClick={handleSave} className="flex-1 py-1.5 bg-app-accent hover:bg-app-accentHover text-white text-xs rounded flex items-center justify-center gap-1 transition-colors">
                <Save size={12} /> 保存
              </button>
              <button onClick={handleCancel} className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded flex items-center justify-center gap-1 transition-colors">
                <X size={12} /> 取消
              </button>
            </div>
          </div>
        ) : (
          <>
             {/* Type Tag */}
             <div className="flex items-center gap-2 mb-1">
                <span className="px-1.5 py-0.5 rounded bg-gray-700/50 text-[10px] text-gray-400">
                    {shot.type || '镜头'}
                </span>
             </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-500">视觉提示词:</span>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-1 hover:bg-gray-800 rounded transition-colors text-gray-600 hover:text-cyan-400"
                  title="编辑"
                >
                  <Edit3 size={12} />
                </button>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed font-light line-clamp-3 hover:line-clamp-none transition-all cursor-pointer" onClick={() => setIsEditing(true)}>
                {shot.visualPrompt}
              </p>
            </div>

            {/* Divider */}
            {shot.description && (
                <div className="pt-3 border-t border-white/5 mt-auto">
                    <p className="text-[10px] text-gray-500 leading-snug">
                        {shot.description}
                    </p>
                </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
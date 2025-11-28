
import React, { useState } from 'react';
import { VisualAnchor } from '../types';
import { Users, Check, Edit2, Sparkles } from 'lucide-react';

interface AnchorReviewModalProps {
  anchors: VisualAnchor[];
  referenceImages: string[];
  onConfirm: (anchors: VisualAnchor[]) => void;
  onCancel: () => void;
}

const AnchorReviewModal: React.FC<AnchorReviewModalProps> = ({ anchors, referenceImages, onConfirm, onCancel }) => {
  const [editedAnchors, setEditedAnchors] = useState<VisualAnchor[]>(anchors);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleUpdate = (id: string, field: keyof VisualAnchor, value: string) => {
    setEditedAnchors(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-[#1A1E29] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-gradient-to-r from-indigo-900/20 to-purple-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
               <Users className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
               <h2 className="text-xl font-bold text-white">确认角色视觉设定 (Visual Anchors)</h2>
               <p className="text-sm text-slate-400">AI 已从您的图片中提取了角色特征。请检查并修正，这决定了画面的一致性。</p>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
          {editedAnchors.map((anchor, index) => (
            <div key={anchor.id} className="bg-black/30 border border-white/10 rounded-xl p-4 flex gap-6 hover:border-indigo-500/30 transition-colors">
               {/* Reference Image Preview */}
               <div className="flex-shrink-0 w-24 h-24 md:w-32 md:h-32 bg-black rounded-lg overflow-hidden border border-white/10 relative group">
                  {typeof anchor.previewImageIndex === 'number' && referenceImages[anchor.previewImageIndex] ? (
                     <img 
                       src={referenceImages[anchor.previewImageIndex]} 
                       alt={anchor.name} 
                       className="w-full h-full object-cover" 
                     />
                  ) : (
                     <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">No Ref</div>
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <span className="text-[10px] text-white font-bold">Ref Image</span>
                  </div>
               </div>

               {/* Editor */}
               <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-4">
                     {editingId === anchor.id ? (
                        <input 
                           value={anchor.name}
                           onChange={(e) => handleUpdate(anchor.id, 'name', e.target.value)}
                           className="bg-slate-800 text-white font-bold px-2 py-1 rounded border border-indigo-500 outline-none"
                           autoFocus
                        />
                     ) : (
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                           {anchor.name}
                           <button onClick={() => setEditingId(anchor.id)} className="text-slate-500 hover:text-indigo-400">
                              <Edit2 className="w-3 h-3" />
                           </button>
                        </h3>
                     )}
                     <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        Character {index + 1}
                     </span>
                  </div>

                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                        视觉锚点描述 (Visual Description)
                     </label>
                     <textarea 
                        value={anchor.description}
                        onChange={(e) => handleUpdate(anchor.id, 'description', e.target.value)}
                        className="w-full h-24 bg-black/20 border border-white/10 rounded-lg p-3 text-sm text-slate-300 focus:text-white focus:ring-1 focus:ring-indigo-500 outline-none resize-none leading-relaxed"
                     />
                     <p className="text-[10px] text-slate-500 mt-1">
                        * 这些描述将强制用于每一张分镜，请确保包含发型、服装、年龄等关键特征。
                     </p>
                  </div>
               </div>
            </div>
          ))}

          {editedAnchors.length === 0 && (
             <div className="text-center py-10 text-slate-500">
                <p>未能自动识别角色。AI 将尝试基于整体风格生成。</p>
             </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-black/20 flex justify-end gap-3">
           <button 
             onClick={onCancel}
             className="px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-white transition-colors"
           >
             取消
           </button>
           <button 
             onClick={() => onConfirm(editedAnchors)}
             className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all"
           >
             <Sparkles className="w-4 h-4" />
             确认并生成故事
           </button>
        </div>
      </div>
    </div>
  );
};

export default AnchorReviewModal;


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
    <div className="anchor-review-modal-overlay">
      <div className="anchor-review-modal">
        
        {/* Header */}
        <div className="anchor-review-modal-header">
          <div className="anchor-review-modal-header-content">
            <div className="anchor-review-modal-header-icon">
               <Users />
            </div>
            <div className="anchor-review-modal-header-text">
               <h2>确认角色视觉设定 (Visual Anchors)</h2>
               <p>AI 已从您的图片中提取了角色特征。请检查并修正，这决定了画面的一致性。</p>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="anchor-review-modal-list">
          {editedAnchors.map((anchor, index) => (
            <div key={anchor.id} className="anchor-review-modal-item">
               {/* Reference Image Preview */}
               <div className="anchor-review-modal-preview">
                  {typeof anchor.previewImageIndex === 'number' && referenceImages[anchor.previewImageIndex] ? (
                     <img 
                       src={referenceImages[anchor.previewImageIndex]} 
                       alt={anchor.name} 
                     />
                  ) : (
                     <div className="anchor-review-modal-preview-placeholder">No Ref</div>
                  )}
                  <div className="anchor-review-modal-preview-overlay">
                     <span className="anchor-review-modal-preview-overlay-text">Ref Image</span>
                  </div>
               </div>

               {/* Editor */}
               <div className="anchor-review-modal-editor">
                  <div className="anchor-review-modal-editor-header">
                     {editingId === anchor.id ? (
                        <input 
                           value={anchor.name}
                           onChange={(e) => handleUpdate(anchor.id, 'name', e.target.value)}
                           className="anchor-review-modal-name-input"
                           autoFocus
                        />
                     ) : (
                        <h3 className="anchor-review-modal-name-display">
                           {anchor.name}
                           <button onClick={() => setEditingId(anchor.id)} className="anchor-review-modal-edit-button">
                              <Edit2 />
                           </button>
                        </h3>
                     )}
                     <span className="anchor-review-modal-badge">
                        Character {index + 1}
                     </span>
                  </div>

                  <div className="anchor-review-modal-field">
                     <label className="anchor-review-modal-field-label">
                        视觉锚点描述 (Visual Description)
                     </label>
                     <textarea 
                        value={anchor.description}
                        onChange={(e) => handleUpdate(anchor.id, 'description', e.target.value)}
                        className="anchor-review-modal-textarea"
                     />
                     <p className="anchor-review-modal-hint">
                        * 这些描述将强制用于每一张分镜，请确保包含发型、服装、年龄等关键特征。
                     </p>
                  </div>
               </div>
            </div>
          ))}

          {editedAnchors.length === 0 && (
             <div className="anchor-review-modal-empty">
                <p>未能自动识别角色。AI 将尝试基于整体风格生成。</p>
             </div>
          )}
        </div>

        {/* Footer */}
        <div className="anchor-review-modal-footer">
           <button 
             onClick={onCancel}
             className="anchor-review-modal-cancel-button"
           >
             取消
           </button>
           <button 
             onClick={() => onConfirm(editedAnchors)}
             className="anchor-review-modal-confirm-button"
           >
             <Sparkles />
             确认并生成故事
           </button>
        </div>
      </div>
    </div>
  );
};

export default AnchorReviewModal;

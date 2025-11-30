import React from 'react';
import { Download, Loader2, PenTool } from 'lucide-react';
import { AspectRatio } from '../../types';

interface CharacterPreviewProps {
  generatedImage: string | null;
  isGenerating: boolean;
  aspectRatio: AspectRatio;
  onSave: () => void;
  onCancel?: () => void;
}

const CharacterPreview: React.FC<CharacterPreviewProps> = ({
  generatedImage,
  isGenerating,
  aspectRatio,
  onSave,
  onCancel,
}) => {
  const getPreviewAspectClass = () => {
    switch (aspectRatio) {
      case '1:1': return 'aspect-square';
      case '3:4': return 'aspect-3-4';
      case '4:3': return 'aspect-4-3';
      case '9:16': return 'aspect-9-16';
      case '16:9': return 'aspect-video';
      default: return 'aspect-square';
    }
  };

  return (
    <div className="character-workshop-right">
      {/* Loading Overlay */}
      {isGenerating && (
        <div className="character-workshop-loading-overlay">
          <div className="character-workshop-loading-spinner">
            <Loader2 size={48} />
          </div>
          <p className="character-workshop-loading-text">正在绘制角色设计图...</p>
          {onCancel && (
            <button
              onClick={onCancel}
              className="character-workshop-cancel-button"
            >
              取消生成
            </button>
          )}
        </div>
      )}

      {generatedImage ? (
        <div className={`character-workshop-preview ${getPreviewAspectClass()}`}>
          <img src={generatedImage} alt="Generated Character" />
          <div className="character-workshop-preview-overlay">
            <button
              onClick={onSave}
              className="character-workshop-save-button"
            >
              <Download size={20} />
              保存到库
            </button>
          </div>
        </div>
      ) : (
        <div className="character-workshop-empty-preview">
          <div className="character-workshop-empty-preview-icon">
            <PenTool size={32} />
          </div>
          <p>预览区域</p>
          <p className="character-workshop-empty-preview-text">生成的角色设计将显示在这里</p>
        </div>
      )}
    </div>
  );
};

export default CharacterPreview;


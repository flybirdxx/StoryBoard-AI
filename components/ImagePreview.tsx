import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import '../styles/image-preview.css';

interface ImagePreviewProps {
  imageUrl: string;
  title?: string;
  onClose: () => void;
  anchorElement?: HTMLElement | null;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ imageUrl, title, onClose, anchorElement }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (anchorElement && containerRef.current) {
      // 等待下一帧确保容器已渲染并有了尺寸
      requestAnimationFrame(() => {
        if (!containerRef.current) return;
        
        const rect = anchorElement.getBoundingClientRect();
        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const previewWidth = 400; // 固定宽度
        const previewHeight = containerRect.height || 400; // 估算高度
        const gap = 16;
        
        // 计算位置：优先显示在右侧
        let left = rect.right + gap;
        let top = rect.top + rect.height / 2;
        let transform = 'translateY(-50%)';
        
        // 如果右侧空间不够，显示在左侧
        if (left + previewWidth > window.innerWidth - gap) {
          const leftSpace = rect.left - gap;
          if (leftSpace >= previewWidth) {
            left = rect.left - previewWidth - gap;
          } else {
            // 如果两侧都不够，居中显示
            left = '50%';
            top = '50%';
            transform = 'translate(-50%, -50%)';
          }
        }
        
        // 垂直方向调整，确保不超出视窗
        if (typeof top === 'number') {
          const halfHeight = previewHeight / 2;
          if (top + halfHeight > window.innerHeight - gap) {
            top = window.innerHeight - halfHeight - gap;
          }
          if (top - halfHeight < gap) {
            top = halfHeight + gap;
          }
        }
        
        setPosition({
          top: typeof top === 'number' ? `${top}px` : top,
          left: typeof left === 'number' ? `${left}px` : left,
          transform
        });
      });
    }
  }, [anchorElement]);

  return (
    <div className="image-preview-overlay" onClick={onClose}>
      <div 
        ref={containerRef}
        className="image-preview-container" 
        onClick={(e) => e.stopPropagation()}
        style={position}
      >
        <div className="image-preview-header">
          {title && <h3 className="image-preview-title">{title}</h3>}
          <button
            onClick={onClose}
            className="image-preview-close"
            title="关闭 (ESC)"
          >
            <X size={18} />
          </button>
        </div>
        <div className="image-preview-content">
          <img
            src={imageUrl}
            alt={title || '预览图片'}
            className="image-preview-image"
          />
        </div>
      </div>
    </div>
  );
};

export default ImagePreview;


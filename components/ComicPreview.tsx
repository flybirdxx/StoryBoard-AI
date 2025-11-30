import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Scene, ComicLayoutConfig, BubbleConfig, PanelAspectRatio } from '../types';
import { Loader2 } from 'lucide-react';
import '../styles/comic-preview.css';

interface ComicPreviewProps {
  scenes: Scene[];
  layoutConfig: ComicLayoutConfig;
  bubbleConfig?: BubbleConfig;
  withText: boolean;
  title: string;
}

/**
 * Calculate panel dimensions based on aspect ratio
 */
const calculatePanelDimensions = (
  width: number,
  aspectRatio: PanelAspectRatio,
  imageRatio?: number
): number => {
  switch (aspectRatio) {
    case '1:1':
      return width;
    case '4:3':
      return width * (3 / 4);
    case '16:9':
      return width * (9 / 16);
    case '3:4':
      return width * (4 / 3);
    case '9:16':
      return width * (16 / 9);
    case 'auto':
    default:
      if (imageRatio) {
        return width / imageRatio;
      }
      return width * 0.75; // Default 4:3
  }
};

/**
 * Wrap text for canvas
 */
const wrapCanvasText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const words = text.split('');
  const lines: string[] = [];
  let currentLine = words[0] || '';

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + word).width;
    if (width < maxWidth) {
      currentLine += word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
};

/**
 * Calculate bubble position
 */
const calculateBubblePosition = (
  position: string,
  panelX: number,
  panelY: number,
  panelW: number,
  panelH: number,
  bubbleW: number,
  bubbleH: number
): { x: number; y: number } => {
  const margin = 20;
  
  switch (position) {
    case 'top-left':
      return { x: panelX + margin, y: panelY + margin };
    case 'top-right':
      return { x: panelX + panelW - bubbleW - margin, y: panelY + margin };
    case 'bottom-left':
      return { x: panelX + margin, y: panelY + panelH - bubbleH - margin };
    case 'bottom-right':
      return { x: panelX + panelW - bubbleW - margin, y: panelY + panelH - bubbleH - margin };
    case 'center':
      return { x: panelX + (panelW - bubbleW) / 2, y: panelY + (panelH - bubbleH) / 2 };
    case 'auto':
    default:
      if (bubbleH > panelH * 0.6) {
        return { x: panelX + (panelW - bubbleW) / 2, y: panelY + (panelH - bubbleH) / 2 };
      }
      return { x: panelX + margin, y: panelY + margin };
  }
};

/**
 * Draw speech bubble
 */
const drawSpeechBubble = (
  ctx: CanvasRenderingContext2D,
  text: string,
  panelX: number,
  panelY: number,
  panelW: number,
  panelH: number,
  config: BubbleConfig
) => {
  const fontSize = config.fontSize;
  ctx.font = `bold ${fontSize}px "Microsoft YaHei", sans-serif`;
  
  const bubblePadding = config.padding;
  const maxBubbleWidth = panelW * 0.85;
  const lines = wrapCanvasText(ctx, text, maxBubbleWidth - (bubblePadding * 2));
  
  const lineHeight = fontSize * 1.4;
  const bubbleHeight = (lines.length * lineHeight) + (bubblePadding * 2);
  const bubbleWidth = Math.min(
    lines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0) + (bubblePadding * 2),
    maxBubbleWidth
  );
  
  const pos = calculateBubblePosition(
    config.position,
    panelX,
    panelY,
    panelW,
    panelH,
    bubbleWidth,
    bubbleHeight
  );
  
  const bubbleX = pos.x;
  const bubbleY = pos.y;
  const r = config.borderRadius;
  
  // Helper function to draw rounded rectangle
  const drawRoundedRect = (x: number, y: number, w: number, h: number, radius: number) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };
  
  // Draw shadow if enabled
  if (config.shadow) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.save();
    ctx.translate(4, 4);
    drawRoundedRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, r);
    ctx.fill();
    ctx.restore();
  }
  
  ctx.beginPath();
  if (config.style === 'japanese' || config.style === 'modern') {
    drawRoundedRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, r);
  } else if (config.style === 'american') {
    const cornerRadius = r * 0.5;
    ctx.moveTo(bubbleX + cornerRadius, bubbleY);
    ctx.lineTo(bubbleX + bubbleWidth - cornerRadius, bubbleY);
    ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + cornerRadius);
    ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - cornerRadius);
    ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - cornerRadius, bubbleY + bubbleHeight);
    ctx.lineTo(bubbleX + 40, bubbleY + bubbleHeight);
    ctx.lineTo(bubbleX + 20, bubbleY + bubbleHeight + 15);
    ctx.lineTo(bubbleX + 30, bubbleY + bubbleHeight);
    ctx.lineTo(bubbleX + cornerRadius, bubbleY + bubbleHeight);
    ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - cornerRadius);
    ctx.lineTo(bubbleX, bubbleY + cornerRadius);
    ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + cornerRadius, bubbleY);
  } else {
    drawRoundedRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, r);
  }
  ctx.closePath();
  
  // Fill and stroke
  ctx.fillStyle = config.color;
  ctx.fill();
  ctx.lineWidth = config.borderWidth;
  ctx.strokeStyle = config.borderColor;
  ctx.stroke();
  
  // Draw text
  ctx.fillStyle = config.textColor;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  
  lines.forEach((line, i) => {
    ctx.fillText(line, bubbleX + bubblePadding, bubbleY + bubblePadding + (i * lineHeight));
  });
};

const ComicPreview: React.FC<ComicPreviewProps> = ({
  scenes,
  layoutConfig,
  bubbleConfig,
  withText,
  title,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previewScenes, setPreviewScenes] = useState<Scene[]>([]);

  // Limit preview to first 6 scenes
  const displayScenes = useMemo(() => {
    return scenes.slice(0, 6).filter(s => s.imageUrl);
  }, [scenes]);

  useEffect(() => {
    setPreviewScenes(displayScenes);
  }, [displayScenes]);

  useEffect(() => {
    if (previewScenes.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Preview dimensions (scaled down for performance)
    const PREVIEW_WIDTH = 800;
    const COLS = layoutConfig.columns;
    const MARGIN_X = layoutConfig.pageMargin.left * (PREVIEW_WIDTH / 2480);
    const MARGIN_Y = layoutConfig.pageMargin.top * (PREVIEW_WIDTH / 2480);
    const GAP = layoutConfig.panelSpacing * (PREVIEW_WIDTH / 2480);
    const PANEL_WIDTH = (PREVIEW_WIDTH - (MARGIN_X * 2) - (GAP * (COLS - 1))) / COLS;

    // Load images
    Promise.all(
      previewScenes.map(
        (scene) =>
          new Promise<{ img: HTMLImageElement; scene: Scene }>((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = scene.imageUrl || '';
            img.onload = () => resolve({ img, scene });
            img.onerror = () => resolve({ img, scene });
          })
      )
    ).then((loadedImages) => {
      // Calculate panel heights
      const panelHeights: number[] = [];
      let maxPanelHeight = 0;

      loadedImages.forEach((item) => {
        const { img } = item;
        const imgRatio = img.width > 0 ? img.width / img.height : 1.33;
        const panelHeight = calculatePanelDimensions(PANEL_WIDTH, layoutConfig.panelAspectRatio, imgRatio);
        panelHeights.push(panelHeight);
        maxPanelHeight = Math.max(maxPanelHeight, panelHeight);
      });

      const useUniformHeight = layoutConfig.panelAspectRatio !== 'auto';
      const STANDARD_PANEL_HEIGHT = useUniformHeight
        ? calculatePanelDimensions(PANEL_WIDTH, layoutConfig.panelAspectRatio)
        : maxPanelHeight;

      // Calculate total height
      const rows = Math.ceil(loadedImages.length / COLS);
      const totalHeight = MARGIN_Y * 2 + rows * (useUniformHeight ? STANDARD_PANEL_HEIGHT : maxPanelHeight) + (rows - 1) * GAP + 100; // Header space

      canvas.width = PREVIEW_WIDTH;
      canvas.height = totalHeight;

      // Clear canvas
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw title
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 32px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(title || '预览', PREVIEW_WIDTH / 2, 50);

      // Draw panels
      let currentY = MARGIN_Y + 100;

      loadedImages.forEach((item, idx) => {
        const col = idx % COLS;
        const row = Math.floor(idx / COLS);

        const x = MARGIN_X + col * (PANEL_WIDTH + GAP);
        const panelHeight = useUniformHeight ? STANDARD_PANEL_HEIGHT : panelHeights[idx];

        let y = currentY;
        for (let r = 0; r < row; r++) {
          const rowIdx = r * COLS;
          const rowHeight = useUniformHeight
            ? STANDARD_PANEL_HEIGHT
            : Math.max(...panelHeights.slice(rowIdx, rowIdx + COLS));
          y += rowHeight + GAP;
        }

        const { img, scene } = item;

        // Draw shadow
        if (layoutConfig.borderStyle === 'solid') {
          ctx.fillStyle = 'rgba(0,0,0,0.1)';
          ctx.fillRect(x + 4, y + 4, PANEL_WIDTH, panelHeight);
        }

        // Draw image
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, PANEL_WIDTH, panelHeight);
        ctx.clip();

        if (img.width > 0) {
          const imgRatio = img.width / img.height;
          const panelRatio = PANEL_WIDTH / panelHeight;
          let renderW, renderH, offX, offY;

          if (imgRatio > panelRatio) {
            renderH = panelHeight;
            renderW = renderH * imgRatio;
            offY = 0;
            offX = (PANEL_WIDTH - renderW) / 2;
          } else {
            renderW = PANEL_WIDTH;
            renderH = renderW / imgRatio;
            offX = 0;
            offY = (panelHeight - renderH) / 2;
          }
          ctx.drawImage(img, x + offX, y + offY, renderW, renderH);
        } else {
          ctx.fillStyle = '#eeeeee';
          ctx.fillRect(x, y, PANEL_WIDTH, panelHeight);
        }
        ctx.restore();

        // Draw border
        if (layoutConfig.borderStyle !== 'none') {
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = layoutConfig.borderWidth * (PREVIEW_WIDTH / 2480);
          if (layoutConfig.borderStyle === 'dashed') {
            ctx.setLineDash([10, 5]);
          } else {
            ctx.setLineDash([]);
          }
          ctx.strokeRect(x, y, PANEL_WIDTH, panelHeight);
          ctx.setLineDash([]);
        }

        // Draw panel number
        if (layoutConfig.showPanelNumbers) {
          const badgeSize = 30;
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(x, y, badgeSize / 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(scene.id + 1), x, y);
        }

        // Draw speech bubble
        if (withText && bubbleConfig && scene.narrative) {
          // Scale bubble config for preview
          const scaledBubbleConfig = {
            ...bubbleConfig,
            fontSize: bubbleConfig.fontSize * (PREVIEW_WIDTH / 2480),
            padding: bubbleConfig.padding * (PREVIEW_WIDTH / 2480),
            borderWidth: bubbleConfig.borderWidth * (PREVIEW_WIDTH / 2480),
            borderRadius: bubbleConfig.borderRadius * (PREVIEW_WIDTH / 2480),
          };
          drawSpeechBubble(ctx, scene.narrative, x, y, PANEL_WIDTH, panelHeight, scaledBubbleConfig);
        }
      });

      setIsLoading(false);
    });
  }, [previewScenes, layoutConfig, bubbleConfig, withText, title]);

  if (previewScenes.length === 0) {
    return (
      <div className="comic-preview-empty">
        <p>暂无场景可预览</p>
        <p className="comic-preview-hint">请确保至少有一个场景包含图像</p>
      </div>
    );
  }

  return (
    <div className="comic-preview-container">
      {isLoading && (
        <div className="comic-preview-loading">
          <Loader2 className="animate-spin" size={24} />
          <span>正在生成预览...</span>
        </div>
      )}
      <div className={`comic-preview-canvas-wrapper ${isLoading ? 'loading' : ''}`}>
        <canvas ref={canvasRef} className="comic-preview-canvas" />
      </div>
      <div className="comic-preview-info">
        <p className="comic-preview-info-text">
          预览显示前 {previewScenes.length} 个场景 • {layoutConfig.columns} 列布局
        </p>
      </div>
    </div>
  );
};

export default ComicPreview;


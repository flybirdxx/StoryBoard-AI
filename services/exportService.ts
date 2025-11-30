
import { jsPDF } from "jspdf";
import JSZip from "jszip";
import saveAs from "file-saver";
import { Scene, ExportConfig, GenerationMode, ComicLayoutConfig, BubbleConfig, PanelAspectRatio } from "../types";
import { getPresetConfig } from "../constants/comicLayoutPresets";

/**
 * Helper to convert text to an image data URL to avoid font issues in PDF.
 * Uses HTML Canvas to render text using system fonts (supporting Chinese).
 */
const textToImage = (text: string, widthMm: number, isTitle: boolean = false): { dataUrl: string; heightMm: number } => {
  if (!text) return { dataUrl: '', heightMm: 0 };

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { dataUrl: '', heightMm: 0 };

  // Scale factor for quality (pixels per mm). 5 is a good balance for PDF.
  const pxPerMm = 5; 
  const canvasWidth = widthMm * pxPerMm;
  
  // Font settings
  // Title: approx 16pt, Body: approx 11pt
  const fontSizePx = isTitle ? (6 * pxPerMm) : (4 * pxPerMm);
  const lineHeight = fontSizePx * 1.4;
  const font = `${isTitle ? 'bold' : 'normal'} ${fontSizePx}px "Microsoft YaHei", "SimHei", "PingFang SC", sans-serif`;
  
  ctx.font = font;
  
  // Word wrap logic
  const words = text.split(''); // Split by char for CJK
  const lines: string[] = [];
  let currentLine = words[0] || '';
  
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + word).width;
    if (width < canvasWidth) {
      currentLine += word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  
  // Calculate canvas height based on lines
  const canvasHeight = lines.length * lineHeight + (pxPerMm * 1); // small padding
  
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  
  // Re-get context after resize (canvas is cleared)
  const ctx2 = canvas.getContext('2d');
  if (!ctx2) return { dataUrl: '', heightMm: 0 };

  // Transparent background
  ctx2.clearRect(0, 0, canvas.width, canvas.height);
  
  ctx2.font = font;
  ctx2.fillStyle = '#000000'; // Black text
  ctx2.textBaseline = 'top';
  
  lines.forEach((line, i) => {
    ctx2.fillText(line, 0, i * lineHeight);
  });
  
  return {
    dataUrl: canvas.toDataURL('image/png'),
    heightMm: canvasHeight / pxPerMm
  };
};

/**
 * Helper to wrap text for Canvas
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
 * Calculate bubble position based on config
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
      // Auto: prefer top-left, but adjust if too large
      if (bubbleH > panelH * 0.6) {
        // If bubble is too tall, center it
        return { x: panelX + (panelW - bubbleW) / 2, y: panelY + (panelH - bubbleH) / 2 };
      }
      return { x: panelX + margin, y: panelY + margin };
  }
};

/**
 * Draws a comic speech bubble on the canvas with enhanced styling
 */
const drawSpeechBubble = (
  ctx: CanvasRenderingContext2D, 
  text: string, 
  panelX: number, 
  panelY: number, 
  panelW: number,
  panelH: number,
  config?: BubbleConfig
) => {
  const bubbleConfig = config || {
    style: 'modern',
    position: 'auto',
    color: '#ffffff',
    textColor: '#000000',
    borderWidth: 2,
    borderColor: '#000000',
    fontSize: 24,
    padding: 16,
    borderRadius: 16,
    shadow: false,
  };

  const fontSize = bubbleConfig.fontSize;
  ctx.font = `bold ${fontSize}px "Microsoft YaHei", sans-serif`;
  
  const bubblePadding = bubbleConfig.padding;
  const maxBubbleWidth = panelW * 0.85;
  const lines = wrapCanvasText(ctx, text, maxBubbleWidth - (bubblePadding * 2));
  
  const lineHeight = fontSize * 1.4;
  const bubbleHeight = (lines.length * lineHeight) + (bubblePadding * 2);
  const bubbleWidth = Math.min(
    lines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0) + (bubblePadding * 2),
    maxBubbleWidth
  );
  
  // Calculate position
  const pos = calculateBubblePosition(
    bubbleConfig.position,
    panelX,
    panelY,
    panelW,
    panelH,
    bubbleWidth,
    bubbleHeight
  );
  
  const bubbleX = pos.x;
  const bubbleY = pos.y;
  const r = bubbleConfig.borderRadius;
  
  // Draw shadow if enabled
  if (bubbleConfig.shadow) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.save();
  ctx.translate(4, 4);
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, r);
  ctx.fill();
  ctx.restore();
  }
  
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
  
  // Draw bubble shape based on style
  ctx.beginPath();
  
  if (bubbleConfig.style === 'japanese' || bubbleConfig.style === 'modern') {
    // Rounded rectangle (Japanese/Modern style)
    drawRoundedRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, r);
  } else if (bubbleConfig.style === 'american') {
    // More angular corners (American style)
    const cornerRadius = r * 0.5;
    ctx.moveTo(bubbleX + cornerRadius, bubbleY);
    ctx.lineTo(bubbleX + bubbleWidth - cornerRadius, bubbleY);
    ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + cornerRadius);
    ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - cornerRadius);
    ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - cornerRadius, bubbleY + bubbleHeight);
    // Tail for American style
    ctx.lineTo(bubbleX + 40, bubbleY + bubbleHeight);
    ctx.lineTo(bubbleX + 20, bubbleY + bubbleHeight + 15);
    ctx.lineTo(bubbleX + 30, bubbleY + bubbleHeight);
    ctx.lineTo(bubbleX + cornerRadius, bubbleY + bubbleHeight);
    ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - cornerRadius);
    ctx.lineTo(bubbleX, bubbleY + cornerRadius);
    ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + cornerRadius, bubbleY);
  } else {
    // Custom: use rounded rect as default
    drawRoundedRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, r);
  }
  
  ctx.closePath();
  
  // Fill bubble
  ctx.fillStyle = bubbleConfig.color;
  ctx.fill();
  
  // Stroke bubble
  ctx.lineWidth = bubbleConfig.borderWidth;
  ctx.strokeStyle = bubbleConfig.borderColor;
  ctx.stroke();

  // Draw text
  ctx.fillStyle = bubbleConfig.textColor;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  
  lines.forEach((line, i) => {
    ctx.fillText(line, bubbleX + bubblePadding, bubbleY + bubblePadding + (i * lineHeight));
  });
};

/**
 * Draws the image onto a canvas and overlays text based on the mode.
 * Returns the base64 string of the composited image.
 */
const compositeImageWithText = async (base64: string, text: string, mode: GenerationMode): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(base64); return; }

      // Draw Image
      ctx.drawImage(img, 0, 0);

      // Text Overlay Logic
      if (text) {
        if (mode === 'comic') {
           // Draw Comic Bubble inside the image
           drawSpeechBubble(ctx, text, 0, 0, canvas.width, canvas.height);
        } else {
           // Storyboard Mode: Cinematic Subtitles
           const gradientHeight = canvas.height * 0.25;
           const gradient = ctx.createLinearGradient(0, canvas.height - gradientHeight, 0, canvas.height);
           gradient.addColorStop(0, "rgba(0,0,0,0)");
           gradient.addColorStop(1, "rgba(0,0,0,0.9)");
           
           ctx.fillStyle = gradient;
           ctx.fillRect(0, canvas.height - gradientHeight, canvas.width, gradientHeight);

           const fontSize = Math.max(20, Math.floor(canvas.width / 30));
           ctx.font = `500 ${fontSize}px "Microsoft YaHei", sans-serif`;
           ctx.fillStyle = '#ffffff';
           ctx.textAlign = 'center';
           ctx.textBaseline = 'bottom';
           
           // Shadow/Outline for text
           ctx.shadowColor = 'rgba(0,0,0,0.8)';
           ctx.shadowBlur = 4;
           ctx.shadowOffsetX = 0;
           ctx.shadowOffsetY = 2;

           const maxTextWidth = canvas.width * 0.8;
           const lines = wrapCanvasText(ctx, text, maxTextWidth);

           const lineHeight = fontSize * 1.4;
           const bottomPadding = canvas.height * 0.05;

           lines.reverse().forEach((line, i) => {
             ctx.fillText(line, canvas.width / 2, canvas.height - bottomPadding - (i * lineHeight));
           });
        }
      }

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(base64);
  });
};

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
      // Use image's native aspect ratio if available, otherwise default to 4:3
      if (imageRatio) {
        return width / imageRatio;
      }
      return width * 0.75; // Default 4:3
  }
};

/**
 * Generates a Comic Page Grid with configurable layout
 */
const generateComicSheet = async (
  scenes: Scene[],
  title: string,
  hasBurntText: boolean,
  layoutConfig?: ComicLayoutConfig,
  bubbleConfig?: BubbleConfig
): Promise<Blob> => {
  const loadedImages = await Promise.all(scenes.map(s => new Promise<{img: HTMLImageElement, scene: Scene}>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = s.imageUrl || '';
    img.onload = () => resolve({img, scene: s});
    img.onerror = () => resolve({img, scene: s});
  })));

  if (loadedImages.length === 0) return new Blob();

  // Use provided config or defaults
  const config = layoutConfig || {
    columns: 2,
    panelAspectRatio: 'auto',
    panelSpacing: 40,
    pageMargin: { top: 120, bottom: 120, left: 120, right: 120 },
    borderWidth: 3,
    borderStyle: 'solid',
    showPanelNumbers: false,
  };

  // Configuration for A4-ish high res output
  const CANVAS_WIDTH = 2480; 
  const MARGIN_X = config.pageMargin.left;
  const MARGIN_Y = config.pageMargin.top;
  const HEADER_HEIGHT = 400; // Title area height
  const PAGE_GAP = 100; // Gap between "pages"
  const GAP = config.panelSpacing;
  const COLS = config.columns;
  const PANEL_WIDTH = (CANVAS_WIDTH - (MARGIN_X * 2) - (GAP * (COLS - 1))) / COLS;
  
  // Calculate scenes per page based on columns
  const SCENES_PER_PAGE = COLS * 3; // 3 rows per page
  const totalPages = Math.ceil(loadedImages.length / SCENES_PER_PAGE);

  // Calculate a default panel height for initial height calculation
  // This will be refined when actually rendering panels
  const DEFAULT_PANEL_HEIGHT = calculatePanelDimensions(PANEL_WIDTH, config.panelAspectRatio);

  // Calculate Total Canvas Height (approximate, will be adjusted during rendering)
  let totalHeight = 0;
  
  for (let p = 0; p < totalPages; p++) {
      // Per Page Height calculation
      let pageHeight = (p === 0 ? HEADER_HEIGHT : MARGIN_Y); // First page has header
      
      const rowsInPage = Math.ceil(Math.min(SCENES_PER_PAGE, loadedImages.length - (p * SCENES_PER_PAGE)) / COLS);
      
      pageHeight += rowsInPage * DEFAULT_PANEL_HEIGHT;
      pageHeight += (rowsInPage - 1) * GAP;
      pageHeight += config.pageMargin.bottom; // Bottom margin
      
      totalHeight += pageHeight;
      if (p < totalPages - 1) totalHeight += PAGE_GAP;
  }

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return new Blob();

  // 1. Draw White Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Helper for drawing pages
  let currentY = 0;

  for (let p = 0; p < totalPages; p++) {
      const pageStartY = currentY;
      
      // Page Background (Optional visual separation, or just contiguous white)
      // If we want it to look like stacked sheets, we can draw a slight shadow/border per page.
      // For now, clean contiguous sheet.

      // Draw Header on First Page
      if (p === 0) {
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Title
          ctx.font = 'bold 80px "Microsoft YaHei", sans-serif';
          ctx.fillText(title, CANVAS_WIDTH / 2, pageStartY + 150);
          
          // Metadata
          ctx.font = 'bold 30px "Microsoft YaHei", monospace';
          ctx.fillStyle = '#555555';
          const dateStr = new Date().toLocaleDateString();
          ctx.fillText(`ISSUE #01  •  ${dateStr}  •  GEMINI AI COMICS`, CANVAS_WIDTH / 2, pageStartY + 250);

          // Divider
          ctx.beginPath();
          ctx.moveTo(MARGIN_X, pageStartY + 300);
          ctx.lineTo(CANVAS_WIDTH - MARGIN_X, pageStartY + 300);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 4;
          ctx.stroke();

          currentY += HEADER_HEIGHT;
      } else {
          currentY += MARGIN_Y; // Top margin for subsequent pages
      }

      // Draw Grid for this Page
      const pageScenes = loadedImages.slice(p * SCENES_PER_PAGE, (p + 1) * SCENES_PER_PAGE);
      
      // Calculate panel heights for this page (may vary if using auto aspect ratio)
      const panelHeights: number[] = [];
      let maxPanelHeight = 0;
      
      pageScenes.forEach((item, idx) => {
        const { img } = item;
        const imgRatio = img.width > 0 ? img.width / img.height : 1.33;
        const panelHeight = calculatePanelDimensions(PANEL_WIDTH, config.panelAspectRatio, imgRatio);
        panelHeights.push(panelHeight);
        maxPanelHeight = Math.max(maxPanelHeight, panelHeight);
      });
      
      // Use uniform height if aspect ratio is fixed, otherwise use calculated heights
      const useUniformHeight = config.panelAspectRatio !== 'auto';
      const STANDARD_PANEL_HEIGHT = useUniformHeight 
        ? calculatePanelDimensions(PANEL_WIDTH, config.panelAspectRatio)
        : maxPanelHeight;
      
      pageScenes.forEach((item, idx) => {
          const col = idx % COLS;
          const row = Math.floor(idx / COLS);
          
          const x = MARGIN_X + (col * (PANEL_WIDTH + GAP));
          const panelHeight = useUniformHeight ? STANDARD_PANEL_HEIGHT : panelHeights[idx];
          
          // Calculate Y position considering variable heights
          let y = currentY;
          for (let r = 0; r < row; r++) {
            const rowIdx = r * COLS;
            const rowHeight = useUniformHeight 
              ? STANDARD_PANEL_HEIGHT 
              : Math.max(...panelHeights.slice(rowIdx, rowIdx + COLS));
            y += rowHeight + GAP;
          }
          
          const { img, scene } = item;

          // 1. Draw Shadow (optional, only if border style is solid)
          if (config.borderStyle === 'solid') {
            const shadowOff = 8;
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(x + shadowOff, y + shadowOff, PANEL_WIDTH, panelHeight);
          }

          // 2. Draw Image (Object Cover)
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, y, PANEL_WIDTH, panelHeight);
          ctx.clip();
          
          if (img.width > 0) {
              // Calculate aspect ratio to fit "cover"
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

          // 3. Draw Border
          if (config.borderStyle !== 'none') {
          ctx.strokeStyle = '#000000';
            ctx.lineWidth = config.borderWidth;
            if (config.borderStyle === 'dashed') {
              ctx.setLineDash([10, 5]);
            } else {
              ctx.setLineDash([]);
            }
            ctx.strokeRect(x, y, PANEL_WIDTH, panelHeight);
            ctx.setLineDash([]); // Reset
          }

          // 4. Draw Number Badge (if enabled)
          if (config.showPanelNumbers) {
          const badgeSize = 50;
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(x, y, badgeSize/2, 0, Math.PI*2);
          ctx.fill();
          
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 24px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(scene.id + 1), x, y);
          }

          // 5. Draw Speech Bubble
          if (hasBurntText) {
             drawSpeechBubble(ctx, scene.narrative, x, y, PANEL_WIDTH, panelHeight, bubbleConfig);
          }
      });

      // Advance Y for next page
      const rowsInThisPage = Math.ceil(pageScenes.length / COLS);
      let pageContentHeight = 0;
      for (let r = 0; r < rowsInThisPage; r++) {
        const rowStartIdx = r * COLS;
        const rowHeight = useUniformHeight
          ? STANDARD_PANEL_HEIGHT
          : Math.max(...panelHeights.slice(rowStartIdx, Math.min(rowStartIdx + COLS, panelHeights.length)));
        pageContentHeight += rowHeight;
        if (r < rowsInThisPage - 1) pageContentHeight += GAP;
      }
      currentY += pageContentHeight + config.pageMargin.bottom;

      // Draw Page Footer
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`PAGE ${p + 1}`, CANVAS_WIDTH / 2, currentY - 40);

      // Add Gap for next page
      currentY += PAGE_GAP;
  }

  return new Promise(resolve => canvas.toBlob(blob => resolve(blob!), 'image/png'));
};

const generateLongImage = async (scenes: Scene[], title: string, hasBurntText: boolean): Promise<Blob> => {
  const loadedImages = await Promise.all(scenes.map(s => new Promise<{img: HTMLImageElement, scene: Scene}>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = s.imageUrl || '';
    img.onload = () => resolve({img, scene: s});
    img.onerror = () => resolve({img, scene: s});
  })));

  if (loadedImages.length === 0) return new Blob();

  const CANVAS_WIDTH = 1080;
  const PADDING_X = 40;
  
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  
  let totalHeight = 0;
  totalHeight += 150; // Title Area
  
  const renderItems: {img: HTMLImageElement, x: number, y: number, w: number, h: number, textLines?: string[], textHeight?: number}[] = [];
  
  let currentY = 150;
  
  for (const item of loadedImages) {
    const { img, scene } = item;
    const aspectRatio = img.width > 0 ? img.width / img.height : 1.77;
    const renderHeight = CANVAS_WIDTH / aspectRatio;
    
    let textHeight = 0;
    let lines: string[] = [];
    
    // In Storyboard mode, text is burnt into image usually by compositeImageWithText if selected.
    // However, if hasBurntText is FALSE, we render text below.
    // If hasBurntText is TRUE, compositeImageWithText handled the subtitle overlay already, so we just draw the image.
    
    if (!hasBurntText && tempCtx) {
       tempCtx.font = '24px "Microsoft YaHei", sans-serif';
       const maxWidth = CANVAS_WIDTH - (PADDING_X * 2);
       
       const words = scene.narrative.split('');
       let currentLine = words[0] || '';
       
       for (let i = 1; i < words.length; i++) {
         const word = words[i];
         const width = tempCtx.measureText(currentLine + word).width;
         if (width < maxWidth) {
           currentLine += word;
         } else {
           lines.push(currentLine);
           currentLine = word;
         }
       }
       lines.push(currentLine);
       
       textHeight = (lines.length * 36) + 40; 
    }
    
    renderItems.push({
       img,
       x: 0,
       y: currentY,
       w: CANVAS_WIDTH,
       h: renderHeight,
       textLines: lines,
       textHeight: textHeight
    });
    
    currentY += renderHeight + textHeight + 20; 
  }
  
  totalHeight = currentY + 60; 
  
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return new Blob();
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 48px "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, CANVAS_WIDTH / 2, 75);
  
  for (const item of renderItems) {
     if (item.img.width > 0) ctx.drawImage(item.img, item.x, item.y, item.w, item.h);
     
     if (!hasBurntText && item.textLines && item.textLines.length > 0) {
        ctx.fillStyle = '#000000';
        ctx.font = '24px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        const textStartY = item.y + item.h + 20;
        item.textLines.forEach((line, i) => {
           ctx.fillText(line, PADDING_X, textStartY + (i * 36));
        });
     }
  }
  
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob!), 'image/png'));
};

export const exportScenes = async (
  scenes: Scene[],
  config: ExportConfig,
  storyTitle: string,
  mode: GenerationMode = 'storyboard'
) => {
  const validScenes = scenes.filter(s => s.imageUrl);
  if (validScenes.length === 0) return;

  // Determine if we should burn text into individual images before composition
  // For Comic Mode Long Image, the generator handles text rendering on the canvas directly,
  // so we skip pre-burning to avoid double bubbles.
  const skipPreBurn = config.format === 'long-image' && mode === 'comic';

  // Process images for PDF or Zip (Individual files)
  const processedScenes = await Promise.all(validScenes.map(async (scene) => {
     // If config asks for text, AND we are NOT skipping due to comic layout logic
     if (config.withText && scene.imageUrl && !skipPreBurn) {
        // This burns text into the image itself
        const newUrl = await compositeImageWithText(scene.imageUrl, scene.narrative, mode);
        return { ...scene, imageUrl: newUrl };
     }
     return scene;
  }));

  if (config.format === 'pdf') {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth(); 
    const pageHeight = doc.internal.pageSize.getHeight(); 
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);

    for (let i = 0; i < processedScenes.length; i++) {
      const scene = processedScenes[i];
      if (i > 0) doc.addPage();

      const titleText = `${storyTitle} - ${mode === 'comic' ? 'Panel' : 'Scene'} ${scene.id + 1}`;
      const titleImg = textToImage(titleText, contentWidth, true);
      const narrativeImg = textToImage(scene.narrative, contentWidth, false);

      const spacing = 5;
      const headerHeight = titleImg.heightMm > 0 ? titleImg.heightMm + spacing : 0;
      const footerHeight = narrativeImg.heightMm > 0 ? narrativeImg.heightMm + spacing : 0;
      const availableHeight = pageHeight - (margin * 2) - headerHeight - footerHeight;
      
      if (titleImg.dataUrl) {
        doc.addImage(titleImg.dataUrl, 'PNG', margin, margin, contentWidth, titleImg.heightMm);
      }

      if (scene.imageUrl) {
        const imgProps = doc.getImageProperties(scene.imageUrl);
        const imgRatio = imgProps.width / imgProps.height;
        let finalWidth = contentWidth;
        let finalHeight = contentWidth / imgRatio;

        if (finalHeight > availableHeight) {
          finalHeight = availableHeight;
          finalWidth = availableHeight * imgRatio;
        }

        const xOffset = margin + (contentWidth - finalWidth) / 2;
        const yOffset = margin + headerHeight;

        doc.addImage(scene.imageUrl, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
      }

      if (narrativeImg.dataUrl) {
        const yPos = pageHeight - margin - narrativeImg.heightMm;
        doc.addImage(narrativeImg.dataUrl, 'PNG', margin, yPos, contentWidth, narrativeImg.heightMm);
      }
    }

    doc.save(`${storyTitle.replace(/\s+/g, '_')}_Storyboard.pdf`);
  } 
  else if (config.format === 'zip') {
    const zip = new JSZip();
    const folder = zip.folder("storyboard_images");

    for (const scene of processedScenes) {
      if (scene.imageUrl) {
        try {
            // Fetch blob data (supports blob: and data: URLs)
            const res = await fetch(scene.imageUrl);
            const blobData = await res.blob();
            folder?.file(`Scene_${String(scene.id + 1).padStart(2, '0')}.png`, blobData);
        } catch (e) {
            console.error("Failed to add image to zip", e);
        }
      }
    }

    const scriptContent = processedScenes.map(s => 
      `SCENE ${s.id + 1}\nVISUAL: ${s.visual_prompt}\nNARRATIVE: ${s.narrative}\n-------------------\n`
    ).join('\n');
    
    zip.file("script.txt", scriptContent);

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${storyTitle.replace(/\s+/g, '_')}_Assets.zip`);
  }
  else if (config.format === 'long-image') {
    if (mode === 'comic') {
       // Switch to Comic Grid Layout with configurable options
       // Apply preset if specified
       let layoutConfig = config.comicLayout;
       let bubbleConfig = config.bubbleConfig;
       
       if (config.preset && config.preset !== 'custom') {
         const preset = getPresetConfig(config.preset);
         layoutConfig = layoutConfig ? { ...preset.layout, ...layoutConfig } : preset.layout;
         bubbleConfig = bubbleConfig ? { ...preset.bubble, ...bubbleConfig } : preset.bubble;
       }
       
       const blob = await generateComicSheet(
         processedScenes, 
         storyTitle, 
         config.withText,
         layoutConfig,
         bubbleConfig
       );
       saveAs(blob, `${storyTitle.replace(/\s+/g, '_')}_ComicPage.png`);
    } else {
       // Default Long Strip
       const blob = await generateLongImage(processedScenes, storyTitle, config.withText);
       saveAs(blob, `${storyTitle.replace(/\s+/g, '_')}_LongImage.png`);
    }
  }
};


import { jsPDF } from "jspdf";
import JSZip from "jszip";
import saveAs from "file-saver";
import { Scene, ExportConfig, GenerationMode } from "../types";

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
 * Draws a comic speech bubble on the canvas
 */
const drawSpeechBubble = (
  ctx: CanvasRenderingContext2D, 
  text: string, 
  panelX: number, 
  panelY: number, 
  panelW: number,
  panelH: number
) => {
  const fontSize = 28; // Large readable font
  ctx.font = `bold ${fontSize}px "Microsoft YaHei", sans-serif`;
  
  const bubblePadding = 20;
  const maxBubbleWidth = panelW * 0.85; // Bubble takes up mostly full width
  const lines = wrapCanvasText(ctx, text, maxBubbleWidth - (bubblePadding * 2));
  
  const bubbleHeight = (lines.length * (fontSize * 1.4)) + (bubblePadding * 2);
  const bubbleWidth = lines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0) + (bubblePadding * 2);
  
  // Position: Top Left with some margin
  const bubbleX = panelX + 30;
  const bubbleY = panelY + 30;
  
  // Draw Bubble Shape (Rounded Rect)
  const r = 15; // radius
  ctx.beginPath();
  ctx.moveTo(bubbleX + r, bubbleY);
  ctx.lineTo(bubbleX + bubbleWidth - r, bubbleY);
  ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + r);
  ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - r);
  ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - r, bubbleY + bubbleHeight);
  // Tail start
  ctx.lineTo(bubbleX + 40, bubbleY + bubbleHeight); 
  ctx.lineTo(bubbleX + 20, bubbleY + bubbleHeight + 15); // Tail tip
  ctx.lineTo(bubbleX + 30, bubbleY + bubbleHeight); // Tail end
  // Continue rect
  ctx.lineTo(bubbleX + r, bubbleY + bubbleHeight);
  ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - r);
  ctx.lineTo(bubbleX, bubbleY + r);
  ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + r, bubbleY);
  ctx.closePath();
  
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.save();
  ctx.translate(4, 4);
  ctx.fill();
  ctx.restore();

  // Fill White
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  
  // Stroke Black
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000000';
  ctx.stroke();

  // Text
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  
  lines.forEach((line, i) => {
    ctx.fillText(line, bubbleX + bubblePadding, bubbleY + bubblePadding + (i * fontSize * 1.4));
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
 * Generates a Comic Page Grid (Stitched Image) matching the UI 2-column layout
 */
const generateComicSheet = async (scenes: Scene[], title: string, hasBurntText: boolean): Promise<Blob> => {
  const loadedImages = await Promise.all(scenes.map(s => new Promise<{img: HTMLImageElement, scene: Scene}>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = s.imageUrl || '';
    img.onload = () => resolve({img, scene: s});
    img.onerror = () => resolve({img, scene: s});
  })));

  if (loadedImages.length === 0) return new Blob();

  // Configuration for A4-ish high res output
  const CANVAS_WIDTH = 2480; 
  const MARGIN_X = 120;
  const MARGIN_Y = 120;
  const HEADER_HEIGHT = 400; // Title area height
  const PAGE_GAP = 100; // Gap between "pages"
  const GAP = 40; // Gap between panels
  const COLS = 2;
  const PANEL_WIDTH = (CANVAS_WIDTH - (MARGIN_X * 2) - (GAP * (COLS - 1))) / COLS;
  
  // Calculate Standard Row Height (e.g. 3:4 aspect or 1:1)
  // To keep it clean like the UI grid, let's assume a slightly tall rect or square.
  // 16:9 images in a 2-col grid usually look best with their native ratio, 
  // but to align rows, we should check max height.
  // Let's use a fixed standard height for uniformity to match the "Grid" look.
  const STANDARD_PANEL_HEIGHT = PANEL_WIDTH * 0.75; // 4:3 aspect ratio roughly

  const SCENES_PER_PAGE = 6;
  const totalPages = Math.ceil(loadedImages.length / SCENES_PER_PAGE);

  // Calculate Total Canvas Height
  let totalHeight = 0;
  
  for (let p = 0; p < totalPages; p++) {
      // Per Page Height calculation
      let pageHeight = (p === 0 ? HEADER_HEIGHT : MARGIN_Y); // First page has header
      
      const rowsInPage = Math.ceil(Math.min(SCENES_PER_PAGE, loadedImages.length - (p * SCENES_PER_PAGE)) / COLS);
      
      pageHeight += rowsInPage * STANDARD_PANEL_HEIGHT;
      pageHeight += (rowsInPage - 1) * GAP;
      pageHeight += MARGIN_Y * 2; // Bottom margin + padding
      
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
      
      pageScenes.forEach((item, idx) => {
          const col = idx % COLS;
          const row = Math.floor(idx / COLS);
          
          const x = MARGIN_X + (col * (PANEL_WIDTH + GAP));
          const y = currentY + (row * (STANDARD_PANEL_HEIGHT + GAP));
          
          const { img, scene } = item;

          // 1. Draw Shadow
          const shadowOff = 15;
          ctx.fillStyle = '#000000';
          ctx.fillRect(x + shadowOff, y + shadowOff, PANEL_WIDTH, STANDARD_PANEL_HEIGHT);

          // 2. Draw Image (Object Cover)
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, y, PANEL_WIDTH, STANDARD_PANEL_HEIGHT);
          ctx.clip();
          
          if (img.width > 0) {
              // Calculate aspect ratio to fit "cover"
              const imgRatio = img.width / img.height;
              const panelRatio = PANEL_WIDTH / STANDARD_PANEL_HEIGHT;
              let renderW, renderH, offX, offY;

              if (imgRatio > panelRatio) {
                  renderH = STANDARD_PANEL_HEIGHT;
                  renderW = renderH * imgRatio;
                  offY = 0;
                  offX = (PANEL_WIDTH - renderW) / 2;
              } else {
                  renderW = PANEL_WIDTH;
                  renderH = renderW / imgRatio;
                  offX = 0;
                  offY = (STANDARD_PANEL_HEIGHT - renderH) / 2;
              }
              ctx.drawImage(img, x + offX, y + offY, renderW, renderH);
          } else {
              ctx.fillStyle = '#eeeeee';
              ctx.fillRect(x, y, PANEL_WIDTH, STANDARD_PANEL_HEIGHT);
          }
          ctx.restore();

          // 3. Draw Border
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 6;
          ctx.strokeRect(x, y, PANEL_WIDTH, STANDARD_PANEL_HEIGHT);

          // 4. Draw Number Badge
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

          // 5. Draw Speech Bubble
          if (hasBurntText) {
             drawSpeechBubble(ctx, scene.narrative, x, y, PANEL_WIDTH, STANDARD_PANEL_HEIGHT);
          }
      });

      // Advance Y for next page
      const rowsInThisPage = Math.ceil(pageScenes.length / COLS);
      currentY += (rowsInThisPage * STANDARD_PANEL_HEIGHT) + ((rowsInThisPage - 1) * GAP) + MARGIN_Y;

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

  // Process images for PDF or Zip (Individual files)
  const processedScenes = await Promise.all(validScenes.map(async (scene) => {
     if (config.withText && scene.imageUrl) {
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
       // Switch to Comic Grid Layout (Paginated 2-col)
       const blob = await generateComicSheet(processedScenes, storyTitle, config.withText);
       saveAs(blob, `${storyTitle.replace(/\s+/g, '_')}_ComicPage.png`);
    } else {
       // Default Long Strip
       const blob = await generateLongImage(processedScenes, storyTitle, config.withText);
       saveAs(blob, `${storyTitle.replace(/\s+/g, '_')}_LongImage.png`);
    }
  }
};


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
           // Comic Mode: Clean caption bar at the bottom
           const barHeight = Math.max(60, canvas.height * 0.15);
           const y = canvas.height - barHeight;
           
           // Draw White Bar
           ctx.fillStyle = '#ffffff';
           ctx.fillRect(0, y, canvas.width, barHeight);
           
           // Draw Top Border for Bar
           ctx.strokeStyle = '#000000';
           ctx.lineWidth = 4;
           ctx.beginPath();
           ctx.moveTo(0, y);
           ctx.lineTo(canvas.width, y);
           ctx.stroke();

           // Draw Text
           const fontSize = Math.floor(barHeight * 0.4);
           ctx.font = `bold ${fontSize}px "Microsoft YaHei", sans-serif`;
           ctx.fillStyle = '#000000';
           ctx.textAlign = 'center';
           ctx.textBaseline = 'middle';
           
           // Fit text
           const maxWidth = canvas.width * 0.9;
           // Simple truncation if too long for now, or resize font
           let displayText = text;
           if (ctx.measureText(displayText).width > maxWidth) {
              const approxChars = Math.floor(displayText.length * (maxWidth / ctx.measureText(displayText).width));
              displayText = displayText.substring(0, approxChars - 2) + "...";
           }
           
           ctx.fillText(displayText, canvas.width / 2, y + barHeight / 2);

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
           const words = text.split('');
           let lines: string[] = [];
           let currentLine = words[0] || '';
           
           for (let i = 1; i < words.length; i++) {
             const word = words[i];
             const width = ctx.measureText(currentLine + word).width;
             if (width < maxTextWidth) {
               currentLine += word;
             } else {
               lines.push(currentLine);
               currentLine = word;
             }
           }
           lines.push(currentLine);

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
 * Generates a Comic Page Grid (Stitched Image)
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

  const CANVAS_WIDTH = 2480; // A4 Width @ 300dpi is approx 2480px
  const MARGIN = 120;
  const GUTTER_X = 80;
  const GUTTER_Y = 100;
  const COLS = 2; // Classic Comic Layout
  const PANEL_WIDTH = (CANVAS_WIDTH - (MARGIN * 2) - (GUTTER_X * (COLS - 1))) / COLS;

  // Temporary canvas for text measurement
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  
  // Calculate Layout Positions
  let currentX = MARGIN;
  let currentY = 320; // Start after Header
  let maxHeightInRow = 0;
  
  const renderItems: any[] = [];
  
  loadedImages.forEach((item, index) => {
      const { img, scene } = item;
      const aspectRatio = img.width > 0 ? img.width / img.height : 1.33;
      const renderHeight = PANEL_WIDTH / aspectRatio;
      
      let textHeight = 0;
      let lines: string[] = [];

      // Calculate separate text height if text is NOT burnt into the image
      if (!hasBurntText && tempCtx) {
           tempCtx.font = '32px "Microsoft YaHei", sans-serif';
           const maxWidth = PANEL_WIDTH;
           const words = scene.narrative.split('');
           let currentLine = words[0] || '';
           for (let i = 1; i < words.length; i++) {
               const width = tempCtx.measureText(currentLine + words[i]).width;
               if (width < maxWidth) {
                   currentLine += words[i];
               } else {
                   lines.push(currentLine);
                   currentLine = words[i];
               }
           }
           lines.push(currentLine);
           textHeight = (lines.length * 48) + 30; // Line height + padding
      }

      // Grid Logic
      const colIndex = index % COLS;
      if (colIndex === 0 && index !== 0) {
          // New Row: Advance Y by previous row's max height + gutter
          currentY += maxHeightInRow + GUTTER_Y;
          currentX = MARGIN;
          maxHeightInRow = 0;
      }

      const totalItemHeight = renderHeight + textHeight;
      if (totalItemHeight > maxHeightInRow) maxHeightInRow = totalItemHeight;

      renderItems.push({
          img,
          x: currentX,
          y: currentY,
          w: PANEL_WIDTH,
          h: renderHeight,
          textLines: lines,
          textHeight,
          sceneId: scene.id + 1
      });

      // Advance X
      currentX += PANEL_WIDTH + GUTTER_X;
  });

  // Calculate Final Height
  const totalHeight = currentY + maxHeightInRow + MARGIN;
  
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return new Blob();

  // 1. Draw Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // 2. Draw Header
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Title
  ctx.font = 'bold 80px "Microsoft YaHei", sans-serif';
  ctx.fillText(title, CANVAS_WIDTH / 2, 120);
  
  // Metadata
  ctx.font = 'bold 30px "Microsoft YaHei", monospace';
  ctx.fillStyle = '#555555';
  const dateStr = new Date().toLocaleDateString();
  ctx.fillText(`ISSUE #01  •  ${dateStr}  •  GEMINI AI COMICS`, CANVAS_WIDTH / 2, 220);

  // Separator Line
  ctx.beginPath();
  ctx.moveTo(MARGIN, 260);
  ctx.lineTo(CANVAS_WIDTH - MARGIN, 260);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.stroke();

  // 3. Draw Panels
  renderItems.forEach((item: any) => {
      // Draw Shadow (Hard Edge Comic Style)
      const shadowOffset = 15;
      ctx.fillStyle = '#000000';
      ctx.fillRect(item.x + shadowOffset, item.y + shadowOffset, item.w, item.h);

      // Draw Image
      if (item.img.width > 0) {
        ctx.drawImage(item.img, item.x, item.y, item.w, item.h);
      } else {
        // Fallback for empty image
        ctx.fillStyle = '#eeeeee';
        ctx.fillRect(item.x, item.y, item.w, item.h);
      }
      
      // Draw Border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 6;
      ctx.strokeRect(item.x, item.y, item.w, item.h);

      // Draw Panel Number Badge (Top Left Corner overlap)
      const badgeSize = 50;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(item.x, item.y, badgeSize/2, 0, Math.PI*2);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(item.sceneId), item.x, item.y);

      // Draw Separated Text if needed (Below panel)
      if (!hasBurntText && item.textLines.length > 0) {
          ctx.fillStyle = '#000000';
          ctx.font = '32px "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          
          const textStartY = item.y + item.h + 25;
          item.textLines.forEach((line: string, i: number) => {
              ctx.fillText(line, item.x, textStartY + (i * 48));
          });
      }
  });

  // Footer / Page Number
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText("PAGE 1", CANVAS_WIDTH / 2, totalHeight - 40);

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

  const processedScenes = await Promise.all(validScenes.map(async (scene) => {
     if (config.withText && scene.imageUrl) {
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
        const base64Data = scene.imageUrl.split(',')[1];
        folder?.file(`Scene_${String(scene.id + 1).padStart(2, '0')}.png`, base64Data, {base64: true});
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
       // Switch to Comic Grid Layout
       const blob = await generateComicSheet(processedScenes, storyTitle, config.withText);
       saveAs(blob, `${storyTitle.replace(/\s+/g, '_')}_ComicPage.png`);
    } else {
       // Default Long Strip
       const blob = await generateLongImage(processedScenes, storyTitle, config.withText);
       saveAs(blob, `${storyTitle.replace(/\s+/g, '_')}_LongImage.png`);
    }
  }
};

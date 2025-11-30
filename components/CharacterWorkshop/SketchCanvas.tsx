import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PenTool, Eraser, RotateCcw, Minus, Plus } from 'lucide-react';

interface SketchCanvasProps {
  onSketchChange: (dataUrl: string | null) => void;
}

const SketchCanvas: React.FC<SketchCanvasProps> = ({ onSketchChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [brushSize, setBrushSize] = useState(3);
  const [brushColor, setBrushColor] = useState('#000000');
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, []);

  // Update canvas data when drawing stops
  const updateSketchData = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      onSketchChange(dataUrl);
    }
  }, [onSketchChange]);

  const getCanvasPoint = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const drawPoint = useCallback((x: number, y: number, ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }, [brushSize]);

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const point = getCanvasPoint(e);
    if (!point) return;

    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    
    if (tool === 'pen') {
      ctx.strokeStyle = brushColor;
      ctx.fillStyle = brushColor;
    } else {
      ctx.strokeStyle = '#ffffff';
      ctx.fillStyle = '#ffffff';
    }
    
    ctx.lineWidth = brushSize;
    drawPoint(point.x, point.y, ctx);
    
    setLastPoint(point);
    setIsDrawing(true);
  }, [tool, brushColor, brushSize, getCanvasPoint, drawPoint]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPoint) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const point = getCanvasPoint(e);
    if (!point) return;

    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    
    setLastPoint(point);
  }, [isDrawing, lastPoint, getCanvasPoint]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    setLastPoint(null);
    // Update sketch data when drawing stops
    setTimeout(() => {
      updateSketchData();
    }, 0);
  }, [updateSketchData]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        updateSketchData();
      }
    }
  }, [updateSketchData]);

  const adjustBrushSize = useCallback((delta: number) => {
    setBrushSize(prev => Math.max(1, Math.min(50, prev + delta)));
  }, []);

  return (
    <div className="character-workshop-canvas-section">
      <div className="character-workshop-canvas-header">
        <label className="character-workshop-label">草图辅助 (可选)</label>
        <div className="character-workshop-toolbar">
          <button
            onClick={() => setTool('pen')}
            className={`character-workshop-tool-button ${tool === 'pen' ? 'active' : ''}`}
            title="画笔"
          >
            <PenTool size={16} />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`character-workshop-tool-button ${tool === 'eraser' ? 'active' : ''}`}
            title="橡皮擦"
          >
            <Eraser size={16} />
          </button>
          <div className="character-workshop-toolbar-divider"></div>
          
          {/* Brush Size Control */}
          {tool === 'pen' && (
            <>
              <div className="character-workshop-brush-controls">
                <button
                  onClick={() => adjustBrushSize(-1)}
                  className="character-workshop-brush-size-button"
                  title="减小画笔"
                >
                  <Minus size={12} />
                </button>
                <span className="character-workshop-brush-size-display">{brushSize}px</span>
                <button
                  onClick={() => adjustBrushSize(1)}
                  className="character-workshop-brush-size-button"
                  title="增大画笔"
                >
                  <Plus size={12} />
                </button>
              </div>
              
              {/* Color Picker */}
              <div className="character-workshop-color-picker-wrapper">
                <input
                  type="color"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value)}
                  className="character-workshop-color-picker"
                  title="选择颜色"
                />
              </div>
            </>
          )}
          
          <div className="character-workshop-toolbar-divider"></div>
          <button
            onClick={clearCanvas}
            className="character-workshop-tool-button"
            title="清空"
            style={{ color: 'var(--color-red)' }}
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>
      <div className="character-workshop-canvas-wrapper">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="character-workshop-canvas"
        />
        <div className="character-workshop-canvas-hint">
          在此绘制简单的构图或轮廓
        </div>
      </div>
    </div>
  );
};

export default SketchCanvas;


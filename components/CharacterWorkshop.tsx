
import React, { useState, useRef, useEffect } from 'react';
import { X, PenTool, Eraser, Download, Save, RotateCcw, Loader2, Monitor, Palette } from 'lucide-react';
import { generateCharacterDesign } from '../services/geminiService';
import { Character, AspectRatio, ArtStyle } from '../types';
import { ART_STYLE_OPTIONS, ASPECT_RATIOS } from '../constants';
import { toast } from 'sonner';

interface CharacterWorkshopProps {
  onClose: () => void;
  onSave: (character: Character) => void;
}

const CharacterWorkshop: React.FC<CharacterWorkshopProps> = ({ onClose, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [name, setName] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [artStyle, setArtStyle] = useState<ArtStyle>('电影写实');
  const [customStyle, setCustomStyle] = useState('');

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

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = tool === 'pen' ? '#000000' : '#ffffff';
    ctx.lineWidth = tool === 'pen' ? 3 : 20;
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const handleGenerate = async () => {
    if (!name || !prompt) {
      toast.error("请填写角色名称和描述");
      return;
    }

    let styleToUse = artStyle;
    if (artStyle === 'custom') {
       if (!customStyle.trim()) {
         toast.error("请输入自定义风格描述");
         return;
       }
       styleToUse = customStyle.trim();
    }

    setIsGenerating(true);
    try {
      const sketchData = canvasRef.current?.toDataURL('image/jpeg', 0.8) || null;
      const imageUrl = await generateCharacterDesign(prompt, sketchData, styleToUse, aspectRatio);
      setGeneratedImage(imageUrl);
      toast.success("生成成功");
    } catch (error) {
      console.error("Failed to generate character", error);
      toast.error("生成失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (generatedImage && name) {
      onSave({
        id: Date.now().toString(),
        name,
        description: prompt,
        imageUrl: generatedImage
      });
      toast.success("角色已保存");
      onClose();
    }
  };

  // Helper to determine container class for preview
  const getPreviewAspectClass = () => {
    switch (aspectRatio) {
      case '1:1': return 'aspect-square';
      case '3:4': return 'aspect-[3/4]';
      case '4:3': return 'aspect-[4/3]';
      case '9:16': return 'aspect-[9/16]';
      case '16:9': return 'aspect-video';
      default: return 'aspect-square';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-[#1A1E29] border border-white/10 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-2">
             <PenTool className="w-5 h-5 text-indigo-400" />
             <h2 className="text-lg font-bold text-white">角色工坊</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
           {/* Left: Input & Sketch */}
           <div className="w-full lg:w-1/2 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar border-r border-white/5 bg-[#0F121A]">
              <div className="space-y-4">
                 <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">角色名称</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="例如：赛博侦探"
                    />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                     {/* Aspect Ratio Selector */}
                     <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                           <Monitor className="w-3 h-3" /> 设计比例
                        </label>
                        <select 
                           value={aspectRatio}
                           onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                           className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                           {ASPECT_RATIOS.map(ratio => (
                              <option key={ratio} value={ratio}>{ratio}</option>
                           ))}
                        </select>
                     </div>

                     {/* Art Style Selector */}
                     <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                           <Palette className="w-3 h-3" /> 艺术风格
                        </label>
                        <select 
                           value={artStyle}
                           onChange={(e) => setArtStyle(e.target.value as ArtStyle)}
                           className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                           {ART_STYLE_OPTIONS.map(opt => (
                              <option key={opt.id} value={opt.id}>{opt.label}</option>
                           ))}
                        </select>
                     </div>
                 </div>

                 {artStyle === 'custom' && (
                   <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">自定义风格</label>
                      <input 
                        type="text" 
                        value={customStyle}
                        onChange={(e) => setCustomStyle(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="例如：哥特式黑暗风格..."
                      />
                   </div>
                 )}

                 <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">外观描述</label>
                    <textarea 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="w-full h-24 bg-black/30 border border-white/10 rounded-xl p-3 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                      placeholder="详细描述角色的外貌、服装、配饰等..."
                    />
                 </div>
              </div>

              <div className="flex-1 flex flex-col">
                 <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">草图辅助 (可选)</label>
                    <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
                       <button 
                         onClick={() => setTool('pen')}
                         className={`p-1.5 rounded-md transition-colors ${tool === 'pen' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                         title="画笔"
                       >
                          <PenTool className="w-4 h-4" />
                       </button>
                       <button 
                         onClick={() => setTool('eraser')}
                         className={`p-1.5 rounded-md transition-colors ${tool === 'eraser' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                         title="橡皮擦"
                       >
                          <Eraser className="w-4 h-4" />
                       </button>
                       <div className="w-px h-4 bg-white/10 mx-1"></div>
                       <button 
                         onClick={clearCanvas}
                         className="p-1.5 rounded-md text-slate-400 hover:text-red-400 transition-colors"
                         title="清空"
                       >
                          <RotateCcw className="w-4 h-4" />
                       </button>
                    </div>
                 </div>
                 <div className="relative flex-1 bg-white rounded-xl overflow-hidden cursor-crosshair border border-slate-700 shadow-inner min-h-[300px]">
                    <canvas 
                       ref={canvasRef}
                       onMouseDown={startDrawing}
                       onMouseMove={draw}
                       onMouseUp={stopDrawing}
                       onMouseLeave={stopDrawing}
                       className="w-full h-full object-contain"
                    />
                    <div className="absolute bottom-2 right-2 text-[10px] text-slate-400 bg-white/90 px-2 py-1 rounded pointer-events-none">
                       在此绘制简单的构图或轮廓
                    </div>
                 </div>
              </div>

              <button 
                onClick={handleGenerate}
                disabled={isGenerating || !name}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                 {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                 生成角色定稿
              </button>
           </div>

           {/* Right: Result */}
           <div className="w-full lg:w-1/2 p-6 flex flex-col items-center justify-center bg-black/40 relative">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
              
              {/* Loading Overlay */}
              {isGenerating && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 animate-pulse"></div>
                    <Loader2 className="relative w-12 h-12 text-indigo-400 animate-spin mb-4" />
                  </div>
                  <p className="text-sm font-bold text-indigo-200 tracking-wider animate-pulse">正在绘制角色设计图...</p>
                </div>
              )}

              {generatedImage ? (
                 <div className={`relative w-full max-w-md ${getPreviewAspectClass()} rounded-2xl overflow-hidden shadow-2xl border border-white/10 group transition-all duration-300 animate-in fade-in zoom-in-90 slide-in-from-bottom-8 duration-500`}>
                    <img src={generatedImage} alt="Generated Character" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <button 
                         onClick={handleSave}
                         className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-xl transform scale-95 group-hover:scale-100 transition-all flex items-center gap-2"
                       >
                          <Download className="w-5 h-5" />
                          保存到库
                       </button>
                    </div>
                 </div>
              ) : (
                 <div className="text-center text-slate-500">
                    <div className="w-20 h-20 rounded-full bg-slate-800 mx-auto mb-4 flex items-center justify-center">
                       <PenTool className="w-8 h-8 opacity-20" />
                    </div>
                    <p>预览区域</p>
                    <p className="text-xs mt-2 opacity-60">生成的角色设计将显示在这里</p>
                 </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterWorkshop;

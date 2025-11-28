
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Sparkles, Image as ImageIcon, X, Palette, Plus, Users, PenTool, LayoutTemplate, Square, Monitor, Wand2, Paintbrush, ChevronDown, Check, Loader2, AlertCircle } from 'lucide-react';
import { ArtStyle, GenerationMode, AspectRatio, Character } from '../types';
import CharacterWorkshop from './CharacterWorkshop';
import { generateStylePreview } from '../services/geminiService';

interface StoryFormProps {
  onSubmit: (theme: string, images: string[], artStyle: ArtStyle, mode: GenerationMode, ratio: AspectRatio) => void;
  isGenerating: boolean;
  savedCharacters: Character[];
  onSaveCharacter: (char: Character) => void;
}

export interface ArtStyleOption {
  id: ArtStyle;
  label: string;
  desc: string;
  fallbackGradient: string;
}

export const ART_STYLE_OPTIONS: ArtStyleOption[] = [
  { id: '电影写实', label: '电影写实', desc: '好莱坞大片质感，真实光影', fallbackGradient: 'from-slate-900 to-slate-700' },
  { id: '美式漫画', label: '美式漫画', desc: '粗犷线条，超级英雄风格', fallbackGradient: 'from-red-900 to-blue-900' },
  { id: '日本动漫', label: '日本动漫', desc: '精致赛璐珞，日系二次元', fallbackGradient: 'from-pink-900 to-indigo-900' },
  { id: '水彩画', label: '水彩画', desc: '柔和晕染，清新艺术感', fallbackGradient: 'from-emerald-900 to-teal-900' },
  { id: '赛博朋克', label: '赛博朋克', desc: '霓虹夜景，高科技低生活', fallbackGradient: 'from-fuchsia-900 to-purple-900' },
  { id: '蒸汽朋克', label: '蒸汽朋克', desc: '维多利亚机械复古美学', fallbackGradient: 'from-amber-900 to-orange-900' },
  { id: '黑暗奇幻', label: '黑暗奇幻', desc: '阴郁哥特，史诗感氛围', fallbackGradient: 'from-gray-900 to-black' },
  { id: '皮克斯3D风格', label: '皮克斯3D', desc: '可爱圆润，CGI动画质感', fallbackGradient: 'from-blue-600 to-cyan-500' },
  { id: '极简线条', label: '极简线条', desc: '黑白线稿，高雅且抽象', fallbackGradient: 'from-gray-200 to-white' },
  { id: '复古像素', label: '复古像素', desc: '8-bit 电子游戏怀旧风格', fallbackGradient: 'from-indigo-600 to-purple-600' },
  { id: '印象派油画', label: '印象派油画', desc: '浓墨重彩，梵高式笔触', fallbackGradient: 'from-yellow-700 to-blue-800' },
];

const ASPECT_RATIOS: AspectRatio[] = ['16:9', '9:16', '1:1', '4:3', '3:4'];

const StoryForm: React.FC<StoryFormProps> = ({ onSubmit, isGenerating, savedCharacters, onSaveCharacter }) => {
  const [theme, setTheme] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<ArtStyle>('电影写实');
  const [showWorkshop, setShowWorkshop] = useState(false);
  
  // Style Dropdown State
  const [isStyleOpen, setIsStyleOpen] = useState(false);
  const [hoveredStyle, setHoveredStyle] = useState<ArtStyle | null>(null);
  
  // Preview Image Cache & Loading State
  const [previewCache, setPreviewCache] = useState<Record<string, string>>({});
  const [previewErrors, setPreviewErrors] = useState<Record<string, boolean>>({});
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // New State for Mode and Ratio
  const [mode, setMode] = useState<GenerationMode>('storyboard');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsStyleOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Smart defaults: Change ratio when mode changes
  useEffect(() => {
    if (mode === 'storyboard') {
      setAspectRatio('16:9');
    } else {
      setAspectRatio('4:3'); // Comic panels are often landscape or square in grids
    }
  }, [mode]);

  // Determine active style to preview
  const activeStyleId = hoveredStyle || selectedStyle;
  const activeStyleOption = ART_STYLE_OPTIONS.find(opt => opt.id === activeStyleId) || ART_STYLE_OPTIONS[0];

  // Fetch preview image on hover if not cached
  useEffect(() => {
    const fetchPreview = async () => {
      // If we already have it in cache, error cache, or are already loading, skip
      if (previewCache[activeStyleId] || previewErrors[activeStyleId] || isLoadingPreview) return;
      
      setIsLoadingPreview(true);
      try {
        const url = await generateStylePreview(activeStyleOption.label, activeStyleOption.desc);
        setPreviewCache(prev => ({ ...prev, [activeStyleId]: url }));
      } catch (error) {
        console.warn(`Failed to generate style preview for ${activeStyleId}`, error);
        setPreviewErrors(prev => ({ ...prev, [activeStyleId]: true }));
      } finally {
        setIsLoadingPreview(false);
      }
    };

    if (isStyleOpen) {
      fetchPreview();
    }
  }, [activeStyleId, isStyleOpen, activeStyleOption]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("文件过大，请选择小于 5MB 的图片。");
        return;
      }
      if (images.length >= 10) {
        alert("最多只能上传 10 张角色参考图。");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImages(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (theme && images.length > 0) {
      onSubmit(theme, images, selectedStyle, mode, aspectRatio);
    }
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  const addSavedCharacter = (char: Character) => {
    if (images.length >= 10) {
      alert("最多只能上传 10 张角色参考图。");
      return;
    }
    setImages(prev => [...prev, char.imageUrl]);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      
      {/* SECTION 1: Project Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
           <div className="h-px flex-1 bg-white/5"></div>
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">项目设置</span>
           <div className="h-px flex-1 bg-white/5"></div>
        </div>

        <div className="grid grid-cols-1 gap-4">
           {/* Mode Selection */}
           <div className="space-y-2">
             <label className="text-xs font-bold text-slate-400 flex items-center gap-2">
               <LayoutTemplate className="w-3.5 h-3.5 text-indigo-400" /> 生成模式
             </label>
             <div className="grid grid-cols-2 gap-2 bg-black/20 p-1.5 rounded-xl border border-white/5">
               <button
                 type="button"
                 onClick={() => setMode('storyboard')}
                 className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                   mode === 'storyboard' 
                     ? 'bg-indigo-600/90 text-white shadow-lg shadow-indigo-500/10 ring-1 ring-white/10' 
                     : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                 }`}
               >
                 <Monitor className="w-3.5 h-3.5" /> 分镜故事
               </button>
               <button
                 type="button"
                 onClick={() => setMode('comic')}
                 className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                   mode === 'comic' 
                     ? 'bg-indigo-600/90 text-white shadow-lg shadow-indigo-500/10 ring-1 ring-white/10' 
                     : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                 }`}
               >
                 <Square className="w-3.5 h-3.5" /> 宫格漫画
               </button>
             </div>
           </div>

           {/* Aspect Ratio */}
           <div className="space-y-2">
             <label className="text-xs font-bold text-slate-400 flex items-center gap-2">
               <Monitor className="w-3.5 h-3.5 text-indigo-400" /> 画幅比例
             </label>
             <div className="flex flex-wrap gap-2">
               {ASPECT_RATIOS.map((ratio) => (
                 <button
                   key={ratio}
                   type="button"
                   onClick={() => setAspectRatio(ratio)}
                   className={`px-3 py-2 rounded-lg text-[10px] font-bold border transition-all ${
                     aspectRatio === ratio
                       ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300 ring-1 ring-indigo-500/20'
                       : 'bg-black/20 border-transparent text-slate-500 hover:border-white/10 hover:text-slate-300'
                   }`}
                 >
                   {ratio}
                 </button>
               ))}
             </div>
           </div>
        </div>
      </div>

      {/* SECTION 2: Characters */}
      <div className="space-y-4">
         <div className="flex items-center gap-2 mb-2">
           <div className="h-px flex-1 bg-white/5"></div>
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">角色与演员</span>
           <div className="h-px flex-1 bg-white/5"></div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <Users className="w-3.5 h-3.5 text-indigo-400" /> 角色参考图
              <span className="text-[10px] bg-slate-800/50 px-2 py-0.5 rounded-full text-slate-500 border border-white/5">{images.length}/10</span>
            </label>
            <button 
              type="button"
              onClick={() => setShowWorkshop(true)}
              className="text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded-md flex items-center gap-1.5 text-indigo-300 border border-indigo-500/20 transition-all"
            >
               <Paintbrush className="w-3 h-3" /> 创建角色
            </button>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {images.map((img, idx) => (
              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/10 group hover:border-indigo-500/50 transition-all shadow-sm">
                <img src={img} alt={`Character ${idx}`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-500/90 text-white rounded-md transition-all backdrop-blur-sm opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            
            {images.length < 10 && (
              <div 
                onClick={triggerFileSelect}
                className="aspect-square border border-dashed border-white/10 hover:border-indigo-500/50 bg-white/5 hover:bg-white/10 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group"
              >
                <div className="p-1.5 rounded-full bg-white/5 group-hover:bg-indigo-500/20 mb-1 transition-colors">
                  <Plus className="w-4 h-4 text-slate-400 group-hover:text-indigo-300" />
                </div>
              </div>
            )}
          </div>
          
          {/* Saved Characters Quick Pick */}
          {savedCharacters.length > 0 && (
             <div className="pt-2">
                <p className="text-[10px] text-slate-500 mb-2 font-medium">已保存的角色库</p>
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                   {savedCharacters.map(char => (
                      <button 
                         key={char.id}
                         type="button"
                         onClick={() => addSavedCharacter(char)}
                         className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden border border-white/10 hover:border-indigo-500 transition-all relative group shadow-sm"
                         title={char.name}
                      >
                         <img src={char.imageUrl} className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-indigo-500/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Plus className="w-3 h-3 text-white" />
                         </div>
                      </button>
                   ))}
                </div>
             </div>
          )}
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
      </div>

      {/* SECTION 3: Style & Story */}
      <div className="space-y-4">
         <div className="flex items-center gap-2 mb-2">
           <div className="h-px flex-1 bg-white/5"></div>
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">风格与剧情</span>
           <div className="h-px flex-1 bg-white/5"></div>
        </div>

        {/* Art Style Selection */}
        <div className="space-y-2 relative" ref={dropdownRef}>
          <label className="text-xs font-bold text-slate-400 flex items-center gap-2">
            <Palette className="w-3.5 h-3.5 text-indigo-400" /> 艺术风格
          </label>
          
          <button
            type="button"
            onClick={() => setIsStyleOpen(!isStyleOpen)}
            className="w-full bg-black/20 border border-white/10 hover:border-indigo-500/30 text-white rounded-xl px-4 py-3 flex items-center justify-between transition-all group hover:bg-black/30"
          >
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-sm font-bold tracking-wide">{selectedStyle}</span>
              <span className="text-[10px] text-slate-500 group-hover:text-slate-400">
                 {ART_STYLE_OPTIONS.find(opt => opt.id === selectedStyle)?.desc}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isStyleOpen ? 'rotate-180' : ''}`} />
          </button>

          {isStyleOpen && (
            <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-[#151921] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200 ring-1 ring-black/50">
               <div className="flex flex-col md:flex-row h-[360px]">
                  {/* Options List */}
                  <div className="w-full md:w-1/2 overflow-y-auto custom-scrollbar border-r border-white/5 bg-[#0F121A]">
                     {ART_STYLE_OPTIONS.map((style) => (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => {
                             setSelectedStyle(style.id);
                             setIsStyleOpen(false);
                          }}
                          onMouseEnter={() => setHoveredStyle(style.id)}
                          onMouseLeave={() => setHoveredStyle(null)}
                          className={`w-full px-4 py-3 text-left flex items-center justify-between border-b border-white/5 transition-all ${
                             selectedStyle === style.id 
                                ? 'bg-indigo-500/10 text-white' 
                                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                          }`}
                        >
                           <div>
                              <p className={`text-xs font-bold ${selectedStyle === style.id ? 'text-indigo-400' : ''}`}>
                                 {style.label}
                              </p>
                              <p className="text-[9px] opacity-70 mt-0.5 font-light">{style.desc}</p>
                           </div>
                           {selectedStyle === style.id && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                        </button>
                     ))}
                  </div>

                  {/* Preview Panel - Dynamic AI Generation */}
                  <div className="hidden md:flex w-1/2 bg-black flex-col relative overflow-hidden group">
                     {/* Render Logic: Cached Image -> Error Fallback -> Loading -> Default Placeholder */}
                     {previewCache[activeStyleId] ? (
                        <img 
                          src={previewCache[activeStyleId]} 
                          alt={activeStyleOption.label} 
                          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 animate-in fade-in"
                        />
                     ) : previewErrors[activeStyleId] ? (
                        // Fallback Gradient if API fails
                        <div className={`absolute inset-0 bg-gradient-to-br ${activeStyleOption.fallbackGradient} opacity-50 flex flex-col items-center justify-center p-6 text-center`}>
                           <AlertCircle className="w-8 h-8 text-white/20 mb-2" />
                           <p className="text-[10px] text-white/40">预览生成不可用</p>
                        </div>
                     ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-[#0A0C10]">
                           {isLoadingPreview ? (
                              <>
                                 <div className="relative mb-3">
                                    <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20"></div>
                                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin relative" />
                                  </div>
                                 <p className="text-[10px] uppercase tracking-widest text-indigo-300 font-medium">绘制风格...</p>
                              </>
                           ) : (
                              <p className="text-[10px] opacity-30">Select a style</p>
                           )}
                        </div>
                     )}
                     
                     {/* Overlay Text */}
                     <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90 pointer-events-none"></div>
                     <div className="absolute bottom-0 left-0 right-0 p-5 z-10 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-1">风格预览</p>
                        <h3 className="text-xl font-bold text-white drop-shadow-lg tracking-tight">{activeStyleOption.label}</h3>
                        <p className="text-xs text-slate-300 mt-1 drop-shadow-md font-light leading-relaxed">{activeStyleOption.desc}</p>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Theme Input */}
        <div className="space-y-2 flex-1 flex flex-col">
          <label className="text-xs font-bold text-slate-400 flex items-center gap-2">
            <PenTool className="w-3.5 h-3.5 text-indigo-400" /> 故事大纲
          </label>
          <div className="relative flex-1 min-h-[140px]">
            <textarea
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder={mode === 'storyboard' ? "描述你想讲述的故事。例如：在2077年的新东京，一个流浪黑客发现了一个改变世界的芯片..." : "描述四格漫画或条漫的主题。例如：程序员与产品经理的爆笑日常..."}
              className="w-full h-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-none transition-all leading-relaxed custom-scrollbar shadow-inner"
            />
            <div className="absolute bottom-3 right-3 text-[10px] text-slate-500 font-mono">
              {theme.length} chars
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-2 sticky bottom-0 z-20 bg-[#0B0F19] pb-4 -mx-2 px-2 border-t border-white/5 mt-4">
        <button
          type="submit"
          disabled={!theme || images.length === 0 || isGenerating}
          className={`w-full py-4 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-all duration-300 shadow-xl relative overflow-hidden group
            ${(!theme || images.length === 0 || isGenerating) 
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5' 
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40 transform hover:-translate-y-0.5'
            }`}
        >
          {isGenerating && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }}></div>
          )}
          
          <div className="relative flex items-center gap-3">
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-white/80" />
                <span className="tracking-wide">AI 正在绘制中...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                <span className="tracking-wide">{mode === 'storyboard' ? '生成分镜故事' : '生成漫画页'}</span>
              </>
            )}
          </div>
        </button>
      </div>

      {showWorkshop && (
        <CharacterWorkshop 
          onClose={() => setShowWorkshop(false)} 
          onSave={onSaveCharacter} 
        />
      )}
    </form>
  );
};

export default StoryForm;

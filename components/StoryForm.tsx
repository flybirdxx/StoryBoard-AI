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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsStyleOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (mode === 'storyboard') {
      setAspectRatio('16:9');
    } else {
      setAspectRatio('4:3'); 
    }
  }, [mode]);

  const activeStyleId = hoveredStyle || selectedStyle;
  const activeStyleOption = ART_STYLE_OPTIONS.find(opt => opt.id === activeStyleId) || ART_STYLE_OPTIONS[0];

  useEffect(() => {
    const fetchPreview = async () => {
      if (previewCache[activeStyleId] || previewErrors[activeStyleId] || isLoadingPreview) return;
      setIsLoadingPreview(true);
      try {
        const url = await generateStylePreview(activeStyleOption.label, activeStyleOption.desc);
        setPreviewCache(prev => ({ ...prev, [activeStyleId]: url }));
      } catch (error) {
        setPreviewErrors(prev => ({ ...prev, [activeStyleId]: true }));
      } finally {
        setIsLoadingPreview(false);
      }
    };
    if (isStyleOpen) fetchPreview();
  }, [activeStyleId, isStyleOpen, activeStyleOption]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { alert("文件过大"); return; }
      if (images.length >= 10) { alert("最多10张"); return; }
      const reader = new FileReader();
      reader.onloadend = () => setImages(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => setImages(prev => prev.filter((_, i) => i !== index));
  const triggerFileSelect = () => fileInputRef.current?.click();
  const addSavedCharacter = (char: Character) => {
    if (images.length >= 10) { alert("最多10张"); return; }
    setImages(prev => [...prev, char.imageUrl]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (theme && images.length > 0) onSubmit(theme, images, selectedStyle, mode, aspectRatio);
  };

  return (
    <div className="p-6 lg:p-12 max-w-7xl mx-auto animate-in fade-in duration-500 pb-24">
       <div className="mb-10">
          <h2 className="text-3xl font-bold text-white mb-2">开始创作</h2>
          <p className="text-slate-400 font-light">配置您的项目参数，Gemini 将为您构建视觉世界。</p>
       </div>

       <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Configuration */}
          <div className="lg:col-span-5 space-y-6">
             
             {/* Mode & Ratio Card */}
             <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex items-center gap-2 mb-2">
                   <LayoutTemplate className="w-4 h-4 text-indigo-400" />
                   <h3 className="text-sm font-bold text-white uppercase tracking-wider">基础设置</h3>
                </div>

                <div className="space-y-3">
                   <label className="text-xs text-slate-500 font-bold">生成模式</label>
                   <div className="grid grid-cols-2 gap-3">
                     <button type="button" onClick={() => setMode('storyboard')} className={`p-4 rounded-xl border text-left transition-all ${mode === 'storyboard' ? 'bg-indigo-600/10 border-indigo-500 text-white' : 'bg-black/20 border-white/5 text-slate-400 hover:bg-white/5'}`}>
                        <Monitor className={`w-5 h-5 mb-2 ${mode === 'storyboard' ? 'text-indigo-400' : 'text-slate-500'}`} />
                        <div className="font-bold text-sm">分镜故事</div>
                        <div className="text-[10px] opacity-60">Cinematic Storyboard</div>
                     </button>
                     <button type="button" onClick={() => setMode('comic')} className={`p-4 rounded-xl border text-left transition-all ${mode === 'comic' ? 'bg-indigo-600/10 border-indigo-500 text-white' : 'bg-black/20 border-white/5 text-slate-400 hover:bg-white/5'}`}>
                        <Square className={`w-5 h-5 mb-2 ${mode === 'comic' ? 'text-indigo-400' : 'text-slate-500'}`} />
                        <div className="font-bold text-sm">宫格漫画</div>
                        <div className="text-[10px] opacity-60">Comic Strip / Manga</div>
                     </button>
                   </div>
                </div>

                <div className="space-y-3">
                   <label className="text-xs text-slate-500 font-bold">画幅比例</label>
                   <div className="flex flex-wrap gap-2">
                      {ASPECT_RATIOS.map((ratio) => (
                        <button key={ratio} type="button" onClick={() => setAspectRatio(ratio)} className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${aspectRatio === ratio ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'bg-black/20 border-transparent text-slate-500 hover:border-white/10'}`}>
                          {ratio}
                        </button>
                      ))}
                   </div>
                </div>
             </div>

             {/* Style Card */}
             <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4" ref={dropdownRef}>
                <div className="flex items-center gap-2 mb-2">
                   <Palette className="w-4 h-4 text-purple-400" />
                   <h3 className="text-sm font-bold text-white uppercase tracking-wider">艺术风格</h3>
                </div>
                
                <div className="relative">
                   <button type="button" onClick={() => setIsStyleOpen(!isStyleOpen)} className="w-full bg-black/20 border border-white/10 hover:border-indigo-500/30 text-white rounded-xl px-4 py-4 flex items-center justify-between transition-all group hover:bg-black/30">
                     <div className="flex flex-col items-start gap-1">
                       <span className="text-base font-bold tracking-wide">{selectedStyle}</span>
                       <span className="text-xs text-slate-500">{activeStyleOption.desc}</span>
                     </div>
                     <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${isStyleOpen ? 'rotate-180' : ''}`} />
                   </button>

                   {isStyleOpen && (
                     <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-[#151921] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 ring-1 ring-black/50">
                        <div className="flex flex-col md:flex-row h-[320px]">
                           <div className="w-full md:w-1/2 overflow-y-auto custom-scrollbar bg-[#0F121A]">
                              {ART_STYLE_OPTIONS.map((style) => (
                                 <button key={style.id} type="button" onClick={() => { setSelectedStyle(style.id); setIsStyleOpen(false); }} onMouseEnter={() => setHoveredStyle(style.id)} onMouseLeave={() => setHoveredStyle(null)} className={`w-full px-4 py-3 text-left flex items-center justify-between border-b border-white/5 transition-all ${selectedStyle === style.id ? 'bg-indigo-500/10 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
                                    <div><p className={`text-xs font-bold ${selectedStyle === style.id ? 'text-indigo-400' : ''}`}>{style.label}</p></div>
                                    {selectedStyle === style.id && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                                 </button>
                              ))}
                           </div>
                           <div className="hidden md:flex w-1/2 bg-black flex-col relative overflow-hidden">
                              {previewCache[activeStyleId] ? (
                                 <img src={previewCache[activeStyleId]} className="absolute inset-0 w-full h-full object-cover animate-in fade-in" />
                              ) : (
                                 <div className={`absolute inset-0 bg-gradient-to-br ${activeStyleOption.fallbackGradient} opacity-50 flex items-center justify-center`}>{isLoadingPreview && <Loader2 className="w-6 h-6 animate-spin text-white/50" />}</div>
                              )}
                              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                                 <p className="text-white font-bold text-sm">{activeStyleOption.label}</p>
                              </div>
                           </div>
                        </div>
                     </div>
                   )}
                </div>
             </div>
          </div>

          {/* RIGHT COLUMN: Characters & Prompt */}
          <div className="lg:col-span-7 space-y-6">
             
             {/* Character Selection */}
             <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-pink-400" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">演员阵容</h3>
                   </div>
                   <button type="button" onClick={() => setShowWorkshop(true)} className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-slate-300 transition-colors flex items-center gap-2">
                      <Plus className="w-3 h-3" /> 新建角色
                   </button>
                </div>
                
                {/* Image Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                   {images.map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/10 group hover:border-indigo-500/50 transition-all shadow-sm">
                         <img src={img} className="w-full h-full object-cover" />
                         <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-500 text-white rounded-md transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100">
                            <X className="w-3 h-3" />
                         </button>
                      </div>
                   ))}
                   {images.length < 10 && (
                      <div onClick={triggerFileSelect} className="aspect-square border border-dashed border-white/10 hover:border-indigo-500/50 bg-white/5 hover:bg-white/10 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group">
                         <Plus className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 mb-1" />
                         <span className="text-[9px] text-slate-500">Upload</span>
                      </div>
                   )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                
                {/* Saved Characters Bar */}
                {savedCharacters.length > 0 && (
                   <div className="pt-2 border-t border-white/5 mt-4">
                      <p className="text-[10px] text-slate-500 mb-2 font-bold uppercase">从库中选择</p>
                      <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                         {savedCharacters.map(char => (
                            <button key={char.id} type="button" onClick={() => addSavedCharacter(char)} className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden border border-white/10 hover:border-indigo-500 transition-all relative group" title={char.name}>
                               <img src={char.imageUrl} className="w-full h-full object-cover" />
                               <div className="absolute inset-0 bg-indigo-500/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Plus className="w-4 h-4 text-white" /></div>
                            </button>
                         ))}
                      </div>
                   </div>
                )}
             </div>

             {/* Prompt & Submit */}
             <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col gap-4 min-h-[200px]">
                <div className="flex items-center gap-2 mb-2">
                   <PenTool className="w-4 h-4 text-green-400" />
                   <h3 className="text-sm font-bold text-white uppercase tracking-wider">故事大纲</h3>
                </div>
                <textarea 
                  value={theme} 
                  onChange={(e) => setTheme(e.target.value)} 
                  placeholder={mode === 'storyboard' ? "描述一个激动人心的电影开场..." : "描述一个有趣的四格漫画剧情..."} 
                  className="w-full flex-1 bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-slate-600 focus:ring-1 focus:ring-indigo-500 outline-none resize-none leading-relaxed" 
                />
                
                <button type="submit" disabled={!theme || images.length === 0 || isGenerating} className={`w-full py-4 px-6 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all shadow-xl relative overflow-hidden group ${(!theme || images.length === 0 || isGenerating) ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/25'}`}>
                   {isGenerating ? (
                      <>
                        <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>AI 正在分析与生成...</span>
                      </>
                   ) : (
                      <>
                        <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                        <span>生成项目</span>
                      </>
                   )}
                </button>
             </div>
          </div>
       </form>
       
       {showWorkshop && <CharacterWorkshop onClose={() => setShowWorkshop(false)} onSave={onSaveCharacter} />}
    </div>
  );
};

export default StoryForm;
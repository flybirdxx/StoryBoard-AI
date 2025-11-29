import React, { useState, useRef, useEffect } from 'react';
import { Upload, Sparkles, Image as ImageIcon, X, Palette, Plus, Users, PenTool, LayoutTemplate, Square, Monitor, Wand2, Loader2 } from 'lucide-react';
import { ArtStyle, GenerationMode, AspectRatio, Character } from '../types';
import CharacterWorkshop from './CharacterWorkshop';
import { useStoryStore } from '../store/useStoryStore';

interface StoryFormProps {
  onSubmit: (theme: string, images: string[], artStyle: ArtStyle, mode: GenerationMode, ratio: AspectRatio) => void;
  isGenerating: boolean;
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
  { id: 'custom', label: '自定义风格', desc: '手动输入艺术风格提示词', fallbackGradient: 'from-slate-800 to-zinc-900' },
];

const ASPECT_RATIOS: AspectRatio[] = ['16:9', '9:16', '1:1', '4:3', '3:4'];

const StoryForm: React.FC<StoryFormProps> = ({ onSubmit, isGenerating }) => {
  const { savedCharacters, addSavedCharacter } = useStoryStore();
  const [theme, setTheme] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<ArtStyle>('电影写实');
  const [customStyleInput, setCustomStyleInput] = useState('');
  const [showWorkshop, setShowWorkshop] = useState(false);
  const [mode, setMode] = useState<GenerationMode>('storyboard');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === 'storyboard') {
      setAspectRatio('16:9');
    } else {
      setAspectRatio('4:3'); 
    }
  }, [mode]);

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
  const handleAddSavedCharacter = (char: Character) => {
    if (images.length >= 10) { alert("最多10张"); return; }
    setImages(prev => [...prev, char.imageUrl]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalStyle = selectedStyle;
    if (selectedStyle === 'custom') {
        if (!customStyleInput.trim()) {
           alert("请输入自定义风格描述");
           return;
        }
        finalStyle = customStyleInput.trim();
    }
    if (theme && images.length > 0) onSubmit(theme, images, finalStyle, mode, aspectRatio);
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
             <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2 mb-2">
                   <Palette className="w-4 h-4 text-purple-400" />
                   <h3 className="text-sm font-bold text-white uppercase tracking-wider">艺术风格</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-2.5">
                   {ART_STYLE_OPTIONS.map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setSelectedStyle(style.id)}
                        className={`relative p-3 rounded-xl border text-left transition-all overflow-hidden group flex flex-col justify-between h-20 ${
                           selectedStyle === style.id 
                             ? 'bg-indigo-500/10 border-indigo-500/50 ring-1 ring-indigo-500/20' 
                             : 'bg-black/20 border-white/5 hover:border-white/20 hover:bg-white/5'
                        }`}
                      >
                         <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${style.fallbackGradient} opacity-60 group-hover:opacity-100 transition-opacity`} />
                         <div className="mt-1">
                             <div className="flex items-center justify-between">
                                <span className={`text-xs font-bold block mb-0.5 ${selectedStyle === style.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                    {style.label}
                                </span>
                                {selectedStyle === style.id && (
                                   <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,1)]"></div>
                                )}
                             </div>
                             <span className="text-[9px] text-slate-600 leading-tight block line-clamp-2 pr-1">
                                 {style.desc}
                             </span>
                         </div>
                      </button>
                   ))}
                </div>

                {selectedStyle === 'custom' && (
                  <div className="animate-in fade-in slide-in-from-top-2 pt-2 bg-black/20 rounded-xl p-3 border border-white/5">
                     <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
                        <Wand2 className="w-3 h-3" />
                        输入自定义风格提示词
                     </label>
                     <textarea
                        value={customStyleInput}
                        onChange={(e) => setCustomStyleInput(e.target.value)}
                        placeholder="例如：梵高星空风格，厚涂油画，蓝色与黄色主调，笔触明显..."
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-slate-600 focus:ring-1 focus:ring-indigo-500 outline-none resize-none shadow-inner"
                        rows={3}
                     />
                  </div>
                )}
             </div>
          </div>

          {/* RIGHT COLUMN */}
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
                
                {savedCharacters.length > 0 && (
                   <div className="pt-2 border-t border-white/5 mt-4">
                      <p className="text-[10px] text-slate-500 mb-2 font-bold uppercase">从库中选择</p>
                      <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                         {savedCharacters.map(char => (
                            <button key={char.id} type="button" onClick={() => handleAddSavedCharacter(char)} className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden border border-white/10 hover:border-indigo-500 transition-all relative group" title={char.name}>
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
       
       {showWorkshop && <CharacterWorkshop onClose={() => setShowWorkshop(false)} onSave={addSavedCharacter} />}
    </div>
  );
};

export default StoryForm;
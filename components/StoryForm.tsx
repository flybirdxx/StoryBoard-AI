
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Palette, Plus, Users, PenTool, LayoutTemplate, Square, Monitor, Wand2, Loader2, StopCircle, UserPlus } from 'lucide-react';
import { ArtStyle, GenerationMode, AspectRatio, Character, ExtractedCharacter } from '../types';
import { ART_STYLE_OPTIONS, ASPECT_RATIOS } from '../constants';
import CharacterWorkshop from './CharacterWorkshop';
import CharacterExtractor from './CharacterExtractor';
import { useStoryStore } from '../store/useStoryStore';
import { toast } from 'sonner';
import { optimizeStoryOutline } from '../services/geminiService';
import '../styles/story-form.css';

interface StoryFormProps {
  onSubmit: (theme: string, images: string[], artStyle: ArtStyle, mode: GenerationMode, ratio: AspectRatio) => void;
  isGenerating: boolean;
  onCancel?: () => void;
}

// 渐变颜色映射
const getGradientColors = (gradient: string): { start: string; end: string } => {
  const gradientMap: Record<string, { start: string; end: string }> = {
    'from-slate-900 to-slate-700': { start: '#0f172a', end: '#334155' },
    'from-red-900 to-blue-900': { start: '#7f1d1d', end: '#1e3a8a' },
    'from-pink-900 to-indigo-900': { start: '#831843', end: '#312e81' },
    'from-emerald-900 to-teal-900': { start: '#064e3b', end: '#134e4a' },
    'from-fuchsia-900 to-purple-900': { start: '#701a75', end: '#581c87' },
    'from-amber-900 to-orange-900': { start: '#78350f', end: '#9a3412' },
    'from-gray-900 to-black': { start: '#111827', end: '#000000' },
    'from-blue-600 to-cyan-500': { start: '#2563eb', end: '#06b6d4' },
    'from-gray-200 to-white': { start: '#e5e7eb', end: '#ffffff' },
    'from-indigo-600 to-purple-600': { start: '#4f46e5', end: '#9333ea' },
    'from-yellow-700 to-blue-800': { start: '#a16207', end: '#1e40af' },
    'from-slate-800 to-zinc-900': { start: '#1e293b', end: '#18181b' },
  };
  return gradientMap[gradient] || { start: '#1e293b', end: '#18181b' };
};

const StoryForm: React.FC<StoryFormProps> = ({ onSubmit, isGenerating, onCancel }) => {
  const { savedCharacters, addSavedCharacter } = useStoryStore();
  const [theme, setTheme] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<ArtStyle>('电影写实');
  const [customStyleInput, setCustomStyleInput] = useState('');
  const [showWorkshop, setShowWorkshop] = useState(false);
  const [showExtractor, setShowExtractor] = useState(false);
  const [mode, setMode] = useState<GenerationMode>('storyboard');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [isOptimizing, setIsOptimizing] = useState(false);

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
      if (file.size > 5 * 1024 * 1024) { toast.error("文件过大 (限制 5MB)"); return; }
      if (images.length >= 10) { toast.error("最多上传 10 张图片"); return; }
      const reader = new FileReader();
      reader.onloadend = () => setImages(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => setImages(prev => prev.filter((_, i) => i !== index));
  const triggerFileSelect = () => fileInputRef.current?.click();
  const handleAddSavedCharacter = (char: Character) => {
    if (images.length >= 10) { toast.error("最多 10 张图片"); return; }
    setImages(prev => [...prev, char.imageUrl]);
    toast.success(`已添加角色: ${char.name}`);
  };

  const handleExtractedCharacters = (extracted: ExtractedCharacter[]) => {
    // 将提取的角色图像添加到演员阵容
    const newImages = extracted
      .filter(char => char.imageUrl)
      .map(char => char.imageUrl!)
      .slice(0, 10 - images.length);
    
    if (newImages.length > 0) {
      setImages(prev => [...prev, ...newImages]);
      toast.success(`已添加 ${newImages.length} 个角色图像到演员阵容`);
    } else {
      toast.info("提取的角色没有图像，请先为角色生成图像");
    }
    
    // 可选：将提取的角色保存到角色库
    extracted.forEach(char => {
      if (char.imageUrl) {
        addSavedCharacter({
          id: char.id,
          name: char.name,
          description: `${char.description}\n\n外观：${char.appearance}${char.personality ? `\n性格：${char.personality}` : ''}`,
          imageUrl: char.imageUrl,
          appearance: char.appearance,
          personality: char.personality,
          role: char.role,
        });
      }
    });
    
    setShowExtractor(false);
  };

  const handleOptimizeOutline = async () => {
    if (!theme.trim()) {
      toast.error("请先输入故事大纲");
      return;
    }

    setIsOptimizing(true);
    try {
      const optimized = await optimizeStoryOutline(theme, mode);
      setTheme(optimized);
      toast.success("故事大纲已优化！");
    } catch (error: any) {
      console.error("Optimize outline error:", error);
      toast.error(error?.message || "优化失败，请稍后重试");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalStyle = selectedStyle;
    if (selectedStyle === 'custom') {
        if (!customStyleInput.trim()) {
           toast.error("请输入自定义风格描述");
           return;
        }
        finalStyle = customStyleInput.trim();
    }
    if (theme && images.length > 0) onSubmit(theme, images, finalStyle, mode, aspectRatio);
  };

  return (
    <div className="story-form-container">
       <div className="story-form-wrapper">
          <div className="story-form-header">
             <h2 className="story-form-title">开始创作</h2>
             <p className="story-form-subtitle">配置您的项目参数，Gemini 将为您构建视觉世界。</p>
       </div>

          <form onSubmit={handleSubmit} className="story-form-grid">
          
          {/* LEFT COLUMN: Configuration */}
          <div className="story-form-left">
             {/* Mode & Ratio Card */}
             <div className="settings-card">
                <div className="settings-card-header">
                   <LayoutTemplate className="icon-md icon-indigo" />
                   <h3 className="settings-card-title">基础设置</h3>
                </div>

                <div className="space-y-3">
                   <label className="label">生成模式</label>
                    <div className="mode-selector">
                      <button 
                        type="button" 
                        onClick={() => setMode('storyboard')} 
                        className={`mode-button ${mode === 'storyboard' ? 'active' : ''}`}
                      >
                        <div className="mode-button-icon-wrapper">
                          <Monitor className="mode-button-icon" />
                        </div>
                        <div className="mode-button-content">
                          <div className="mode-button-label">分镜故事</div>
                          <div className="mode-button-desc">Cinematic Storyboard</div>
                        </div>
                     </button>
                      <button 
                        type="button" 
                        onClick={() => setMode('comic')} 
                        className={`mode-button ${mode === 'comic' ? 'active' : ''}`}
                      >
                        <div className="mode-button-icon-wrapper">
                          <Square className="mode-button-icon" />
                        </div>
                        <div className="mode-button-content">
                          <div className="mode-button-label">条漫漫画</div>
                          <div className="mode-button-desc">Comic Strip / Manga</div>
                        </div>
                     </button>
                   </div>
                </div>

                <div className="space-y-3">
                   <label className="label">画幅比例</label>
                   <div className="aspect-ratio-selector">
                      {ASPECT_RATIOS.map((ratio) => (
                        <button 
                          key={ratio} 
                          type="button" 
                          onClick={() => setAspectRatio(ratio)} 
                          className={`aspect-ratio-button ${aspectRatio === ratio ? 'active' : ''}`}
                        >
                          {ratio}
                        </button>
                      ))}
                   </div>
                </div>
             </div>

             {/* Style Card */}
             <div className="settings-card">
                <div className="settings-card-header">
                   <Palette className="icon-md icon-indigo" />
                   <h3 className="settings-card-title">艺术风格</h3>
                </div>
                
                <div className="art-style-grid">
                   {ART_STYLE_OPTIONS.map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setSelectedStyle(style.id)}
                        className={`art-style-button ${selectedStyle === style.id ? 'active' : ''}`}
                      >
                         <div 
                           className="art-style-gradient" 
                           style={{
                             background: `linear-gradient(to right, ${getGradientColors(style.fallbackGradient).start}, ${getGradientColors(style.fallbackGradient).end})`
                           }}
                         />
                         <div className="art-style-content">
                             <span className="art-style-label">
                                    {style.label}
                                </span>
                             <span className="art-style-desc">
                                 {style.desc}
                             </span>
                         </div>
                      </button>
                   ))}
                </div>

                {selectedStyle === 'custom' && (
                  <div className="custom-style-input">
                     <label className="custom-style-label">
                        <Wand2 className="icon-sm" />
                        输入自定义风格提示词
                     </label>
                     <textarea
                        value={customStyleInput}
                        onChange={(e) => setCustomStyleInput(e.target.value)}
                        placeholder="例如：梵高星空风格，厚涂油画，蓝色与黄色主调，笔触明显..."
                        className="custom-style-textarea"
                        rows={3}
                     />
                  </div>
                )}
             </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="story-form-right">
             {/* Character Selection - Redesigned */}
             <div className="cast-section-modern">
                {/* Header */}
                <div className="cast-section-header">
                   <div className="cast-section-title-group">
                      <Users className="cast-section-icon" />
                      <div>
                         <h3 className="cast-section-title">演员阵容</h3>
                         <p className="cast-section-subtitle">添加角色图像以保持视觉一致性</p>
                      </div>
                   </div>
                   <div className="cast-section-count">
                      <span className="cast-section-count-current">{images.length}</span>
                      <span className="cast-section-count-separator">/</span>
                      <span className="cast-section-count-total">10</span>
                   </div>
                </div>

                {/* Action Buttons */}
                <div className="cast-section-actions">
                   <button 
                      type="button" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!theme.trim()) {
                          toast.error("请先输入故事大纲");
                          return;
                        }
                        setShowExtractor(true);
                      }} 
                      className="cast-action-button cast-action-button-primary"
                      title="从大纲中自动提取角色"
                   >
                      <UserPlus size={18} />
                      <span>自动提取</span>
                   </button>
                   <button 
                      type="button" 
                      onClick={() => setShowWorkshop(true)} 
                      className="cast-action-button cast-action-button-secondary"
                      title="创建新角色"
                   >
                      <Plus size={18} />
                      <span>新建角色</span>
                   </button>
                </div>
                
                {/* Cast Grid */}
                <div className="cast-section-content">
                   <div className="cast-grid-modern">
                      {images.map((img, idx) => (
                         <div key={idx} className="cast-item-modern">
                            <div className="cast-item-number-modern">{idx + 1}</div>
                            <img src={img} className="cast-item-image-modern" alt={`Character ${idx + 1}`} />
                            <button 
                               type="button" 
                               onClick={() => removeImage(idx)} 
                               className="cast-item-remove-modern"
                               title="移除"
                            >
                               <X size={14} />
                            </button>
                         </div>
                      ))}
                      {images.length < 10 && (
                         <div 
                            onClick={triggerFileSelect} 
                            className="cast-upload-modern"
                            title="上传图片"
                         >
                            <div className="cast-upload-icon-modern">
                               <Plus size={24} />
                            </div>
                            <span className="cast-upload-text-modern">上传图片</span>
                            <span className="cast-upload-hint-modern">支持多选</span>
                         </div>
                      )}
                   </div>
                </div>
                
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple className="hidden" />
                
                {/* Character Library */}
                {savedCharacters.length > 0 && (
                   <div className="cast-library-modern">
                      <div className="cast-library-header-modern">
                         <div className="cast-library-title-group">
                            <Users size={16} />
                            <span className="cast-library-title">角色库</span>
                         </div>
                         <span className="cast-library-count-modern">{savedCharacters.length} 个角色</span>
                      </div>
                      <div className="cast-library-list-modern">
                         {savedCharacters.map(char => (
                            <button 
                              key={char.id} 
                              type="button" 
                              onClick={() => handleAddSavedCharacter(char)} 
                              className="cast-library-item-modern" 
                              title={char.name}
                            >
                               <img src={char.imageUrl} className="cast-library-item-image-modern" alt={char.name} />
                               <div className="cast-library-item-overlay-modern">
                                 <Plus size={16} />
                               </div>
                               <div className="cast-library-item-name-modern">{char.name}</div>
                            </button>
                         ))}
                      </div>
                   </div>
                )}
             </div>

             {/* Story Outline - Redesigned */}
             <div className="story-outline-modern">
                {/* Header */}
                <div className="story-outline-header-modern">
                   <div className="story-outline-title-group">
                      <PenTool className="story-outline-icon" />
                      <div>
                         <h3 className="story-outline-title">故事大纲</h3>
                         <p className="story-outline-subtitle">描述您的故事或漫画剧情</p>
                      </div>
                   </div>
                   <div className="story-outline-actions-modern">
                      <button 
                         onClick={handleOptimizeOutline}
                         disabled={!theme.trim() || isOptimizing}
                         className="story-outline-action-button story-outline-action-button-primary"
                         title="使用 Gemini 3 优化大纲"
                      >
                         {isOptimizing ? (
                            <>
                               <Loader2 size={16} className="animate-spin" />
                               <span>优化中...</span>
                            </>
                         ) : (
                            <>
                               <Sparkles size={16} />
                               <span>AI 优化</span>
                            </>
                         )}
                      </button>
                      <button 
                         className="story-outline-action-button story-outline-action-button-secondary"
                         title="分享"
                      >
                         分享
                      </button>
                   </div>
                </div>
                
                {/* Textarea */}
                <div className="story-outline-content-modern">
                   <textarea 
                      value={theme} 
                      onChange={(e) => setTheme(e.target.value)} 
                      placeholder={mode === 'storyboard' ? "描述一个激动人心的故事开发..." : "描述一个有趣的四格漫画剧情..."} 
                      className="story-outline-textarea-modern"
                      disabled={isOptimizing}
                      rows={8}
                   />
                   {theme && (
                      <div className="story-outline-counter">
                         <span>{theme.length} 字符</span>
                      </div>
                   )}
                </div>
             </div>
             
             <button 
               type="submit" 
               disabled={!theme || images.length === 0 || isGenerating} 
               className="story-form-submit"
             >
                      {isGenerating ? (
                          <>
                     <div className="story-form-submit-loading"></div>
                     <Loader2 className="icon-lg animate-spin" />
                            <span>AI 正在分析与生成...</span>
                          </>
                      ) : (
                          <>
                     <Sparkles className="icon-lg" />
                            <span>生成项目</span>
                          </>
                      )}
                    </button>
                    {isGenerating && onCancel && (
                <button type="button" onClick={onCancel} className="story-form-cancel">
                   <StopCircle className="icon-lg" />
                          <span>取消</span>
                       </button>
                    )}
                </div>
          </form>
          </div>
       
       {showWorkshop && (
         <CharacterWorkshop 
           onClose={() => setShowWorkshop(false)} 
           onSave={(character) => {
             addSavedCharacter(character);
             setShowWorkshop(false);
           }}
         />
       )}

       {showExtractor && (
         <CharacterExtractor
           outline={theme}
           mode={mode}
           onConfirm={handleExtractedCharacters}
           onCancel={() => setShowExtractor(false)}
         />
       )}
    </div>
  );
};

export default StoryForm;

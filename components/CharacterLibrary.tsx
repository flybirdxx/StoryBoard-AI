import React, { useState, useRef, useEffect } from 'react';
import { Asset, DetectedCharacter, ImageStyle } from '../types';
import { Users, Plus, Loader2, AlertTriangle, CheckCircle2, Sparkles, Palette, Bold, Italic, List, X, Edit3, Trash2 } from 'lucide-react';
import { generateCharacterImage } from '../services/geminiService';

interface CharacterLibraryProps {
  characters: Asset[];
  detectedCharacters: DetectedCharacter[];
  onAddCharacter: (asset: Asset) => void;
  onRemoveCharacter: (id: string) => void;
  onNext: () => void;
  selectedStyle: ImageStyle;
  onStyleChange: (style: ImageStyle) => void;
}

// Helper to strip HTML for AI prompt
const stripHtml = (html: string) => {
   const tmp = document.createElement("DIV");
   tmp.innerHTML = html;
   return tmp.textContent || tmp.innerText || "";
};

const RichTextEditor = ({ value, onChange, placeholder }: { value: string, onChange: (html: string) => void, placeholder?: string }) => {
  const contentEditableRef = useRef<HTMLDivElement>(null);

  // Sync external value changes (e.g. reset) to the editable div
  useEffect(() => {
    if (contentEditableRef.current && contentEditableRef.current.innerHTML !== value) {
       // Only update if empty (reset) to avoid cursor jumping
       if (value === '') {
         contentEditableRef.current.innerHTML = '';
       }
    }
  }, [value]);

  const exec = (command: string, val?: string) => {
    document.execCommand(command, false, val);
    if (contentEditableRef.current) {
        onChange(contentEditableRef.current.innerHTML);
    }
  };

  return (
    <div className="bg-app-bg border border-app-border rounded-md overflow-hidden flex flex-col h-32 group focus-within:border-app-accent transition-colors relative">
      <div className="flex items-center gap-1 p-1 border-b border-app-border bg-[#11141d]">
        <button onClick={() => exec('bold')} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors" title="Bold">
          <Bold size={12} />
        </button>
        <button onClick={() => exec('italic')} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors" title="Italic">
          <Italic size={12} />
        </button>
        <button onClick={() => exec('insertUnorderedList')} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors" title="List">
          <List size={12} />
        </button>
      </div>
      <div 
        ref={contentEditableRef}
        className="flex-1 p-3 text-xs text-white focus:outline-none overflow-y-auto leading-relaxed"
        contentEditable
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        style={{ minHeight: '60px' }}
      />
      {!value && (
        <div className="absolute top-9 left-3 text-xs text-gray-600 pointer-events-none">
            {placeholder || "输入内容..."}
        </div>
      )}
    </div>
  );
};

export const CharacterLibrary: React.FC<CharacterLibraryProps> = ({ 
  characters = [], 
  detectedCharacters = [],
  onAddCharacter, 
  onRemoveCharacter, 
  onNext,
  selectedStyle,
  onStyleChange
}) => {
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  
  // Modal State
  const [selectedChar, setSelectedChar] = useState<Asset | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Manual Creation State
  const [newCharName, setNewCharName] = useState('');
  const [newCharDesc, setNewCharDesc] = useState('');
  const [manualStyle, setManualStyle] = useState<ImageStyle>(selectedStyle);

  const styleMap: Record<ImageStyle, string> = {
    'Cinematic': '电影质感',
    'Anime': '日式动漫',
    '3D Render': '3D 渲染',
    'Watercolor': '水彩画',
    'Cyberpunk': '赛博朋克',
    'Sketch': '素描手绘',
    'Film Noir': '黑色电影',
    'Wes Anderson': '韦斯·安德森',
    'Studio Ghibli': '吉卜力风格',
    'Retro Sci-Fi': '复古科幻',
    'Comic Book': '美漫风格'
  };

  const styles = Object.keys(styleMap) as ImageStyle[];

  // Sync manual style when global selectedStyle changes initially, but allow override
  useEffect(() => {
    setManualStyle(selectedStyle);
  }, [selectedStyle]);

  // --------------------------------------------------------------------------
  // Consistency Check Logic
  // --------------------------------------------------------------------------
  const getConsistencyStatus = (detectedName: string) => {
    // Safety check for characters array
    const safeCharacters = Array.isArray(characters) ? characters : [];
    const match = safeCharacters.find(c => c.name.toLowerCase().includes(detectedName.toLowerCase()) || detectedName.toLowerCase().includes(c.name.toLowerCase()));
    return !!match;
  };

  const handleAutoGenerate = async (detected: DetectedCharacter) => {
    setGeneratingId(detected.name);
    // Use the currently selected global style
    const imageUrl = await generateCharacterImage(detected.description, selectedStyle);
    setGeneratingId(null);

    if (imageUrl) {
        const newAsset: Asset = {
            id: Date.now().toString(),
            name: detected.name,
            type: 'Character',
            description: detected.description,
            imageUrl: imageUrl
        };
        onAddCharacter(newAsset);
    }
  };

  const handleManualCreate = async () => {
    if (!newCharName || !newCharDesc) return;
    
    setGeneratingId('manual');
    
    // Strip HTML tags for the AI prompt to ensure clean generation
    const cleanDescription = stripHtml(newCharDesc);
    const imageUrl = await generateCharacterImage(cleanDescription, manualStyle);
    
    setGeneratingId(null);

    if (imageUrl) {
        const newAsset: Asset = {
            id: Date.now().toString(),
            name: newCharName,
            type: 'Character',
            description: cleanDescription, // We save the clean description for consistency
            imageUrl: imageUrl
        };
        onAddCharacter(newAsset);
        setNewCharName('');
        setNewCharDesc('');
    }
  };

  const openModal = (char: Asset) => {
    setSelectedChar(char);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedChar(null);
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto relative">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
           <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-2">
            <Users className="text-cyan-400" />
            角色库 & 一致性检查
           </h2>
           <p className="text-gray-500 text-sm">确保剧本中的所有角色都已设定形象，以保持分镜的一致性。</p>
        </div>

        <div className="flex items-center gap-4">
            {/* Global Style Selector */}
            <div className="flex items-center gap-2 bg-app-card border border-app-border rounded-lg px-3 py-2 shadow-sm">
               <Palette size={16} className="text-purple-400" />
               <span className="text-xs text-gray-400 font-medium">生成风格:</span>
               <select 
                 value={selectedStyle} 
                 onChange={(e) => onStyleChange(e.target.value as ImageStyle)}
                 className="bg-transparent text-sm font-medium text-gray-200 focus:outline-none cursor-pointer hover:text-white transition-colors"
               >
                 {styles.map(s => <option key={s} value={s} className="bg-app-card">{styleMap[s]}</option>)}
               </select>
            </div>

            <button 
              onClick={onNext}
              className="bg-app-accent hover:bg-app-accentHover text-white px-6 py-2 rounded-full font-semibold shadow-lg shadow-purple-900/40 flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
            >
                <Sparkles size={18} />
                开始生成故事板
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* LEFT: Consistency Check Panel */}
        <div className="xl:col-span-1 space-y-6">
           <div className="bg-[#151923] border border-app-border rounded-xl p-5 shadow-lg">
             <h3 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
               <AlertTriangle size={16} className="text-yellow-500" />
               剧本角色检测 ({detectedCharacters?.length || 0})
             </h3>
             
             <div className="space-y-3">
               {detectedCharacters?.length === 0 && (
                 <div className="text-gray-600 text-xs italic text-center py-4">
                   未检测到角色信息，请先进行剧本分析
                 </div>
               )}
               {detectedCharacters?.map((char, idx) => {
                 const isPresent = getConsistencyStatus(char.name);
                 return (
                   <div key={idx} className={`p-3 rounded-lg border flex flex-col gap-2 transition-colors ${isPresent ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-red-900/10 border-red-500/30'}`}>
                      <div className="flex items-center justify-between">
                         <div className="font-medium text-gray-200 text-sm">{char.name}</div>
                         {isPresent ? (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded-full">
                               <CheckCircle2 size={10} /> 已就绪
                            </span>
                         ) : (
                            <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-900/30 px-2 py-0.5 rounded-full">
                               <AlertTriangle size={10} /> 缺失
                            </span>
                         )}
                      </div>
                      <div className="text-[10px] text-gray-500 line-clamp-2">
                        {char.role} - {char.description}
                      </div>
                      {!isPresent && (
                        <button 
                          onClick={() => handleAutoGenerate(char)}
                          disabled={generatingId === char.name}
                          className="mt-1 w-full py-2 bg-gray-800 hover:bg-app-accent text-gray-300 hover:text-white text-xs rounded transition-colors flex items-center justify-center gap-1.5 font-medium border border-gray-700 hover:border-transparent"
                        >
                           {generatingId === char.name ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                           一键生成形象 ({styleMap[selectedStyle]})
                        </button>
                      )}
                   </div>
                 );
               })}
             </div>
           </div>
           
           {/* Manual Add Form */}
           <div className="bg-app-card border-2 border-dashed border-app-border rounded-xl p-5 flex flex-col gap-3 hover:border-gray-600 transition-colors">
              <h3 className="font-semibold text-gray-300 text-sm">自定义添加</h3>
              <input 
                  type="text" 
                  placeholder="角色名称"
                  className="bg-app-bg border border-app-border rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-app-accent"
                  value={newCharName}
                  onChange={e => setNewCharName(e.target.value)}
              />
              
              <RichTextEditor 
                value={newCharDesc}
                onChange={setNewCharDesc}
                placeholder="外貌描述 (如: 身穿银色战甲...)"
              />
              
              {/* Manual Style Selector */}
              <div className="flex items-center gap-2 bg-app-bg border border-app-border rounded px-3 py-2 group focus-within:border-app-accent transition-colors">
                 <Palette size={14} className="text-gray-500 group-focus-within:text-app-accent" />
                 <select 
                   value={manualStyle}
                   onChange={(e) => setManualStyle(e.target.value as ImageStyle)}
                   className="bg-transparent text-xs text-gray-300 focus:outline-none w-full cursor-pointer hover:text-white"
                 >
                    {styles.map(s => <option key={s} value={s} className="bg-app-card">{styleMap[s]}</option>)}
                 </select>
              </div>

              <button 
                  onClick={handleManualCreate}
                  disabled={generatingId === 'manual' || !newCharName || !stripHtml(newCharDesc).trim()}
                  className="w-full py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white rounded-lg flex items-center justify-center gap-2 transition-colors text-xs font-medium"
              >
                  {generatingId === 'manual' ? <Loader2 className="animate-spin" size={12} /> : <Plus size={12} />}
                  生成并添加
              </button>
          </div>
        </div>

        {/* RIGHT: Character Library Grid */}
        <div className="xl:col-span-2 relative h-[calc(100vh-200px)] flex flex-col">
          <h3 className="text-sm font-bold text-gray-300 mb-4 flex-shrink-0">当前角色库 ({characters?.length || 0})</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pb-20 pr-2 custom-scrollbar content-start">
            {characters?.map(char => (
                <div 
                    key={char.id} 
                    onClick={() => openModal(char)}
                    className="bg-app-card border border-app-border rounded-xl overflow-hidden group hover:shadow-2xl hover:shadow-app-accent/20 hover:border-app-accent/50 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:scale-[1.02] flex-shrink-0 h-fit"
                >
                    <div className="aspect-square relative overflow-hidden bg-gray-900">
                        <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                        <div className="absolute bottom-3 left-3 right-3">
                             <div className="text-white font-bold text-sm truncate">{char.name}</div>
                        </div>
                    </div>
                </div>
            ))}
            {characters.length === 0 && (
                <div className="col-span-full h-40 flex flex-col items-center justify-center border-2 border-dashed border-gray-800 rounded-xl text-gray-600">
                    <Users size={32} className="mb-2 opacity-50" />
                    <p className="text-sm">暂无角色，请从左侧添加或生成</p>
                </div>
            )}
          </div>
        </div>

      </div>

      {/* Character Detail Modal */}
      {isModalOpen && selectedChar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={closeModal}>
            <div 
                className="bg-[#151923] border border-app-border rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col md:flex-row relative animate-in zoom-in-50 duration-300" 
                onClick={e => e.stopPropagation()}
            >
                {/* Close Button */}
                <button 
                    onClick={closeModal}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/40 hover:bg-white/10 text-white backdrop-blur-md transition-colors"
                >
                    <X size={20} />
                </button>

                {/* Left: Image */}
                <div className="md:w-1/2 h-64 md:h-auto bg-black relative">
                    <img 
                        src={selectedChar.imageUrl} 
                        alt={selectedChar.name} 
                        className="w-full h-full object-contain md:object-cover"
                    />
                </div>

                {/* Right: Info */}
                <div className="md:w-1/2 p-6 md:p-8 flex flex-col overflow-y-auto custom-scrollbar bg-gradient-to-br from-[#151923] to-[#0B0E14]">
                    <div className="flex items-center gap-3 mb-6">
                        <h2 className="text-3xl font-bold text-white tracking-tight">{selectedChar.name}</h2>
                        <span className="px-3 py-1 bg-app-accent/20 text-app-accent text-xs rounded-full border border-app-accent/30 font-medium">
                            {selectedChar.type}
                        </span>
                    </div>

                    <div className="space-y-6 flex-1">
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">角色描述 / Prompt</h4>
                            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap border-l-2 border-gray-700 pl-4">
                                {selectedChar.description}
                            </p>
                        </div>
                        
                        <div>
                             <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">生成参数</h4>
                             <div className="grid grid-cols-2 gap-3">
                                 <div className="bg-app-bg p-3 rounded border border-app-border">
                                     <span className="text-xs text-gray-500 block">ID</span>
                                     <span className="text-xs text-gray-300 font-mono">{selectedChar.id.slice(-6)}</span>
                                 </div>
                                 <div className="bg-app-bg p-3 rounded border border-app-border">
                                      <span className="text-xs text-gray-500 block">尺寸</span>
                                      <span className="text-xs text-gray-300 font-mono">1024x1024</span>
                                 </div>
                             </div>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-8 pt-6 border-t border-app-border">
                        <button className="flex-1 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium transition-colors flex items-center justify-center gap-2">
                             <Edit3 size={16} /> 编辑信息
                        </button>
                        <button 
                            onClick={() => {
                                onRemoveCharacter(selectedChar.id);
                                closeModal();
                            }}
                            className="flex-1 py-2.5 rounded-lg bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/30 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                             <Trash2 size={16} /> 删除角色
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { Sparkles, Edit2, Trash2, Check, X, User, Loader2, Image as ImageIcon } from 'lucide-react';
import { ExtractedCharacter, GenerationMode } from '../types';
import { toast } from 'sonner';
import { extractCharactersFromOutline } from '../services/geminiService';
import { generateCharacterDesign } from '../services/geminiService';
import { useStoryStore } from '../store/useStoryStore';
import CharacterEditor from './CharacterEditor';
import ImagePreview from './ImagePreview';
import '../styles/character-extractor.css';

interface CharacterExtractorProps {
  outline: string;
  mode: GenerationMode;
  onConfirm: (characters: ExtractedCharacter[]) => void;
  onCancel: () => void;
}

const CharacterExtractor: React.FC<CharacterExtractorProps> = ({
  outline,
  mode,
  onConfirm,
  onCancel,
}) => {
  const { extractedCharacters: savedExtracted, setExtractedCharacters, updateExtractedCharacter } = useStoryStore();
  const [extractedCharacters, setExtractedCharactersLocal] = useState<ExtractedCharacter[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGeneratingAllImages, setIsGeneratingAllImages] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<ExtractedCharacter | null>(null);
  const [generatingImageFor, setGeneratingImageFor] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; anchorElement: HTMLElement | null } | null>(null);

  // 从 store 加载已保存的提取结果
  useEffect(() => {
    if (savedExtracted && savedExtracted.length > 0) {
      setExtractedCharactersLocal(savedExtracted);
    }
  }, [savedExtracted]);

  const handleExtract = async () => {
    if (!outline.trim()) {
      toast.error("请先输入故事大纲");
      return;
    }

    setIsExtracting(true);
    try {
      const characters = await extractCharactersFromOutline(outline, mode);
      setExtractedCharactersLocal(characters);
      setExtractedCharacters(characters); // 保存到 store
      toast.success(`成功提取 ${characters.length} 个角色，正在自动生成图像...`);
      
      // 自动为所有角色生成图像
      setIsGeneratingAllImages(true);
      await generateAllImages(characters);
      setIsGeneratingAllImages(false);
    } catch (error: any) {
      console.error("Extract characters error:", error);
      toast.error(error?.message || "提取角色失败，请稍后重试");
      setIsGeneratingAllImages(false);
    } finally {
      setIsExtracting(false);
    }
  };

  // 为所有角色生成图像
  const generateAllImages = async (characters: ExtractedCharacter[]) => {
    const updatedCharacters = [...characters];
    
    for (let i = 0; i < updatedCharacters.length; i++) {
      const character = updatedCharacters[i];
      if (!character.imageUrl) {
        setGeneratingImageFor(character.id);
        try {
          const imageUrl = await generateCharacterDesign(
            `${character.name}. ${character.appearance}`,
            null,
            '电影写实',
            '1:1'
          );
          updatedCharacters[i] = { ...character, imageUrl };
          setExtractedCharactersLocal([...updatedCharacters]);
          setExtractedCharacters([...updatedCharacters]); // 更新 store
          toast.success(`${character.name} 的图像已生成 (${i + 1}/${updatedCharacters.length})`);
        } catch (error: any) {
          console.error(`Generate image for ${character.name} error:`, error);
          toast.error(`${character.name} 图像生成失败: ${error?.message || "未知错误"}`);
        } finally {
          setGeneratingImageFor(null);
        }
      }
    }
    
    toast.success("所有角色图像生成完成！");
  };

  const handleEdit = (character: ExtractedCharacter) => {
    setEditingCharacter(character);
  };

  const handleSaveEdit = (updated: ExtractedCharacter) => {
    const updatedList = extractedCharacters.map(char => char.id === updated.id ? updated : char);
    setExtractedCharactersLocal(updatedList);
    setExtractedCharacters(updatedList); // 更新 store
    setEditingCharacter(null);
    toast.success("角色信息已更新");
  };

  const handleDelete = (id: string) => {
    const updatedList = extractedCharacters.filter(char => char.id !== id);
    setExtractedCharactersLocal(updatedList);
    setExtractedCharacters(updatedList); // 更新 store
    toast.success("角色已删除");
  };

  const handleGenerateImage = async (character: ExtractedCharacter) => {
    setGeneratingImageFor(character.id);
    try {
      const imageUrl = await generateCharacterDesign(
        `${character.name}. ${character.appearance}`,
        null,
        '电影写实',
        '1:1'
      );
      const updatedList = extractedCharacters.map(char =>
        char.id === character.id ? { ...char, imageUrl } : char
      );
      setExtractedCharactersLocal(updatedList);
      setExtractedCharacters(updatedList); // 更新 store
      toast.success(`${character.name} 的图像已生成`);
    } catch (error: any) {
      console.error("Generate image error:", error);
      toast.error(error?.message || "生成图像失败");
    } finally {
      setGeneratingImageFor(null);
    }
  };

  const handleConfirm = () => {
    const confirmed = extractedCharacters.filter(char => char.isConfirmed);
    if (confirmed.length === 0) {
      toast.error("请至少确认一个角色");
      return;
    }
    
    // 检查所有确认的角色是否都有图像
    const withoutImages = confirmed.filter(char => !char.imageUrl);
    if (withoutImages.length > 0) {
      toast.error(`以下角色还没有图像，请先生成：${withoutImages.map(c => c.name).join('、')}`);
      return;
    }
    
    onConfirm(confirmed);
  };

  const toggleConfirm = (id: string) => {
    const updatedList = extractedCharacters.map(char =>
      char.id === id ? { ...char, isConfirmed: !char.isConfirmed } : char
    );
    setExtractedCharactersLocal(updatedList);
    setExtractedCharacters(updatedList); // 更新 store
  };

  return (
    <div className="character-extractor-overlay" onClick={onCancel}>
      <div className="character-extractor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="character-extractor-header">
          <div>
            <h3 className="character-extractor-title">角色提取</h3>
            <p className="character-extractor-subtitle">
              从故事大纲中自动提取角色信息
            </p>
          </div>
          <button
            onClick={onCancel}
            className="character-extractor-close"
            title="关闭"
          >
            <X size={20} />
          </button>
        </div>

        <div className="character-extractor-content">
          {extractedCharacters.length === 0 ? (
            <div className="character-extractor-empty">
              <Sparkles size={48} className="character-extractor-empty-icon" />
              <p className="character-extractor-empty-text">
                点击下方按钮，从故事大纲中自动提取角色
              </p>
              <button
                onClick={handleExtract}
                disabled={isExtracting || isGeneratingAllImages || !outline.trim()}
                className="character-extractor-extract-button"
              >
                {isExtracting || isGeneratingAllImages ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>{isExtracting ? '正在提取...' : '正在生成图像...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    <span>自动提取角色</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              <div className="character-extractor-list">
                {extractedCharacters.map((character) => (
                  <div
                    key={character.id}
                    className={`character-extractor-item ${character.isConfirmed ? 'confirmed' : ''}`}
                  >
                    <div className="character-extractor-item-header">
                      <div 
                        ref={(el) => {
                          if (el && character.imageUrl) {
                            (el as any).__characterId = character.id;
                          }
                        }}
                        className="character-extractor-item-image-wrapper"
                        onClick={(e) => {
                          if (character.imageUrl) {
                            setPreviewImage({
                              url: character.imageUrl,
                              title: character.name,
                              anchorElement: e.currentTarget
                            });
                          }
                        }}
                        style={{ cursor: character.imageUrl ? 'pointer' : 'default' }}
                        title={character.imageUrl ? '点击预览' : undefined}
                      >
                        {character.imageUrl ? (
                          <img
                            src={character.imageUrl}
                            alt={character.name}
                            className="character-extractor-item-image"
                          />
                        ) : (
                          <div className="character-extractor-item-placeholder">
                            <User size={24} />
                          </div>
                        )}
                        {generatingImageFor === character.id && (
                          <div className="character-extractor-item-loading">
                            <Loader2 size={16} className="animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="character-extractor-item-info">
                        <div className="character-extractor-item-name-row">
                          <h4 className="character-extractor-item-name">
                            {character.name}
                          </h4>
                          <span className="character-extractor-item-role">
                            {character.role}
                          </span>
                        </div>
                        <p className="character-extractor-item-description">
                          {character.description}
                        </p>
                        <div className="character-extractor-item-appearance">
                          <strong>外观：</strong>
                          {character.appearance}
                        </div>
                        {character.personality && (
                          <div className="character-extractor-item-personality">
                            <strong>性格：</strong>
                            {character.personality}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="character-extractor-item-actions">
                      <button
                        onClick={() => handleEdit(character)}
                        className="character-extractor-action-button"
                        title="编辑"
                      >
                        <Edit2 size={16} />
                      </button>
                      {!character.imageUrl && (
                        <button
                          onClick={() => handleGenerateImage(character)}
                          disabled={generatingImageFor === character.id}
                          className="character-extractor-action-button"
                          title="生成图像"
                        >
                          {generatingImageFor === character.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <ImageIcon size={16} />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(character.id)}
                        className="character-extractor-action-button danger"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        onClick={() => toggleConfirm(character.id)}
                        className={`character-extractor-confirm-button ${character.isConfirmed ? 'confirmed' : ''}`}
                        title={character.isConfirmed ? "取消确认" : "确认使用"}
                      >
                        {character.isConfirmed ? (
                          <>
                            <Check size={16} />
                            <span>已确认</span>
                          </>
                        ) : (
                          <span>确认</span>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="character-extractor-footer">
                <button
                  onClick={onCancel}
                  className="character-extractor-cancel-button"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isGeneratingAllImages || generatingImageFor !== null}
                  className="character-extractor-submit-button"
                >
                  {isGeneratingAllImages || generatingImageFor !== null ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>生成中...</span>
                    </>
                  ) : (
                    <>
                      确认使用 ({extractedCharacters.filter(c => c.isConfirmed).length} 个角色)
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {editingCharacter && (
          <CharacterEditor
            character={editingCharacter}
            onSave={handleSaveEdit}
            onCancel={() => setEditingCharacter(null)}
          />
        )}

        {previewImage && (
          <ImagePreview
            imageUrl={previewImage.url}
            title={previewImage.title}
            anchorElement={previewImage.anchorElement}
            onClose={() => setPreviewImage(null)}
          />
        )}
      </div>
    </div>
  );
};

export default CharacterExtractor;


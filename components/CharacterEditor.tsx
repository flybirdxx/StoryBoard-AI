import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { ExtractedCharacter } from '../types';
import '../styles/character-editor.css';

interface CharacterEditorProps {
  character: ExtractedCharacter;
  onSave: (character: ExtractedCharacter) => void;
  onCancel: () => void;
}

const CharacterEditor: React.FC<CharacterEditorProps> = ({
  character,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(character.name);
  const [description, setDescription] = useState(character.description);
  const [appearance, setAppearance] = useState(character.appearance);
  const [personality, setPersonality] = useState(character.personality || '');
  const [role, setRole] = useState(character.role);

  useEffect(() => {
    setName(character.name);
    setDescription(character.description);
    setAppearance(character.appearance);
    setPersonality(character.personality || '');
    setRole(character.role);
  }, [character.id]);

  const handleSave = () => {
    if (!name.trim()) {
      alert("请输入角色名称");
      return;
    }
    onSave({
      ...character,
      name: name.trim(),
      description: description.trim(),
      appearance: appearance.trim(),
      personality: personality.trim() || undefined,
      role: role.trim(),
    });
  };

  return (
    <div className="character-editor-overlay" onClick={onCancel}>
      <div className="character-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="character-editor-header">
          <h3 className="character-editor-title">编辑角色</h3>
          <button
            onClick={onCancel}
            className="character-editor-close"
            title="关闭"
          >
            <X size={20} />
          </button>
        </div>

        <div className="character-editor-content">
          <div className="character-editor-field">
            <label className="character-editor-label">角色名称 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="character-editor-input"
              placeholder="例如：张三"
            />
          </div>

          <div className="character-editor-field">
            <label className="character-editor-label">角色定位</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="character-editor-select"
            >
              <option value="主角">主角</option>
              <option value="配角">配角</option>
              <option value="反派">反派</option>
              <option value="背景角色">背景角色</option>
              <option value="其他">其他</option>
            </select>
          </div>

          <div className="character-editor-field">
            <label className="character-editor-label">角色描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="character-editor-textarea"
              placeholder="角色在故事中的描述和作用"
              rows={3}
            />
          </div>

          <div className="character-editor-field">
            <label className="character-editor-label">外观特征 *</label>
            <textarea
              value={appearance}
              onChange={(e) => setAppearance(e.target.value)}
              className="character-editor-textarea"
              placeholder="详细的外观特征描述（年龄、性别、体型、发型、服装等）"
              rows={5}
            />
          </div>

          <div className="character-editor-field">
            <label className="character-editor-label">性格特征（可选）</label>
            <textarea
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              className="character-editor-textarea"
              placeholder="性格特征描述"
              rows={3}
            />
          </div>
        </div>

        <div className="character-editor-footer">
          <button
            onClick={onCancel}
            className="character-editor-cancel-button"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="character-editor-save-button"
          >
            <Save size={16} />
            <span>保存</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CharacterEditor;


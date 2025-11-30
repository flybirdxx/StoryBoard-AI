import React from 'react';
import { Monitor, Palette } from 'lucide-react';
import { AspectRatio, ArtStyle } from '../../types';
import { ART_STYLE_OPTIONS, ASPECT_RATIOS } from '../../constants';

interface CharacterFormProps {
  name: string;
  prompt: string;
  aspectRatio: AspectRatio;
  artStyle: ArtStyle;
  customStyle: string;
  onNameChange: (name: string) => void;
  onPromptChange: (prompt: string) => void;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  onArtStyleChange: (style: ArtStyle) => void;
  onCustomStyleChange: (style: string) => void;
}

const CharacterForm: React.FC<CharacterFormProps> = ({
  name,
  prompt,
  aspectRatio,
  artStyle,
  customStyle,
  onNameChange,
  onPromptChange,
  onAspectRatioChange,
  onArtStyleChange,
  onCustomStyleChange,
}) => {
  return (
    <div className="character-workshop-form">
      <div className="character-workshop-field">
        <label className="character-workshop-label">角色名称</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="character-workshop-input"
          placeholder="例如：赛博侦探"
        />
      </div>

      <div className="character-workshop-grid">
        {/* Aspect Ratio Selector */}
        <div className="character-workshop-field">
          <label className="character-workshop-label character-workshop-label-with-icon">
            <Monitor size={12} />
            设计比例
          </label>
          <select
            value={aspectRatio}
            onChange={(e) => onAspectRatioChange(e.target.value as AspectRatio)}
            className="character-workshop-select"
          >
            {ASPECT_RATIOS.map(ratio => (
              <option key={ratio} value={ratio}>{ratio}</option>
            ))}
          </select>
        </div>

        {/* Art Style Selector */}
        <div className="character-workshop-field">
          <label className="character-workshop-label character-workshop-label-with-icon">
            <Palette size={12} />
            艺术风格
          </label>
          <select
            value={artStyle}
            onChange={(e) => onArtStyleChange(e.target.value as ArtStyle)}
            className="character-workshop-select"
          >
            {ART_STYLE_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {artStyle === 'custom' && (
        <div className="character-workshop-field character-workshop-custom-style">
          <label className="character-workshop-label">自定义风格</label>
          <input
            type="text"
            value={customStyle}
            onChange={(e) => onCustomStyleChange(e.target.value)}
            className="character-workshop-input"
            placeholder="例如：哥特式黑暗风格..."
          />
        </div>
      )}

      <div className="character-workshop-field">
        <label className="character-workshop-label">外观描述</label>
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          className="character-workshop-textarea"
          placeholder="详细描述角色的外貌、服装、配饰等..."
          rows={4}
        />
      </div>
    </div>
  );
};

export default CharacterForm;


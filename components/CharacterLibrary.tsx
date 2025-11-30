import React, { useState } from 'react';
import { Plus, Rocket, User, Users } from 'lucide-react';
import { Character } from '../types';
import CharacterWorkshop from './CharacterWorkshop';
import CharacterMenu from './CharacterMenu';
import { useStoryStore } from '../store/useStoryStore';
import { toast } from 'sonner';

const CharacterLibrary: React.FC = () => {
  const { savedCharacters, addSavedCharacter, updateSavedCharacter, removeSavedCharacter } = useStoryStore();
  const [showWorkshop, setShowWorkshop] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | undefined>(undefined);

  return (
    <div className="character-library-container">
      <div className="character-library-header">
        <div>
          <h2 className="character-library-title">角色库</h2>
          <p className="character-library-subtitle">管理您的数字演员，在所有故事中保持一致的视觉形象。</p>
        </div>
        <button
          onClick={() => setShowWorkshop(true)}
          className="character-library-create-button"
        >
          <Plus style={{ width: '1.25rem', height: '1.25rem' }} />
          <span>创建新角色</span>
        </button>
      </div>

      <div className="character-library-grid">
        {/* Create Card */}
        <button
          onClick={() => setShowWorkshop(true)}
          className="character-library-create-card"
        >
          <div className="character-library-create-card-icon">
            <Rocket />
          </div>
          <span className="character-library-create-card-text">创建角色资产</span>
        </button>

        {/* Character Cards */}
        {savedCharacters.map((char) => (
          <div key={char.id} className="character-card">
            <div className="character-card-image-container">
               {char.imageUrl ? (
                  <img src={char.imageUrl} alt={char.name} className="character-card-image" />
               ) : (
                  <div className="character-card-placeholder">
                     <User />
                  </div>
               )}
               <div className="character-card-gradient"></div>
            </div>

            <div className="character-card-info">
               <h3 className="character-card-name">{char.name}</h3>
               <p className="character-card-description">{char.description}</p>
            </div>
            
            {/* Menu button in top right corner */}
            <div className="character-card-menu-wrapper">
              <CharacterMenu
                character={char}
                onEdit={(char) => {
                  setEditingCharacter(char);
                  setShowWorkshop(true);
                }}
                onDelete={(id) => {
                  removeSavedCharacter(id);
                  toast.success("角色已删除");
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {savedCharacters.length === 0 && (
        <div className="character-library-empty">
           <div className="character-library-empty-icon">
              <Users style={{ width: '2.5rem', height: '2.5rem' }} />
           </div>
           <p className="character-library-empty-text">暂无已保存的角色，开始创建您的第一个角色吧!</p>
        </div>
      )}

      {showWorkshop && (
        <CharacterWorkshop 
          onClose={() => {
            setShowWorkshop(false);
            setEditingCharacter(undefined);
          }}
          onSave={(character) => {
            if (editingCharacter) {
              // Update existing character
              updateSavedCharacter(character.id, character);
            } else {
              // Add new character
              addSavedCharacter(character);
            }
            setEditingCharacter(undefined);
          }}
          initialCharacter={editingCharacter}
        />
      )}
    </div>
  );
};

export default CharacterLibrary;
import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Edit, Trash2, X } from 'lucide-react';
import { Character } from '../types';
import '../styles/character-menu.css';

interface CharacterMenuProps {
  character: Character;
  onEdit: (character: Character) => void;
  onDelete: (characterId: string) => void;
}

const CharacterMenu: React.FC<CharacterMenuProps> = ({ character, onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleEdit = () => {
    setIsOpen(false);
    onEdit(character);
  };

  const handleDelete = () => {
    if (window.confirm(`确定要删除角色"${character.name}"吗？此操作无法撤销。`)) {
      setIsOpen(false);
      onDelete(character.id);
    }
  };

  return (
    <div className="character-menu-wrapper" ref={menuRef}>
      <button
        className="character-menu-button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title="更多选项"
      >
        <MoreHorizontal size={16} />
      </button>

      {isOpen && (
        <div className="character-menu-dropdown">
          <button
            className="character-menu-item"
            onClick={handleEdit}
          >
            <Edit size={16} />
            <span>编辑</span>
          </button>
          <button
            className="character-menu-item danger"
            onClick={handleDelete}
          >
            <Trash2 size={16} />
            <span>删除</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default CharacterMenu;


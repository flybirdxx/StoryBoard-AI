
import React from 'react';
import { Sparkles, Users, Clapperboard, LayoutGrid, FolderOpen, Moon, Sun } from 'lucide-react';
import type { ViewType } from '../types/view';
import { useTheme } from '../hooks/useTheme';
import '../styles/sidebar.css';

// 保持向后兼容，重新导出类型
export type { ViewType };

interface SidebarProps {
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  hasActiveStory: boolean;
  onOpenSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, hasActiveStory, onOpenSettings }) => {
  const { theme, toggleTheme } = useTheme();
  return (
    <aside className="sidebar">
      {/* Logo Area */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <LayoutGrid />
        </div>
        <div className="sidebar-logo-text">
          <h1 className="sidebar-logo-title">
            StoryBoard
          </h1>
          <p className="sidebar-logo-subtitle">AI STUDIO</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <button
          onClick={() => onChangeView('create')}
          className={`sidebar-nav-item ${currentView === 'create' ? 'active' : ''}`}
          title="创作中心"
        >
          <Sparkles className="sidebar-nav-item-icon" />
          <span className="sidebar-nav-item-text">创作中心</span>
        </button>

        <button
          onClick={() => onChangeView('projects')}
          className={`sidebar-nav-item ${currentView === 'projects' ? 'active' : ''}`}
          title="我的故事"
        >
          <FolderOpen className="sidebar-nav-item-icon" />
          <span className="sidebar-nav-item-text">我的故事</span>
        </button>

        <button
          onClick={() => onChangeView('characters')}
          className={`sidebar-nav-item ${currentView === 'characters' ? 'active' : ''}`}
          title="角色库"
        >
          <Users className="sidebar-nav-item-icon" />
          <span className="sidebar-nav-item-text">角色库</span>
        </button>

        <button
          onClick={() => hasActiveStory && onChangeView('editor')}
          disabled={!hasActiveStory}
          className={`sidebar-nav-item ${currentView === 'editor' ? 'active' : ''}`}
          title={hasActiveStory ? "分镜编辑器" : "暂无活跃项目"}
        >
          <Clapperboard className="sidebar-nav-item-icon" />
          <span className="sidebar-nav-item-text">分镜编辑器</span>
        </button>
      </nav>

      {/* Footer Settings */}
      <div className="sidebar-footer">
        <button 
          onClick={toggleTheme}
          className="sidebar-theme-toggle"
          title={theme === 'light' ? '切换到暗色主题' : '切换到亮色主题'}
        >
          {theme === 'light' ? (
            <Moon className="sidebar-theme-icon" />
          ) : (
            <Sun className="sidebar-theme-icon" />
          )}
          <span className="sidebar-theme-text">
            {theme === 'light' ? '暗色模式' : '亮色模式'}
          </span>
        </button>
        
        <button 
          onClick={onOpenSettings}
          className="sidebar-settings-button"
          title="设置"
        >
           <div className="sidebar-settings-avatar">
              <span className="sidebar-settings-avatar-text">GD</span>
           </div>
           <div className="sidebar-settings-info">
              <p className="sidebar-settings-title">Gemini 3 Pro</p>
              <p className="sidebar-settings-subtitle">Current model</p>
           </div>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

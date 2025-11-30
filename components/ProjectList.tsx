
import React, { useEffect, useState } from 'react';
import { storageService } from '../services/storageService';
import { useStoryStore } from '../store/useStoryStore';
import { FolderOpen, Calendar, Trash2, ArrowRight, Loader2, Image as ImageIcon, Plus, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectListProps {
  onOpenProject: () => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ onOpenProject }) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { loadStory } = useStoryStore();

  const fetchProjects = async () => {
    setIsLoading(true);
    const list = await storageService.getAllStories();
    setProjects(list);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleOpen = async (id: string) => {
    const success = await loadStory(id);
    if (success) {
      toast.success("项目加载成功");
      onOpenProject();
    } else {
      toast.error("加载项目失败");
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("确定要删除这个故事吗？此操作无法撤销。")) {
      await storageService.deleteStory(id);
      toast.success("项目已删除");
      fetchProjects();
    }
  };

  if (isLoading) {
    return (
      <div className="project-list-loading">
        <Loader2 />
        <p>正在加载项目...</p>
      </div>
    );
  }

  return (
    <div className="project-list-container">
      <div className="project-list-header">
        <div>
          <h2 className="project-list-title">我的故事</h2>
          <p className="project-list-subtitle">管理你已保存的创作项目。</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="project-list-create-button"
        >
          <Plus />
          <span>创建新故事</span>
        </button>
        </div>

      <div className="project-list-grid">
          {projects.map((project) => (
            <div 
              key={project.id} 
              onClick={() => handleOpen(project.id)}
            className="project-card"
            >
              {/* Thumbnail */}
            <div className="project-card-thumbnail">
                {project.thumbnail ? (
                  <img 
                    src={project.thumbnail} 
                    alt={project.title} 
                  />
                ) : (
                <div className="project-card-thumbnail-placeholder">
                  <ImageIcon />
                  </div>
                )}
              <span className="project-card-tag">
                {project.mode === 'comic' ? '奇幻' : '科幻冒险'}
                   </span>
              </div>

              {/* Info */}
            <div className="project-card-info">
              <h3 className="project-card-title">{project.title || "未命名故事"}</h3>
              <div className="project-card-meta">
                <span className="project-card-meta-left">
                  <Calendar style={{ width: '1rem', height: '1rem' }} />
                  <span>上次编辑：{new Date(project.lastModified).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(project.id, e);
                  }}
                  className="project-card-more-button"
                  title="更多选项"
                >
                  <MoreHorizontal style={{ width: '1.25rem', height: '1.25rem' }} />
                </button>
                  </div>
                </div>
              </div>
        ))}

        {/* Create New Card */}
              <button 
          onClick={() => window.location.reload()}
          className="project-card-create"
        >
          <div className="project-card-create-icon">
            <Plus />
          </div>
          <h3 className="project-card-create-title">创建新故事</h3>
          <p className="project-card-create-subtitle">开始你的下一个杰作</p>
              </button>
            </div>
    </div>
  );
};

export default ProjectList;

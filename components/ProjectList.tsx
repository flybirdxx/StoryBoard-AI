
import React, { useEffect, useState } from 'react';
import { storageService } from '../services/storageService';
import { useStoryStore } from '../store/useStoryStore';
import { FolderOpen, Calendar, Trash2, ArrowRight, Loader2, Image as ImageIcon } from 'lucide-react';
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
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>正在加载项目...</p>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto animate-in fade-in duration-500">
      <h2 className="text-3xl font-bold text-white mb-2">我的故事</h2>
      <p className="text-slate-400 font-light mb-10">管理您已保存的创作项目。</p>

      {projects.length === 0 ? (
        <div className="text-center py-20 bg-[#13161f] rounded-2xl border border-white/5 border-dashed">
           <FolderOpen className="w-16 h-16 text-slate-700 mx-auto mb-4" />
           <p className="text-slate-500 text-lg">暂无已保存的故事</p>
           <p className="text-sm text-slate-600 mt-2">前往创作中心开始您的第一个项目</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {projects.map((project) => (
            <div 
              key={project.id} 
              onClick={() => handleOpen(project.id)}
              className="group relative bg-[#13161f] border border-white/5 rounded-2xl overflow-hidden hover:border-indigo-500/50 hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer"
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-black/50 relative overflow-hidden">
                {project.thumbnail ? (
                  <img 
                    src={project.thumbnail} 
                    alt={project.title} 
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-700">
                    <ImageIcon className="w-10 h-10" />
                  </div>
                )}
                
                {/* Overlay Action */}
                <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <span className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-white text-xs font-bold flex items-center gap-2 border border-white/20">
                     打开项目 <ArrowRight className="w-3 h-3" />
                   </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-5">
                <h3 className="font-bold text-white text-lg mb-1 truncate">{project.title || "未命名故事"}</h3>
                <div className="flex items-center justify-between text-xs text-slate-500 mt-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(project.lastModified).toLocaleDateString()}</span>
                  </div>
                  <span className="uppercase tracking-wider opacity-60 bg-white/5 px-2 py-0.5 rounded text-[10px]">
                    {project.mode === 'comic' ? 'Comic' : 'Storyboard'}
                  </span>
                </div>
              </div>

              {/* Delete Button */}
              <button 
                onClick={(e) => handleDelete(project.id, e)}
                className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-red-500/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all z-20"
                title="删除项目"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectList;

import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Check, ChevronLeft, X } from 'lucide-react';
import { NavItem } from '../types';
import { useAppStore } from '../store/useAppStore';

export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { previewImage, setPreviewImage } = useAppStore();

  const getActiveItem = (): NavItem => {
    const path = location.pathname;
    if (path.includes('script')) return NavItem.SCRIPT;
    if (path.includes('characters')) return NavItem.CHARACTERS;
    if (path.includes('storyboard')) return NavItem.STORYBOARD;
    if (path.includes('timeline')) return NavItem.TIMELINE;
    if (path.includes('assets')) return NavItem.ASSETS;
    if (path.includes('subscription')) return NavItem.SUBSCRIPTION;
    return NavItem.SCRIPT;
  };

  const activeItem = getActiveItem();

  // Helper to determine step status
  const getStepStatus = (targetStep: NavItem) => {
    const order = [NavItem.SCRIPT, NavItem.CHARACTERS, NavItem.STORYBOARD, NavItem.TIMELINE];
    const currentIndex = order.indexOf(activeItem);
    const targetIndex = order.indexOf(targetStep);
    
    if (currentIndex === targetIndex) return 'current';
    if (currentIndex > targetIndex) return 'completed';
    return 'pending';
  };

  return (
    <div className="flex h-screen w-screen bg-app-bg text-app-text overflow-hidden font-sans">
      
      <Sidebar activeItem={activeItem} />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Stepper Bar - Workflow Progress */}
        <header className="h-16 border-b border-app-border flex items-center justify-between px-8 bg-app-bg/50 backdrop-blur-sm z-10 shrink-0">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center cursor-pointer hover:bg-gray-700 transition-colors" onClick={() => navigate(-1)}>
               <ChevronLeft className="rotate-180 text-gray-400" size={18} />
             </div>
          </div>

          <div className="flex items-center relative w-1/2 justify-between">
             {/* Step 1: Script */}
             <StepItem 
                step={1} 
                label="剧本拆解" 
                status={getStepStatus(NavItem.SCRIPT)} 
                onClick={() => navigate('/script')} 
             />
             
             {/* Line 1 */}
             <StepLine status={getStepStatus(NavItem.CHARACTERS)} />

             {/* Step 2: Characters */}
             <StepItem 
                step={2} 
                label="角色一致性" 
                status={getStepStatus(NavItem.CHARACTERS)} 
                onClick={() => navigate('/characters')} 
             />

             {/* Line 2 */}
             <StepLine status={getStepStatus(NavItem.STORYBOARD)} />

             {/* Step 3: Storyboard */}
             <StepItem 
                step={3} 
                label="生成故事板" 
                status={getStepStatus(NavItem.STORYBOARD)} 
                onClick={() => navigate('/storyboard')} 
             />

             {/* Line 3 */}
             <StepLine status={getStepStatus(NavItem.TIMELINE)} />

             {/* Step 4: Video */}
             <StepItem 
                step={4} 
                label="视频制作" 
                status={getStepStatus(NavItem.TIMELINE)} 
                onClick={() => navigate('/timeline')} 
             />
          </div>

          <div className="w-8"></div> {/* Spacer */}
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden relative">
           <Outlet />
        </div>
      </div>
      
      {/* Lightbox Modal (Global) */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <button 
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            onClick={() => setPreviewImage(null)}
          >
            <X size={24} />
          </button>
          <img 
            src={previewImage} 
            alt="Full size preview" 
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-50 duration-300"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}

    </div>
  );
};

// Sub-components for Cleaner Stepper
const StepItem = ({ step, label, status, onClick }: { step: number, label: string, status: 'current' | 'completed' | 'pending', onClick: () => void }) => {
    const isCompleted = status === 'completed';
    const isCurrent = status === 'current';
    
    return (
        <div className={`flex flex-col items-center gap-1 z-10 transition-opacity cursor-pointer ${status === 'pending' ? 'opacity-70' : 'opacity-100'}`} onClick={onClick}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                ${isCurrent ? 'bg-cyan-500 text-black ring-4 ring-cyan-900/40 scale-110' : 
                  isCompleted ? 'bg-emerald-500 text-black' : 
                  'bg-app-card border border-gray-600 text-gray-500'}`}>
                {isCompleted ? <Check size={14} strokeWidth={3} /> : step}
            </div>
            <span className={`text-[10px] font-medium hidden md:block 
                ${isCurrent ? 'text-cyan-400' : 
                  isCompleted ? 'text-emerald-500' : 
                  'text-gray-600'}`}>
                {label}
            </span>
        </div>
    );
};

const StepLine = ({ status }: { status: 'current' | 'completed' | 'pending' }) => {
    const isActive = status !== 'pending';
    return (
        <div className="h-[2px] flex-1 bg-gray-800 mx-2 relative overflow-hidden rounded-full">
            <div className={`absolute inset-0 bg-emerald-500 transition-transform duration-500 ${isActive ? 'translate-x-0' : '-translate-x-full'}`} />
        </div>
    );
};
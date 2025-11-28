import React from 'react';
import { NavItem } from '../types';
import { 
  BookOpen, 
  Users, 
  Clapperboard, 
  Film, 
  Library, 
  CreditCard, 
  Settings, 
  LogOut,
  ChevronLeft
} from 'lucide-react';

interface SidebarProps {
  activeItem: NavItem;
  setActiveItem: (item: NavItem) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeItem, setActiveItem }) => {
  
  const navItems = [
    { id: NavItem.SCRIPT, label: '剧本编辑', icon: <BookOpen size={20} /> },
    { id: NavItem.CHARACTERS, label: '角色库', icon: <Users size={20} /> },
    { id: NavItem.STORYBOARD, label: '故事板', icon: <Clapperboard size={20} /> },
    { id: NavItem.TIMELINE, label: '时间线', icon: <Film size={20} /> },
    { id: NavItem.ASSETS, label: '素材库', icon: <Library size={20} /> },
    { id: NavItem.SUBSCRIPTION, label: '订阅服务', icon: <CreditCard size={20} /> },
  ];

  return (
    <div className="w-64 h-screen bg-app-sidebar border-r border-app-border flex flex-col justify-between shrink-0">
      
      {/* Top Section */}
      <div>
        {/* Logo / Project Selector */}
        <div className="p-4 mb-4">
          <div className="h-12 w-full bg-app-card rounded-lg flex items-center px-3 border border-app-border cursor-pointer hover:border-app-accent transition-colors">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-amber-700 rounded mr-3"></div>
            <span className="text-sm font-medium text-gray-200 truncate">博物馆奇妙夜</span>
            <ChevronLeft className="ml-auto text-gray-500 rotate-180" size={16} />
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveItem(item.id)}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                ${activeItem === item.id 
                  ? 'bg-app-accent/10 text-app-accent border-l-2 border-app-accent' 
                  : 'text-gray-400 hover:bg-app-card hover:text-gray-200 border-l-2 border-transparent'
                }`}
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="p-4 border-t border-app-border">
        <button className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors">
          <Settings size={20} className="mr-3" />
          设置
        </button>
        <button className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 transition-colors mt-1">
          <LogOut size={20} className="mr-3" />
          登出
        </button>
      </div>
    </div>
  );
};
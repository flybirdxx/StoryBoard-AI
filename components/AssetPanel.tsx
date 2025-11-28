import React from 'react';
import { Asset } from '../types';
import { Plus, Edit2 } from 'lucide-react';

interface AssetPanelProps {
  assets: Asset[];
}

export const AssetPanel: React.FC<AssetPanelProps> = ({ assets }) => {
  return (
    <div className="w-80 border-r border-app-border bg-app-bg flex flex-col shrink-0">
      <div className="h-14 flex items-center justify-between px-4 border-b border-app-border">
        <span className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm border border-gray-500 flex items-center justify-center text-[10px]">📦</div>
          项目道具
        </span>
        <button className="text-gray-400 hover:text-white">
          <Plus size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {assets.map((asset) => (
          <div key={asset.id} className="bg-app-card rounded-xl border border-app-border overflow-hidden group hover:border-gray-600 transition-colors cursor-pointer">
            <div className="aspect-square w-full bg-gray-800 relative">
              <img 
                src={asset.imageUrl} 
                alt={asset.name} 
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              />
              <div className="absolute top-2 right-2 bg-black/50 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                 <Edit2 size={12} className="text-white" />
              </div>
            </div>
            <div className="p-3">
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-bold text-gray-200 text-sm">{asset.name}</h4>
                <Edit2 size={14} className="text-gray-600 hover:text-gray-400" />
              </div>
              <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
                {asset.description}
              </p>
            </div>
          </div>
        ))}

        <div className="h-32 border-2 border-dashed border-app-border rounded-xl flex flex-col items-center justify-center text-gray-500 hover:border-gray-600 hover:text-gray-400 cursor-pointer transition-colors">
            <Plus size={24} className="mb-2"/>
            <span className="text-xs">添加新道具</span>
        </div>
      </div>
    </div>
  );
};
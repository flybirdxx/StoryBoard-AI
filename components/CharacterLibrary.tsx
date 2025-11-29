import React, { useState } from 'react';
import { Plus, Paintbrush, MoreHorizontal, User, Users } from 'lucide-react';
import { Character } from '../types';
import CharacterWorkshop from './CharacterWorkshop';
import { useStoryStore } from '../store/useStoryStore';

const CharacterLibrary: React.FC = () => {
  const { savedCharacters, addSavedCharacter } = useStoryStore();
  const [showWorkshop, setShowWorkshop] = useState(false);

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">角色库</h2>
          <p className="text-slate-400 font-light">管理您的数字演员，在所有故事中保持一致的视觉形象。</p>
        </div>
        <button
          onClick={() => setShowWorkshop(true)}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          创建新角色
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {/* Create Card */}
        <button
          onClick={() => setShowWorkshop(true)}
          className="aspect-[3/4] rounded-2xl border-2 border-dashed border-white/10 hover:border-indigo-500/50 hover:bg-white/5 flex flex-col items-center justify-center gap-4 group transition-all"
        >
          <div className="w-16 h-16 rounded-full bg-white/5 group-hover:bg-indigo-500/20 flex items-center justify-center transition-colors">
            <Paintbrush className="w-8 h-8 text-slate-500 group-hover:text-indigo-400" />
          </div>
          <span className="text-sm font-bold text-slate-500 group-hover:text-slate-300">新建角色设计</span>
        </button>

        {/* Character Cards */}
        {savedCharacters.map((char) => (
          <div key={char.id} className="group relative aspect-[3/4] rounded-2xl bg-[#13161f] border border-white/10 overflow-hidden shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
            <div className="absolute inset-0">
               {char.imageUrl ? (
                  <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
               ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-800">
                     <User className="w-12 h-12 text-slate-600" />
                  </div>
               )}
               <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-1 group-hover:translate-y-0 transition-transform">
               <h3 className="text-lg font-bold text-white mb-1 drop-shadow-md">{char.name}</h3>
               <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity delay-75">{char.description}</p>
            </div>
            
            <button className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-black/60 text-white rounded-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
               <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {savedCharacters.length === 0 && (
        <div className="mt-20 text-center">
           <div className="w-24 h-24 bg-slate-800/50 rounded-full mx-auto flex items-center justify-center mb-6">
              <Users className="w-10 h-10 text-slate-600" />
           </div>
           <p className="text-slate-500">暂无已保存的角色。开始创建您的第一个角色吧！</p>
        </div>
      )}

      {showWorkshop && (
        <CharacterWorkshop 
          onClose={() => setShowWorkshop(false)}
          onSave={addSavedCharacter}
        />
      )}
    </div>
  );
};

export default CharacterLibrary;
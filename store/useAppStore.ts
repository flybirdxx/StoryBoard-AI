import { create } from 'zustand';
import { Scene, Asset, DetectedCharacter, ImageStyle, GenerationStatus, Shot } from '../types';

interface AppState {
  // Data
  scriptContent: string;
  setScriptContent: (content: string) => void;
  
  detectedCharacters: DetectedCharacter[];
  setDetectedCharacters: (chars: DetectedCharacter[]) => void;
  
  assets: Asset[];
  addAsset: (asset: Asset) => void;
  removeAsset: (id: string) => void;
  setAssets: (assets: Asset[]) => void;
  
  scenes: Scene[];
  setScenes: (scenes: Scene[]) => void;
  updateSceneShot: (sceneId: number, shotId: number, updates: Partial<Shot>) => void;
  
  selectedStyle: ImageStyle;
  setSelectedStyle: (style: ImageStyle) => void;

  // UI/Status
  generationStatus: GenerationStatus;
  setGenerationStatus: (status: GenerationStatus) => void;
  
  isAnalyzing: boolean;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  
  previewImage: string | null;
  setPreviewImage: (url: string | null) => void;
  
  // API Key Status (Global)
  isApiKeyValid: boolean;
  setIsApiKeyValid: (isValid: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial Data
  scriptContent: "一个关于古代文明如何在海边发现盐的故事。场景开始于海浪拍打岩石，阳光暴晒下的白色结晶，原始人好奇地触碰和品尝。",
  detectedCharacters: [],
  assets: [],
  scenes: [],
  selectedStyle: 'Cinematic',
  
  // Initial UI Status
  generationStatus: GenerationStatus.IDLE,
  isAnalyzing: false,
  previewImage: null,
  isApiKeyValid: false,

  // Actions
  setScriptContent: (content) => set({ scriptContent: content }),
  setDetectedCharacters: (chars) => set({ detectedCharacters: chars }),
  
  addAsset: (asset) => set((state) => ({ assets: [...state.assets, asset] })),
  removeAsset: (id) => set((state) => ({ assets: state.assets.filter(a => a.id !== id) })),
  setAssets: (assets) => set({ assets }),
  
  setScenes: (scenes) => set({ scenes }),
  updateSceneShot: (sceneId, shotId, updates) => set((state) => ({
    scenes: state.scenes.map(s => {
      if (s.id !== sceneId) return s;
      return {
        ...s,
        shots: s.shots.map(sh => sh.id === shotId ? { ...sh, ...updates } : sh)
      };
    })
  })),
  
  setSelectedStyle: (style) => set({ selectedStyle: style }),
  
  setGenerationStatus: (status) => set({ generationStatus: status }),
  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setPreviewImage: (previewImage) => set({ previewImage }),
  setIsApiKeyValid: (isValid) => set({ isApiKeyValid: isValid }),
}));
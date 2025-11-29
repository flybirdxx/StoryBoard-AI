
import { create } from 'zustand';
import { StoryData, Scene, Character, VisualAnchor, PlotOption, ArtStyle, GenerationMode, AspectRatio } from '../types';
import { storageService } from '../services/storageService';

interface GlobalSettings {
  theme: string;
  originalImages: string[];
  artStyle: ArtStyle;
  mode: GenerationMode;
  aspectRatio: AspectRatio;
}

interface StoryState {
  // Data
  story: StoryData | null;
  history: StoryData[];
  historyIndex: number;
  savedCharacters: Character[];
  plotOptions: PlotOption[];
  
  // Global Config for the current session
  settings: GlobalSettings;
  
  // Visual Anchors (Temporary or Persisted)
  detectedAnchors: VisualAnchor[];

  // Actions
  createNewStory: () => void;
  loadStory: (id: string) => Promise<boolean>;
  saveCurrentStory: () => Promise<void>;

  setStory: (story: StoryData | null, actionDescription?: string) => void;
  updateScene: (sceneId: number, updates: Partial<Scene>, pushToHistory?: boolean) => void;
  setSettings: (settings: Partial<GlobalSettings>) => void;
  setSavedCharacters: (chars: Character[]) => void;
  addSavedCharacter: (char: Character) => void;
  setPlotOptions: (options: PlotOption[]) => void;
  setDetectedAnchors: (anchors: VisualAnchor[]) => void;
  
  // History Actions
  undo: () => void;
  redo: () => void;
  jumpToHistory: (index: number) => void;
  initHistory: (story: StoryData) => void;
}

export const useStoryStore = create<StoryState>((set, get) => ({
  story: null,
  history: [],
  historyIndex: -1,
  savedCharacters: [],
  plotOptions: [],
  detectedAnchors: [],
  
  settings: {
    theme: '',
    originalImages: [],
    artStyle: '电影写实',
    mode: 'storyboard',
    aspectRatio: '16:9'
  },

  createNewStory: () => {
    // Cleanup existing resources to prevent memory leaks
    const state = get();
    storageService.revokeStoryResources(state.story, state.settings, state.savedCharacters, state.history);

    set({
        story: null,
        history: [],
        historyIndex: -1,
        plotOptions: [],
        detectedAnchors: [],
        savedCharacters: [], // Reset for new session
        settings: {
            theme: '',
            originalImages: [],
            artStyle: '电影写实',
            mode: 'storyboard',
            aspectRatio: '16:9'
        }
    });
  },

  loadStory: async (id: string) => {
    // Cleanup previous resources
    const state = get();
    storageService.revokeStoryResources(state.story, state.settings, state.savedCharacters, state.history);

    const data = await storageService.loadStory(id);
    if (data) {
        set({
            story: data.story,
            settings: data.settings,
            savedCharacters: data.savedCharacters,
            detectedAnchors: data.story.visualAnchors || [],
            history: [{ ...data.story, actionType: "项目加载" }],
            historyIndex: 0
        });
        return true;
    }
    return false;
  },

  saveCurrentStory: async () => {
    const state = get();
    if (state.story) {
        await storageService.saveStory(state.story, state.settings, state.savedCharacters);
    }
  },

  setSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings }
  })),

  setSavedCharacters: (chars) => set({ savedCharacters: chars }),
  
  addSavedCharacter: (char) => set((state) => ({ 
    savedCharacters: [...state.savedCharacters, char] 
  })),

  setPlotOptions: (options) => set({ plotOptions: options }),
  
  setDetectedAnchors: (anchors) => set({ detectedAnchors: anchors }),

  setStory: (newStory, actionDescription) => {
    set((state) => {
      if (!actionDescription || !newStory) {
        return { story: newStory };
      }

      const newHistory = state.history.slice(0, state.historyIndex + 1);
      const historyEntry = { 
        ...newStory, 
        lastModified: Date.now(), 
        actionType: actionDescription 
      };
      
      return {
        story: newStory,
        history: [...newHistory, historyEntry],
        historyIndex: newHistory.length
      };
    });
  },

  updateScene: (sceneId, updates, pushToHistory = true) => {
    set((state) => {
      if (!state.story) return {};

      const newScenes = state.story.scenes.map(s => 
        s.id === sceneId ? { ...s, ...updates } : s
      );
      
      const newStory = { ...state.story, scenes: newScenes };

      if (!pushToHistory) {
        return { story: newStory };
      }

      let actionType = "更新场景";
      if (updates.narrative) actionType = "更新文本";
      if (updates.tags) actionType = "更新标签";
      if (updates.imageUrl) actionType = "更新图片";

      const newHistory = state.history.slice(0, state.historyIndex + 1);
      const historyEntry = { 
         ...newStory, 
         lastModified: Date.now(), 
         actionType 
      };

      return {
        story: newStory,
        history: [...newHistory, historyEntry],
        historyIndex: newHistory.length
      };
    });
  },

  initHistory: (story) => set({
    story,
    history: [{ ...story, lastModified: Date.now(), actionType: "初始加载" }],
    historyIndex: 0
  }),

  undo: () => set((state) => {
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      return {
        historyIndex: newIndex,
        story: state.history[newIndex]
      };
    }
    return {};
  }),

  redo: () => set((state) => {
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      return {
        historyIndex: newIndex,
        story: state.history[newIndex]
      };
    }
    return {};
  }),

  jumpToHistory: (index) => set((state) => {
    if (index >= 0 && index < state.history.length) {
      return {
        historyIndex: index,
        story: state.history[index]
      };
    }
    return {};
  })
}));

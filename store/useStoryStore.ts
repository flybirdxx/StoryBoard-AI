
import { create } from 'zustand';
import { StoryData, Scene, Character, VisualAnchor, PlotOption, ArtStyle, GenerationMode, AspectRatio, HistoryEntry, ExtractedCharacter } from '../types';
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
  extractedCharacters: ExtractedCharacter[]; // 提取的角色（临时状态）
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
  updateScene: (sceneId: number, updates: Partial<Scene>, pushToHistory?: boolean, actionDescription?: string) => void;
  setSettings: (settings: Partial<GlobalSettings>) => void;
  setSavedCharacters: (chars: Character[]) => void;
  addSavedCharacter: (char: Character) => void;
  updateSavedCharacter: (id: string, updates: Partial<Character>) => void;
  removeSavedCharacter: (id: string) => void;
  setExtractedCharacters: (characters: ExtractedCharacter[]) => void;
  updateExtractedCharacter: (id: string, updates: Partial<ExtractedCharacter>) => void;
  clearExtractedCharacters: () => void;
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
  extractedCharacters: [],
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
        extractedCharacters: [], // Reset extracted characters
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

  updateSavedCharacter: (id, updates) => set((state) => ({
    savedCharacters: state.savedCharacters.map(char => 
      char.id === id ? { ...char, ...updates } : char
    )
  })),

  removeSavedCharacter: (id) => set((state) => ({
    savedCharacters: state.savedCharacters.filter(char => char.id !== id)
  })),

  setExtractedCharacters: (characters) => set({ extractedCharacters: characters }),
  
  updateExtractedCharacter: (id, updates) => set((state) => ({
    extractedCharacters: state.extractedCharacters.map(char => 
      char.id === id ? { ...char, ...updates } : char
    )
  })),
  
  clearExtractedCharacters: () => set({ extractedCharacters: [] }),

  setPlotOptions: (options) => set({ plotOptions: options }),
  
  setDetectedAnchors: (anchors) => set({ detectedAnchors: anchors }),

  setStory: (newStory, actionDescription) => {
    set((state) => {
      if (!actionDescription || !newStory) {
        return { story: newStory };
      }

      const newHistory = state.history.slice(0, state.historyIndex + 1);
      const historyEntry: HistoryEntry = {
        id: `${Date.now()}-global-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        actionType: actionDescription,
        description: actionDescription
      };
      
      const historyStoryEntry: StoryData = { 
        ...newStory, 
        lastModified: Date.now(), 
        actionType: actionDescription,
        historyEntry
      };
      
      return {
        story: newStory,
        history: [...newHistory, historyStoryEntry],
        historyIndex: newHistory.length
      };
    });
  },

  updateScene: (sceneId, updates, pushToHistory = true, actionDescription) => {
    set((state) => {
      if (!state.story) return {};

      const sceneIndex = state.story.scenes.findIndex(s => s.id === sceneId);
      if (sceneIndex === -1) return {};

      const newScenes = state.story.scenes.map(s => 
        s.id === sceneId ? { ...s, ...updates } : s
      );
      
      const newStory = { ...state.story, scenes: newScenes };

      if (!pushToHistory) {
        return { story: newStory };
      }

      // Determine action type and affected fields
      const affectedFields: string[] = [];
      if (updates.narrative) affectedFields.push('narrative');
      if (updates.visual_prompt) affectedFields.push('visual_prompt');
      if (updates.tags) affectedFields.push('tags');
      if (updates.imageUrl) affectedFields.push('imageUrl');
      if (updates.characters) affectedFields.push('characters');

      let actionType = actionDescription || "编辑场景";
      if (!actionDescription) {
        if (updates.narrative && updates.visual_prompt) {
          actionType = "编辑场景文本";
        } else if (updates.narrative) {
          actionType = "更新中文叙述";
        } else if (updates.visual_prompt) {
          actionType = "更新视觉提示";
        } else if (updates.tags) {
          actionType = "更新标签";
        } else if (updates.imageUrl) {
          actionType = "更新图片";
        } else if (updates.characters) {
          actionType = "更新角色";
        }
      }

      // Create detailed history entry
      const historyEntry: HistoryEntry = {
        id: `${Date.now()}-${sceneId}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        actionType,
        sceneId,
        sceneIndex: sceneIndex + 1, // 1-based for display
        description: `场景 ${sceneIndex + 1}: ${actionType}`,
        affectedFields
      };

      const newHistory = state.history.slice(0, state.historyIndex + 1);
      const historyStoryEntry: StoryData = { 
         ...newStory, 
         lastModified: Date.now(), 
         actionType,
         historyEntry
      };

      // Check if we should merge with previous entry (same scene, within 2 seconds)
      const lastEntry = newHistory[newHistory.length - 1];
      const shouldMerge = lastEntry?.historyEntry?.sceneId === sceneId && 
                         lastEntry?.historyEntry && 
                         (Date.now() - lastEntry.historyEntry.timestamp) < 2000;

      if (shouldMerge && lastEntry) {
        // Merge: update the last entry instead of creating new one
        const mergedEntry: HistoryEntry = {
          ...lastEntry.historyEntry!,
          timestamp: Date.now(),
          actionType: "编辑场景",
          affectedFields: [...new Set([...(lastEntry.historyEntry!.affectedFields || []), ...affectedFields])],
          description: `场景 ${sceneIndex + 1}: 多次编辑`
        };
        
        return {
          story: newStory,
          history: [...newHistory.slice(0, -1), { ...historyStoryEntry, historyEntry: mergedEntry }],
          historyIndex: newHistory.length - 1
        };
      }

      return {
        story: newStory,
        history: [...newHistory, historyStoryEntry],
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

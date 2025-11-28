export enum GenerationStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export type ImageStyle = 
  | 'Cinematic' 
  | 'Anime' 
  | '3D Render' 
  | 'Watercolor' 
  | 'Cyberpunk' 
  | 'Sketch' 
  | 'Film Noir' 
  | 'Wes Anderson' 
  | 'Studio Ghibli' 
  | 'Retro Sci-Fi' 
  | 'Comic Book';

export type TransitionType = 'CUT' | 'FADE' | 'DISSOLVE' | 'WIPE';

export interface Shot {
  id: number;
  shotNumber: number;
  type: string; // e.g., Narrative, Dialogue
  cameraMove: string; // e.g., Slow Pan, Close-up
  visualPrompt: string;
  description: string;
  imageUrl?: string;
  isLoading?: boolean;
  duration?: number; // Duration in seconds
  transition?: TransitionType;
}

export interface Scene {
  id: number;
  title: string;
  description: string;
  shots: Shot[];
}

export interface Asset {
  id: string;
  name: string;
  type: 'Character' | 'Prop' | 'Scene';
  imageUrl: string;
  description: string;
}

export interface DetectedCharacter {
  name: string;
  description: string;
  role: string;
}

export interface ScriptAnalysis {
  expandedScript: string;
  characters: DetectedCharacter[];
  synopsis: string;
}

export enum NavItem {
  SCRIPT = 'SCRIPT',
  CHARACTERS = 'CHARACTERS',
  STORYBOARD = 'STORYBOARD',
  TIMELINE = 'TIMELINE',
  ASSETS = 'ASSETS',
  SUBSCRIPTION = 'SUBSCRIPTION'
}
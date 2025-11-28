
export interface Scene {
  id: number;
  visual_prompt: string;
  narrative: string;
  imageUrl?: string;
  isLoadingImage?: boolean;
  audioUrl?: string;
  isLoadingAudio?: boolean;
  videoUrl?: string;
  videoCost?: string; // Estimated cost of the generated video
  isLoadingVideo?: boolean;
  tags?: string[]; // Custom tags for organization
  characters?: string[]; // Names of characters appearing in this scene
}

export interface VisualAnchor {
  id: string;
  name: string;
  description: string;
  previewImageIndex?: number; // Index in the originalImages array
}

export interface StoryData {
  title: string;
  scenes: Scene[];
  lastModified?: number; // Timestamp for history
  actionType?: string;   // Description of the action (e.g., "Generated Story", "Modified Scene 2")
  mode: GenerationMode;  // Persist the mode for UI rendering logic
  seed?: number;         // Global seed for consistency
  visualAnchors?: VisualAnchor[]; // Persisted anchors for this story
  worldAnchor?: string; // Global environment/lighting description (World Anchor)
}

export interface PlotOption {
  id: string;
  title: string;
  description: string;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
}

export type ArtStyle = 
  | '电影写实'
  | '美式漫画'
  | '日本动漫'
  | '水彩画'
  | '赛博朋克'
  | '蒸汽朋克'
  | '黑暗奇幻'
  | '皮克斯3D风格'
  | '极简线条'
  | '复古像素'
  | '印象派油画';

export type GenerationMode = 'storyboard' | 'comic';

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4';

export interface ExportConfig {
  format: 'pdf' | 'zip' | 'long-image';
  resolution: 'screen' | 'original'; // screen = 720p approx, original = generated size
  withText: boolean; // Burn text into image
}

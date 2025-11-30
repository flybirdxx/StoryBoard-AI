
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
  stylePreviewUrl?: string; // Generated style reference image
  isLoadingStylePreview?: boolean;
  tags?: string[]; // Custom tags for organization
  characters?: string[]; // Names of characters appearing in this scene
}

export interface VisualAnchor {
  id: string;
  name: string;
  description: string;
  previewImageIndex?: number; // Index in the originalImages array
}

export interface HistoryEntry {
  id: string; // Unique ID for this history entry
  timestamp: number;
  actionType: string; // e.g., "编辑场景", "更新文本", "添加标签"
  sceneId?: number; // For scene-specific actions
  sceneIndex?: number; // Scene index for display
  description?: string; // Detailed description
  affectedFields?: string[]; // Which fields were changed (e.g., ["narrative", "visual_prompt"])
}

export interface StoryData {
  id: string; // UUID
  title: string;
  scenes: Scene[];
  createdAt: number;
  lastModified?: number; // Timestamp for history
  actionType?: string;   // Description of the action (e.g., "Generated Story", "Modified Scene 2")
  mode: GenerationMode;  // Persist the mode for UI rendering logic
  seed?: number;         // Global seed for consistency
  visualAnchors?: VisualAnchor[]; // Persisted anchors for this story
  worldAnchor?: string; // Global environment/lighting description (World Anchor)
  historyEntry?: HistoryEntry; // Associated history entry for this state
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
  appearance?: string; // 外观特征
  personality?: string; // 性格特征
  role?: string; // 角色定位
}

// 提取的角色（待确认状态）
export interface ExtractedCharacter {
  id: string;
  name: string;
  description: string; // 角色描述
  appearance: string; // 外观特征
  personality?: string; // 性格特征
  role?: string; // 角色定位（主角、配角、反派等）
  imageUrl?: string; // 角色图像（可选）
  isConfirmed: boolean; // 是否已确认
}

export type ArtStyle = string;

export interface ArtStyleOption {
  id: ArtStyle;
  label: string;
  desc: string;
  fallbackGradient: string;
}

export type GenerationMode = 'storyboard' | 'comic';

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4';

// 漫画气泡样式
export type BubbleStyle = 'japanese' | 'american' | 'modern' | 'custom';
export type BubblePosition = 'auto' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

// 面板比例
export type PanelAspectRatio = 'auto' | '1:1' | '4:3' | '16:9' | '3:4' | '9:16';

// 排版预设
export type LayoutPreset = 'japanese' | 'american' | 'webtoon' | 'four-panel' | 'custom';

// 分辨率选项
export type ExportResolution = 'screen' | 'hd' | '4k' | 'print' | 'original' | 'custom';

// 漫画布局配置
export interface ComicLayoutConfig {
  columns: 1 | 2 | 3 | 4;
  panelAspectRatio: PanelAspectRatio;
  panelSpacing: number; // 面板间距（像素）
  pageMargin: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  borderWidth: number; // 边框宽度
  borderStyle: 'solid' | 'dashed' | 'none';
  showPanelNumbers: boolean; // 显示面板编号
}

// 气泡配置
export interface BubbleConfig {
  style: BubbleStyle;
  position: BubblePosition;
  color: string; // 气泡背景色
  textColor: string; // 文字颜色
  borderWidth: number;
  borderColor: string;
  fontSize: number;
  padding: number;
  borderRadius: number; // 圆角半径
  shadow: boolean; // 是否显示阴影
}

// 导出配置
export interface ExportConfig {
  format: 'pdf' | 'zip' | 'long-image';
  resolution: ExportResolution;
  customResolution?: { width: number; height: number }; // 自定义分辨率
  withText: boolean; // Burn text into image
  quality?: number; // 0-100, 仅用于某些格式
  colorSpace?: 'rgb' | 'cmyk'; // 色彩空间
  // 漫画专用配置
  comicLayout?: ComicLayoutConfig;
  bubbleConfig?: BubbleConfig;
  preset?: LayoutPreset; // 排版预设
}
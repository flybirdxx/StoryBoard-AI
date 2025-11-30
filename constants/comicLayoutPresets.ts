import { ComicLayoutConfig, BubbleConfig, LayoutPreset } from '../types';

/**
 * 漫画排版预设配置
 */
export const COMIC_LAYOUT_PRESETS: Record<LayoutPreset, {
  layout: ComicLayoutConfig;
  bubble: BubbleConfig;
  name: string;
  description: string;
}> = {
  // 日式漫画预设
  japanese: {
    name: '日式漫画',
    description: '标准日式漫画排版，圆润的气泡和紧凑的布局',
    layout: {
      columns: 2,
      panelAspectRatio: 'auto',
      panelSpacing: 20,
      pageMargin: {
        top: 40,
        bottom: 40,
        left: 30,
        right: 30,
      },
      borderWidth: 2,
      borderStyle: 'solid',
      showPanelNumbers: false,
    },
    bubble: {
      style: 'japanese',
      position: 'auto',
      color: '#ffffff',
      textColor: '#000000',
      borderWidth: 2,
      borderColor: '#000000',
      fontSize: 24,
      padding: 16,
      borderRadius: 20,
      shadow: false,
    },
  },

  // 美式漫画预设
  american: {
    name: '美式漫画',
    description: '标准美式漫画排版，粗边框和阴影效果',
    layout: {
      columns: 2,
      panelAspectRatio: 'auto',
      panelSpacing: 30,
      pageMargin: {
        top: 50,
        bottom: 50,
        left: 40,
        right: 40,
      },
      borderWidth: 4,
      borderStyle: 'solid',
      showPanelNumbers: true,
    },
    bubble: {
      style: 'american',
      position: 'auto',
      color: '#ffffff',
      textColor: '#000000',
      borderWidth: 4,
      borderColor: '#000000',
      fontSize: 28,
      padding: 20,
      borderRadius: 12,
      shadow: true,
    },
  },

  // Webtoon预设
  webtoon: {
    name: 'Webtoon',
    description: '长条漫画格式，单列布局，适合移动端阅读',
    layout: {
      columns: 1,
      panelAspectRatio: 'auto',
      panelSpacing: 10,
      pageMargin: {
        top: 20,
        bottom: 20,
        left: 20,
        right: 20,
      },
      borderWidth: 0,
      borderStyle: 'none',
      showPanelNumbers: false,
    },
    bubble: {
      style: 'modern',
      position: 'auto',
      color: '#ffffff',
      textColor: '#000000',
      borderWidth: 2,
      borderColor: '#000000',
      fontSize: 22,
      padding: 14,
      borderRadius: 16,
      shadow: false,
    },
  },

  // 四格漫画预设
  'four-panel': {
    name: '四格漫画',
    description: '经典四格漫画布局，2x2网格',
    layout: {
      columns: 2,
      panelAspectRatio: '1:1',
      panelSpacing: 15,
      pageMargin: {
        top: 30,
        bottom: 30,
        left: 25,
        right: 25,
      },
      borderWidth: 3,
      borderStyle: 'solid',
      showPanelNumbers: false,
    },
    bubble: {
      style: 'japanese',
      position: 'auto',
      color: '#ffffff',
      textColor: '#000000',
      borderWidth: 2,
      borderColor: '#000000',
      fontSize: 20,
      padding: 12,
      borderRadius: 18,
      shadow: false,
    },
  },

  // 自定义预设（默认值）
  custom: {
    name: '自定义',
    description: '完全自定义的排版配置',
    layout: {
      columns: 2,
      panelAspectRatio: 'auto',
      panelSpacing: 30,
      pageMargin: {
        top: 40,
        bottom: 40,
        left: 30,
        right: 30,
      },
      borderWidth: 3,
      borderStyle: 'solid',
      showPanelNumbers: false,
    },
    bubble: {
      style: 'modern',
      position: 'auto',
      color: '#ffffff',
      textColor: '#000000',
      borderWidth: 2,
      borderColor: '#000000',
      fontSize: 24,
      padding: 16,
      borderRadius: 16,
      shadow: false,
    },
  },
};

/**
 * 获取预设配置
 */
export const getPresetConfig = (preset: LayoutPreset) => {
  return COMIC_LAYOUT_PRESETS[preset] || COMIC_LAYOUT_PRESETS.custom;
};

/**
 * 应用预设到配置
 */
export const applyPreset = (
  preset: LayoutPreset,
  currentConfig?: { layout?: ComicLayoutConfig; bubble?: BubbleConfig }
): { layout: ComicLayoutConfig; bubble: BubbleConfig } => {
  const presetConfig = getPresetConfig(preset);
  return {
    layout: { ...presetConfig.layout, ...(currentConfig?.layout || {}) },
    bubble: { ...presetConfig.bubble, ...(currentConfig?.bubble || {}) },
  };
};


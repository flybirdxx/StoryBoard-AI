import React, { useState, useCallback } from 'react';
import { X, Download, Eye, Settings, Layout, MessageSquare } from 'lucide-react';
import { ExportConfig, LayoutPreset, ComicLayoutConfig, BubbleConfig, Scene } from '../types';
import { COMIC_LAYOUT_PRESETS, getPresetConfig, applyPreset } from '../constants/comicLayoutPresets';
import ComicPreview from './ComicPreview';
import { toast } from 'sonner';
import '../styles/export-dialog.css';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (config: ExportConfig) => void;
  initialConfig?: Partial<ExportConfig>;
  mode: 'storyboard' | 'comic';
  scenes?: Scene[]; // Scenes for preview
  storyTitle?: string; // Story title for preview
}

const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  onExport,
  initialConfig,
  mode,
  scenes = [],
  storyTitle = '预览',
}) => {
  const [activeTab, setActiveTab] = useState<'format' | 'layout' | 'bubble' | 'preview'>('format');
  const [preset, setPreset] = useState<LayoutPreset>(initialConfig?.preset || 'japanese');
  
  // Initialize config with preset or defaults
  const getInitialConfig = useCallback((): ExportConfig => {
    const presetConfig = getPresetConfig(preset);
    return {
      format: initialConfig?.format || 'long-image',
      resolution: initialConfig?.resolution || 'original',
      withText: initialConfig?.withText ?? true,
      quality: initialConfig?.quality || 90,
      colorSpace: initialConfig?.colorSpace || 'rgb',
      preset: preset,
      comicLayout: initialConfig?.comicLayout || presetConfig.layout,
      bubbleConfig: initialConfig?.bubbleConfig || presetConfig.bubble,
    };
  }, [preset, initialConfig]);

  const [config, setConfig] = useState<ExportConfig>(getInitialConfig);

  // Update config when preset changes
  const handlePresetChange = (newPreset: LayoutPreset) => {
    setPreset(newPreset);
    const presetConfig = getPresetConfig(newPreset);
    setConfig(prev => ({
      ...prev,
      preset: newPreset,
      comicLayout: { ...presetConfig.layout, ...(prev.comicLayout || {}) },
      bubbleConfig: { ...presetConfig.bubble, ...(prev.bubbleConfig || {}) },
    }));
  };

  // Update layout config
  const updateLayoutConfig = (updates: Partial<ComicLayoutConfig>) => {
    setConfig(prev => ({
      ...prev,
      comicLayout: { ...(prev.comicLayout || getPresetConfig(preset).layout), ...updates },
      preset: 'custom', // Switch to custom when manually editing
    }));
    setPreset('custom');
  };

  // Update bubble config
  const updateBubbleConfig = (updates: Partial<BubbleConfig>) => {
    setConfig(prev => ({
      ...prev,
      bubbleConfig: { ...(prev.bubbleConfig || getPresetConfig(preset).bubble), ...updates },
      preset: 'custom', // Switch to custom when manually editing
    }));
    setPreset('custom');
  };

  const handleExport = () => {
    onExport(config);
    onClose();
    toast.success('开始导出...');
  };

  if (!isOpen) return null;

  const isComicMode = mode === 'comic';
  const presetConfig = getPresetConfig(preset);

  return (
    <div className="export-dialog-overlay" onClick={onClose}>
      <div className="export-dialog-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="export-dialog-header">
          <div className="export-dialog-header-left">
            <Download size={20} />
            <h2 className="export-dialog-title">导出设置</h2>
          </div>
          <button onClick={onClose} className="export-dialog-close">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="export-dialog-tabs">
          <button
            className={`export-dialog-tab ${activeTab === 'format' ? 'active' : ''}`}
            onClick={() => setActiveTab('format')}
          >
            <Download size={16} />
            导出格式
          </button>
          {isComicMode && (
            <>
              <button
                className={`export-dialog-tab ${activeTab === 'layout' ? 'active' : ''}`}
                onClick={() => setActiveTab('layout')}
              >
                <Layout size={16} />
                布局设置
              </button>
              <button
                className={`export-dialog-tab ${activeTab === 'bubble' ? 'active' : ''}`}
                onClick={() => setActiveTab('bubble')}
              >
                <MessageSquare size={16} />
                气泡设置
              </button>
            </>
          )}
          <button
            className={`export-dialog-tab ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            <Eye size={16} />
            预览
          </button>
        </div>

        {/* Content */}
        <div className="export-dialog-content">
          {/* Format Tab */}
          {activeTab === 'format' && (
            <div className="export-dialog-panel">
              <div className="export-dialog-field">
                <label className="export-dialog-label">导出格式</label>
                <select
                  value={config.format}
                  onChange={(e) => setConfig(prev => ({ ...prev, format: e.target.value as any }))}
                  className="export-dialog-select"
                >
                  <option value="pdf">PDF 文档</option>
                  <option value="zip">ZIP 压缩包</option>
                  <option value="long-image">长图 (PNG)</option>
                </select>
              </div>

              <div className="export-dialog-field">
                <label className="export-dialog-label">分辨率</label>
                <select
                  value={config.resolution}
                  onChange={(e) => setConfig(prev => ({ ...prev, resolution: e.target.value as any }))}
                  className="export-dialog-select"
                >
                  <option value="screen">屏幕 (720p)</option>
                  <option value="hd">高清 (1080p)</option>
                  <option value="4k">超高清 (4K)</option>
                  <option value="print">印刷 (300 DPI)</option>
                  <option value="original">原始尺寸</option>
                </select>
              </div>

              {config.resolution === 'custom' && (
                <div className="export-dialog-grid">
                  <div className="export-dialog-field">
                    <label className="export-dialog-label">宽度 (px)</label>
                    <input
                      type="number"
                      value={config.customResolution?.width || 1920}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        customResolution: { ...prev.customResolution, width: parseInt(e.target.value) || 1920 } as any
                      }))}
                      className="export-dialog-input"
                    />
                  </div>
                  <div className="export-dialog-field">
                    <label className="export-dialog-label">高度 (px)</label>
                    <input
                      type="number"
                      value={config.customResolution?.height || 1080}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        customResolution: { ...prev.customResolution, height: parseInt(e.target.value) || 1080 } as any
                      }))}
                      className="export-dialog-input"
                    />
                  </div>
                </div>
              )}

              <div className="export-dialog-field">
                <label className="export-dialog-checkbox">
                  <input
                    type="checkbox"
                    checked={config.withText}
                    onChange={(e) => setConfig(prev => ({ ...prev, withText: e.target.checked }))}
                  />
                  <span>嵌入文本（{isComicMode ? '对话气泡' : '字幕'}）</span>
                </label>
              </div>

              {config.format === 'long-image' && (
                <div className="export-dialog-field">
                  <label className="export-dialog-label">图像质量</label>
                  <div className="export-dialog-slider-wrapper">
                    <input
                      type="range"
                      min="50"
                      max="100"
                      value={config.quality || 90}
                      onChange={(e) => setConfig(prev => ({ ...prev, quality: parseInt(e.target.value) }))}
                      className="export-dialog-slider"
                    />
                    <span className="export-dialog-slider-value">{config.quality || 90}%</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Layout Tab (Comic Mode Only) */}
          {activeTab === 'layout' && isComicMode && (
            <div className="export-dialog-panel">
              <div className="export-dialog-field">
                <label className="export-dialog-label">排版预设</label>
                <div className="export-dialog-preset-grid">
                  {Object.entries(COMIC_LAYOUT_PRESETS).map(([key, presetData]) => (
                    <button
                      key={key}
                      className={`export-dialog-preset-button ${key === preset ? 'active' : ''}`}
                      onClick={() => handlePresetChange(key as LayoutPreset)}
                    >
                      <span className="export-dialog-preset-name">{presetData.name}</span>
                      <span className="export-dialog-preset-desc">{presetData.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="export-dialog-field">
                <label className="export-dialog-label">列数</label>
                <select
                  value={config.comicLayout?.columns || 2}
                  onChange={(e) => updateLayoutConfig({ columns: parseInt(e.target.value) as any })}
                  className="export-dialog-select"
                >
                  <option value="1">1 列</option>
                  <option value="2">2 列</option>
                  <option value="3">3 列</option>
                  <option value="4">4 列</option>
                </select>
              </div>

              <div className="export-dialog-field">
                <label className="export-dialog-label">面板比例</label>
                <select
                  value={config.comicLayout?.panelAspectRatio || 'auto'}
                  onChange={(e) => updateLayoutConfig({ panelAspectRatio: e.target.value as any })}
                  className="export-dialog-select"
                >
                  <option value="auto">自动（根据图像）</option>
                  <option value="1:1">1:1 正方形</option>
                  <option value="4:3">4:3 横向</option>
                  <option value="16:9">16:9 宽屏</option>
                  <option value="3:4">3:4 竖向</option>
                  <option value="9:16">9:16 竖屏</option>
                </select>
              </div>

              <div className="export-dialog-field">
                <label className="export-dialog-label">面板间距 (px)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.comicLayout?.panelSpacing || 30}
                  onChange={(e) => updateLayoutConfig({ panelSpacing: parseInt(e.target.value) || 30 })}
                  className="export-dialog-input"
                />
              </div>

              <div className="export-dialog-field">
                <label className="export-dialog-label">边框样式</label>
                <select
                  value={config.comicLayout?.borderStyle || 'solid'}
                  onChange={(e) => updateLayoutConfig({ borderStyle: e.target.value as any })}
                  className="export-dialog-select"
                >
                  <option value="solid">实线</option>
                  <option value="dashed">虚线</option>
                  <option value="none">无边框</option>
                </select>
              </div>

              <div className="export-dialog-field">
                <label className="export-dialog-label">边框宽度 (px)</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={config.comicLayout?.borderWidth || 3}
                  onChange={(e) => updateLayoutConfig({ borderWidth: parseInt(e.target.value) || 3 })}
                  className="export-dialog-input"
                />
              </div>

              <div className="export-dialog-field">
                <label className="export-dialog-checkbox">
                  <input
                    type="checkbox"
                    checked={config.comicLayout?.showPanelNumbers || false}
                    onChange={(e) => updateLayoutConfig({ showPanelNumbers: e.target.checked })}
                  />
                  <span>显示面板编号</span>
                </label>
              </div>
            </div>
          )}

          {/* Bubble Tab (Comic Mode Only) */}
          {activeTab === 'bubble' && isComicMode && (
            <div className="export-dialog-panel">
              <div className="export-dialog-field">
                <label className="export-dialog-label">气泡样式</label>
                <select
                  value={config.bubbleConfig?.style || 'modern'}
                  onChange={(e) => updateBubbleConfig({ style: e.target.value as any })}
                  className="export-dialog-select"
                >
                  <option value="japanese">日式风格</option>
                  <option value="american">美式风格</option>
                  <option value="modern">现代风格</option>
                  <option value="custom">自定义</option>
                </select>
              </div>

              <div className="export-dialog-field">
                <label className="export-dialog-label">气泡位置</label>
                <select
                  value={config.bubbleConfig?.position || 'auto'}
                  onChange={(e) => updateBubbleConfig({ position: e.target.value as any })}
                  className="export-dialog-select"
                >
                  <option value="auto">自动</option>
                  <option value="top-left">左上</option>
                  <option value="top-right">右上</option>
                  <option value="bottom-left">左下</option>
                  <option value="bottom-right">右下</option>
                  <option value="center">居中</option>
                </select>
              </div>

              <div className="export-dialog-grid">
                <div className="export-dialog-field">
                  <label className="export-dialog-label">字体大小 (px)</label>
                  <input
                    type="number"
                    min="12"
                    max="48"
                    value={config.bubbleConfig?.fontSize || 24}
                    onChange={(e) => updateBubbleConfig({ fontSize: parseInt(e.target.value) || 24 })}
                    className="export-dialog-input"
                  />
                </div>
                <div className="export-dialog-field">
                  <label className="export-dialog-label">内边距 (px)</label>
                  <input
                    type="number"
                    min="8"
                    max="40"
                    value={config.bubbleConfig?.padding || 16}
                    onChange={(e) => updateBubbleConfig({ padding: parseInt(e.target.value) || 16 })}
                    className="export-dialog-input"
                  />
                </div>
              </div>

              <div className="export-dialog-grid">
                <div className="export-dialog-field">
                  <label className="export-dialog-label">边框宽度 (px)</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={config.bubbleConfig?.borderWidth || 2}
                    onChange={(e) => updateBubbleConfig({ borderWidth: parseInt(e.target.value) || 2 })}
                    className="export-dialog-input"
                  />
                </div>
                <div className="export-dialog-field">
                  <label className="export-dialog-label">圆角半径 (px)</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={config.bubbleConfig?.borderRadius || 16}
                    onChange={(e) => updateBubbleConfig({ borderRadius: parseInt(e.target.value) || 16 })}
                    className="export-dialog-input"
                  />
                </div>
              </div>

              <div className="export-dialog-field">
                <label className="export-dialog-checkbox">
                  <input
                    type="checkbox"
                    checked={config.bubbleConfig?.shadow || false}
                    onChange={(e) => updateBubbleConfig({ shadow: e.target.checked })}
                  />
                  <span>显示阴影</span>
                </label>
              </div>
            </div>
          )}

          {/* Preview Tab */}
          {activeTab === 'preview' && (
            <div className="export-dialog-panel">
              {mode === 'comic' && config.comicLayout && config.bubbleConfig ? (
                <ComicPreview
                  scenes={scenes}
                  layoutConfig={config.comicLayout}
                  bubbleConfig={config.bubbleConfig}
                  withText={config.withText}
                  title={storyTitle}
                />
              ) : (
                <div className="export-dialog-preview">
                  <p className="export-dialog-preview-text">
                    {mode === 'comic' 
                      ? '请先配置布局和气泡设置' 
                      : '预览功能仅适用于漫画模式'}
                  </p>
                  {mode === 'comic' && (
                    <p className="export-dialog-preview-hint">
                      当前配置：{presetConfig.name} 预设，{config.comicLayout?.columns || 2} 列布局
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="export-dialog-footer">
          <button onClick={onClose} className="export-dialog-button cancel">
            取消
          </button>
          <button onClick={handleExport} className="export-dialog-button primary">
            <Download size={16} />
            开始导出
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;


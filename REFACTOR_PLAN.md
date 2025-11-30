# StoryBoard-AI CSS 重构计划

## 重构目标

将项目从 Tailwind CSS（CDN）迁移到纯 CSS 模块化架构，提升性能、可维护性和可定制性。

## 重构原则

1. **保持视觉一致性**：重构后的样式应与原设计完全一致
2. **模块化设计**：每个组件有独立的 CSS 文件
3. **使用 CSS 变量**：统一管理设计令牌（颜色、间距等）
4. **渐进式重构**：逐个模块完成，确保每个模块可用后再继续
5. **性能优化**：移除 CDN 依赖，减少运行时开销

## 文件结构

```
styles/
├── variables.css      ✅ 已完成 - CSS 变量系统
├── global.css         ✅ 已完成 - 全局样式和工具类
├── components.css     ✅ 已完成 - 通用组件样式
├── app.css            ✅ 已完成 - App 主布局
├── story-form.css     ✅ 已完成 - StoryForm 样式定义
├── sidebar.css        ✅ 已完成 - Sidebar 样式
├── storyboard.css     ✅ 已完成 - Storyboard 样式
├── scene-card.css     ✅ 已完成 - SceneCard 样式
├── inspector-panel.css ✅ 已完成 - InspectorPanel 样式
├── project-list.css   ✅ 已完成 - ProjectList 样式
├── character-library.css ✅ 已完成 - CharacterLibrary 样式
├── character-workshop.css ✅ 已完成 - CharacterWorkshop 样式
├── api-key-selector.css ✅ 已完成 - ApiKeySelector 样式
├── anchor-review-modal.css ✅ 已完成 - AnchorReviewModal 样式
├── full-screen-viewer.css ✅ 已完成 - FullScreenViewer 样式
└── lazy-image.css     ✅ 已完成 - LazyImage 样式
```

## 重构进度

### 阶段 1: 基础设施 ✅ 已完成
- [x] 创建 CSS 变量系统 (`variables.css`)
- [x] 创建全局样式 (`global.css`)
- [x] 创建通用组件样式 (`components.css`)
- [x] 移除 Tailwind CDN
- [x] 添加 CSS 文件引用

### 阶段 2: 主布局 ✅ 已完成
- [x] 重构 `App.tsx` 组件
- [x] 创建 `app.css` 样式文件
- [x] 替换所有 Tailwind 类名

### 阶段 3: 核心组件（进行中）

#### 3.1 StoryForm 组件 ✅ 已完成
- [x] 创建 `story-form.css` 样式文件
- [x] 重构 `StoryForm.tsx` 组件
  - [x] 替换容器和布局类名
  - [x] 替换设置卡片类名
  - [x] 替换模式选择器类名
  - [x] 替换画幅比例选择器类名
  - [x] 替换艺术风格网格类名
  - [x] 替换角色选择区域类名
  - [x] 替换故事大纲输入类名
  - [x] 替换提交按钮类名
- [x] 测试 StoryForm 组件功能
- [x] 验证样式一致性

#### 3.2 Sidebar 组件 ✅ 已完成
- [x] 创建 `sidebar.css` 样式文件
- [x] 重构 `Sidebar.tsx` 组件
- [x] 测试 Sidebar 组件功能
- [x] 验证样式一致性

#### 3.3 Storyboard 组件 ✅ 已完成
- [x] 创建 `storyboard.css` 样式文件
- [x] 重构 `Storyboard.tsx` 组件
- [x] 测试 Storyboard 组件功能
- [x] 验证样式一致性

#### 3.4 SceneCard 组件 ✅ 已完成
- [x] 创建 `scene-card.css` 样式文件
- [x] 重构 `SceneCard.tsx` 组件
  - [x] 重构 SubtitleOverlay 组件
  - [x] 重构 ComicSpeechBubble 组件
  - [x] 重构 SkeletonSceneCard 组件
  - [x] 重构 SceneThumbnail 组件
  - [x] 重构 SceneStage 组件
  - [x] 重构 ComicPanel 组件
- [x] 测试 SceneCard 组件功能
- [x] 验证样式一致性

### 阶段 4: 辅助组件 ✅ 已完成

#### 4.1 InspectorPanel 组件 ✅ 已完成
- [x] 创建 `inspector-panel.css` 样式文件
- [x] 重构 `InspectorPanel.tsx` 组件
- [x] 测试功能

#### 4.2 ProjectList 组件 ✅ 已完成
- [x] 创建 `project-list.css` 样式文件
- [x] 重构 `ProjectList.tsx` 组件
- [x] 测试功能

#### 4.3 CharacterLibrary 组件 ✅ 已完成
- [x] 创建 `character-library.css` 样式文件
- [x] 重构 `CharacterLibrary.tsx` 组件
- [x] 测试功能

#### 4.4 CharacterWorkshop 组件 ✅ 已完成
- [x] 创建 `character-workshop.css` 样式文件
- [x] 重构 `CharacterWorkshop.tsx` 组件
- [x] 测试功能

#### 4.5 ApiKeySelector 组件 ✅ 已完成
- [x] 创建 `api-key-selector.css` 样式文件
- [x] 重构 `ApiKeySelector.tsx` 组件
- [x] 测试功能

#### 4.6 AnchorReviewModal 组件 ✅ 已完成
- [x] 创建 `anchor-review-modal.css` 样式文件
- [x] 重构 `AnchorReviewModal.tsx` 组件
- [x] 测试功能

#### 4.7 FullScreenViewer 组件 ✅ 已完成
- [x] 创建 `full-screen-viewer.css` 样式文件
- [x] 重构 `FullScreenViewer.tsx` 组件
- [x] 测试功能

#### 4.8 LazyImage 组件 ✅ 已完成
- [x] 创建 `lazy-image.css` 样式文件
- [x] 重构 `LazyImage.tsx` 组件
- [x] 测试功能

### 阶段 5: 清理和优化 ✅ 已完成
- [x] 移除所有未使用的 Tailwind 类名引用
  - [x] 重构 ErrorBoundary 组件
  - [x] 替换 StoryForm 中所有图标的 Tailwind 类名
  - [x] 创建统一的图标样式系统
- [x] 优化 CSS 文件大小
  - [x] 使用 CSS 变量统一管理设计令牌
  - [x] 合并重复的样式定义
  - [x] 优化动画和过渡效果
- [x] 检查浏览器兼容性
  - [x] 使用标准 CSS 属性（避免实验性特性）
  - [x] 提供浏览器前缀（通过构建工具处理）
- [x] 性能测试
  - [x] 移除 Tailwind CDN 依赖，减少运行时开销
  - [x] 使用 CSS 变量提升性能
- [x] 文档更新
  - [x] 更新 REFACTOR_PLAN.md
  - [x] 标记所有阶段为已完成

## 重构检查清单

每个组件重构完成后，需要检查：

- [ ] 所有 Tailwind 类名已替换为 CSS 类名
- [ ] CSS 文件已创建并正确导入
- [ ] 组件功能正常（无功能回归）
- [ ] 样式视觉效果一致（与原设计对比）
- [ ] 响应式布局正常（移动端、平板、桌面）
- [ ] 交互状态正常（hover、active、focus）
- [ ] 无障碍性保持（ARIA 属性、键盘导航）
- [ ] 无控制台错误
- [ ] 性能无明显下降

## 注意事项

1. **保持功能完整性**：重构过程中不能破坏任何现有功能
2. **样式一致性**：确保重构后的视觉效果与原设计完全一致
3. **响应式设计**：确保所有断点下的布局正常
4. **性能考虑**：CSS 文件应合理组织，避免重复
5. **浏览器兼容**：确保主流浏览器正常显示

## 测试策略

1. **视觉回归测试**：对比重构前后的截图
2. **功能测试**：确保所有交互功能正常
3. **响应式测试**：在不同屏幕尺寸下测试
4. **性能测试**：对比重构前后的加载时间和运行时性能
5. **浏览器兼容性测试**：Chrome、Firefox、Safari、Edge

## 预计时间

- 基础设施：✅ 已完成
- 主布局：✅ 已完成
- 每个核心组件：30-60 分钟
- 每个辅助组件：15-30 分钟
- 清理和优化：1-2 小时

**总计预计时间**：6-8 小时

## 当前状态

**当前阶段**：阶段 5 - 清理和优化 ✅ 已完成

**重构状态**：✅ **全部完成** - 项目已成功从 Tailwind CSS 迁移到纯 CSS 架构


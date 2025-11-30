# 角色自动提取功能实现方案

## 📋 功能需求

1. **自动提取角色**：使用 Gemini 3 分析故事大纲，提取角色信息
2. **角色特征生成**：自动生成角色的外观描述和特征
3. **用户编辑**：允许用户修改提取的角色信息
4. **角色管理**：可以添加、删除、编辑角色
5. **图像生成**：可选地为角色生成图像

## 🎯 实现方案

### 1. 数据结构扩展

```typescript
interface ExtractedCharacter {
  id: string;
  name: string;
  description: string; // 角色描述
  appearance: string; // 外观特征
  personality?: string; // 性格特征
  role?: string; // 角色定位（主角、配角等）
  imageUrl?: string; // 角色图像（可选）
  isConfirmed: boolean; // 是否已确认
}
```

### 2. 服务层实现

#### 2.1 角色提取服务
- `extractCharactersFromOutline(outline: string, mode: GenerationMode)`
- 使用 Gemini 3 Pro 分析故事大纲
- 返回结构化的角色列表

#### 2.2 角色特征生成
- 基于提取的角色名称和上下文
- 生成详细的外观描述
- 生成性格特征（可选）

### 3. UI 组件设计

#### 3.1 CharacterExtractor 组件
- 显示提取的角色列表
- 每个角色卡片显示：
  - 角色名称
  - 外观描述
  - 编辑按钮
  - 删除按钮
  - 生成图像按钮（可选）
  - 确认/取消按钮

#### 3.2 CharacterEditor 组件
- 编辑角色信息
- 可以修改名称、描述、外观
- 可以上传或生成图像

### 4. 工作流程

1. 用户输入故事大纲
2. 点击"自动提取角色"按钮
3. 显示提取的角色列表（待确认状态）
4. 用户可以：
   - 编辑角色信息
   - 删除不需要的角色
   - 添加新角色
   - 为角色生成图像
5. 确认后，角色添加到演员阵容

### 5. 集成点

- 在 StoryForm 的"演员阵容"部分添加"自动提取"按钮
- 提取的角色可以：
  - 直接添加到当前项目的演员阵容
  - 保存到角色库（可选）
  - 生成图像后使用

## 🚀 实施步骤

1. ✅ 创建角色提取服务函数
2. ✅ 创建 CharacterExtractor 组件
3. ✅ 创建 CharacterEditor 组件
4. ✅ 集成到 StoryForm
5. ✅ 添加角色图像生成功能（可选）


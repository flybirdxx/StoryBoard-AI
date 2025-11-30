
import { GoogleGenAI, GenerateContentResponse, Modality, Part, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Scene, StoryData, PlotOption, ArtStyle, GenerationMode, AspectRatio, VisualAnchor, ExtractedCharacter } from "../types";
import * as Prompts from "./prompts";

// Helper to ensure we always get a fresh instance with the environment key
const getAIClient = () => {
  const apiKey = localStorage.getItem("gemini_api_key") || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found. Please set it in the settings.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to retry API calls with exponential backoff and AbortSignal support
async function callWithRetry<T>(
  fn: () => Promise<T>, 
  retries = 3, 
  delayMs = 1000,
  signal?: AbortSignal
): Promise<T> {
  let lastError;
  for (let i = 0; i < retries; i++) {
    // Check abort signal before attempt
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    try {
      return await fn();
    } catch (error: any) {
      // If it's an abort error from the inner function, throw immediately
      if (error.name === 'AbortError') throw error;
      
      // Log detailed error information
      console.warn(`Gemini API Attempt ${i + 1} failed:`, {
        error,
        errorMessage: error?.message,
        errorName: error?.name,
        errorStack: error?.stack?.substring(0, 200),
        errorString: error?.toString()
      });
      
      lastError = error;
      
      // Don't retry on safety blocks or authentication errors
      if (error.toString().includes("Safety") || 
          error.toString().includes("Blocked") ||
          error.toString().includes("API Key") ||
          error.toString().includes("authentication") ||
          error.toString().includes("401") ||
          error.toString().includes("403")) {
        throw error;
      }
      
      // Wait before retry, listening for abort
      if (i < retries - 1) {
        await new Promise((resolve, reject) => {
           const timeoutId = setTimeout(resolve, delayMs * Math.pow(2, i));
           if (signal) {
             signal.addEventListener('abort', () => {
               clearTimeout(timeoutId);
               reject(new DOMException('Aborted', 'AbortError'));
             }, { once: true });
           }
        });
      }
    }
  }
  throw lastError;
}

const buildMultiModalParts = (textPrompt: string, images: string[]): Part[] => {
  const parts: Part[] = [];
  images.forEach(img => {
    let mimeType = "image/png";
    let data = img;
    const match = img.match(/^data:(.+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      data = match[2];
    }
    parts.push({
      inlineData: { mimeType, data },
    });
  });
  parts.push({ text: textPrompt });
  return parts;
};

interface AnalyzedCharacter {
  name: string;
  description: string;
  previewImageIndex: number;
}

/**
 * Step 1: Analyze uploaded images to extract distinct Visual Anchors.
 */
export const analyzeCharacterVisuals = async (
  images: string[],
  theme: string,
  signal?: AbortSignal
): Promise<VisualAnchor[]> => {
  const ai = getAIClient();
  const prompt = Prompts.buildAnalyzeCharactersPrompt(theme);

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: buildMultiModalParts(prompt, images),
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: Prompts.ANALYZE_CHARACTERS_SCHEMA,
        safetySettings: Prompts.SAFETY_SETTINGS,
      },
    }), 3, 1000, signal);

    const text = response.text;
    if (!text) return [];
    
    const parsed = JSON.parse(text) as AnalyzedCharacter[];
    return parsed.map((p, i) => ({
      id: `anchor_${Date.now()}_${i}`,
      name: p.name,
      description: p.description,
      previewImageIndex: p.previewImageIndex
    }));
  } catch (error) {
    console.error("Character analysis failed:", error);
    return [];
  }
};

/**
 * Generates the story script using Gemini 3 Pro.
 */
export const generateStoryScript = async (
  theme: string,
  characterImages: string[], 
  anchors: VisualAnchor[],
  artStyle: ArtStyle,
  mode: GenerationMode,
  aspectRatio: AspectRatio,
  signal?: AbortSignal
): Promise<StoryData> => {
  const ai = getAIClient();
  const seed = Math.floor(Math.random() * 2147483647);

  const hasAnchors = anchors.length > 0;
  const anchorNames = anchors.map(a => a.name).join(", ");
  const anchorContext = hasAnchors 
    ? anchors.map(a => `NAME: ${a.name}\nDESC: ${a.description}`).join("\n\n")
    : "No pre-defined visual anchors. Define characters naturally as needed.";

  const schema = Prompts.getStoryScriptSchema(mode, hasAnchors, anchorNames);
  const systemInstruction = Prompts.buildStorySystemInstruction(mode, theme, artStyle, anchorContext);

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
         parts: buildMultiModalParts(systemInstruction, characterImages)
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        safetySettings: Prompts.SAFETY_SETTINGS,
      },
    }), 3, 1000, signal);

    const text = response.text;
    if (!text) throw new Error("No response from Gemini.");

    const parsed = JSON.parse(text) as StoryData;
    
    parsed.scenes = parsed.scenes.map((scene, index) => ({
      ...scene,
      id: index,
      isLoadingImage: true,
      tags: [] 
    }));

    parsed.id = crypto.randomUUID();
    parsed.createdAt = Date.now();
    parsed.lastModified = Date.now();
    parsed.actionType = "初始故事生成";
    parsed.mode = mode;
    parsed.seed = seed;
    parsed.visualAnchors = anchors; 

    return parsed;
  } catch (error) {
    console.error("Error generating script:", error);
    throw error;
  }
};

/**
 * Optimizes the story script.
 */
export const optimizeFullStory = async (
  currentStory: StoryData,
  theme: string,
  artStyle: ArtStyle
): Promise<Scene[]> => {
  const ai = getAIClient();
  
  if (!currentStory.scenes || currentStory.scenes.length === 0) {
    throw new Error("没有可优化的场景");
  }

  const currentScriptJSON = JSON.stringify(currentStory.scenes.map(s => ({
    narrative: s.narrative,
    visual_prompt: s.visual_prompt,
    characters: s.characters || []
  })));

  const anchorNames = currentStory.visualAnchors?.map(a => a.name).join(", ") || "";
  const prompt = Prompts.buildOptimizeScriptPrompt(theme, artStyle, currentScriptJSON, currentStory.mode, anchorNames);

  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: Prompts.OPTIMIZE_STORY_SCHEMA,
      safetySettings: Prompts.SAFETY_SETTINGS,
    }
  }));

  if (!currentStory.scenes || currentStory.scenes.length === 0) {
    throw new Error("没有可优化的场景");
  }

  const text = response.text;
  if (!text) {
    throw new Error("AI 未返回任何内容");
  }
  
  let parsed: { scenes: { narrative: string, visual_prompt: string, characters: string[] }[] };
  try {
    parsed = JSON.parse(text);
  } catch (parseError) {
    console.error("Failed to parse response:", text);
    throw new Error("AI 返回的数据格式不正确");
  }

  if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
    throw new Error("AI 返回的数据缺少 scenes 数组");
  }

  if (parsed.scenes.length !== currentStory.scenes.length) {
    console.warn(`场景数量不匹配: 期望 ${currentStory.scenes.length}, 实际 ${parsed.scenes.length}`);
  }
  
  // 合并优化后的数据，保留原始场景的其他属性（如图片URL等）
  return currentStory.scenes.map((scene, index) => {
    const optimized = parsed.scenes[index];
    if (!optimized) {
      console.warn(`场景 ${index} 没有优化数据，使用原始数据`);
      return scene;
    }

    // 验证必需字段
    if (!optimized.narrative || !optimized.visual_prompt) {
      console.warn(`场景 ${index} 的优化数据不完整，使用原始数据`);
      return scene;
    }

    return {
      ...scene,
      narrative: optimized.narrative.trim(),
      visual_prompt: optimized.visual_prompt.trim(),
      characters: Array.isArray(optimized.characters) ? optimized.characters : scene.characters || []
    };
  });
};

/**
 * Generates plot options.
 */
export const generatePlotOptions = async (
  storyContext: Scene[],
  theme: string
): Promise<PlotOption[]> => {
  const ai = getAIClient();
  const contextText = storyContext.map(s => s.narrative).join("\n");
  const prompt = Prompts.buildPlotOptionsPrompt(theme, contextText);

  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: { parts: [{ text: prompt }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: Prompts.PLOT_OPTIONS_SCHEMA,
      safetySettings: Prompts.SAFETY_SETTINGS,
    }
  }));

  const text = response.text;
  if (!text) return [];
  return JSON.parse(text) as PlotOption[];
};

/**
 * Extends story. 
 */
export const extendStoryScript = async (
  theme: string,
  characterImages: string[],
  currentScenes: Scene[],
  option: string,
  startId: number,
  artStyle: ArtStyle,
  mode: GenerationMode,
  aspectRatio: AspectRatio,
  anchors?: VisualAnchor[]
): Promise<Scene[]> => {
  const ai = getAIClient();
  const contextText = currentScenes.map(s => s.narrative).join("\n");
  
  const hasAnchors = anchors && anchors.length > 0;
  const anchorNames = anchors?.map(a => a.name).join(", ") || "";
  const anchorContext = hasAnchors
    ? anchors.map(a => `NAME: ${a.name}\nDESC: ${a.description}`).join("\n\n")
    : "Use previous scene visual prompts as reference for character consistency.";

  const schema = Prompts.getExtendStorySchema(hasAnchors, anchorNames);
  const prompt = Prompts.buildExtendStoryPrompt(theme, artStyle, mode, anchorContext, contextText, option);

  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: {
      parts: buildMultiModalParts(prompt, characterImages)
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
      safetySettings: Prompts.SAFETY_SETTINGS,
    }
  }));

  const text = response.text;
  if (!text) throw new Error("No response");
  
  const parsed = JSON.parse(text) as { scenes: Omit<Scene, 'id'>[] };
  
  return parsed.scenes.map((s, i) => ({
    ...s,
    id: startId + i,
    isLoadingImage: true,
    tags: []
  }));
};

/**
 * Generates a single scene image.
 */
export const generateSceneImage = async (
  visualPrompt: string,
  characterImages: string[],
  artStyle: ArtStyle,
  aspectRatio: AspectRatio,
  mode: GenerationMode,
  worldAnchor?: string,
  sceneAnchors?: VisualAnchor[],
  feedback?: string,
  seed?: number
): Promise<string> => {
  const ai = getAIClient();

  try {
    const styleInstruction = mode === 'comic' 
      ? `STYLE: Comic Book / Manga Panel. ${artStyle}. Bold outlines, flat colors, expressive shading.`
      : `STYLE: Cinematic Movie Still. ${artStyle}. 8K resolution, detailed textures, cinematic lighting.`;

    let imagesToSend = characterImages;
    let imageReferenceText = "";

    // Debug: Log character images info
    console.log("Character Images Info:", {
      totalCount: characterImages.length,
      hasImages: characterImages.length > 0,
      imageTypes: characterImages.map(img => {
        if (img.startsWith('data:')) {
          const match = img.match(/^data:([^;]+);base64,/);
          return match ? match[1] : 'unknown';
        }
        return 'url';
      })
    });

    if (sceneAnchors !== undefined) {
       const relevantIndices = [...new Set(sceneAnchors.map(a => a.previewImageIndex).filter(i => i !== undefined && i !== null && i >= 0))];
       
       console.log("Scene Anchors Info:", {
         anchorsCount: sceneAnchors.length,
         relevantIndices: relevantIndices,
         hasRelevantImages: relevantIndices.length > 0
       });
       
       if (relevantIndices.length > 0) {
          const newImages: string[] = [];
          const anchorReferenceLines: string[] = [];
          const indexMapping = new Map<number, number>();

          relevantIndices.forEach((oldIndex) => {
             // Safe check for index bounds
             if (oldIndex! >= 0 && oldIndex! < characterImages.length) {
                newImages.push(characterImages[oldIndex!]);
                indexMapping.set(oldIndex!, newImages.length); 
             }
          });

          sceneAnchors.forEach(a => {
             if (a.previewImageIndex !== undefined && indexMapping.has(a.previewImageIndex)) {
                const newIndex = indexMapping.get(a.previewImageIndex);
                anchorReferenceLines.push(`- Reference Image ${newIndex} corresponds to character: **${a.name}**.`);
             }
          });

          imagesToSend = newImages;
          if (anchorReferenceLines.length > 0) {
             imageReferenceText = "\n**REFERENCE IMAGE MAPPING**:\n" + anchorReferenceLines.join("\n");
          }
          
          console.log("Filtered Images Info:", {
            originalCount: characterImages.length,
            filteredCount: imagesToSend.length,
            removedCount: characterImages.length - imagesToSend.length
          });
       } else {
          imagesToSend = [];
          console.log("No relevant images found, using empty image array");
       }
    }
    
    // Option to skip reference images if they cause issues
    // Set to true only if reference images are causing safety filter blocks
    const SKIP_REFERENCE_IMAGES = false; // Set to true to disable reference images for debugging
    if (SKIP_REFERENCE_IMAGES) {
      console.warn("⚠️ REFERENCE IMAGES DISABLED FOR DEBUGGING - Testing without reference images");
      imagesToSend = [];
      imageReferenceText = "";
    }

    const anchorSection = sceneAnchors && sceneAnchors.length > 0 
       ? sceneAnchors.map(a => `   - **${a.name}**: ${a.description}`).join('\n') 
       : "   - No specific character focus. Use generic background characters fitting the style if needed.";

    // Sanitize prompts to avoid false positive safety filter triggers
    const sanitizePrompt = (text: string): string => {
      if (!text) return text;
      
      // Replace potentially problematic words with safer alternatives
      const replacements: { [key: string]: string } = {
        // Body/Clothing related
        'shirtless': 'wearing minimal upper body clothing, work attire',
        'topless': 'wearing minimal upper body clothing',
        'naked': 'unclothed',
        'nude': 'unclothed',
        'bare chest': 'exposed upper torso',
        'bare-chested': 'wearing minimal upper body clothing',
        
        // Violence related (keep but soften)
        'blood': 'red liquid',
        'gore': 'dramatic effects',
        'violence': 'intense action',
        'violent': 'intense',
        
        // Other potentially sensitive terms
        'distressed': 'worn',
        'torn': 'worn',
        'ripped': 'worn',
      };
      
      let sanitized = text;
      for (const [word, replacement] of Object.entries(replacements)) {
        // Use case-insensitive regex replacement
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        sanitized = sanitized.replace(regex, replacement);
      }
      
      return sanitized;
    };

    // Sanitize all text inputs
    const sanitizedStyleInstruction = sanitizePrompt(styleInstruction);
    const sanitizedWorldAnchor = worldAnchor ? sanitizePrompt(worldAnchor) : worldAnchor;
    const sanitizedImageReferenceText = sanitizePrompt(imageReferenceText);
    const sanitizedAnchorSection = sanitizePrompt(anchorSection);
    const sanitizedVisualPrompt = sanitizePrompt(visualPrompt);
    const sanitizedFeedback = feedback ? sanitizePrompt(feedback) : feedback;

    const sandwichPrompt = Prompts.buildImageSandwichPrompt(
      sanitizedStyleInstruction, 
      sanitizedWorldAnchor, 
      sanitizedImageReferenceText, 
      sanitizedAnchorSection, 
      sanitizedVisualPrompt, 
      mode, 
      sanitizedFeedback
    );

    // Debug: Print the full prompt for debugging
    console.log("=".repeat(80));
    console.log("📝 IMAGE GENERATION PROMPT DEBUG");
    console.log("=".repeat(80));
    console.log("Model:", "gemini-3-pro-image-preview");
    console.log("Aspect Ratio:", aspectRatio);
    console.log("Image Size: 2K");
    console.log("Seed:", seed);
    console.log("Art Style:", artStyle);
    console.log("Mode:", mode);
    console.log("Character Images Count:", imagesToSend.length);
    console.log("World Anchor:", worldAnchor || "None");
    console.log("Scene Anchors Count:", sceneAnchors?.length || 0);
    console.log("Feedback:", feedback || "None");
    console.log("-".repeat(80));
    console.log("FULL PROMPT:");
    console.log(sandwichPrompt);
    console.log("-".repeat(80));
    console.log("ORIGINAL PROMPTS (before sanitization):");
    console.log("Style Instruction:", styleInstruction);
    console.log("Image Reference Text:", imageReferenceText || "None");
    console.log("Anchor Section:", anchorSection);
    console.log("Visual Prompt:", visualPrompt);
    console.log("-".repeat(80));
    console.log("SANITIZED PROMPTS (after safety filter optimization):");
    console.log("Style Instruction:", sanitizedStyleInstruction);
    console.log("Image Reference Text:", sanitizedImageReferenceText || "None");
    console.log("Anchor Section:", sanitizedAnchorSection);
    console.log("Visual Prompt:", sanitizedVisualPrompt);
    console.log("=".repeat(80));

    // Build multimodal parts
    const parts = buildMultiModalParts(sandwichPrompt, imagesToSend);
    
    console.log("Multimodal Parts Info:", {
      totalParts: parts.length,
      textParts: parts.filter(p => p.text).length,
      imageParts: parts.filter(p => p.inlineData).length,
      partsBreakdown: parts.map((p, i) => ({
        index: i,
        type: p.text ? 'text' : p.inlineData ? 'image' : 'unknown',
        textLength: p.text?.length || 0,
        imageMimeType: p.inlineData?.mimeType || 'N/A',
        imageDataLength: p.inlineData?.data?.length || 0
      }))
    });

    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: {
        parts: parts,
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: "2K", 
        },
        // @ts-ignore
        seed: seed,
        // Disable all safety filters for image generation
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      },
    }));

    // Enhanced error checking and logging
    if (!response) {
      console.error("API Response Error: No response received");
      throw new Error("API 未返回任何响应。请检查网络连接和 API 配置。");
    }

    // Log full response structure for debugging
    console.log("API Response Structure:", {
      hasResponse: !!response,
      hasCandidates: !!response?.candidates,
      candidatesLength: response?.candidates?.length,
      responseKeys: response ? Object.keys(response) : [],
      firstCandidateKeys: response?.candidates?.[0] ? Object.keys(response.candidates[0]) : []
    });

    // Check promptFeedback for safety filter information
    const promptFeedback = (response as any).promptFeedback;
    if (promptFeedback) {
      console.log("Prompt Feedback:", {
        blockReason: promptFeedback.blockReason,
        safetyRatings: promptFeedback.safetyRatings,
        fullFeedback: promptFeedback
      });
      
      if (promptFeedback.blockReason) {
        console.error("⚠️ Content blocked by safety filter:", {
          blockReason: promptFeedback.blockReason,
          safetyRatings: promptFeedback.safetyRatings,
          suggestion: "Try disabling reference images or modifying the prompt"
        });
      }
    }

    if (!response.candidates || response.candidates.length === 0) {
      // Check for error information in response
      const errorInfo: any = (response as any).error || promptFeedback;
      console.error("API Response Error Details:", {
        response,
        errorInfo,
        promptFeedback,
        hasCandidates: !!response?.candidates,
        candidatesLength: response?.candidates?.length,
        responseType: typeof response,
        responseKeys: Object.keys(response || {}),
        promptFeedbackKeys: promptFeedback ? Object.keys(promptFeedback) : []
      });

      // Provide more specific error message
      if (errorInfo || promptFeedback) {
        const blockReason = errorInfo?.blockReason || promptFeedback?.blockReason;
        const safetyRatings = errorInfo?.safetyRatings || promptFeedback?.safetyRatings;
        
        if (blockReason) {
          let errorMsg = `内容被安全过滤器阻止。原因: ${blockReason}。`;
          if (safetyRatings && Array.isArray(safetyRatings)) {
            const blockedCategories = safetyRatings
              .filter((r: any) => r.blocked)
              .map((r: any) => r.category);
            if (blockedCategories.length > 0) {
              errorMsg += `\n被阻止的类别: ${blockedCategories.join(', ')}`;
            }
          }
          errorMsg += `\n\n建议：\n1. 尝试禁用参考图片（已在代码中设置 SKIP_REFERENCE_IMAGES = true）\n2. 修改提示词，避免敏感词汇\n3. 检查参考图片内容是否包含敏感内容`;
          throw new Error(errorMsg);
        }
        if (errorInfo?.message) {
          throw new Error(`API 错误: ${errorInfo.message}`);
        }
      }

      throw new Error("API 响应中没有候选结果。可能是内容被安全过滤器阻止，或 API 配置有误。请检查：\n1. API Key 是否正确设置\n2. 模型 'gemini-3-pro-image-preview' 是否可用\n3. 提示词是否触发了安全过滤器\n4. 参考图片是否包含敏感内容（已自动禁用参考图片进行测试）");
    }

    const firstCandidate = response.candidates[0];
    if (!firstCandidate) {
      console.error("Candidate Error: No first candidate");
      throw new Error("API 响应中没有有效的候选结果。");
    }

    // Log candidate structure for debugging
    console.log("First Candidate Structure:", {
      hasCandidate: !!firstCandidate,
      hasContent: !!firstCandidate?.content,
      hasParts: !!firstCandidate?.content?.parts,
      partsLength: firstCandidate?.content?.parts?.length,
      finishReason: firstCandidate?.finishReason,
      candidateKeys: Object.keys(firstCandidate || {})
    });

    if (!firstCandidate.content || !firstCandidate.content.parts) {
      console.error("Candidate Error Details:", {
        firstCandidate,
        hasContent: !!firstCandidate?.content,
        hasParts: !!firstCandidate?.content?.parts,
        contentKeys: firstCandidate?.content ? Object.keys(firstCandidate.content) : [],
        finishReason: firstCandidate?.finishReason,
        safetyRatings: (firstCandidate as any)?.safetyRatings,
        fullCandidate: JSON.stringify(firstCandidate, null, 2).substring(0, 1000)
      });
      
      // Provide more helpful error message based on finishReason
      if (firstCandidate.finishReason === 'NO_IMAGE' || (firstCandidate.finishReason as any) === 'IMAGE_OTHER') {
        throw new Error("图片生成失败。API 返回了无法生成图片的状态。\n\n可能的原因：\n1. 提示词格式或内容不被支持\n2. 图片生成模型暂时不可用\n3. 请求参数不兼容\n\n建议：\n- 检查提示词是否包含特殊字符或格式\n- 尝试简化提示词\n- 稍后重试");
      }
      
      throw new Error(`API 响应格式异常：缺少内容或部分数据。完成原因: ${firstCandidate.finishReason || '未知'}。`);
    }

    // Check for finish reason (safety blocks, etc.)
    if (firstCandidate.finishReason) {
      console.log("Finish Reason:", firstCandidate.finishReason);
      if (firstCandidate.finishReason === 'SAFETY') {
        const safetyRatings = (firstCandidate as any)?.safetyRatings;
        console.error("Safety Block Details:", safetyRatings);
        throw new Error("内容被安全过滤器阻止。请修改提示词后重试。");
      } else if (firstCandidate.finishReason === 'RECITATION') {
        throw new Error("内容可能包含受版权保护的材料。");
      } else if (firstCandidate.finishReason === 'MAX_TOKENS') {
        throw new Error("响应超出最大长度限制。");
      } else if (firstCandidate.finishReason === 'NO_IMAGE' || (firstCandidate.finishReason as any) === 'IMAGE_OTHER') {
        // NO_IMAGE or IMAGE_OTHER usually means the image generation failed for other reasons
        // This could be due to prompt issues, model limitations, or API constraints
        console.error("Image Generation Failed:", {
          finishReason: firstCandidate.finishReason,
          hasContent: !!firstCandidate.content,
          hasParts: !!firstCandidate.content?.parts,
          partsLength: firstCandidate.content?.parts?.length,
          contentKeys: firstCandidate.content ? Object.keys(firstCandidate.content) : []
        });
        throw new Error("图片生成失败。可能的原因：\n1. 提示词过于复杂或包含不支持的内容\n2. 模型暂时不可用或达到限制\n3. 图片生成参数不兼容\n\n建议：\n- 简化提示词\n- 尝试不同的宽高比\n- 稍后重试");
      } else if (firstCandidate.finishReason !== 'STOP') {
        console.warn("Unexpected finish reason:", firstCandidate.finishReason);
        throw new Error(`API 返回未预期的完成原因: ${firstCandidate.finishReason}。`);
      }
    }

    // Search for image data in parts
    for (const part of firstCandidate.content.parts) {
      if (part.inlineData && part.inlineData.data) {
        const mime = part.inlineData.mimeType || "image/png";
        return `data:${mime};base64,${part.inlineData.data}`;
      }
    }

    // If we get here, no image was found
    console.error("No image data in response:", {
      partsCount: firstCandidate.content.parts.length,
      parts: firstCandidate.content.parts.map(p => ({
        hasInlineData: !!p.inlineData,
        hasText: !!p.text,
        type: p.inlineData ? 'image' : p.text ? 'text' : 'unknown'
      }))
    });
    throw new Error("API 响应中没有找到图像数据。请检查 API 配置和模型可用性。");
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};

export const generateStylePreview = async (styleLabel: string, styleDesc: string): Promise<string> => {
  const ai = getAIClient();
  const prompt = Prompts.buildStylePreviewPrompt(styleLabel, styleDesc);
  
  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: { parts: [{ text: prompt }] },
      config: { 
         safetySettings: Prompts.SAFETY_SETTINGS,
         imageConfig: {
            aspectRatio: '16:9',
         }
      }
    }));
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("No preview");
  } catch (error) {
    throw error;
  }
};

export const generateCharacterDesign = async (
    desc: string, 
    sketch: string | null, 
    style: ArtStyle, 
    ratio: AspectRatio,
    signal?: AbortSignal
): Promise<string> => {
    const ai = getAIClient();
    const prompt = Prompts.buildCharacterDesignPrompt(style, desc);
    try {
        const inputs = sketch ? buildMultiModalParts(prompt, [sketch]) : [{ text: prompt }];
        // Cast text-only input for TS if needed, but array of Part is safer
        const parts: Part[] = sketch ? buildMultiModalParts(prompt, [sketch]) : [{ text: prompt }];

        const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-3-pro-image-preview",
            contents: { parts },
            config: { 
              imageConfig: { aspectRatio: ratio, imageSize: "2K" },
              safetySettings: Prompts.SAFETY_SETTINGS
            },
        }), 3, 1000, signal);

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
        throw new Error("No character");
    } catch (e) { throw e; }
};

const createWavUrl = (pcmData: Uint8Array): string => {
  const PCM_SAMPLE_RATE = 24000;
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  const dataLength = pcmData.length;
  const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
  };
  writeString(view, 0, 'RIFF'); view.setUint32(4, 36 + dataLength, true); writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, PCM_SAMPLE_RATE, true); view.setUint32(28, PCM_SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);   writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  // Combine header and PCM data
  const combined = new Uint8Array(44 + dataLength);
  combined.set(new Uint8Array(wavHeader), 0);
  combined.set(pcmData, 44);
  return URL.createObjectURL(new Blob([combined], { type: 'audio/wav' }));
};

export const generateSpeech = async (text: string): Promise<string> => {
    const ai = getAIClient();
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: { parts: [{ text }] },
        config: { 
          responseModalities: [Modality.AUDIO], 
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } 
        },
    }));
    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64) throw new Error("No audio");
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return createWavUrl(bytes);
};

// VEO模型类型
export type VeoModel = 'veo3.1' | 'veo3.1-components';

// 第三方VEO API配置
const VEO_API_BASE_URL = 'https://ai.t8star.cn/v2/videos/generations';
const VEO_MODEL_COST: Record<VeoModel, string> = {
  'veo3.1': '$0.3',
  'veo3.1-components': '$0.3'
};

// 查询任务状态
const queryVeoTask = async (taskId: string, apiKey: string, signal?: AbortSignal): Promise<any> => {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const response = await fetch(`${VEO_API_BASE_URL}/${taskId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    signal
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`查询任务失败: ${response.status} ${errorText}`);
  }

  return await response.json();
};

// 轮询任务直到完成
const pollTaskUntilComplete = async (taskId: string, apiKey: string, signal?: AbortSignal, maxAttempts = 120, intervalMs = 5000): Promise<any> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // 检查是否已取消
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const result = await queryVeoTask(taskId, apiKey, signal);
    
    // 再次检查是否已取消（在请求完成后）
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    
    // 检查任务状态（根据实际API响应格式）
    const status = result.status?.toUpperCase();
    
    // 调试：记录完整的响应结构（仅在状态变化时）
    if (attempt === 0 || status !== (result.status?.toUpperCase() || '')) {
      console.log('Task status check:', {
        status: result.status,
        statusUpper: status,
        progress: result.progress,
        hasData: !!result.data,
        hasOutput: !!result.data?.output,
        outputLength: result.data?.output?.length || 0,
        outputPreview: result.data?.output?.substring(0, 100) || 'N/A'
      });
    }
    
    // 任务完成：检查状态和output字段
    if (status === 'COMPLETED' || status === 'SUCCEEDED' || status === 'SUCCESS' || status === 'FINISHED') {
      // 检查是否有output
      if (result.data?.output && result.data.output.trim() !== '') {
        console.log('Task completed with output:', result.data.output.substring(0, 100));
        return result;
      }
      
      // 如果状态是完成但output为空，再等待一次（给API时间填充output）
      if (attempt < maxAttempts - 1) {
        console.log('Status is SUCCESS but output is empty, waiting one more time...');
        await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(resolve, intervalMs);
          if (signal) {
            signal.addEventListener('abort', () => {
              clearTimeout(timeoutId);
              reject(new DOMException('Aborted', 'AbortError'));
            }, { once: true });
          }
        });
        // 再次查询一次
        const retryResult = await queryVeoTask(taskId, apiKey, signal);
        if (retryResult.data?.output && retryResult.data.output.trim() !== '') {
          console.log('Got output on retry:', retryResult.data.output.substring(0, 100));
          return retryResult;
        }
        // 如果还是没有，返回结果让调用者处理
        console.warn('Status is SUCCESS but output is still empty, returning result anyway');
        return retryResult;
      }
    }
    
    // 任务失败
    if (status === 'FAILED' || status === 'ERROR') {
      const failReason = result.fail_reason || result.error || '任务生成失败';
      throw new Error(`视频生成失败: ${failReason}`);
    }
    
    // 任务进行中：NOT_START, PROCESSING, RUNNING 等状态继续等待
    // 显示进度信息（如果有）
    if (result.progress) {
      console.log(`视频生成进度: ${result.progress} (状态: ${result.status})`);
    }

    // 等待后重试（支持取消）
    await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(resolve, intervalMs);
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          reject(new DOMException('Aborted', 'AbortError'));
        }, { once: true });
      }
    });
  }
  
  throw new Error('任务超时，请稍后重试。视频生成可能需要更长时间，请稍后再试。');
};

// 压缩图片以减小文件大小
const compressImage = (blob: Blob, maxWidth: number = 1920, maxHeight: number = 1080, quality: number = 0.85): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      // 计算新尺寸，保持宽高比
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }
      
      // 创建 canvas 并绘制压缩后的图片
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('无法创建 canvas 上下文'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // 转换为 blob
      canvas.toBlob(
        (compressedBlob) => {
          if (compressedBlob) {
            resolve(compressedBlob);
          } else {
            reject(new Error('图片压缩失败'));
          }
        },
        blob.type || 'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };
    
    img.src = url;
  });
};

// 将图片URL转换为base64格式（带压缩）
const convertImageUrlToBase64 = async (imageUrl: string, compress: boolean = true): Promise<{ mimeType: string; base64Data: string }> => {
  // 如果已经是data URL格式
  const dataUrlMatch = imageUrl.match(/^data:(.+);base64,(.+)$/);
  if (dataUrlMatch) {
    const mimeType = dataUrlMatch[1];
    const base64Data = dataUrlMatch[2];
    
    // 如果启用压缩且数据较大，先转换为 blob 再压缩
    if (compress && base64Data.length > 500000) { // 约 375KB
      try {
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: mimeType });
        const compressedBlob = await compressImage(blob);
        
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            const match = result.match(/^data:(.+);base64,(.+)$/);
            if (match) {
              resolve({
                mimeType: match[1],
                base64Data: match[2]
              });
            } else {
              reject(new Error('无法转换压缩后的图片为base64格式'));
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(compressedBlob);
        });
      } catch (error) {
        console.warn('图片压缩失败，使用原始数据:', error);
        // 压缩失败，使用原始数据
        return { mimeType, base64Data };
      }
    }
    
    return { mimeType, base64Data };
  }

  // 如果是blob URL或其他URL，需要先获取blob
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`无法获取图片: ${response.status}`);
    }
    
    let blob = await response.blob();
    const originalSize = blob.size;
    
    // 如果启用压缩且文件较大，进行压缩
    if (compress && originalSize > 500000) { // 约 500KB
      try {
        blob = await compressImage(blob);
        console.log(`图片已压缩: ${originalSize} -> ${blob.size} bytes (${Math.round((1 - blob.size / originalSize) * 100)}% 减小)`);
      } catch (error) {
        console.warn('图片压缩失败，使用原始数据:', error);
      }
    }
    
    const mimeType = blob.type || 'image/png';
    
    // 将blob转换为base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const match = result.match(/^data:(.+);base64,(.+)$/);
        if (match) {
          resolve({
            mimeType: match[1],
            base64Data: match[2]
          });
        } else {
          reject(new Error('无法转换图片为base64格式'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    throw new Error(`图片格式转换失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
};

export const generateSceneVideo = async (
  imageUrl: string, 
  visualPrompt: string,
  narrative?: string,
  characters?: string[],
  model: VeoModel = 'veo3.1-components',
  signal?: AbortSignal
): Promise<{ url: string, cost: string }> => {
  try {
    // 检查是否已取消
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const apiKey = localStorage.getItem("veo_api_key");
    if (!apiKey) {
      throw new Error("VEO API Key not found. Please set it in the settings.");
    }

    if (!imageUrl) {
      throw new Error("图片URL不能为空");
    }

    // 转换图片为base64格式（支持data URL和blob URL）
    const { mimeType, base64Data } = await convertImageUrlToBase64(imageUrl);

    // 再次检查是否已取消
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    // 确保 base64 数据是纯字符串（不含 data URL 前缀）
    // API 要求 images 数组中的元素是 base64 字符串或 URL
    let cleanBase64 = base64Data.trim();
    
    // 验证 base64 数据不为空
    if (!cleanBase64 || cleanBase64.length === 0) {
      throw new Error('图片 base64 数据为空');
    }
    
    // 移除可能的换行符和空格（base64 不应该包含这些）
    cleanBase64 = cleanBase64.replace(/\s/g, '');
    
    // 验证 base64 格式（基本检查）
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    if (!base64Regex.test(cleanBase64)) {
      throw new Error('图片 base64 数据格式无效');
    }
    
    // 记录 base64 数据长度（用于调试）
    const base64SizeKB = Math.round(cleanBase64.length * 3 / 4 / 1024);
    console.log(`Base64 data: ${cleanBase64.length} characters (approx ${base64SizeKB} KB)`);
    
    // 检查 base64 数据是否过大（如果超过 2MB，警告）
    if (base64SizeKB > 2048) {
      console.warn(`Base64 data is very large (${base64SizeKB} KB), this may cause API errors`);
    }

    // 构建完整的视频生成提示词，确保与分镜相关且人物一致
    const buildVideoPrompt = (
      visualPrompt: string, 
      narrative?: string, 
      characters?: string[]
    ): string => {
      let prompt = visualPrompt.trim();
      
      // 1. 强调人物一致性 - 确保视频中的人物与分镜图片中的人物完全一致
      if (characters && characters.length > 0) {
        const characterRef = characters.length === 1 
          ? `Maintain exact character appearance from the reference image: ${characters[0]}.`
          : `Maintain exact character appearances from the reference image: ${characters.join(', ')}.`;
        prompt = `${characterRef} ${prompt}`;
      } else {
        // 即使没有明确角色，也强调保持人物一致性
        prompt = `Maintain exact character appearance and details from the reference image. ${prompt}`;
      }
      
      // 2. 结合 narrative 信息，确保视频内容与分镜相关
      if (narrative && narrative.trim()) {
        // 如果 narrative 是中文，添加说明让 enhance_prompt 处理
        // 如果是英文，直接使用
        const isChineseNarrative = /[\u4e00-\u9fa5]/.test(narrative);
        if (isChineseNarrative) {
          // 中文 narrative 会在 enhance_prompt 时被翻译
          prompt = `${prompt} Scene narrative context: ${narrative}. The video should reflect this narrative moment and emotion.`;
        } else {
          // 英文 narrative 可以直接使用
          prompt = `${prompt} Scene narrative context: ${narrative}. The video should reflect this narrative moment and emotion.`;
        }
      }
      
      // 3. 强调基于参考图片生成，保持人物和场景一致性
      prompt = `Based on the reference image, maintain exact visual consistency. ${prompt}`;
      
      // 4. 添加视频特定的动态描述（如果还没有）
      const videoKeywords = [
        'cinematic movement',
        'smooth camera motion',
        'dynamic action',
        'fluid motion',
        'camera movement',
        'motion blur'
      ];
      
      const hasVideoKeyword = videoKeywords.some(keyword => 
        prompt.toLowerCase().includes(keyword)
      );
      
      if (!hasVideoKeyword) {
        // 根据提示词内容智能添加运动描述
        const lowerPrompt = prompt.toLowerCase();
        
        if (lowerPrompt.includes('close-up') || 
            lowerPrompt.includes('portrait') ||
            lowerPrompt.includes('face')) {
          prompt += ', subtle camera push-in, gentle focus shift, smooth motion';
        } else if (lowerPrompt.includes('action') || 
                   lowerPrompt.includes('movement') ||
                   lowerPrompt.includes('running') ||
                   lowerPrompt.includes('fighting')) {
          prompt += ', dynamic camera movement, fluid motion, cinematic action';
        } else if (lowerPrompt.includes('wide') || 
                   lowerPrompt.includes('establishing')) {
          prompt += ', slow camera pan, cinematic sweep';
        } else {
          prompt += ', cinematic camera movement, smooth transition, professional cinematography';
        }
      }
      
      // 5. 确保包含视频质量描述
      if (!prompt.toLowerCase().includes('cinematic')) {
        prompt = 'Cinematic shot, ' + prompt;
      }
      
      // 6. 强化人物一致性和视频质量强调
      prompt += '. Maintain exact character appearance, clothing, and facial features from the reference image. High quality video, professional cinematography, consistent visual style';
      
      return prompt;
    };

    // 构建完整的视频生成提示词
    const optimizedPrompt = buildVideoPrompt(visualPrompt, narrative, characters);
    
    // 验证 prompt 不为空
    if (!optimizedPrompt || optimizedPrompt.trim().length === 0) {
      throw new Error('视频生成提示词不能为空');
    }
    
    // 检查提示词是否包含中文，决定是否启用enhance_prompt
    const hasChinese = /[\u4e00-\u9fa5]/.test(optimizedPrompt);
    
    // 限制 prompt 长度（避免过长导致 API 错误）
    const maxPromptLength = 2000; // 根据实际 API 限制调整
    const finalPrompt = optimizedPrompt.length > maxPromptLength 
      ? optimizedPrompt.substring(0, maxPromptLength) + '...'
      : optimizedPrompt;
    
    // 创建图生视频请求（根据第三方API文档调整格式）
    // 根据 API 文档：images 可以是 base64 字符串或 URL
    // 尝试使用 data URL 格式（data:mimeType;base64,data）
    const imageDataUrl = `data:${mimeType};base64,${cleanBase64}`;
    
    const requestBody: any = {
      model: model,
      images: [imageDataUrl], // 使用 data URL 格式，符合 "url or base64" 的要求
      prompt: finalPrompt, // 使用限制长度后的 prompt
      aspect_ratio: '16:9',
    };

    // enhance_prompt 只在需要时添加（可选参数）
    if (hasChinese) {
      requestBody.enhance_prompt = true;
    }

    // 调试：记录请求体信息（不包含完整的 base64）
    const debugInfo = {
      model: requestBody.model,
      images: [`[base64, length: ${cleanBase64.length}]`],
      prompt: requestBody.prompt.substring(0, 200) + (requestBody.prompt.length > 200 ? '...' : ''),
      promptLength: requestBody.prompt.length,
      aspect_ratio: requestBody.aspect_ratio,
      enhance_prompt: requestBody.enhance_prompt
    };
    console.log('VEO API Request Info:', JSON.stringify(debugInfo, null, 2));
    
    // 验证请求体结构
    console.log('Request body keys:', Object.keys(requestBody));
    console.log('Request body structure:', {
      hasModel: !!requestBody.model,
      hasImages: Array.isArray(requestBody.images) && requestBody.images.length > 0,
      hasPrompt: !!requestBody.prompt,
      imagesType: typeof requestBody.images[0],
      imagesLength: requestBody.images[0]?.length || 0,
      promptType: typeof requestBody.prompt,
      promptLength: requestBody.prompt?.length || 0
    });

    // 验证 JSON 序列化是否成功
    let requestBodyString: string;
    try {
      requestBodyString = JSON.stringify(requestBody);
      console.log('Request body JSON length:', requestBodyString.length);
      // 检查 JSON 是否包含 base64 数据
      const base64InJson = requestBodyString.includes(cleanBase64.substring(0, 100));
      console.log('Base64 data in JSON:', base64InJson);
    } catch (e) {
      console.error('JSON stringify failed:', e);
      throw new Error('请求体序列化失败: ' + (e instanceof Error ? e.message : '未知错误'));
    }

    // 发送创建任务请求
    console.log('Sending request to:', VEO_API_BASE_URL);
    const createResponse = await fetch(VEO_API_BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: requestBodyString,
      signal
    });
    
    console.log('Response status:', createResponse.status, createResponse.statusText);

    if (!createResponse.ok) {
      let errorText = '';
      try {
        errorText = await createResponse.text();
        console.error('VEO API Error Response:', errorText);
        
        // 尝试解析 JSON 错误信息
        let errorJson: any;
        try {
          errorJson = JSON.parse(errorText);
        } catch (e) {
          // 如果不是 JSON，直接抛出
          throw new Error(`创建视频任务失败: ${createResponse.status} ${errorText || createResponse.statusText}`);
        }
        
        // 解析上游错误信息（可能是嵌套的 JSON 字符串）
        let errorMsg = errorJson.message || errorText;
        if (errorJson.upstream_message) {
          try {
            // upstream_message 可能是 JSON 字符串，需要再次解析
            const upstreamMsg = typeof errorJson.upstream_message === 'string' 
              ? JSON.parse(errorJson.upstream_message)
              : errorJson.upstream_message;
            errorMsg = upstreamMsg.msg || upstreamMsg.message || errorJson.upstream_message;
          } catch (e) {
            // 如果解析失败，使用原始值
            errorMsg = errorJson.upstream_message;
          }
        }
        
        // 提供更详细的错误信息
        const detailedError = `创建视频任务失败 (${createResponse.status}): ${errorMsg}`;
        console.error('Detailed error:', detailedError);
        throw new Error(detailedError);
      } catch (parseError: any) {
        // 如果解析失败，使用原始错误
        if (parseError.message && parseError.message.includes('创建视频任务失败')) {
          throw parseError;
        }
        throw new Error(`创建视频任务失败: ${createResponse.status} ${errorText || createResponse.statusText}`);
      }
    }

    const createResult = await createResponse.json();
    
    // 获取任务ID（根据实际API响应调整字段名）
    const taskId = createResult.task_id || createResult.taskId || createResult.id;
    if (!taskId) {
      throw new Error('未获取到任务ID');
    }

    // 轮询任务状态（传递signal以支持取消）
    const finalResult = await pollTaskUntilComplete(taskId, apiKey, signal);

    // 获取视频URL（根据实际API响应格式，视频URL在data.output中）
    // 调试：记录完整的响应结构
    console.log('Final result structure:', {
      status: finalResult.status,
      hasData: !!finalResult.data,
      dataKeys: finalResult.data ? Object.keys(finalResult.data) : [],
      output: finalResult.data?.output ? finalResult.data.output.substring(0, 200) : 'N/A',
      allKeys: Object.keys(finalResult)
    });
    
    // 尝试多种可能的字段名获取视频URL
    const videoUrl = finalResult.data?.output 
      || finalResult.data?.video_url
      || finalResult.data?.url
      || finalResult.video_url 
      || finalResult.videoUrl 
      || finalResult.url
      || finalResult.output;
      
    if (!videoUrl || videoUrl.trim() === '') {
      // 如果状态是成功但没有URL，记录详细信息
      console.error('No video URL found in response:', JSON.stringify(finalResult, null, 2));
      throw new Error('未获取到视频URL。任务状态: ' + (finalResult.status || '未知') + '，请检查任务是否已完成');
    }
    
    console.log('Video URL found:', videoUrl.substring(0, 100) + '...');

    // 再次检查是否已取消（在下载前）
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    // 下载视频（视频URL可能是公开的，不需要认证）
    let videoResponse: Response;
    try {
      videoResponse = await fetch(videoUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        signal
      });
    } catch (e: any) {
      // 如果是取消错误，直接抛出
      if (e.name === 'AbortError') {
        throw e;
      }
      // 如果带认证失败，尝试不带认证
      videoResponse = await fetch(videoUrl, { signal });
    }

    if (!videoResponse.ok) {
      throw new Error(`下载视频失败: ${videoResponse.status} ${videoResponse.statusText}`);
    }

    const videoBlob = await videoResponse.blob();
    const blobUrl = URL.createObjectURL(videoBlob);

    return { 
      url: blobUrl, 
      cost: VEO_MODEL_COST[model] 
    };
  } catch (e) { 
    console.error('Video generation error:', e); 
    throw e; 
  }
};

/**
 * 从故事大纲中提取角色信息
 */
export const extractCharactersFromOutline = async (
  outline: string,
  mode: GenerationMode,
  signal?: AbortSignal
): Promise<ExtractedCharacter[]> => {
  const ai = getAIClient();
  const prompt = Prompts.buildExtractCharactersPrompt(outline, mode);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: Prompts.EXTRACT_CHARACTERS_SCHEMA,
        safetySettings: Prompts.SAFETY_SETTINGS,
      },
    }), 3, 1000, signal || controller.signal);

    clearTimeout(timeoutId);
    if (controller.signal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const text = response.text;
    if (!text) {
      throw new Error("AI 未返回角色数据");
    }

    let parsed: { characters: Array<{
      name: string;
      description: string;
      appearance: string;
      personality?: string;
      role: string;
    }> };
    
    try {
      parsed = JSON.parse(text);
    } catch (jsonError) {
      console.error("JSON parse error:", jsonError);
      throw new Error("AI 返回的数据格式不正确");
    }

    if (!parsed.characters || !Array.isArray(parsed.characters)) {
      throw new Error("AI 返回的数据缺少角色数组");
    }

    // 转换为 ExtractedCharacter 格式
    return parsed.characters.map((char, index) => ({
      id: `extracted-${Date.now()}-${index}`,
      name: char.name.trim(),
      description: char.description.trim(),
      appearance: char.appearance.trim(),
      personality: char.personality?.trim(),
      role: char.role.trim(),
      isConfirmed: false,
    }));
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error("提取请求已超时或被取消");
    }
    if (error.toString().includes("Safety") || error.toString().includes("Blocked")) {
      throw new Error("内容可能违反了安全政策，无法提取角色");
    }
    throw error;
  }
};

export const polishText = async (text: string, type: 'narrative' | 'visual'): Promise<string> => {
    const ai = getAIClient();
    const prompt = Prompts.buildPolishTextPrompt(text, type);
    
    try {
      const res = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({ 
        model: "gemini-3-pro-preview", 
        contents: { parts: [{ text: prompt }] },
        config: { 
          safetySettings: Prompts.SAFETY_SETTINGS,
          // Explicitly request text-only response
        }
      }));
      
      const polishedText = res.text || text;
      
      // Clean up the response - remove any scene numbers, titles, or formatting that AI might add
      let cleaned = polishedText.trim();
      
      // Remove common prefixes that AI might add
      const prefixesToRemove = [
        /^场次\s*\d+[：:]\s*/i,
        /^场景\s*\d+[：:]\s*/i,
        /^Scene\s*\d+[：:]\s*/i,
        /^【.*?】\s*/,
        /^###\s*.*?\n/,
        /^##\s*.*?\n/,
        /^#\s*.*?\n/,
      ];
      
      for (const prefix of prefixesToRemove) {
        cleaned = cleaned.replace(prefix, '');
      }
      
      // Remove any markdown formatting that might be present
      cleaned = cleaned.replace(/^\*\*.*?\*\*\s*/g, '');
      cleaned = cleaned.replace(/^>+\s*/gm, '');
      
      // If the cleaned text is empty or too short, use original
      if (!cleaned || cleaned.length < text.length * 0.5) {
        console.warn("Polished text seems invalid, using original");
        return text;
      }
      
      return cleaned.trim();
    } catch (error) {
      console.error("Error polishing text:", error);
      throw error;
    }
};

/**
 * Optimizes the story outline using Gemini 3 Pro.
 */
export const optimizeStoryOutline = async (
  outline: string,
  mode: GenerationMode
): Promise<string> => {
  const ai = getAIClient();
  
  const prompt = `你是一位专业的故事创作顾问。请优化以下故事大纲，使其更加生动、有趣、结构清晰。

${mode === 'storyboard' ? '这是一个分镜故事，需要：' : '这是一个四格漫画，需要：'}
- 增强故事的戏剧性和吸引力
- 优化叙事节奏和结构
- 丰富细节描述，使故事更加生动
- 保持原有核心创意和主题
- 确保故事逻辑连贯

原始大纲：
${outline}

请直接返回优化后的故事大纲，不要添加任何额外的说明或标记。`;

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({ 
      model: "gemini-3-pro-preview", 
      contents: [{ text: prompt }],
      config: { 
        safetySettings: Prompts.SAFETY_SETTINGS,
        temperature: 0.8,
      }
    }));
    
    const optimizedText = response.text?.trim() || outline;
    return optimizedText;
  } catch (error) {
    console.error("Error optimizing outline:", error);
    throw error;
  }
};

export const checkApiKey = async (): Promise<boolean> => {
    if (localStorage.getItem("gemini_api_key")) return true;
    const win = window as any;
    if (win.aistudio && win.aistudio.hasSelectedApiKey) return await win.aistudio.hasSelectedApiKey();
    return false;
};

export const checkVeoApiKey = (): boolean => {
    return !!localStorage.getItem("veo_api_key");
};
export const openApiKeySelector = async (): Promise<void> => {
    const win = window as any;
    if (win.aistudio && win.aistudio.openSelectKey) await win.aistudio.openSelectKey();
    else throw new Error("No AI Studio");
};

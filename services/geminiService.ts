
import { GoogleGenAI, GenerateContentResponse, Modality, Part } from "@google/genai";
import { Scene, StoryData, PlotOption, ArtStyle, GenerationMode, AspectRatio, VisualAnchor } from "../types";
import * as Prompts from "./prompts";

// Helper to ensure we always get a fresh instance with the environment key
const getAIClient = () => {
  const apiKey = localStorage.getItem("gemini_api_key") || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found. Please set it in the settings.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to retry API calls with exponential backoff
async function callWithRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      console.warn(`Gemini API Attempt ${i + 1} failed:`, error);
      lastError = error;
      if (error.toString().includes("Safety") || error.toString().includes("Blocked")) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
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
  theme: string
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
    }));

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
  aspectRatio: AspectRatio
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
    }));

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
  
  const currentScriptJSON = JSON.stringify(currentStory.scenes.map(s => ({
    narrative: s.narrative,
    visual_prompt: s.visual_prompt,
    characters: s.characters
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

  const text = response.text;
  if (!text) throw new Error("No response");
  
  const parsed = JSON.parse(text) as { scenes: { narrative: string, visual_prompt: string, characters: string[] }[] };
  
  return currentStory.scenes.map((scene, index) => {
    const optimized = parsed.scenes[index];
    return {
      ...scene,
      narrative: optimized ? optimized.narrative : scene.narrative,
      visual_prompt: optimized ? optimized.visual_prompt : scene.visual_prompt,
      characters: optimized ? optimized.characters : scene.characters
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

    if (sceneAnchors !== undefined) {
       const relevantIndices = [...new Set(sceneAnchors.map(a => a.previewImageIndex).filter(i => i !== undefined && i !== null && i >= 0))];
       
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
       } else {
          imagesToSend = [];
       }
    }

    const anchorSection = sceneAnchors && sceneAnchors.length > 0 
       ? sceneAnchors.map(a => `   - **${a.name}**: ${a.description}`).join('\n') 
       : "   - No specific character focus. Use generic background characters fitting the style if needed.";

    const sandwichPrompt = Prompts.buildImageSandwichPrompt(
      styleInstruction, 
      worldAnchor, 
      imageReferenceText, 
      anchorSection, 
      visualPrompt, 
      mode, 
      feedback
    );

    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: {
        parts: buildMultiModalParts(sandwichPrompt, imagesToSend),
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: "2K", 
        },
        // @ts-ignore
        seed: seed,
        safetySettings: Prompts.SAFETY_SETTINGS,
      },
    }));

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const mime = part.inlineData.mimeType || "image/png";
        return `data:${mime};base64,${part.inlineData.data}`;
      }
    }

    throw new Error("No image data found.");
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

export const generateCharacterDesign = async (desc: string, sketch: string | null, style: ArtStyle, ratio: AspectRatio): Promise<string> => {
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
        }));
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
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  return URL.createObjectURL(new Blob([wavHeader, pcmData], { type: 'audio/wav' }));
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

export const generateSceneVideo = async (imageUrl: string, prompt: string): Promise<{ url: string, cost: string }> => {
    const ai = getAIClient();
    try {
        const match = imageUrl.match(/^data:(.+);base64,(.+)$/);
        if (!match) throw new Error("Invalid image");
        const apiKey = localStorage.getItem("gemini_api_key") || process.env.API_KEY;
        let op = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt + " Cinematic movement.",
            image: { imageBytes: match[2], mimeType: match[1] },
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
        });
        while (!op.done) {
            await new Promise(r => setTimeout(r, 5000));
            op = await ai.operations.getVideosOperation({operation: op});
        }
        const uri = op.response?.generatedVideos?.[0]?.video?.uri;
        if (!uri) throw new Error("No video");
        const res = await fetch(`${uri}&key=${apiKey}`);
        if (!res.ok) throw new Error("Download failed");
        return { url: URL.createObjectURL(await res.blob()), cost: "$0.0375" };
    } catch (e) { console.error(e); throw e; }
};

export const polishText = async (text: string, type: 'narrative' | 'visual'): Promise<string> => {
    const ai = getAIClient();
    const prompt = Prompts.buildPolishTextPrompt(text, type);
    const res = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({ 
      model: "gemini-3-pro-preview", 
      contents: prompt,
      config: { safetySettings: Prompts.SAFETY_SETTINGS }
    }));
    return res.text || text;
};

export const checkApiKey = async (): Promise<boolean> => {
    if (localStorage.getItem("gemini_api_key")) return true;
    const win = window as any;
    if (win.aistudio && win.aistudio.hasSelectedApiKey) return await win.aistudio.hasSelectedApiKey();
    return false;
};
export const openApiKeySelector = async (): Promise<void> => {
    const win = window as any;
    if (win.aistudio && win.aistudio.openSelectKey) await win.aistudio.openSelectKey();
    else throw new Error("No AI Studio");
};

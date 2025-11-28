
import { GoogleGenAI, Type, Modality, HarmCategory, HarmBlockThreshold, GenerateContentResponse } from "@google/genai";
import { Scene, StoryData, PlotOption, ArtStyle, GenerationMode, AspectRatio, VisualAnchor, ImageFeedback } from "../types";

// Helper to ensure we always get a fresh instance with the environment key
const getAIClient = () => {
  let apiKey = localStorage.getItem("gemini_api_key");
  
  // Safely check process.env for development environments
  if (!apiKey && typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    apiKey = process.env.API_KEY;
  }

  if (!apiKey || !apiKey.trim()) {
    throw new Error("API Key not found. Please set it in the settings.");
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
};

// Standard Safety Settings
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

// Helper to retry API calls with exponential backoff
async function callWithRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      console.warn(`Gemini API Attempt ${i + 1} failed:`, error);
      lastError = error;
      
      const errStr = error.toString();
      // If error suggests blocking or invalid arg, don't retry, just throw
      if (errStr.includes("Safety") || errStr.includes("Blocked") || errStr.includes("API key") || errStr.includes("CREDENTIALS_MISSING") || errStr.includes("UNAUTHENTICATED")) {
        throw error;
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
    }
  }
  throw lastError;
}

const buildMultiModalParts = (textPrompt: string, images: string[]) => {
  const parts: any[] = [];
  images.forEach(img => {
    if (!img) return;
    let mimeType = "image/png";
    let data = img;
    // Basic regex to extract base64 if present
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

/**
 * Step 1: Analyze uploaded images to extract distinct Visual Anchors.
 */
export const analyzeCharacterVisuals = async (
  images: string[],
  theme: string
): Promise<VisualAnchor[]> => {
  const ai = getAIClient();

  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Suggested name" },
        description: { type: Type.STRING, description: "Detailed visual description. FOCUS ON FIXED IDENTIFIERS." },
        previewImageIndex: { type: Type.INTEGER, description: "The index (0-based) of the image." }
      },
      required: ["name", "description", "previewImageIndex"]
    }
  };

  const prompt = `Role: Senior Character Designer.
  Task: Analyze the provided reference images for a story about: "${theme}".
  Goal: Create strict "Visual Anchors".
  
  For each distinct character identified:
  1. Assign a clear Name.
  2. Write a "Visual Anchor" description.
  3. Identify the 0-based index of the best reference image.`;

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: buildMultiModalParts(prompt, images),
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        safetySettings: SAFETY_SETTINGS,
      },
    }));

    const text = response.text;
    if (!text) return [];
    
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.warn("Failed to parse visual anchors JSON", e);
      return [];
    }

    if (!Array.isArray(parsed)) return [];

    return parsed.map((p: any, i: number) => ({
      id: `anchor_${Date.now()}_${i}`,
      // Ensure name is always a string to prevent "reading '0'" error on undefined
      name: (p.name && typeof p.name === 'string') ? p.name : `Character ${i + 1}`, 
      description: p.description || "No description provided.",
      previewImageIndex: typeof p.previewImageIndex === 'number' ? p.previewImageIndex : -1
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

  const charactersSchema = hasAnchors 
    ? { 
        type: Type.ARRAY, 
        items: { type: Type.STRING }, 
        description: `List of character names appearing in this scene. Choose from: ${anchorNames}` 
      }
    : { 
        type: Type.ARRAY, 
        items: { type: Type.STRING }, 
        description: "List of character names appearing in this scene." 
      };

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Story Title" },
      world_anchor: { type: Type.STRING, description: "Global environment description." },
      scenes: {
        type: Type.ARRAY,
        description: "List of scenes/panels",
        items: {
          type: Type.OBJECT,
          properties: {
            narrative: { type: Type.STRING },
            visual_prompt: { type: Type.STRING },
            characters: charactersSchema
          },
          required: ["narrative", "visual_prompt", "characters"],
        },
      },
    },
    required: ["title", "world_anchor", "scenes"],
  };

  const anchorContext = hasAnchors 
    ? anchors.map(a => `NAME: ${a.name}\nDESC: ${a.description}`).join("\n\n")
    : "No pre-defined visual anchors.";

  const prompt = `
  Role: Visual Director.
  Theme: "${theme}". Style: "${artStyle}". Mode: "${mode}".
  
  1. Define a "World Anchor".
  2. Plan scenes. Identify characters.
  3. Write 'visual_prompt' focusing on ACTION and COMPOSITION.
  
  DEFINED CHARACTERS:
  ${anchorContext}
  `;

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: { parts: buildMultiModalParts(prompt, characterImages) },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        safetySettings: SAFETY_SETTINGS,
      },
    }));

    const text = response.text;
    if (!text) throw new Error("No response from Gemini.");

    const parsed = JSON.parse(text) as StoryData;
    
    // Safety check for scenes array
    const safeScenes = Array.isArray(parsed.scenes) ? parsed.scenes : [];

    parsed.scenes = safeScenes.map((scene, index) => ({
      ...scene,
      id: index,
      isLoadingImage: true,
      tags: [],
      characters: Array.isArray(scene.characters) ? scene.characters : []
    }));

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

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      scenes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            narrative: { type: Type.STRING },
            visual_prompt: { type: Type.STRING },
            characters: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["narrative", "visual_prompt", "characters"],
        },
      },
    },
    required: ["scenes"],
  };

  const prompt = `Optimize script. Theme: ${theme}, Style: ${artStyle}.
  Current Script: ${currentScriptJSON}
  Return updated scenes.`;

  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      safetySettings: SAFETY_SETTINGS,
    }
  }));

  const text = response.text;
  if (!text) throw new Error("No response");
  
  let parsed: any;
  try {
     parsed = JSON.parse(text);
  } catch (e) {
     throw new Error("Failed to parse optimization result");
  }

  if (!parsed || !parsed.scenes || !Array.isArray(parsed.scenes)) {
     console.warn("Optimization returned invalid structure, reverting to original.");
     return currentStory.scenes;
  }
  
  return currentStory.scenes.map((scene, index) => {
    const optimized = parsed.scenes[index];
    if (!optimized) return scene; 
    
    return {
      ...scene,
      narrative: optimized.narrative || scene.narrative,
      visual_prompt: optimized.visual_prompt || scene.visual_prompt,
      characters: optimized.characters || scene.characters
    };
  });
};

export const generatePlotOptions = async (
  storyContext: Scene[],
  theme: string
): Promise<PlotOption[]> => {
  const ai = getAIClient();
  const contextText = storyContext.map(s => s.narrative).join("\n");
  
  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        title: { type: Type.STRING },
        description: { type: Type.STRING }
      },
      required: ["id", "title", "description"]
    }
  };

  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: {
      parts: [{ text: `Based on this story (${theme}):\n${contextText}\nProvide 3 interesting plot options (Chinese).` }]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      safetySettings: SAFETY_SETTINGS,
    }
  }));

  const text = response.text;
  if (!text) return [];
  try {
     const parsed = JSON.parse(text);
     return Array.isArray(parsed) ? parsed : [];
  } catch (e) { return []; }
};

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

  const charactersSchema = hasAnchors 
    ? { type: Type.ARRAY, items: { type: Type.STRING }, description: `Must select from: ${anchorNames}` }
    : { type: Type.ARRAY, items: { type: Type.STRING } };

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      scenes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            narrative: { type: Type.STRING },
            visual_prompt: { type: Type.STRING },
            characters: charactersSchema
          },
          required: ["narrative", "visual_prompt", "characters"],
        },
      },
    },
    required: ["scenes"],
  };

  const prompt = `Extend story. Theme: "${theme}". Option: "${option}".
  Current Story: ${contextText}
  DEFINED CHARACTERS: ${anchorContext}
  Generate 3-4 new scenes.`;

  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: { parts: buildMultiModalParts(prompt, characterImages) },
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      safetySettings: SAFETY_SETTINGS,
    }
  }));

  const text = response.text;
  if (!text) throw new Error("No response");
  
  const parsed = JSON.parse(text) as { scenes: Omit<Scene, 'id'>[] };
  
  return (parsed.scenes || []).map((s, i) => ({
    ...s,
    id: startId + i,
    isLoadingImage: true,
    tags: []
  }));
};

export const generateSceneImage = async (
  visualPrompt: string,
  characterImages: string[],
  artStyle: ArtStyle,
  aspectRatio: AspectRatio,
  mode: GenerationMode,
  worldAnchor?: string,
  sceneAnchors?: VisualAnchor[],
  feedback?: ImageFeedback,
  seed?: number
): Promise<string> => {
  const ai = getAIClient();

  try {
    const styleInstruction = mode === 'comic' 
      ? `STYLE: Comic Book / Manga Panel. ${artStyle}. Bold outlines.`
      : `STYLE: Cinematic Movie Still. ${artStyle}. 8K resolution.`;

    let imagesToSend = characterImages;
    let imageReferenceText = "";

    if (sceneAnchors !== undefined) {
       const relevantIndices = [...new Set(sceneAnchors.map(a => a.previewImageIndex).filter(i => i !== undefined && i !== null && i >= 0))];
       
       if (relevantIndices.length > 0) {
          const newImages: string[] = [];
          const anchorReferenceLines: string[] = [];
          const indexMapping = new Map<number, number>();

          relevantIndices.forEach((oldIndex) => {
             if (oldIndex >= 0 && oldIndex < characterImages.length) {
                newImages.push(characterImages[oldIndex]);
                indexMapping.set(oldIndex, newImages.length); 
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
       : "   - No specific character focus.";

    let sandwichPrompt = `
    *** VISUAL CONSISTENCY PROTOCOL ***
    
    [PHASE 1: WORLD SETTING]
    - Visual Style: ${styleInstruction}
    - World Anchor: ${worldAnchor || "Consistent cinematic atmosphere."}
    
    [PHASE 2: CHARACTER DEFINITION]
    ${imageReferenceText}
    ${imageReferenceText ? "STRICT INSTRUCTION: The provided Reference Images are the GROUND TRUTH." : ""}
    
    Present Characters:
    ${anchorSection}

    [PHASE 3: SCENE COMPOSITION]
    Action Prompt: ${visualPrompt}
    
    [PHASE 4: QUALITY CONTROL]
    - ${mode === 'comic' ? 'Clean line art. No text.' : 'Photorealistic. No text.'}
    `;

    if (feedback) {
      sandwichPrompt += `\n\n[PHASE 5: REVISION]: ${feedback.type.toUpperCase()}: "${feedback.text}".`;
    }
    
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: { parts: buildMultiModalParts(sandwichPrompt, imagesToSend) },
      config: {
        imageConfig: { aspectRatio: aspectRatio, imageSize: "2K" },
        // @ts-ignore
        seed: seed,
        safetySettings: SAFETY_SETTINGS,
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
  try {
    const prompt = `Sample art style: ${styleLabel}. ${styleDesc}. Epic landscape. No text.`;
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: { parts: [{ text: prompt }] },
      config: { 
         safetySettings: SAFETY_SETTINGS,
         imageConfig: { aspectRatio: '16:9' }
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
    try {
        const prompt = `Character design sheet. Style: ${style}. Desc: ${desc}. Full body.`;
        const inputs = sketch ? buildMultiModalParts(prompt, [sketch]) : [{ text: prompt }];
        const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-3-pro-image-preview",
            contents: { parts: inputs },
            config: { 
              imageConfig: { aspectRatio: ratio, imageSize: "2K" },
              safetySettings: SAFETY_SETTINGS
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
        if (!imageUrl) throw new Error("Image required for video generation");
        const match = imageUrl.match(/^data:(.+);base64,(.+)$/);
        if (!match) throw new Error("Invalid image format");
        
        const apiKey = localStorage.getItem("gemini_api_key") || (typeof process !== 'undefined' ? process.env.API_KEY : '') || '';
        
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
        if (!uri) throw new Error("No video returned");
        
        const res = await fetch(`${uri}&key=${apiKey}`);
        if (!res.ok) throw new Error("Download failed");
        return { url: URL.createObjectURL(await res.blob()), cost: "$0.0375" };
    } catch (e) { 
        console.error(e); 
        throw e; 
    }
};

export const polishText = async (text: string, type: 'narrative' | 'visual'): Promise<string> => {
    const ai = getAIClient();
    const prompt = type === 'narrative' 
        ? `Optimize narrative (Chinese): "${text}"`
        : `Optimize visual prompt (English). Keep visual anchors intact: "${text}"`;
    const res = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({ 
      model: "gemini-3-pro-preview", 
      contents: prompt,
      config: { safetySettings: SAFETY_SETTINGS }
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

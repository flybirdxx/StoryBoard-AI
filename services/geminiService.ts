
import { GoogleGenAI, Type, Modality, HarmCategory, HarmBlockThreshold, GenerateContentResponse } from "@google/genai";
import { Scene, StoryData, PlotOption, ArtStyle, GenerationMode, AspectRatio, VisualAnchor } from "../types";

// Helper to ensure we always get a fresh instance with the environment key
const getAIClient = () => {
  const apiKey = localStorage.getItem("gemini_api_key") || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found. Please set it in the settings.");
  }
  return new GoogleGenAI({ apiKey });
};

// Standard Safety Settings to prevent over-blocking of creative content
// Using BLOCK_NONE where possible, or BLOCK_ONLY_HIGH to allow creative freedom
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
      // If error suggests blocking or invalid arg, don't retry, just throw
      if (error.toString().includes("Safety") || error.toString().includes("Blocked")) {
        throw error;
      }
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
    }
  }
  throw lastError;
}

const buildMultiModalParts = (textPrompt: string, images: string[]) => {
  const parts: any[] = [];
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
        name: { type: Type.STRING, description: "Suggested name (e.g., 'Protagonist', 'Little Boy', 'Robot')" },
        description: { type: Type.STRING, description: "Detailed visual description (Appearance, Clothes, Age, Accessories)" },
        previewImageIndex: { type: Type.INTEGER, description: "The index (0-based) of the image that best represents this character in the provided list." }
      },
      required: ["name", "description", "previewImageIndex"]
    }
  };

  const prompt = `Analyze the provided reference images for a story about: "${theme}".
  Identify the distinct main characters present in these images.
  
  For each distinct character, provide:
  1. A short name.
  2. A highly detailed "Visual Anchor" description in English. This description will be used to generate consistent images of this character. Include:
     - Body type & Age
     - Hair style & Color
     - Facial features
     - Clothing details (colors, style, textures)
  3. The index of the image that best identifies them (0 for the first image, 1 for the second, etc.).
  
  If multiple images show the same character, merge their details into one anchor.`;

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
    
    const parsed = JSON.parse(text) as any[];
    return parsed.map((p: any, i: number) => ({
      id: `anchor_${Date.now()}_${i}`,
      name: p.name,
      description: p.description,
      previewImageIndex: p.previewImageIndex
    }));
  } catch (error) {
    console.error("Character analysis failed:", error);
    // Return empty array instead of throwing to allow manual creation or fallback
    return [];
  }
};

/**
 * Generates the story script using Gemini 3 Pro.
 * Now generates a World Anchor and decoupled visual prompts.
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

  // Handle case where no anchors exist to prevent Schema validation errors
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
      world_anchor: { type: Type.STRING, description: "A consistent environment/lighting/atmosphere description that applies to the entire story. Must specify Color Palette and Lighting Style." },
      scenes: {
        type: Type.ARRAY,
        description: mode === 'comic' ? "3-5 Comic Panels" : "3-5 Storyboard Scenes",
        items: {
          type: Type.OBJECT,
          properties: {
            narrative: { type: Type.STRING, description: "Chinese story text." },
            visual_prompt: { type: Type.STRING, description: "English visual prompt focusing ONLY on action, composition, and camera angle. Do NOT include detailed character appearance descriptions here." },
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
    : "No pre-defined visual anchors. Define characters naturally as needed.";

  const consistencyInstruction = `
  【Role: Visual Director】
  1. Define a "World Anchor" (environment/lighting) that stays consistent throughout the story.
     - Based on Theme: "${theme}" and Style: "${artStyle}".
     - It MUST set a unified color palette (e.g., "Teal and Orange") and lighting style (e.g., "Chiaroscuro", "Soft Daylight").
  2. Plan the scenes. For each scene, identify which characters from the "DEFINED CHARACTERS" list appear.
  3. Write 'visual_prompt' focusing on ACTION and COMPOSITION (e.g., "Low angle shot, X is running towards camera"). DO NOT describe the character's clothes/face in the 'visual_prompt' because we will inject the "Visual Anchor" programmatically later.
  
  DEFINED CHARACTERS:
  ${anchorContext}
  `;

  let systemInstruction = "";
  if (mode === 'comic') {
    systemInstruction = `You are a Comic Script Writer.
    ${consistencyInstruction}`;
  } else {
    systemInstruction = `You are a Storyboard Artist.
    ${consistencyInstruction}`;
  }

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
         parts: buildMultiModalParts(systemInstruction, characterImages)
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        safetySettings: SAFETY_SETTINGS,
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

  const modeInstruction = currentStory.mode === 'comic' 
    ? "Enhance comic pacing and punchlines."
    : "Enhance cinematic flow and camera direction.";

  const prompt = `Optimize the story script.
  Theme: ${theme}
  Art Style: ${artStyle}
  
  Current Script:
  ${currentScriptJSON}
  
  Instructions:
  1. ${modeInstruction}
  2. Make narrative engaging (Chinese).
  3. Enrich visual_prompt (English). Focus on action/camera.
  4. Ensure 'characters' list correctly identifies who is in the scene${anchorNames ? ` from: [${anchorNames}]` : ''}.
  
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

// ... generatePlotOptions ... (Unchanged)
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
      parts: [{
        text: `Based on this story (${theme}):\n${contextText}\nProvide 3 interesting plot options (Chinese).`
      }]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      safetySettings: SAFETY_SETTINGS,
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

  const charactersSchema = hasAnchors 
    ? { 
        type: Type.ARRAY, 
        items: { type: Type.STRING }, 
        description: `Must select from: ${anchorNames}` 
      }
    : { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "List of character names."
      };

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

  const prompt = `Extend the story.
  Theme: "${theme}"
  Style: "${artStyle}"
  Mode: "${mode}"
  
  DEFINED CHARACTERS:
  ${anchorContext}
  
  Current Story: 
  ${contextText}
  
  Direction: "${option}"
  
  Generate 3-4 new scenes.
  1. Use Chinese for narrative.
  2. Use English for visual_prompt (Action/Composition focus).
  3. Identify characters present in each scene.`;

  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: {
      parts: buildMultiModalParts(prompt, characterImages)
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      safetySettings: SAFETY_SETTINGS,
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
 * Generates a single scene image using the "Refined Sandwich Prompt" method.
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

    // --- SMART IMAGE SELECTION ---
    // Instead of sending ALL character images, only send the ones relevant to the characters in this scene.
    // This reduces noise and helps the model focus on the correct identities.
    
    let imagesToSend = characterImages;
    let imageReferenceText = "";

    // If sceneAnchors are provided (meaning we know who is in the scene):
    if (sceneAnchors !== undefined) {
       // Filter images to strictly match the anchors present
       const relevantIndices = [...new Set(sceneAnchors.map(a => a.previewImageIndex).filter(i => i !== undefined && i !== null && i >= 0))];
       
       if (relevantIndices.length > 0) {
          // Map old indices to new sequential indices (1, 2, 3...) for the prompt
          const newImages: string[] = [];
          const anchorReferenceLines: string[] = [];
          const indexMapping = new Map<number, number>();

          relevantIndices.forEach((oldIndex) => {
             // Validate index bounds
             if (oldIndex >= 0 && oldIndex < characterImages.length) {
                newImages.push(characterImages[oldIndex]);
                indexMapping.set(oldIndex, newImages.length); // Store 1-based index
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
          // If scene has anchors but no valid images found (unlikely), or sceneAnchors is empty list (no characters).
          // If no characters are in the scene (empty sceneAnchors), we send NO images to avoid face hallucinations in landscapes.
          imagesToSend = [];
       }
    }

    // --- REFINED PROMPT INJECTION (SANDWICH METHOD V2) ---
    // Top Bun: Global Style & World Anchor
    // Meat: Character Anchors (Detailed) + Image Mappings
    // Lettuce: Scene Action
    // Bottom Bun: Negative Constraints & Reinforcement

    const anchorSection = sceneAnchors && sceneAnchors.length > 0 
       ? sceneAnchors.map(a => `   - **${a.name}**: ${a.description}`).join('\n') 
       : "   - No specific character focus. Use generic background characters fitting the style if needed.";

    let sandwichPrompt = `
    *** IMAGE GENERATION ORDER ***
    
    STEP 1: SET THE SCENE (WORLD ANCHOR)
    - Visual Style: ${styleInstruction}
    - Global Atmosphere & Lighting: ${worldAnchor || "Consistent cinematic atmosphere suitable for the theme. Cohesive color palette."}
    
    STEP 2: APPLY CHARACTER DESIGNS (VISUAL ANCHORS)
    ${imageReferenceText}
    ${imageReferenceText ? "For the characters listed above, you MUST use the provided reference image ID as the primary source for their facial features and clothing." : ""}
    The following characters have strict visual definitions. You MUST adhere to these descriptions if they appear in the action:
    ${anchorSection}

    STEP 3: EXECUTE ACTION
    ${visualPrompt}
    
    *** CRITICAL CONSTRAINTS ***
    ${imageReferenceText ? "- Check the Reference Images: They are the ground truth for character identity." : ""}
    - Consistency Check: Ensure characters maintain their defined clothes and facial features from Step 2.
    - ${mode === 'comic' ? 'Do NOT generate speech bubbles or text boxes. Clean art.' : 'No text overlays. Photorealistic.'}
    `;

    if (feedback) {
      sandwichPrompt += `\n\nUSER FEEDBACK: "${feedback}". Update image accordingly while keeping anchors intact.`;
    }
    
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

// ... generateStylePreview ...
export const generateStylePreview = async (styleLabel: string, styleDesc: string): Promise<string> => {
  const ai = getAIClient();
  try {
    const prompt = `Sample art style: ${styleLabel}. ${styleDesc}. Epic landscape, hero silhouette. No text. High quality, detailed.`;
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-2.5-flash-image", // Using flash-image for faster previews
      contents: { parts: [{ text: prompt }] },
      config: { 
         safetySettings: SAFETY_SETTINGS,
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

// ... generateCharacterDesign ... (Unchanged)
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

// ... generateSpeech ... (Unchanged)
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

// ... generateSceneVideo ... (Unchanged)
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

// ... polishText ... (Unchanged)
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

// ... checkApiKey & openApiKeySelector ... (Unchanged)
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

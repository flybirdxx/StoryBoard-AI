import { Type, Schema, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { ArtStyle, GenerationMode, VisualAnchor } from "../types";

// --- CONFIGURATION ---

export const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

// --- SCHEMAS ---

export const ANALYZE_CHARACTERS_SCHEMA: Schema = {
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

export const getStoryScriptSchema = (mode: GenerationMode, hasAnchors: boolean, anchorNames: string): Schema => {
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

  return {
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
            visual_prompt: { type: Type.STRING, description: "English visual prompt focusing ONLY on action, composition, and camera angle. Do NOT describe character appearance details here (use 'the character', 'the boy' etc)." },
            characters: charactersSchema
          },
          required: ["narrative", "visual_prompt", "characters"],
        },
      },
    },
    required: ["title", "world_anchor", "scenes"],
  };
};

export const OPTIMIZE_STORY_SCHEMA: Schema = {
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

export const PLOT_OPTIONS_SCHEMA: Schema = {
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

export const getExtendStorySchema = (hasAnchors: boolean, anchorNames: string): Schema => {
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

  return {
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
};

// --- PROMPTS ---

export const buildAnalyzeCharactersPrompt = (theme: string) => `
Analyze the provided reference images for a story about: "${theme}".
Identify the distinct main characters present in these images.

For each distinct character, provide:
1. A short name.
2. A highly detailed "Visual Anchor" description in English. This description will be used to generate consistent images of this character. Include:
   - Body type & Age
   - Hair style & Color
   - Facial features
   - Clothing details (colors, style, textures)
3. The index of the image that best identifies them (0 for the first image, 1 for the second, etc.).

If multiple images show the same character, merge their details into one anchor.
`;

export const buildStorySystemInstruction = (
  mode: GenerationMode, 
  theme: string, 
  artStyle: ArtStyle, 
  anchorContext: string
) => {
  const role = mode === 'comic' ? "Comic Script Writer" : "Storyboard Artist";
  
  return `
You are a ${role}.

【Consistency Instructions】
1. Define a "World Anchor" (environment/lighting) that stays consistent throughout the story.
   - Based on Theme: "${theme}" and Style: "${artStyle}".
   - It MUST set a unified color palette (e.g., "Teal and Orange") and lighting style (e.g., "Chiaroscuro", "Soft Daylight").
2. Plan the scenes. For each scene, identify which characters from the "DEFINED CHARACTERS" list appear.
3. Write 'visual_prompt' focusing on ACTION, COMPOSITION, and CAMERA ANGLE (e.g., "Low angle shot, X is running towards camera"). 
   - DO NOT describe the character's clothes/face in the 'visual_prompt'. We will inject the Visual Anchor programmatically.
   - Use generic terms like "the protagonist" or "the robot" in the visual prompt if needed, the system will apply the specific look.

DEFINED CHARACTERS:
${anchorContext}
`;
};

export const buildOptimizeScriptPrompt = (
  theme: string, 
  artStyle: ArtStyle, 
  currentScriptJSON: string, 
  mode: GenerationMode,
  anchorNames: string
) => {
  const modeInstruction = mode === 'comic' 
    ? "Enhance comic pacing and punchlines."
    : "Enhance cinematic flow and camera direction.";

  return `
Optimize the story script.
Theme: ${theme}
Art Style: ${artStyle}

Current Script:
${currentScriptJSON}

Instructions:
1. ${modeInstruction}
2. Make narrative engaging (Chinese).
3. Enrich visual_prompt (English). Focus on action/camera.
4. Ensure 'characters' list correctly identifies who is in the scene${anchorNames ? ` from: [${anchorNames}]` : ''}.

Return updated scenes.
`;
};

export const buildExtendStoryPrompt = (
  theme: string,
  artStyle: ArtStyle,
  mode: GenerationMode,
  anchorContext: string,
  contextText: string,
  direction: string
) => `
Extend the story.
Theme: "${theme}"
Style: "${artStyle}"
Mode: "${mode}"

DEFINED CHARACTERS:
${anchorContext}

Current Story: 
${contextText}

Direction: "${direction}"

Generate 3-4 new scenes.
1. Use Chinese for narrative.
2. Use English for visual_prompt (Action/Composition focus).
3. Identify characters present in each scene.
`;

export const buildPlotOptionsPrompt = (theme: string, contextText: string) => `
Based on this story (${theme}):
${contextText}
Provide 3 interesting plot options (Chinese).
`;

export const buildImageSandwichPrompt = (
  styleInstruction: string,
  worldAnchor: string | undefined,
  imageReferenceText: string,
  anchorSection: string,
  visualPrompt: string,
  mode: GenerationMode,
  feedback?: string
) => {
  const styleHeader = `
STEP 1: SET THE SCENE (WORLD ANCHOR)
- Visual Style: ${styleInstruction}
- Global Atmosphere & Lighting: ${worldAnchor || "Consistent cinematic atmosphere suitable for the theme. Cohesive color palette."}
`;

  const characterHeader = `
STEP 2: APPLY CHARACTER DESIGNS (VISUAL ANCHORS)
${imageReferenceText}
${imageReferenceText ? "For the characters listed above, you MUST use the provided reference image ID as the primary source for their facial features and clothing." : ""}
The following characters have strict visual definitions. You MUST adhere to these descriptions if they appear in the action:
${anchorSection}
`;

  const actionHeader = `
STEP 3: EXECUTE ACTION
${visualPrompt}
`;

  const constraints = `
*** CRITICAL CONSTRAINTS ***
${imageReferenceText ? "- Check the Reference Images: They are the ground truth for character identity." : ""}
- Consistency Check: Ensure characters maintain their defined clothes and facial features from Step 2.
- ${mode === 'comic' ? 'Do NOT generate speech bubbles or text boxes. Clean art.' : 'No text overlays. Photorealistic.'}
- NEGATIVE CONSTRAINTS: Do not include text, watermarks, speech bubbles, blurry faces, distorted limbs, extra fingers, bad anatomy, low quality.
`;

  const userFeedback = feedback ? `\n\nUSER FEEDBACK: "${feedback}". Update image accordingly while keeping anchors intact.` : "";

  return `
*** IMAGE GENERATION ORDER ***
${styleHeader}
${characterHeader}
${actionHeader}
${constraints}
${userFeedback}
`;
};

export const buildStylePreviewPrompt = (styleLabel: string, styleDesc: string) => 
  `Sample art style: ${styleLabel}. ${styleDesc}. Epic landscape, hero silhouette. No text. High quality, detailed.`;

export const buildCharacterDesignPrompt = (style: string, desc: string) => 
  `Character design sheet. Style: ${style}. Desc: ${desc}. Full body.`;

export const buildPolishTextPrompt = (text: string, type: 'narrative' | 'visual') => 
  type === 'narrative' 
    ? `Optimize narrative (Chinese): "${text}"`
    : `Optimize visual prompt (English). Keep visual anchors intact: "${text}"`;

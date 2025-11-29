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
        description: mode === 'comic' ? "4-6 Comic Panels following a narrative arc" : "3-5 Storyboard Scenes",
        items: {
          type: Type.OBJECT,
          properties: {
            narrative: { type: Type.STRING, description: mode === 'comic' ? "Short punchy dialogue or SFX (Chinese)." : "Scene description (Chinese)." },
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
  
  // --- COMIC MODE: MANGA DIRECTOR PERSONA ---
  if (mode === 'comic') {
    return `
ROLE: You are an expert Manga Director and Visual Narrative Specialist.
TASK: Adapt the Theme "${theme}" into a dynamic 4-6 panel comic strip.

Input Analysis & Guidelines:
1. **Theme Analysis**: Determine if the story is Action (Dynamic/Impact), Comedy (Exaggerated/Funny), or Slice of Life (Gentle/Warm).
2. **Style**: ${artStyle}. Apply this style consistently.
3. **Safety Protocol**:
   - Sanitize Violence: If the theme involves combat, render it as "High-energy impact", "Magical clashes", or "Dynamic martial arts poses".
   - NO Gore/Blood: Replace with "Energy effects", "Speed lines", "Debris", or "Sparkles".
   - Characters: Ensure all characters are treated as fictional entities.

STORY STRUCTURE (Kishōtenketsu):
1. **Introduction (Ki)**: Set the scene and characters.
2. **Development (Shō)**: Introduce action or conflict.
3. **Twist/Climax (Ten)**: The peak moment, highest dynamic tension.
4. **Conclusion (Ketsu)**: Resolution or punchline.

VISUAL PROMPT ENGINEERING (For FLUX/Nano Banana):
- **Dynamic Elements**: MUST include keywords like "Speed lines", "Motion blur", "Impact frames", "Particle effects", "Dramatic lighting" where appropriate.
- **Camera Work**: Use specific angles: "Low angle shot", "Fisheye lens", "Dutch angle", "Close-up on eyes", "Wide shot".
- **Composition**: Describe the action trajectory (e.g., "Punching from left to right", "Running towards camera").
- **Strictly Visual**: Do NOT describe text bubbles or sound effects in the 'visual_prompt'. The image should be clean art.

OUTPUT REQUIREMENTS:
- **Narrative (Chinese)**: Short, punchy dialogue or Sound Effects (SFX) text. Max 1-2 lines per panel.
- **Visual Prompt (English)**: A production-ready image prompt.
- **Characters**: Strictly verify character presence against the "DEFINED CHARACTERS" list.

DEFINED CHARACTERS (Visual Anchors):
${anchorContext}
`;
  }

  // --- STORYBOARD MODE: CINEMATIC ARTIST PERSONA ---
  return `
ROLE: You are a professional Cinematic Storyboard Artist.
TASK: Create a 3-5 shot storyboard sequence for the Theme: "${theme}".

【Consistency Instructions】
1. **World Anchor**: Define a consistent environment/lighting/atmosphere (e.g., "Teal and Orange palette", "Noir Lighting").
2. **Cinematic Flow**: Ensure shots flow logically (e.g., Establishing Shot -> Medium Shot -> Close Up).
3. **Visual Prompting**: 
   - Focus on COMPOSITION, LIGHTING, and CAMERA LENS (e.g., "35mm lens", "Depth of field", "Bokeh").
   - DO NOT describe character details (hair/clothes) in the visual_prompt; the system inserts them automatically.
   - NO text inside the visual prompt.

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
    ? "Enhance comic pacing, punchlines, and dynamic 'manga-style' visual descriptions (speed lines, impact)."
    : "Enhance cinematic flow, camera direction, and lighting descriptions.";

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
- ${mode === 'comic' ? 'Do NOT generate speech bubbles or text boxes within the artwork. Clean manga/comic art.' : 'No text overlays. Photorealistic.'}
- NEGATIVE CONSTRAINTS: Do not include text, watermarks, speech bubbles, blurry faces, distorted limbs, extra fingers, bad anatomy, low quality, blood, gore.
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
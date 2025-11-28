import { GoogleGenAI, Type } from "@google/genai";
import { Scene, ScriptAnalysis, DetectedCharacter, ImageStyle } from "../types";

const parseJSON = (text: string) => {
  try {
    // Remove markdown code blocks if present
    let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse Gemini response:", e);
    return null;
  }
};

const getAI = () => {
  if (!process.env.API_KEY) {
    console.error("API_KEY is missing");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const analyzeScriptDeeply = async (scriptContext: string): Promise<ScriptAnalysis | null> => {
  const ai = getAI();
  if (!ai) return null;

  const prompt = `
    You are a professional screenwriter and script doctor.
    Your task is to analyze the following user input (story idea or rough draft) and expand it into a detailed, professional script outline.
    
    User Input: "${scriptContext}"

    1. **Optimize and Expand**: Rewrite the script to be more detailed. Include clear character arcs, main conflicts, and plot twists. Ensure the pacing is suitable for a visual storyboard.
    2. **Extract Characters**: Identify ALL characters mentioned or implied. Provide a detailed visual description for each.
    
    Return the result in the following JSON format ONLY:
    {
      "synopsis": "A brief summary of the improved story",
      "expandedScript": "The full detailed script text...",
      "characters": [
        { "name": "Name", "role": "Role in story", "description": "Visual description for AI image generation" }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Switched to flash for reliable large JSON generation
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            synopsis: { type: Type.STRING },
            expandedScript: { type: Type.STRING },
            characters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  role: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["name", "role", "description"]
              }
            }
          },
          required: ["synopsis", "expandedScript", "characters"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    
    const result = parseJSON(text);
    if (!result) return null;

    // Safety check to ensure characters is an array
    if (!result.characters || !Array.isArray(result.characters)) {
        result.characters = [];
    }
    
    return result as ScriptAnalysis;

  } catch (error) {
    console.error("Gemini API Error (Script Analysis):", error);
    return null;
  }
};

export const generateStoryboard = async (scriptContext: string): Promise<Scene[] | null> => {
  const ai = getAI();
  if (!ai) return null;

  const prompt = `
    You are a professional film director and cinematographer.
    Analyze the following script/concept and generate a detailed storyboard breakdown.
    
    Context: ${scriptContext}

    Break this down into 1-2 Scenes. Each scene should have 3-4 distinct Shots.
    
    For each shot, provide:
    - shotNumber: Integer
    - type: e.g., "Narrative", "Dialogue", "Action" (Keep it short, max 4 chars if possible or translate to Chinese e.g. "旁白")
    - cameraMove: e.g., "Slow Pan", "Close-up", "Tracking" (Translate to English technical terms is fine, or Chinese: "慢推", "特写")
    - visualPrompt: A highly descriptive visual prompt suitable for AI image generation (in Chinese). Focus on lighting, composition, and mood.
    - description: A brief explanation of what is happening in the shot (in Chinese).
    - duration: Estimated duration in seconds (integer, e.g., 3, 5, 8).

    Return ONLY raw JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Switched to flash for reliable large JSON generation
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              title: { type: Type.STRING, description: "Scene header, e.g., 'INT. MUSEUM - DAY'" },
              description: { type: Type.STRING },
              shots: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.INTEGER },
                    shotNumber: { type: Type.INTEGER },
                    type: { type: Type.STRING },
                    cameraMove: { type: Type.STRING },
                    visualPrompt: { type: Type.STRING },
                    description: { type: Type.STRING },
                    duration: { type: Type.NUMBER }
                  },
                  required: ["id", "shotNumber", "type", "cameraMove", "visualPrompt", "description", "duration"]
                }
              }
            },
            required: ["id", "title", "description", "shots"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    
    const result = parseJSON(text);
    if (Array.isArray(result)) {
        // Post-process to add default transition
        return result.map((scene: any) => ({
            ...scene,
            shots: scene.shots.map((shot: any) => ({
                ...shot,
                transition: 'CUT'
            }))
        }));
    }
    return null;

  } catch (error) {
    console.error("Gemini API Error (Storyboard):", error);
    return null;
  }
};

export const generateShotImage = async (visualPrompt: string, style: string = 'Cinematic'): Promise<string | null> => {
  const ai = getAI();
  if (!ai) return null;

  // Enhance prompt for 'Cinematic' style to ensure photorealism
  let finalPrompt = visualPrompt;
  if (style === 'Cinematic') {
      finalPrompt = `movie still, photorealistic, 8k, highly detailed, cinematic lighting, ${visualPrompt}`;
  } else if (style === 'Anime') {
      finalPrompt = `anime style, studio ghibli inspired, vibrant colors, ${visualPrompt}`;
  } else {
      finalPrompt = `${style} style, high quality, ${visualPrompt}`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: finalPrompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Gemini API Error (Image):", error);
    return null;
  }
};

export const generateCharacterImage = async (description: string, style: string = 'Cinematic'): Promise<string | null> => {
  const ai = getAI();
  if (!ai) return null;

  // Construct a style-specific prompt
  let styleContext = "";
  if (style === 'Cinematic') {
      styleContext = "photorealistic, movie still, 8k, highly detailed texture, dramatic lighting, shot on 35mm lens";
  } else if (style === 'Anime') {
      styleContext = "anime character sheet, 2D flat, vibrant, clean lines, studio ghibli style";
  } else if (style === '3D Render') {
      styleContext = "3D character render, unreal engine 5, octane render, subsurface scattering";
  } else if (style === 'Watercolor') {
      styleContext = "watercolor painting, artistic, soft edges, paper texture";
  } else if (style === 'Cyberpunk') {
      styleContext = "cyberpunk aesthetic, neon lights, futuristic, high techwear";
  } else if (style === 'Sketch') {
      styleContext = "pencil sketch, rough lines, artistic concept art";
  } else if (style === 'Film Noir') {
      styleContext = "film noir, black and white, high contrast, dramatic shadows";
  } else if (style === 'Wes Anderson') {
      styleContext = "Wes Anderson style, symmetrical, pastel colors, quirky";
  } else if (style === 'Studio Ghibli') {
      styleContext = "Studio Ghibli style, hand drawn, beautiful background";
  } else if (style === 'Retro Sci-Fi') {
      styleContext = "1980s sci-fi art, synthwave, retro futurism";
  } else if (style === 'Comic Book') {
      styleContext = "comic book art, bold lines, halftone patterns, vibrant";
  }

  const finalPrompt = `Full body character design, ${styleContext}, neutral background. Character description: ${description}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: finalPrompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Gemini API Error (Character):", error);
    return null;
  }
};
import { GoogleGenAI, Type } from "@google/genai";
import { Scene, ScriptAnalysis, ImageStyle } from "../types";
import { 
  getScriptAnalysisPrompt, 
  getStoryboardPrompt, 
  getImageGenerationPrompt, 
  getCharacterGenerationPrompt 
} from "./prompts";
import { robustParseJSON, createConcurrencyLimiter } from "./utils";

// Create a concurrency limiter for image generation to prevent 429 errors
// Limit to 3 concurrent requests
const imageGenerationLimiter = createConcurrencyLimiter(3);

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

  const prompt = getScriptAnalysisPrompt(scriptContext);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
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
    
    const result = robustParseJSON<ScriptAnalysis>(text);
    if (!result) return null;

    // Safety check
    if (!result.characters || !Array.isArray(result.characters)) {
        result.characters = [];
    }
    
    return result;

  } catch (error) {
    console.error("Gemini API Error (Script Analysis):", error);
    return null;
  }
};

export const generateStoryboard = async (scriptContext: string): Promise<Scene[] | null> => {
  const ai = getAI();
  if (!ai) return null;

  const prompt = getStoryboardPrompt(scriptContext);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
    
    const result = robustParseJSON<Scene[]>(text);
    
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
  return imageGenerationLimiter(async () => {
    const ai = getAI();
    if (!ai) return null;

    const finalPrompt = getImageGenerationPrompt(visualPrompt, style);

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
  });
};

export const generateCharacterImage = async (description: string, style: string = 'Cinematic'): Promise<string | null> => {
  return imageGenerationLimiter(async () => {
    const ai = getAI();
    if (!ai) return null;

    const finalPrompt = getCharacterGenerationPrompt(description, style);

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
  });
};

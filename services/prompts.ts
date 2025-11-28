import { ImageStyle } from "../types";

export const getScriptAnalysisPrompt = (scriptContext: string) => `
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

export const getStoryboardPrompt = (scriptContext: string) => `
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

export const getImageGenerationPrompt = (visualPrompt: string, style: string) => {
  if (style === 'Cinematic') {
    return `movie still, photorealistic, 8k, highly detailed, cinematic lighting, ${visualPrompt}`;
  } else if (style === 'Anime') {
    return `anime style, studio ghibli inspired, vibrant colors, ${visualPrompt}`;
  } else {
    return `${style} style, high quality, ${visualPrompt}`;
  }
};

export const getCharacterGenerationPrompt = (description: string, style: string) => {
  let styleContext = "";
  switch (style) {
    case 'Cinematic':
      styleContext = "photorealistic, movie still, 8k, highly detailed texture, dramatic lighting, shot on 35mm lens";
      break;
    case 'Anime':
      styleContext = "anime character sheet, 2D flat, vibrant, clean lines, studio ghibli style";
      break;
    case '3D Render':
      styleContext = "3D character render, unreal engine 5, octane render, subsurface scattering";
      break;
    case 'Watercolor':
      styleContext = "watercolor painting, artistic, soft edges, paper texture";
      break;
    case 'Cyberpunk':
      styleContext = "cyberpunk aesthetic, neon lights, futuristic, high techwear";
      break;
    case 'Sketch':
      styleContext = "pencil sketch, rough lines, artistic concept art";
      break;
    case 'Film Noir':
      styleContext = "film noir, black and white, high contrast, dramatic shadows";
      break;
    case 'Wes Anderson':
      styleContext = "Wes Anderson style, symmetrical, pastel colors, quirky";
      break;
    case 'Studio Ghibli':
      styleContext = "Studio Ghibli style, hand drawn, beautiful background";
      break;
    case 'Retro Sci-Fi':
      styleContext = "1980s sci-fi art, synthwave, retro futurism";
      break;
    case 'Comic Book':
      styleContext = "comic book art, bold lines, halftone patterns, vibrant";
      break;
    default:
      styleContext = `${style} style, high quality`;
  }

  return `Full body character design, ${styleContext}, neutral background. Character description: ${description}`;
};

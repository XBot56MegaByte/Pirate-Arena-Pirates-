
import { GoogleGenAI } from "@google/genai";

// getBrainrotCommentary generates funny commentary for game events using Gemini.
export const getBrainrotCommentary = async (event: string): Promise<string> => {
  try {
    // Always instantiate right before the call to ensure the latest API key is used.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a short, funny 1-sentence "brainrot" style commentary for a pirate game event: "${event}". 
      Use slang like skibidi, rizz, gyatt, fanum tax, ohio, sigma, etc., but keep it piraty.`,
      config: {
        maxOutputTokens: 50,
        temperature: 0.9,
      }
    });
    return response.text || "PIRATE RIZZ MOMENT!";
  } catch (error) {
    console.error("Gemini Commentary Error:", error);
    return "SKIBIDI PIRATE MOMENT!";
  }
};

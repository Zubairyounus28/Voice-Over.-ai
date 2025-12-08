
import { GoogleGenAI, Modality } from "@google/genai";
import { AVAILABLE_VOICES, SpeakingStyle } from "../types";

// Ensure API key exists
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || '' });

/**
 * Generates speech from text using the specified voice and style.
 */
export const generateSpeech = async (text: string, voiceId: string, style: SpeakingStyle = SpeakingStyle.STANDARD) => {
  const selectedVoice = AVAILABLE_VOICES.find(v => v.id === voiceId) || AVAILABLE_VOICES[1];
  
  // Choose model
  const model = "gemini-2.5-flash-preview-tts";

  // Construct prompt based on style
  let finalPrompt = text;
  
  switch (style) {
    case SpeakingStyle.FICTION:
      finalPrompt = `Read the following story with deep emotion, character expression, and dramatic flair suitable for an audiobook: ${text}`;
      break;
    case SpeakingStyle.NON_FICTION:
      finalPrompt = `Narrate the following text in a clear, professional, and factual documentary style: ${text}`;
      break;
    case SpeakingStyle.SINGING:
      finalPrompt = `Sing this cheerfully: ${text}`;
      break;
    case SpeakingStyle.STANDARD:
    default:
      finalPrompt = text;
      break;
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: finalPrompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: selectedVoice.geminiVoiceName },
          },
        },
      },
    });

    // Check for candidates and parts
    const candidate = response.candidates?.[0];
    const part = candidate?.content?.parts?.[0];

    if (!part || !part.inlineData || !part.inlineData.data) {
      throw new Error("No audio data returned from Gemini.");
    }

    return part.inlineData.data; // Base64 string
  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
};

/**
 * Transcribes a video file to text.
 */
export const transcribeVideo = async (base64Video: string, mimeType: string) => {
  const model = "gemini-2.5-flash"; // Capable of multimodal inputs

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Video,
            },
          },
          {
            text: "Please transcribe the speech in this video accurately. Provide only the transcription without intro or outro text.",
          },
        ],
      },
    });

    return response.text;
  } catch (error) {
    console.error("Error transcribing video:", error);
    throw error;
  }
};

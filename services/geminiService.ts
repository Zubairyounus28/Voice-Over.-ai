
import { GoogleGenAI, Modality } from "@google/genai";
import { AVAILABLE_VOICES, AVAILABLE_PODCAST_PAIRS, SpeakingStyle } from "../types";

// Ensure API key exists
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || '' });

/**
 * Translates text to Urdu.
 */
export const translateToUrdu = async (text: string): Promise<string> => {
  if (!text.trim()) return "";
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: `Translate the following text to Urdu (Pakistani standard). Provide only the translated Urdu text, nothing else:\n\n${text}` }] }],
    });
    
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
};

/**
 * Generates a podcast script from raw text.
 */
export const generatePodcastScript = async (text: string, pairId: string, language: 'ENGLISH' | 'URDU'): Promise<string> => {
    const pair = AVAILABLE_PODCAST_PAIRS.find(p => p.id === pairId) || AVAILABLE_PODCAST_PAIRS[0];
    const s1 = pair.speaker1.name;
    const s2 = pair.speaker2.name;

    const langInstruction = language === 'URDU' 
        ? "The dialogue must be in Urdu (Roman Urdu or Urdu script as preferred, but make it natural)." 
        : "The dialogue must be in English.";

    const prompt = `Convert the following text into a natural, engaging podcast dialogue script between two speakers: ${s1} and ${s2}.
    ${langInstruction}
    
    Format the output strictly as:
    ${s1}: [Line]
    ${s2}: [Line]
    
    Keep the tone conversational.
    
    Original Text/Topic:
    ${text}`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: prompt }] }],
        });
        return response.text?.trim() || "";
    } catch (error) {
        console.error("Script generation error:", error);
        throw error;
    }
};

/**
 * Generates speech from text using the specified voice/pair and style.
 */
export const generateSpeech = async (text: string, voiceOrPairId: string, style: SpeakingStyle = SpeakingStyle.STANDARD) => {
  const model = "gemini-2.5-flash-preview-tts";
  let config: any = {
    responseModalities: [Modality.AUDIO],
  };
  let finalPrompt = text;

  if (style === SpeakingStyle.PODCAST) {
     const pair = AVAILABLE_PODCAST_PAIRS.find(p => p.id === voiceOrPairId) || AVAILABLE_PODCAST_PAIRS[0];
     
     // Configure Multi-speaker
     config.speechConfig = {
        multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
                {
                    speaker: pair.speaker1.name,
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: pair.speaker1.voiceName } }
                },
                {
                    speaker: pair.speaker2.name,
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: pair.speaker2.voiceName } }
                }
            ]
        }
     };

     // The prompt needs to know it's a conversation
     finalPrompt = `TTS the following conversation between ${pair.speaker1.name} and ${pair.speaker2.name}.\n\n${text}`;

  } else {
      // Standard Single Speaker
      const selectedVoice = AVAILABLE_VOICES.find(v => v.id === voiceOrPairId) || AVAILABLE_VOICES[1];
      
      config.speechConfig = {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: selectedVoice.geminiVoiceName },
          },
      };

      if (selectedVoice.isUrdu) {
        finalPrompt = `Narrate the following text in Urdu with a natural Pakistani accent: ${text}`;
      } else {
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
      }
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: finalPrompt }] }],
      config: config,
    });

    const candidate = response.candidates?.[0];
    const part = candidate?.content?.parts?.[0];

    if (!part || !part.inlineData || !part.inlineData.data) {
      throw new Error("No audio data returned from Gemini.");
    }

    return part.inlineData.data; 
  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
};

/**
 * Transcribes a video file to text.
 */
export const transcribeVideo = async (base64Video: string, mimeType: string) => {
  const model = "gemini-2.5-flash"; 

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

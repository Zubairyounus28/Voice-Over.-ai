
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { AVAILABLE_VOICES, AVAILABLE_PODCAST_PAIRS, SpeakingStyle, VoiceGender } from "../types";

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
 * Analyzes an audio sample to create a "Cloned" voice profile (Style Matching).
 */
export const analyzeVoiceSample = async (base64Audio: string, mimeType: string): Promise<{
  name: string;
  description: string;
  stylePrompt: string;
  baseVoice: string;
  pitch: number;
  gender: VoiceGender;
}> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Audio } },
          { text: `Analyze this voice sample for a text-to-speech cloning application.
            
            1. Identify the Gender (MALE, FEMALE, CHILD).
            2. Describe the voice's style (e.g., Raspy, Energetic, Soft, Authoritative, Deep, Breathly) and any accent.
            3. Write a specific "Acting Prompt" to instruct an AI narrator to mimic this exact style.
            4. Select the best Base Voice ID to start with from:
               - 'Fenrir' (Deep/Authoritative Male)
               - 'Puck' (Standard/Energetic Male)
               - 'Kore' (Mature/Soft Female)
               - 'Zephyr' (Young/Lively Female)
            5. Recommend a pitch shift (in cents, between -200 and +200) to match the speaker's pitch.
            
            Return JSON only.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            gender: { type: Type.STRING, enum: ["MALE", "FEMALE", "CHILD"] },
            styleDescription: { type: Type.STRING },
            actingPrompt: { type: Type.STRING },
            baseVoice: { type: Type.STRING, enum: ["Fenrir", "Puck", "Kore", "Zephyr"] },
            pitch: { type: Type.NUMBER },
          }
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    return {
      name: `Cloned ${result.styleDescription?.split(' ')[0] || 'Voice'}`,
      description: result.styleDescription || "Custom cloned voice",
      stylePrompt: result.actingPrompt || "Speak naturally.",
      baseVoice: result.baseVoice || "Puck",
      pitch: result.pitch || 0,
      gender: result.gender as VoiceGender || VoiceGender.MALE
    };

  } catch (error) {
    console.error("Voice analysis error:", error);
    throw new Error("Failed to analyze voice sample");
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
export const generateSpeech = async (
    text: string, 
    voiceOrPairId: string, 
    style: SpeakingStyle = SpeakingStyle.STANDARD,
    customVoiceData?: any 
) => {
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
      let selectedVoice = AVAILABLE_VOICES.find(v => v.id === voiceOrPairId);
      
      // If not found in presets, check if it's the custom voice passed in
      if (!selectedVoice && customVoiceData && customVoiceData.id === voiceOrPairId) {
          selectedVoice = customVoiceData;
      }
      
      // Fallback
      if (!selectedVoice) selectedVoice = AVAILABLE_VOICES[1];
      
      config.speechConfig = {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: selectedVoice.geminiVoiceName },
          },
      };

      if (selectedVoice.isCloned && selectedVoice.stylePrompt) {
        // Use the cloned style prompt
        finalPrompt = `Act as a professional voice actor. ${selectedVoice.stylePrompt} Narrate the following text: "${text}"`;
      } else if (selectedVoice.isUrdu) {
        if (selectedVoice.id === 'urdu_authority_male') {
             finalPrompt = `Narrate the following text in Urdu with a bold, authoritative, and professional commercial tone (Pakistani accent). The delivery should be strong, impactful, and suitable for a high-energy advertisement. Text: ${text}`;
        } else if (selectedVoice.id === 'urdu_pro_emotional') {
             finalPrompt = `Narrate the following text in Urdu (Pakistani accent) with deep natural emotion and professionalism. The tone should be warm, trustworthy, and sophisticated, like a high-quality brand ambassador or Dr. Saifuddin style. Use expressive intonation and natural pacing. Text: ${text}`;
        } else {
             finalPrompt = `Narrate the following text in Urdu with a natural Pakistani accent: ${text}`;
        }
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

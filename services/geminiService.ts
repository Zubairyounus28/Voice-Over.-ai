
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
 * Translates script for Video Dubbing/Translation.
 * Focuses on natural flow and retaining meaning.
 */
export const translateScript = async (text: string, targetLanguage: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: `
        Act as a professional dubbing translator. Translate the following video transcript into "${targetLanguage}".
        
        Rules:
        1. The translation must be natural and colloquial for a native speaker of ${targetLanguage}.
        2. CRITICAL: Try to match the approximate length and rhythm of the original sentences to help with lip-syncing.
        3. Maintain the original emotional tone (whether it's serious, funny, energetic, etc.).
        4. Do not include notes, only return the translated text.

        Original Text:
        "${text}"
      ` }] }],
    });
    
    return response.text?.trim() || text;
  } catch (error) {
    console.warn("Translation failed (Network/API Error). Using original text.", error);
    return text;
  }
};

/**
 * Improves the script for a specific accent/style.
 * Includes fallback to original text on error.
 */
export const improveScript = async (text: string, targetStyle: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: `
        Act as a professional script editor. Rewrite the following transcript to match a "${targetStyle}" style. 
        
        Rules:
        1. Fix any grammatical errors.
        2. Improve vocabulary to be more professional or suitable for the requested style.
        3. Ensure the sentence structure flows naturally for speech.
        4. Keep the original meaning intact.
        5. DO NOT translate the text unless the style explicitly requests a specific language (e.g. "English" or "Urdu"). Preserve the original language of the text.
        6. CRITICAL FOR LIP-SYNC: Attempt to match the syllable count, sentence length, and rhythm of the original text as closely as possible.
        7. Return ONLY the rewritten text.

        Original Text:
        "${text}"
      ` }] }],
    });
    
    return response.text?.trim() || text;
  } catch (error) {
    console.warn("Script improvement failed (Network/API Error). Using original text as fallback.", error);
    // Fallback to original text so the flow doesn't break
    return text;
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
  age: string;
  accent: string;
  language: string;
  intonation?: string;
  rhythm?: string;
}> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Audio } },
          { text: `Analyze this voice sample for a professional high-fidelity AI voice cloning application.
            
            1. Identify the Gender (MALE, FEMALE, CHILD).
            2. Estimate the Age (e.g., Child, Teenager, Young Adult, Middle Aged, Elderly).
            3. Identify the Accent (e.g., American, British, Indian, Pakistani, Australian, etc.) and be specific about region if possible.
            4. Identify the Language being spoken.
            5. Analyze the **Intonation Pattern** (e.g., Rising at end, Flat/Monotone, Melodic, Expressive).
            6. Analyze the **Speech Rhythm** (e.g., Fast, Slow, Staccato, Flowing, Pausing often).
            7. Describe the voice's unique tone (e.g., Raspy, Energetic, Soft, Authoritative, Deep, Breathly).
            8. Write an extremely specific "Acting Prompt" to help an AI mimic this person perfectly. Include instructions on vowel pronunciation, stress patterns, and emotional delivery. 
               Example: "Act as a middle-aged Pakistani man. Speak with a heavy Urdu accent, emphasizing hard consonants. Use a melodic, storytelling intonation."
            9. Select the best Base Voice ID to start with from:
               - 'Fenrir' (Deep/Authoritative Male)
               - 'Puck' (Standard/Energetic Male)
               - 'Kore' (Mature/Soft Female)
               - 'Zephyr' (Young/Lively Female)
            10. Recommend a pitch shift (in cents, between -200 and +200).
            
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
            age: { type: Type.STRING },
            accent: { type: Type.STRING },
            language: { type: Type.STRING },
            intonation: { type: Type.STRING },
            rhythm: { type: Type.STRING },
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
      gender: result.gender as VoiceGender || VoiceGender.MALE,
      age: result.age || "Adult",
      accent: result.accent || "Neutral",
      language: result.language || "English",
      intonation: result.intonation,
      rhythm: result.rhythm
    };

  } catch (error) {
    console.error("Voice analysis error:", error);
    throw new Error("Failed to analyze voice sample. File might be too large or format unsupported.");
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
  
  // Strict modality config
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
        // Enhanced Instruction: Explicitly ask for realism
        finalPrompt = `Task: Mimic the voice described below with extreme accuracy.
        Voice Description: ${selectedVoice.stylePrompt}
        
        Instructions:
        1. Maintain the exact accent, intonation, and rhythm described.
        2. If the accent is non-native English (e.g. Urdu accent), ensure the pronunciation reflects that region's phonetic habits (e.g. vowel sounds, consonant stress).
        3. Speak naturally and realistically.
        
        Text to narrate: "${text}"`;
      } else if (selectedVoice.isUrdu) {
        if (selectedVoice.id === 'urdu_authority_male') {
             finalPrompt = `Narrate the following text in Urdu with a bold, authoritative, and professional commercial tone (Pakistani accent). The delivery should be strong, impactful, and suitable for a high-energy advertisement. Text: ${text}`;
        } else if (selectedVoice.id === 'urdu_pro_emotional') {
             finalPrompt = `Narrate the following text in Urdu (Pakistani accent) with deep natural emotion and professionalism. The tone should be warm, trustworthy, and sophisticated, like a high-quality brand ambassador or Dr. Saifuddin style. Use expressive intonation and natural pacing. Text: ${text}`;
        } else if (selectedVoice.id === 'urdu_wise_old') {
             finalPrompt = `Act as an elderly, wise storyteller. Narrate the following text in Urdu (Pakistani accent) with a relaxed, emotional, and deep tone. The voice should sound experienced, calm, and heartfelt. Text: ${text}`;
        } else if (selectedVoice.id === 'urdu_young_soft') {
             finalPrompt = `Act as a young, emotional man. Narrate the following text in Urdu (Pakistani accent) with a soft, relaxed, and heartfelt tone. The delivery should be gentle, calm, and touching. Text: ${text}`;
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

    // ERROR CHECK: Did the model refuse and return text?
    if (part?.text && !part?.inlineData) {
        console.warn("Gemini returned text instead of audio (Safety/Refusal):", part.text);
        throw new Error("The AI model refused to generate audio for this prompt. Please try simpler text or a different style.");
    }

    if (!part || !part.inlineData || !part.inlineData.data) {
      throw new Error("No audio data returned from Gemini. The request may have timed out or been blocked.");
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

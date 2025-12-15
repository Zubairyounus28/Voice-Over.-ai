
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
 * Optimizes script for TTS performance.
 */
export const optimizeScriptForSpeech = async (text: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: `
        Act as a professional Voice Director. Rewrite the following script to be optimized for Text-to-Speech generation.
        Objectives: Fix grammatical errors, insert punctuation for breathing, break run-on sentences.
        Original Script: "${text}"
      ` }] }],
    });
    return response.text?.trim() || text;
  } catch (error) {
    console.warn("Script optimization failed.", error);
    return text;
  }
};

/**
 * Translates script for Video Dubbing.
 */
export const translateScript = async (text: string, targetLanguage: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: `
        Act as a professional dubbing translator. Translate the following video transcript into "${targetLanguage}".
        Rules: Natural colloquial flow, match approximate length/rhythm for lip-sync, maintain emotional tone.
        Original Text: "${text}"
      ` }] }],
    });
    return response.text?.trim() || text;
  } catch (error) {
    console.warn("Translation failed.", error);
    return text;
  }
};

/**
 * Improves the script for a specific accent/style.
 */
export const improveScript = async (text: string, targetStyle: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: `
        Act as a professional script editor. Rewrite the following transcript to match a "${targetStyle}" style. 
        Rules: Fix grammar, improve vocabulary, ensure natural flow, keep original meaning.
        Original Text: "${text}"
      ` }] }],
    });
    return response.text?.trim() || text;
  } catch (error) {
    console.warn("Script improvement failed.", error);
    return text;
  }
};

/**
 * Analyzes an audio sample to create a "Cloned" voice profile.
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
          { text: `Analyze this voice sample for a high-fidelity AI voice cloning application. Return JSON with gender, age, accent, language, intonation, rhythm, styleDescription, actingPrompt, baseVoice (Fenrir/Puck/Kore/Zephyr), and pitch (-200 to 200).` }
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
    throw new Error("Failed to analyze voice sample.");
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
    Format: ${s1}: [Line] ...
    Original Text: ${text}`;

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
 * Generates a Bedtime Story script from raw text (Story Mode).
 */
export const generateStoryScript = async (text: string, pairId: string, language: 'ENGLISH' | 'URDU'): Promise<string> => {
    const pair = AVAILABLE_PODCAST_PAIRS.find(p => p.id === pairId) || AVAILABLE_PODCAST_PAIRS[3]; 
    const s1 = pair.speaker1.name; // Parent
    const s2 = pair.speaker2.name; // Child
    
    // Determine Role
    const parentRole = (s1 === 'Mom' || s1 === 'Mother') ? 'Mother' : 'Father';

    const langInstruction = language === 'URDU'
        ? "Mix English with natural Roman Urdu (e.g. 'Beta, suno...', 'Bohat purani baat hai'). This is a Desi/Pakistani bedtime story context."
        : "Write in beautiful, soothing English.";

    const prompt = `Act as a professional creative writer for Bedtime Stories. 
    Convert the following raw topic into a beautiful, soothing bedtime story interaction between a ${parentRole} (${s1}) and a Child (${s2}).
    
    Role:
    - ${s1} (${parentRole}): Tells the story in a soothing, loving, beautiful voice. ${parentRole === 'Father' ? 'He' : 'She'} explains things gently.
    - ${s2} (Child): Listens, occasionally asks cute questions, or reacts with wonder (or gets sleepy).
    
    Instructions:
    1. Determine if the topic is Fiction or Non-Fiction and adapt the tone (Magical vs Educational).
    2. ${langInstruction}
    3. Keep the conversation natural and heartwarming.
    
    Format the output strictly as:
    ${s1}: [Line]
    ${s2}: [Line]
    
    Raw Topic/Script:
    ${text}`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: prompt }] }],
        });
        return response.text?.trim() || "";
    } catch (error) {
        console.error("Story script generation error:", error);
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
  
  let config: any = { responseModalities: [Modality.AUDIO] };
  let finalPrompt = text;

  if (style === SpeakingStyle.PODCAST || style === SpeakingStyle.STORY) {
     const pair = AVAILABLE_PODCAST_PAIRS.find(p => p.id === voiceOrPairId) || AVAILABLE_PODCAST_PAIRS[0];
     
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

     if (style === SpeakingStyle.STORY) {
         const parentRole = (pair.speaker1.name === 'Mom' || pair.speaker1.name === 'Mother') ? 'Mother' : 'Father';
         const parentAdjectives = parentRole === 'Father' ? 'extremely DEEP, SLOW, warm, and protective' : 'extremely SOFT, GENTLE, warm, and loving';

         finalPrompt = `Task: Generate a heartwarming Bedtime Story interaction between a ${parentRole} (${pair.speaker1.name}) and a Child (${pair.speaker2.name}).
         
         Context: The ${parentRole} is telling a brief story to their child at night. 
         
         Voice Directions:
         - ${pair.speaker1.name} (${parentRole}): Must sound ${parentAdjectives}.
         - ${pair.speaker2.name} (Child): Must sound like a LITTLE KID (5 years old). High pitch, energetic, cute, and curious.
         
         Environment: Quiet, cozy night time.
         
         Dialogue to Narrate:
         ${text}`;
     } else {
         finalPrompt = `TTS the following conversation between ${pair.speaker1.name} and ${pair.speaker2.name}.\n\n${text}`;
     }

  } else {
      let selectedVoice = AVAILABLE_VOICES.find(v => v.id === voiceOrPairId);
      if (!selectedVoice && customVoiceData && customVoiceData.id === voiceOrPairId) {
          selectedVoice = customVoiceData;
      }
      if (!selectedVoice) selectedVoice = AVAILABLE_VOICES[1];
      
      config.speechConfig = {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice.geminiVoiceName } },
      };

      if (selectedVoice.isCloned && selectedVoice.stylePrompt) {
        finalPrompt = `Task: Mimic the voice described below. Description: ${selectedVoice.stylePrompt}. Text: "${text}"`;
      } else if (selectedVoice.isUrdu) {
         finalPrompt = `Narrate the following text in Urdu with a natural Pakistani accent: ${text}`;
      } else {
        // Simple pass-through for stability
        finalPrompt = text;
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

    if (part?.text && !part?.inlineData) {
        throw new Error("AI refused to generate audio. Try simpler text.");
    }

    if (!part?.inlineData?.data) {
      throw new Error("No audio data returned.");
    }

    return part.inlineData.data; 
  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
};

export const transcribeVideo = async (base64Video: string, mimeType: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Video } },
          { text: "Transcribe the speech in this video." },
        ],
      },
    });
    return response.text;
  } catch (error) {
    console.error("Error transcribing video:", error);
    throw error;
  }
};

/**
 * Generates a visual description prompt for video generation based on a script.
 */
export const generateVisualPrompt = async (script: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: `
        Act as a professional cinematographer. Create a concise, visually rich description for a video generation model (like Veo) based on this story segment.
        Focus on: Subject appearance, Action, Environment, Lighting, and Mood.
        Keep it under 300 characters.
        Story Script: "${script.substring(0, 1000)}"
      ` }] }],
    });
    return response.text?.trim() || "A cinematic scene representing the story.";
  } catch (error) {
    console.warn("Visual prompt generation failed.", error);
    return "A cinematic scene representing the story.";
  }
};

/**
 * Generates a video using Veo model.
 */
export const generateVeoVideo = async (prompt: string): Promise<string> => {
  try {
    // Create new instance to ensure fresh API key usage for Veo as per guidelines
    const veoAi = new GoogleGenAI({ apiKey: process.env.API_KEY || '' }); 

    let operation = await veoAi.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p', 
        aspectRatio: '16:9'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await veoAi.operations.getVideosOperation({operation: operation});
    }

    if (operation.error) {
       throw new Error(`Video generation failed: ${operation.error.message}`);
    }
    
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("No video URI returned.");
    }

    // Fetch with API key to get the bytes
    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!videoResponse.ok) {
        throw new Error("Failed to download generated video.");
    }
    const blob = await videoResponse.blob();
    return URL.createObjectURL(blob);

  } catch (error) {
    console.error("Veo generation error:", error);
    throw error;
  }
};

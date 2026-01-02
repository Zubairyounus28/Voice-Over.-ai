
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { AVAILABLE_VOICES, AVAILABLE_PODCAST_PAIRS, SpeakingStyle, VoiceGender } from "../types";

/**
 * Translates text to Urdu using Gemini 3 Flash.
 */
export const translateToUrdu = async (text: string): Promise<string> => {
  if (!text.trim()) return "";
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: `Translate the following text to Urdu (Pakistani standard). Provide only the translated Urdu text, nothing else:\n\n${text}` }] }],
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
};

/**
 * Optimizes script for TTS performance using Gemini 3 Flash.
 */
export const optimizeScriptForSpeech = async (text: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
 * Analyzes an audio sample for AI voice cloning parameters.
 */
export const analyzeVoiceSample = async (base64Audio: string, mimeType: string): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
          },
          required: ["gender", "baseVoice", "pitch"]
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
 * Generates a podcast dialogue script.
 */
export const generatePodcastScript = async (text: string, pairId: string, language: 'ENGLISH' | 'URDU'): Promise<string> => {
    const pair = AVAILABLE_PODCAST_PAIRS.find(p => p.id === pairId) || AVAILABLE_PODCAST_PAIRS[0];
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Convert the following text into a natural, engaging podcast dialogue script between ${pair.speaker1.name} and ${pair.speaker2.name}. 
    ${language === 'URDU' ? "The dialogue must be in natural Roman Urdu." : "The dialogue must be in English."}
    Format: ${pair.speaker1.name}: [Line] ...
    Original Text: ${text}`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ parts: [{ text: prompt }] }],
        });
        return response.text?.trim() || "";
    } catch (error) {
        console.error("Script generation error:", error);
        throw error;
    }
};

/**
 * Generates a Bedtime Story dialogue script.
 */
export const generateStoryScript = async (text: string, pairId: string, language: 'ENGLISH' | 'URDU'): Promise<string> => {
    const pair = AVAILABLE_PODCAST_PAIRS.find(p => p.id === pairId) || AVAILABLE_PODCAST_PAIRS[0]; 
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Convert the following topic into a soothing bedtime story dialogue between ${pair.speaker1.name} and ${pair.speaker2.name}.
    ${language === 'URDU' ? "Use natural Roman Urdu." : "Use beautiful English."}
    Format strictly as:
    ${pair.speaker1.name}: [Line]
    ${pair.speaker2.name}: [Line]
    Topic: ${text}`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ parts: [{ text: prompt }] }],
        });
        return response.text?.trim() || "";
    } catch (error) {
        console.error("Story script generation error:", error);
        throw error;
    }
};

/**
 * Generates a Solo Bedtime Story script.
 */
export const generateSoloStoryScript = async (text: string, language: 'ENGLISH' | 'URDU'): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Rewrite the following topic into a beautiful, engaging solo bedtime story narration for a child. 
  ${language === 'URDU' ? "Use natural Roman Urdu." : "Use magical English."}
  Make it descriptive, rhythmic, and soothing. 
  Topic: ${text}`;

  try {
      const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ parts: [{ text: prompt }] }],
      });
      return response.text?.trim() || "";
  } catch (error) {
      console.error("Solo story script generation error:", error);
      throw error;
  }
};

/**
 * Generates a short story title in Roman Urdu/Hindi.
 */
export const generateStoryTitle = async (storyText: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: `
        Generate a catchy title (max 4 words) for this story.
        CRITICAL: Use ONLY Roman Urdu (English Alphabets). 
        STRICTLY NO Urdu Script (Arabic characters).
        STRICTLY NO Hindi Script.
        Example: "Sher Ki Bahani", "Jadooee Jungle".
        Story: "${storyText.substring(0, 500)}"
      ` }] }],
    });
    return response.text?.trim().replace(/^"|"$/g, '') || "Meri Kahani";
  } catch (error) {
    return "Meri Kahani";
  }
};

/**
 * Generates YouTube SEO Metadata using Gemini 3 Flash.
 */
export const generateYouTubeMetadata = async (storyText: string): Promise<{title: string, description: string, tags: string}> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
      const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ parts: [{ text: `
            Act as a YouTube SEO Expert. Generate metadata for this story.
            Story: ${storyText.substring(0, 1000)}
            
            Return JSON:
            {
              "title": "A viral, emotional title in mixed English/Roman Urdu",
              "description": "A 3-sentence summary with call to action",
              "tags": "20 comma-separated SEO keywords"
            }
          ` }] }],
          config: { responseMimeType: "application/json" }
      });
      const res = JSON.parse(response.text || "{}");
      return {
          title: res.title || "New Bedtime Story",
          description: res.description || "Amazing bedtime story for kids. Subscribe for more!",
          tags: res.tags || "kids story, bedtime story, urdu story"
      };
  } catch (e) {
      return { title: "Amazing Story", description: "Watch this story!", tags: "story, kids" };
  }
};

/**
 * Generates Pixar-style story image using Gemini 2.5 Flash Image.
 */
export const generateStoryImage = async (storyText: string, aspectRatio: "9:16" | "16:9"): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const prompt = `Pixar-style 3D digital illustration for: "${storyText.substring(0, 400)}". Magical, vibrant, kid-friendly. No text in image. Aspect ratio: ${aspectRatio}.`;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: { parts: [{ text: prompt }] },
            config: { imageConfig: { aspectRatio } }
        });
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) return part.inlineData.data;
        }
        throw new Error("No image data");
    } catch (error) {
        console.error("Image generation error:", error);
        throw error;
    }
};

/**
 * Generates a visual prompt for high-quality video generation.
 */
export const generateVisualPrompt = async (script: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: `Create a detailed visual description (max 50 words) for an AI video generation model based on this story part: "${script}". Focus on cinematic lighting, style, and key subjects. No text in output.` }] }],
    });
    return response.text?.trim() || "A cinematic animated scene.";
  } catch (e) {
    return "A cinematic animated scene.";
  }
};

/**
 * Generates video using Veo 3.1 Fast. Handles API key selection.
 */
export const generateVeoVideo = async (prompt: string): Promise<string> => {
  // Ensure user has selected a paid API key for Veo
  if (!(await (window as any).aistudio.hasSelectedApiKey())) {
    await (window as any).aistudio.openSelectKey();
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });

  // Long-running operation polling
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation failed.");
  
  // Append API key for direct download as per Veo guidelines
  return `${downloadLink}&key=${process.env.API_KEY}`;
};

/**
 * Generates speech using Gemini 2.5 Flash Preview TTS.
 */
export const generateSpeech = async (
    text: string, 
    voiceOrPairId: string, 
    style: SpeakingStyle = SpeakingStyle.STANDARD,
    customVoiceData?: any 
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-2.5-flash-preview-tts";
  
  let config: any = { responseModalities: [Modality.AUDIO] };
  let finalPrompt = text;

  // Handle Multi-Speaker (Story/Podcast)
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
        const pDesc = parentRole === 'Father' ? 'Adult Male, Deep, Very Low Pitch, Mature' : 'Adult Female, Warm, Mature, Calm';
        const cDesc = 'Child, Very High Pitch, Energetic, Small Boy/Girl Voice';

        finalPrompt = `ACTORS:
        1. ${pair.speaker1.name}: ${pDesc}.
        2. ${pair.speaker2.name}: ${cDesc}.
        
        NARRATE DIALOGUE:
        ${text}`;
     } else {
        finalPrompt = `TTS CONVERSATION:\n${text}`;
     }

  } else {
      // Single Speaker
      let voice = AVAILABLE_VOICES.find(v => v.id === voiceOrPairId) || customVoiceData || AVAILABLE_VOICES[0];
      config.speechConfig = {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice.geminiVoiceName } },
      };
      
      if (style === SpeakingStyle.SOLO_STORY) {
          finalPrompt = `ACT AS A STORYTELLER. Speak in a soothing, expressive, and rhythmic way for a child's bedtime story. NARRATE: ${text}`;
      } else {
          finalPrompt = text;
      }
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: finalPrompt }] }],
      config: config,
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];

    if (part?.text && !part?.inlineData) {
        throw new Error(`AI Refusal: ${part.text}`);
    }

    if (!part?.inlineData?.data) {
      throw new Error("No audio data returned from model.");
    }

    return part.inlineData.data; 
  } catch (error: any) {
    console.error("Speech Gen Error:", error);
    throw new Error(error.message || "Speech generation failed.");
  }
};

/**
 * Transcribes video using Gemini 3 Flash.
 */
export const transcribeVideo = async (base64Video: string, mimeType: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Video } },
        { text: "Transcribe the speech in this video." },
      ],
    },
  });
  return response.text;
};

/**
 * Translates script using Gemini 3 Flash.
 */
export const translateScript = async (text: string, lang: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: `Translate this to ${lang}: ${text}` }] }],
  });
  return response.text;
};

/**
 * Improves script style using Gemini 3 Flash.
 */
export const improveScript = async (text: string, style: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: `Improve this script for ${style}: ${text}` }] }],
  });
  return response.text;
};

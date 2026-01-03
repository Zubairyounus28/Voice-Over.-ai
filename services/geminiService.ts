
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { AVAILABLE_VOICES, AVAILABLE_PODCAST_PAIRS, SpeakingStyle, VoiceGender } from "../types";

/**
 * Translates text to Urdu (Standard or Roman) using Gemini 3 Flash.
 */
export const translateToUrdu = async (text: string, roman: boolean = true): Promise<string> => {
  if (!text.trim()) return "";
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const formatInstruction = roman 
    ? "Use ONLY Roman Urdu (Urdu words written in English/Latin alphabet). No Arabic script." 
    : "Use standard Urdu script.";
    
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: `Translate the following to Urdu. ${formatInstruction} Provide only the translated text:\n\n${text}` }] }],
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
    ${language === 'URDU' ? "The dialogue must be in natural Roman Urdu (English alphabet only)." : "The dialogue must be in English."}
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
    ${language === 'URDU' ? "Use natural Roman Urdu (Urdu words written with English letters). No Arabic script." : "Use beautiful English."}
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
  ${language === 'URDU' ? "IMPORTANT: Use natural ROMAN URDU (Urdu words written using the English/Latin alphabet). DO NOT use Arabic or Urdu script." : "Use magical English."}
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
 * Generates a descriptive visual prompt for video generation.
 */
export const generateVisualPrompt = async (script: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: `Based on this story, generate a descriptive visual prompt (max 50 words) for AI video generation. Focus on character style (Pixar-style 3D), cinematic lighting, and atmospheric depth: "${script.substring(0, 1000)}"` }] }],
    });
    return response.text?.trim() || "A magical cinematic story scene in Pixar style.";
  } catch (error) {
    return "A beautiful cinematic scene.";
  }
};

/**
 * Generates a video using Veo models.
 * Note: Users MUST select their own paid API key via aistudio.openSelectKey() before this can succeed.
 */
export const generateVeoVideo = async (prompt: string): Promise<string> => {
  // Always initialize with the current process.env.API_KEY which might be updated via aistudio dialog
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    // Operation loop to poll for completion (usually takes a few minutes)
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed: No video URI returned from the operation.");

    // The downloadLink returns MP4 bytes; must append the API key as a query parameter.
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!response.ok) throw new Error(`Failed to download generated video: ${response.statusText}`);
    
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error: any) {
    console.error("Veo generation error:", error);
    if (error.message?.includes("Requested entity was not found")) {
      throw new Error("Veo generation requires a paid GCP project API key. Please ensure you have selected one in the settings.");
    }
    throw error;
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
  
  let config: any = { 
    responseModalities: [Modality.AUDIO],
  };
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

     // The model needs an explicit command to perform TTS for the conversation
     finalPrompt = `TTS the following conversation between ${pair.speaker1.name} and ${pair.speaker2.name}:\n\n${text}`;

  } else {
      // Single Speaker
      let voice = AVAILABLE_VOICES.find(v => v.id === voiceOrPairId) || customVoiceData || AVAILABLE_VOICES[0];
      config.speechConfig = {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice.geminiVoiceName } },
      };
      
      // Use "Say:" to explicitly trigger TTS audio generation
      if (style === SpeakingStyle.SOLO_STORY) {
          finalPrompt = `Say soothingly as a storyteller: ${text}`;
      } else {
          finalPrompt = `Say: ${text}`;
      }
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: finalPrompt }] }],
      config: {
        ...config,
        systemInstruction: "You are a professional Text-to-Speech engine. Your only goal is to generate high-fidelity audio for the input provided. Do not provide any text explanations, descriptions, or conversation. Return ONLY audio data.",
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate) throw new Error("No candidates returned from AI model.");

    const parts = candidate.content?.parts || [];
    let audioData = null;
    let refusalText = "";

    // Iterate through all parts to find audio data
    for (const part of parts) {
      if (part.inlineData?.data) {
        audioData = part.inlineData.data;
      } else if (part.text) {
        refusalText += part.text;
      }
    }

    if (audioData) return audioData;

    // Detailed error for text-only refusals
    if (refusalText) {
        throw new Error(`AI Refusal: ${refusalText.substring(0, 100)}...`);
    }

    throw new Error("No audio data returned from model. The model might have returned an empty response or hit a safety filter.");
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

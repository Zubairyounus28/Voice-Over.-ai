
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { AVAILABLE_VOICES, AVAILABLE_PODCAST_PAIRS, SpeakingStyle, VoiceGender } from "../types";

/**
 * Translates text to Urdu (Standard or Roman) using Gemini 3 Flash.
 */
export const translateToUrdu = async (text: string, roman: boolean = true): Promise<string> => {
  if (!text.trim()) return "";
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
 * Breaks a script into 5-second segments for video flow.
 */
export const generateShortsSegments = async (script: string, characterDescription: string): Promise<{segments: {text: string, visual_prompt: string}[]}> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: `
        Break the following script into logical segments for a video flow.
        For each segment, write a detailed visual prompt for an AI video generator.
        
        CRITICAL RULES FOR VISUAL PROMPTS:
        1. CHARACTER CONSISTENCY: Use the exact same physical description for every segment: ${characterDescription}. Describe specific clothing (e.g., color of dupatta, style of kurti) to ensure identity doesn't shift.
        2. BACKGROUND: Every scene MUST have a professional, flat, solid CHROMA KEY GREEN SCREEN background. No furniture, no shadows on the green.
        3. ACTING: The character should look at the lens, speaking or gesturing naturally.
        4. QUALITY: Cinematic 8k, photorealistic, studio lighting.
        
        Return JSON format:
        {
          "segments": [
            { "text": "Segment script text", "visual_prompt": "Ultra-detailed visual prompt including character details and green screen instruction" },
            ...
          ]
        }

        Script: "${script}"
      ` }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            segments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  visual_prompt: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || '{"segments":[]}');
  } catch (error) {
    console.error("Shorts segmentation error:", error);
    throw error;
  }
};

/**
 * Optimizes script for TTS performance using Gemini 3 Flash.
 */
export const optimizeScriptForSpeech = async (text: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
      id: `cloned-${Date.now()}`,
      ...result,
      name: `Cloned ${result.styleDescription?.split(' ')[0] || 'Voice'}`,
      description: result.styleDescription || "Custom cloned voice",
      stylePrompt: result.actingPrompt || "Speak naturally.",
      geminiVoiceName: result.baseVoice || "Puck",
      recommendedPitch: result.pitch || 0,
      gender: result.gender as VoiceGender || VoiceGender.MALE,
      age: result.age || "Adult",
      accent: result.accent || "Neutral",
      language: result.language || "English",
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
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
export const generateVeoVideo = async (prompt: string, aspectRatio: '16:9' | '9:16' = '16:9'): Promise<string> => {
  // Always initialize with the current process.env.GEMINI_API_KEY which might be updated via aistudio dialog
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio
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
    const response = await fetch(`${downloadLink}&key=${process.env.GEMINI_API_KEY}`);
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
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
  const maxRetries = 2;
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
            finalPrompt = `TTS the following bedtime story conversation between ${pair.speaker1.name} and ${pair.speaker2.name}:\n${text}`;
         } else {
            finalPrompt = `TTS the following podcast conversation between ${pair.speaker1.name} and ${pair.speaker2.name}:\n${text}`;
         }

      } else {
          // Single Speaker
          let voice = AVAILABLE_VOICES.find(v => v.id === voiceOrPairId) || customVoiceData || AVAILABLE_VOICES[0];
          config.speechConfig = {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: voice.geminiVoiceName } },
          };
          
          if (style === SpeakingStyle.SOLO_STORY) {
              finalPrompt = `Say this as a soothing storyteller: ${text}`;
          } else if (voice.stylePrompt) {
              finalPrompt = `Instruction: ${voice.stylePrompt}\nText to speak: ${text}`;
          } else {
              finalPrompt = `Say: ${text}`;
          }
      }

      const response = await ai.models.generateContent({
        model: model,
        contents: [{ parts: [{ text: finalPrompt }] }],
        config: config,
      });

      const candidate = response.candidates?.[0];
      if (!candidate) throw new Error("No candidates returned from AI model.");

      if (candidate.finishReason && candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS') {
         throw new Error(`AI Generation failed with reason: ${candidate.finishReason}`);
      }

      if (!candidate.content) {
         throw new Error(`AI model returned a candidate with no content. Finish reason: ${candidate.finishReason}`);
      }

      const parts = candidate.content.parts || [];
      if (parts.length === 0) {
        throw new Error(`AI model returned a candidate with no parts. Finish reason: ${candidate.finishReason}`);
      }

      let audioData = null;
      let refusalText = "";

      for (const part of parts) {
        if (part.inlineData?.data) {
          audioData = part.inlineData.data;
        } else if (part.text) {
          refusalText += part.text;
        }
      }

      if (audioData) return audioData;

      if (refusalText) {
          throw new Error(`AI Refusal: ${refusalText}`);
      }

      throw new Error("No audio data returned from model.");
    } catch (error: any) {
      lastError = error;
      console.error(`Speech Gen Attempt ${attempt + 1} failed:`, error);
      
      // Retry on OTHER or transient-looking errors
      if ((error.message.includes("OTHER") || error.message.includes("fetch")) && attempt < maxRetries) {
        const delay = 2000 * (attempt + 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw new Error(error.message || "Speech generation failed.");
    }
  }
  throw lastError;
};

/**
 * Transcribes video using Gemini 3 Flash.
 */
export const transcribeVideo = async (base64Video: string, mimeType: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
 * Transcribes audio using Gemini 3 Flash.
 */
export const transcribeAudio = async (base64Audio: string, mimeType: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Audio } },
        { text: "Accurately transcribe the following audio. If multiple speakers are present, indicate speaker turns." },
      ],
    },
  });
  return response.text;
};

/**
 * Translates script using Gemini 3 Flash.
 */
export const translateScript = async (text: string, lang: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: `Improve this script for ${style}: ${text}` }] }],
  });
  return response.text;
};


import { GoogleGenAI, Modality, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { AVAILABLE_VOICES, AVAILABLE_PODCAST_PAIRS, SpeakingStyle, VoiceGender } from "../types";

const isServer = typeof window === 'undefined';

const clientPost = async (path: string, body: any) => {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) {
    if (contentType.includes('application/json')) {
      const error = await response.json().catch(() => ({ error: 'Unknown server error' }));
      throw new Error(error.error || error.message || 'Server error');
    } else {
      const text = await response.text();
      throw new Error(`Server returned non-JSON error (${response.status}): ${text.substring(0, 100)}...`);
    }
  }
  
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Expected JSON but got ${contentType}: ${text.substring(0, 100)}...`);
  }
  
  return response.json();
};

/**
 * A robust helper to call Gemini with retries and model fallback.
 * Prevents "High Demand" 503 errors from breaking the app.
 */
const callGemini = async (
  prompt: string | any, 
  primaryModel: string = "gemini-3-flash-preview", 
  config: any = {}, 
  multimodalData?: { mimeType: string, data: string }
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const maxRetries = 5; // Reduced from 10 to avoid backend timeouts (Vite/Ingress)
  
  // Safety settings to prevent Urdu script or educational content from being blocked
  const defaultSafetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  ];

  // Define fallback path.
  const fallbackModels = [primaryModel];
  if (primaryModel === "gemini-3-flash-preview") {
    fallbackModels.push("gemini-2.0-flash", "gemini-1.5-flash");
  }

  for (const modelName of fallbackModels) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        let contentsData: any;
        if (multimodalData) {
           contentsData = [
             { 
               parts: [
                 { inlineData: { mimeType: multimodalData.mimeType, data: multimodalData.data } }, 
                 { text: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) }
               ] 
             }
           ];
        } else {
           contentsData = [{ parts: [{ text: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) }] }];
        }

        const response = await ai.models.generateContent({
          model: modelName,
          contents: contentsData,
          config: {
            ...config,
            safetySettings: defaultSafetySettings,
          },
        });

        const candidate = response.candidates?.[0];
        const text = candidate?.content?.parts?.find(p => p.text)?.text || "";
        const inlineData = candidate?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

        // If it's a TTS request or multimodal, check for finishReason
        if (candidate) {
           const reason = candidate.finishReason;
           const hasAudio = !!inlineData;
           const hasText = !!text;
           
           if (reason && reason !== 'STOP' && reason !== 'MAX_TOKENS') {
              // Only fail if we didn't get what we wanted
              if ((config.responseModalities?.includes(Modality.AUDIO) && !hasAudio) || (!config.responseModalities && !hasText)) {
                 // Convert to a pseudo-transient 429-like error to trigger retry
                 throw new Error(`FINISH_REASON_${reason}`);
              }
           }
        }

        return { response, text, inlineData };
      } catch (error: any) {
        const errorMsgOriginal = error.message || error.toString();
        const errorMsg = errorMsgOriginal.toLowerCase();
        
        // Hard Quota exhaustion detection (Limit: 0)
        const isHardQuotaExhausted = errorMsg.includes("limit: 0") || 
                                    errorMsg.includes("quota exceeded") && errorMsg.includes("0") ||
                                    errorMsg.includes("exhausted") && errorMsg.includes("0");
        
        // Handle Rate Limiting (429) & finishReason: OTHER
        const isRateLimited = errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("limit") || errorMsg.includes("rate");
        const isOtherFinish = errorMsg.includes("other") || errorMsg.includes("unknown") || errorMsg.includes("finish_reason") || errorMsg.includes("finish_reason_other");
        const isTransient = isRateLimited || 
                           isOtherFinish ||
                           errorMsg.includes("503") || 
                           errorMsg.includes("500") ||
                           errorMsg.includes("high demand") || 
                           errorMsg.includes("overload") ||
                           errorMsg.includes("unavailable") ||
                           errorMsg.includes("deadline") ||
                           errorMsg.includes("socket") ||
                           errorMsg.includes("connection") ||
                           errorMsg.includes("timeout") ||
                           errorMsg.includes("reset") ||
                           errorMsg.includes("internal error");

        if (isHardQuotaExhausted) {
           console.error(`Gemini Quota Hard Exhausted for ${modelName}.`);
           break; 
        }

        if (isTransient && attempt < maxRetries) {
          let delay = Math.pow(1.5, attempt) * 2000; // Faster backoff for lower retry count
          
          // Try to extract delay from structured JSON message if available (use Original case)
          try {
            const jsonMatch = errorMsgOriginal.match(/\{.*\}/);
            if (jsonMatch) {
              const details = JSON.parse(jsonMatch[0]);
              // Look for RetryInfo
              const retrySecs = details.error?.details?.find((d: any) => d['@type']?.includes('RetryInfo'))?.retryDelay;
              if (retrySecs) {
                const s = typeof retrySecs === 'string' ? parseInt(retrySecs) : (retrySecs.seconds || 0);
                if (s > 0) delay = (s + 2) * 1000;
              }
            }
          } catch (e) {}

          if (isRateLimited && delay < 5000) delay = 5000 + (attempt * 2000);

          console.warn(`Gemini API Transient Error (${modelName}): ${errorMsg.substring(0, 100)}... Retrying in ${Math.round(delay/1000)}s (Attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        
        console.error(`Gemini Error (${modelName}) final failure after ${attempt} retries: ${errorMsg}`);
        break; 
      }
    }
  }
  
  const finalError = "Gemini AI is currently under heavy load or quota is exhausted. Please try again in 1 minute.";
  throw new Error(finalError);
};

const cleanTextForTTS = (text: string) => {
  return text
    .replace(/\*\*/g, '') // remove markdown bold
    .replace(/\*/g, '')   // remove markdown italics
    .replace(/#/g, '')    // remove markdown headings
    .replace(/`/g, '')    // remove markdown code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // remove markdown links
    .replace(/\n\s*[-*]\s+/g, '\n') // bullets
    .replace(/\n\s*\d+\.\s+/g, '\n') // numbers
    .replace(/\n+/g, ' ') // replace multiple newlines with a space
    .trim();
};

/**
 * Translates text to Urdu (Standard or Roman) using Gemini 3 Flash.
 */
export const translateToUrdu = async (text: string, roman: boolean = true): Promise<string> => {
  if (!text.trim()) return "";
  if (!isServer) {
    const data = await clientPost('/api/genai/translate', { text, roman });
    return data.result;
  }
  
  const formatInstruction = roman 
    ? "Use ONLY Roman Urdu (Urdu words written in English/Latin alphabet). No Arabic script." 
    : "Use standard Urdu script.";
    
  try {
    const { text: resultText } = await callGemini(`Translate the following to Urdu. ${formatInstruction} Provide only the translated text:\n\n${text}`);
    return resultText.trim() || "";
  } catch (error: any) {
    console.error("Translation error:", error);
    throw error;
  }
};

/**
 * Breaks a script into 5-second segments for video flow.
 */
export const generateShortsSegments = async (script: string, characterDescription: string): Promise<{segments: {text: string, visual_prompt: string}[]}> => {
  if (!isServer) {
    return clientPost('/api/genai/shorts-segments', { script, characterDescription });
  }
  
  const prompt = `
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
  `;

  try {
    const { text: resultText } = await callGemini(prompt, "gemini-3-flash-preview", {
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
    });
    return JSON.parse(resultText || '{"segments":[]}');
  } catch (error) {
    console.error("Shorts segmentation error:", error);
    throw error;
  }
};

/**
 * Optimizes script for TTS performance using Gemini 3 Flash.
 */
export const optimizeScriptForSpeech = async (text: string): Promise<string> => {
  if (!isServer) {
    const data = await clientPost('/api/genai/optimize-script', { text });
    return data.result;
  }
  
  const prompt = `
    Act as a professional Voice Director. Rewrite the following script to be optimized for Text-to-Speech generation.
    Objectives: Fix grammatical errors, insert punctuation for breathing, break run-on sentences.
    Original Script: "${text}"
  `;

  try {
    const { text: resultText } = await callGemini(prompt);
    return resultText.trim() || text;
  } catch (error) {
    console.warn("Script optimization failed.", error);
    return text;
  }
};

/**
 * Analyzes an audio sample for AI voice cloning parameters.
 */
export const analyzeVoiceSample = async (base64Audio: string, mimeType: string): Promise<any> => {
  if (!isServer) {
    return clientPost('/api/genai/analyze-voice', { base64Audio, mimeType });
  }

  const prompt = `Analyze this voice sample for a high-fidelity AI voice cloning application. Return JSON with gender, age, accent, language, intonation, rhythm, styleDescription, actingPrompt, baseVoice (Fenrir/Puck/Kore/Zephyr), and pitch (-200 to 200).`;

  try {
    const { text: resultText } = await callGemini(prompt, "gemini-3-flash-preview", {
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
    }, { mimeType, data: base64Audio });

    const result = JSON.parse(resultText || "{}");
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
    if (!isServer) {
      const data = await clientPost('/api/genai/podcast-script', { text, pairId, language });
      return data.result;
    }
    const pair = AVAILABLE_PODCAST_PAIRS.find(p => p.id === pairId) || AVAILABLE_PODCAST_PAIRS[0];
    const prompt = `Convert the following text into a natural, engaging podcast dialogue script between ${pair.speaker1.name} and ${pair.speaker2.name}. 
    ${language === 'URDU' ? "The dialogue must be in natural Roman Urdu (English alphabet only)." : "The dialogue must be in English."}
    Format: ${pair.speaker1.name}: [Line] ...
    Original Text: ${text}`;

    try {
        const { text: resultText } = await callGemini(prompt);
        return resultText.trim() || "";
    } catch (error) {
        console.error("Script generation error:", error);
        throw error;
    }
};

/**
 * Generates a Bedtime Story dialogue script.
 */
export const generateStoryScript = async (text: string, pairId: string, language: 'ENGLISH' | 'URDU'): Promise<string> => {
    if (!isServer) {
      const data = await clientPost('/api/genai/story-script', { text, pairId, language });
      return data.result;
    }
    const pair = AVAILABLE_PODCAST_PAIRS.find(p => p.id === pairId) || AVAILABLE_PODCAST_PAIRS[0]; 
    const prompt = `Convert the following topic into a soothing bedtime story dialogue between ${pair.speaker1.name} and ${pair.speaker2.name}.
    ${language === 'URDU' ? "Use natural Roman Urdu (Urdu words written with English letters). No Arabic script." : "Use beautiful English."}
    Format strictly as:
    ${pair.speaker1.name}: [Line]
    ${pair.speaker2.name}: [Line]
    Topic: ${text}`;

    try {
        const { text: resultText } = await callGemini(prompt);
        return resultText.trim() || "";
    } catch (error) {
        console.error("Story script generation error:", error);
        throw error;
    }
};

/**
 * Generates a Solo Bedtime Story script.
 */
export const generateSoloStoryScript = async (text: string, language: 'ENGLISH' | 'URDU'): Promise<string> => {
  if (!isServer) {
    const data = await clientPost('/api/genai/solo-story-script', { text, language });
    return data.result;
  }
  const prompt = `Rewrite the following topic into a beautiful, engaging solo bedtime story narration for a child. 
  ${language === 'URDU' ? "IMPORTANT: Use natural ROMAN URDU (Urdu words written using the English/Latin alphabet). DO NOT use Arabic or Urdu script." : "Use magical English."}
  Make it descriptive, rhythmic, and soothing. 
  Topic: ${text}`;

  try {
      const { text: resultText } = await callGemini(prompt);
      return resultText.trim() || "";
  } catch (error) {
      console.error("Solo story script generation error:", error);
      throw error;
  }
};

/**
 * Generates a short story title in Roman Urdu/Hindi.
 */
export const generateStoryTitle = async (storyText: string): Promise<string> => {
  if (!isServer) {
    const data = await clientPost('/api/genai/story-title', { storyText });
    return data.result;
  }
  
  const prompt = `
    Generate a catchy title (max 4 words) for this story.
    CRITICAL: Use ONLY Roman Urdu (English Alphabets). 
    STRICTLY NO Urdu Script (Arabic characters).
    STRICTLY NO Hindi Script.
    Example: "Sher Ki Bahani", "Jadooee Jungle".
    Story: "${storyText.substring(0, 500)}"
  `;

  try {
    const { text: resultText } = await callGemini(prompt);
    return resultText.trim().replace(/^"|"$/g, '') || "Meri Kahani";
  } catch (error) {
    return "Meri Kahani";
  }
};

/**
 * Generates YouTube SEO Metadata using Gemini 3 Flash.
 */
export const generateYouTubeMetadata = async (storyText: string): Promise<{title: string, description: string, tags: string}> => {
  if (!isServer) {
    return clientPost('/api/genai/youtube-meta', { storyText });
  }
  
  const prompt = `
    Act as a YouTube SEO Expert. Generate metadata for this story.
    Story: ${storyText.substring(0, 1000)}
    
    Return JSON:
    {
      "title": "A viral, emotional title in mixed English/Roman Urdu",
      "description": "A 3-sentence summary with call to action",
      "tags": "20 comma-separated SEO keywords"
    }
  `;

  try {
      const { text: resultText } = await callGemini(prompt, "gemini-3-flash-preview", { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              tags: { type: Type.STRING }
            },
            required: ["title", "description", "tags"]
          }
      });
      const res = JSON.parse(resultText || "{}");
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
  if (!isServer) {
    const data = await clientPost('/api/genai/visual-prompt', { script });
    return data.result;
  }
  
  const prompt = `Based on this story, generate a descriptive visual prompt (max 50 words) for AI video generation. Focus on character style (Pixar-style 3D), cinematic lighting, and atmospheric depth: "${script.substring(0, 1000)}"`;

  try {
    const { text: resultText } = await callGemini(prompt);
    return resultText.trim() || "A magical cinematic story scene in Pixar style.";
  } catch (error) {
    return "A beautiful cinematic scene.";
  }
};

/**
 * Generates a video using Veo models.
 * Note: Veo is a long-running process, we use operations API.
 * We add retries specifically for the operation check if needed.
 */
export const generateVeoVideo = async (prompt: string, aspectRatio: '16:9' | '9:16' = '16:9'): Promise<string> => {
  if (!isServer) {
    const data = await clientPost('/api/genai/veo-video', { prompt, aspectRatio });
    return data.result;
  }
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

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed.");
    const response = await fetch(`${downloadLink}&key=${process.env.GEMINI_API_KEY}`);
    const blob = await response.blob();
    // Server-side would normally save to disk or storage and return URL
    return ""; 
  } catch (error: any) {
    throw error;
  }
};

/**
 * Generates Pixar-style story image using Gemini 2.5 Flash Image.
 */
export const generateStoryImage = async (storyText: string, aspectRatio: "9:16" | "16:9"): Promise<string> => {
    if (!isServer) {
      const data = await clientPost('/api/genai/story-image', { storyText, aspectRatio });
      return data.result;
    }
    
    const prompt = `Pixar-style 3D digital illustration for: "${storyText.substring(0, 400)}". Magical, vibrant, kid-friendly. No text in image. Aspect ratio: ${aspectRatio}.`;

    try {
        const { inlineData } = await callGemini(prompt, "gemini-2.5-flash-image", { imageConfig: { aspectRatio } });
        if (inlineData) return inlineData;
        throw new Error("No image data returned from Gemini 2.5 Image");
    } catch (error) {
        console.error("Image generation error, using fallback placeholder:", error);
        const cleanTopic = encodeURIComponent(storyText.substring(0, 30).trim() || "Bedtime Story");
        // Fallback to placehold.co with a nice creative style
        return `EXTERNAL_URL:https://placehold.co/1280x720/1e1b4b/e2e8f0?text=${cleanTopic}+Story&font=playfair`;
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
  if (!isServer) {
    const data = await clientPost('/api/genai/speech', { text, voiceOrPairId, style, customVoiceData });
    return data.result;
  }

  const model = "gemini-2.5-flash-preview-tts";
  const cleanText = cleanTextForTTS(text);
  
  // Trim text for robust TTS performance (max ~4000 chars)
  const safeText = cleanText.length > 4000 ? cleanText.substring(0, 4000) : cleanText;
  let finalPrompt = safeText;

  let config: any = { responseModalities: [Modality.AUDIO] };

  if (style === SpeakingStyle.PODCAST || style === SpeakingStyle.STORY) {
      const pair = AVAILABLE_PODCAST_PAIRS.find(p => p.id === voiceOrPairId) || AVAILABLE_PODCAST_PAIRS[0];
      config.speechConfig = {
        multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
                { speaker: pair.speaker1.name, voiceConfig: { prebuiltVoiceConfig: { voiceName: pair.speaker1.voiceName } } },
                { speaker: pair.speaker2.name, voiceConfig: { prebuiltVoiceConfig: { voiceName: pair.speaker2.voiceName } } }
            ]
        }
      };
      // Keep it simple for Gemini TTS
      finalPrompt = `Podcast dialogue between ${pair.speaker1.name} and ${pair.speaker2.name}:\n${safeText}`;
  } else {
      let voice = AVAILABLE_VOICES.find(v => v.id === voiceOrPairId) || customVoiceData || AVAILABLE_VOICES[0];
      config.speechConfig = {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice.geminiVoiceName } },
      };
      if (style === SpeakingStyle.SOLO_STORY) {
          finalPrompt = `Narration: ${safeText}`;
      } else {
          finalPrompt = safeText;
      }
  }

  const maxTopRetries = 1;
  let lastError: any = null;

  for (let topAttempt = 0; topAttempt <= maxTopRetries; topAttempt++) {
    try {
      const { inlineData, response } = await callGemini(finalPrompt, model, config);
      const candidate = response.candidates?.[0];
      
      if (inlineData) return inlineData;

      throw new Error(`No audio data in candidate. Reason: ${candidate?.finishReason}`);
    } catch (error: any) {
      lastError = error;
      console.warn(`Speech generation attempt ${topAttempt + 1} failed: ${error.message}`);
      
      if (topAttempt < maxTopRetries) {
        // Fallback to absolute simplest prompt and standard voice
        finalPrompt = safeText; 
        config = { 
           responseModalities: [Modality.AUDIO],
           speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } // Use a very reliable standard voice
           }
        };
        await new Promise(r => setTimeout(r, 3000)); // Wait longer
        continue;
      }
    }
  }

  throw lastError || new Error("Failed to generate speech after retries.");
};

/**
 * Generates an educational lesson in Urdu from an English topic.
 */
export const generateTeacherLesson = async (topic: string): Promise<string> => {
  if (!isServer) {
    const data = await clientPost('/api/teacher/generate-lesson', { topic });
    return data.lesson;
  }
  
  const prompt = `
    Act as a professional and easy-to-understand Urdu teacher.
    Convert the following English text or topic into an Urdu educational lesson.
    GUIDELINES:
    1. Language: Standard Urdu script.
    2. Style: Professional, friendly.
    3. Structure: Urdu Title, Intro (Salaam), Explanation with Examples, Summary, Shukriya.
    Topic: "${topic}"
  `;

  try {
    const { text: resultText } = await callGemini(prompt);
    return resultText.trim() || "";
  } catch (error) {
    throw error;
  }
};

export const transcribeVideo = async (base64Video: string, mimeType: string) => {
  if (!isServer) {
    const data = await clientPost('/api/genai/transcribe-video', { base64Video, mimeType });
    return data.result;
  }
  
  try {
    const { text: resultText } = await callGemini("Transcribe.", "gemini-3-flash-preview", {}, { mimeType, data: base64Video });
    return resultText;
  } catch (error) {
    throw error;
  }
};

export const transcribeAudio = async (base64Audio: string, mimeType: string) => {
  if (!isServer) {
    const data = await clientPost('/api/genai/transcribe-audio', { base64Audio, mimeType });
    return data.result;
  }
  
  try {
    const { text: resultText } = await callGemini("Transcribe.", "gemini-3-flash-preview", {}, { mimeType, data: base64Audio });
    return resultText;
  } catch (error) {
    throw error;
  }
};

export const translateScript = async (text: string, lang: string) => {
  if (!isServer) {
    const data = await clientPost('/api/genai/translate-script', { text, lang });
    return data.result;
  }
  
  try {
    const { text: resultText } = await callGemini(`Translate to ${lang}: ${text}`);
    return resultText;
  } catch (error) {
    throw error;
  }
};

export const improveScript = async (text: string, style: string) => {
  if (!isServer) {
    const data = await clientPost('/api/genai/improve-script', { text, style });
    return data.result;
  }
  
  try {
    const { text: resultText } = await callGemini(`Improve for ${style}: ${text}`);
    return resultText;
  } catch (error) {
    throw error;
  }
};


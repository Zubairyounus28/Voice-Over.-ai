
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import { generateTeacherLesson, generateSpeech } from "./services/geminiService";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Audio Proxy Route to bypass CORS
  app.get("/api/proxy-audio", async (req, res) => {
    const audioUrl = req.query.url as string;
    if (!audioUrl) {
      return res.status(400).send("URL is required");
    }

    try {
      const response = await axios({
        method: 'get',
        url: audioUrl,
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      // Forward headers
      res.setHeader('Content-Type', response.headers['content-type'] || 'audio/mpeg');
      if (response.headers['content-length']) {
        res.setHeader('Content-Length', response.headers['content-length']);
      }

      response.data.pipe(res);
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).send("Failed to fetch audio");
    }
  });

  // --- Teacher Routes ---
  
  app.post("/api/teacher/generate-lesson", async (req, res) => {
    try {
      const { topic } = req.body;
      const lesson = await generateTeacherLesson(topic);
      res.json({ lesson });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/teacher/generate-audio", async (req, res) => {
    try {
      const { text, voiceId } = req.body;
      const audio = await generateSpeech(text, voiceId);
      res.json({ audio });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- General GenAI Routes ---

  app.post("/api/genai/translate", async (req, res) => {
    try {
      const { text, roman } = req.body;
      const { translateToUrdu } = await import("./services/geminiService");
      const result = await translateToUrdu(text, roman);
      res.json({ result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/genai/optimize-script", async (req, res) => {
    try {
      const { text } = req.body;
      const { optimizeScriptForSpeech } = await import("./services/geminiService");
      const result = await optimizeScriptForSpeech(text);
      res.json({ result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/genai/podcast-script", async (req, res) => {
    try {
      const { text, pairId, language } = req.body;
      const { generatePodcastScript } = await import("./services/geminiService");
      const result = await generatePodcastScript(text, pairId, language);
      res.json({ result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/genai/story-script", async (req, res) => {
    try {
      const { text, pairId, language } = req.body;
      const { generateStoryScript } = await import("./services/geminiService");
      const result = await generateStoryScript(text, pairId, language);
      res.json({ result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/genai/solo-story-script", async (req, res) => {
    try {
      const { text, language } = req.body;
      const { generateSoloStoryScript } = await import("./services/geminiService");
      const result = await generateSoloStoryScript(text, language);
      res.json({ result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/genai/story-image", async (req, res) => {
    try {
      const { storyText, aspectRatio } = req.body;
      const { generateStoryImage } = await import("./services/geminiService");
      const result = await generateStoryImage(storyText, aspectRatio);
      res.json({ result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/genai/story-title", async (req, res) => {
    try {
      const { storyText } = req.body;
      const { generateStoryTitle } = await import("./services/geminiService");
      const result = await generateStoryTitle(storyText);
      res.json({ result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/genai/youtube-meta", async (req, res) => {
    try {
      const { storyText } = req.body;
      const { generateYouTubeMetadata } = await import("./services/geminiService");
      const result = await generateYouTubeMetadata(storyText);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/genai/analyze-voice", async (req, res) => {
    try {
      const { base64Audio, mimeType } = req.body;
      const { analyzeVoiceSample } = await import("./services/geminiService");
      const result = await analyzeVoiceSample(base64Audio, mimeType);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/genai/speech", async (req, res) => {
    try {
      const { text, voiceOrPairId, style, customVoiceData } = req.body;
      const { generateSpeech } = await import("./services/geminiService");
      const result = await generateSpeech(text, voiceOrPairId, style, customVoiceData);
      res.json({ result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/genai/shorts-segments", async (req, res) => {
    try {
      const { script, characterDescription } = req.body;
      const { generateShortsSegments } = await import("./services/geminiService");
      const result = await generateShortsSegments(script, characterDescription);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/genai/visual-prompt", async (req, res) => {
    try {
      const { script } = req.body;
      const { generateVisualPrompt } = await import("./services/geminiService");
      const result = await generateVisualPrompt(script);
      res.json({ result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/genai/veo-video", async (req, res) => {
    try {
      const { prompt, aspectRatio } = req.body;
      const { generateVeoVideo } = await import("./services/geminiService");
      const result = await generateVeoVideo(prompt, aspectRatio);
      res.json({ result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/genai/transcribe-video", async (req, res) => {
    try {
      const { base64Video, mimeType } = req.body;
      const { transcribeVideo } = await import("./services/geminiService");
      const result = await transcribeVideo(base64Video, mimeType);
      res.json({ result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/genai/transcribe-audio", async (req, res) => {
    try {
      const { base64Audio, mimeType } = req.body;
      const { transcribeAudio } = await import("./services/geminiService");
      const result = await transcribeAudio(base64Audio, mimeType);
      res.json({ result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/genai/translate-script", async (req, res) => {
    try {
      const { text, lang } = req.body;
      const { translateScript } = await import("./services/geminiService");
      const result = await translateScript(text, lang);
      res.json({ result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/genai/improve-script", async (req, res) => {
    try {
      const { text, style } = req.body;
      const { improveScript } = await import("./services/geminiService");
      const result = await improveScript(text, style);
      res.json({ result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

import React, { useState } from 'react';
import { AppMode } from './types';
import { VoiceOverPanel } from './components/VoiceOverPanel';
import { VideoToTextPanel } from './components/VideoToTextPanel';
import { Mic, FileVideo, Sparkles } from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.VOICE_OVER);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="text-white" size={20} />
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              VoxStudio<span className="text-indigo-500">.ai</span>
            </h1>
          </div>
          
          <nav className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setMode(AppMode.VOICE_OVER)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === AppMode.VOICE_OVER
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Mic size={16} />
              Voice Generator
            </button>
            <button
              onClick={() => setMode(AppMode.VIDEO_TO_TEXT)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === AppMode.VIDEO_TO_TEXT
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <FileVideo size={16} />
              Video to Text
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="animate-fade-in-up">
          {mode === AppMode.VOICE_OVER ? (
            <div className="space-y-4">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">AI Voice Generator</h2>
                <p className="text-slate-400 max-w-2xl">
                  Transform text into lifelike speech. Select a persona, adjust the pitch to simulate kids or adults, and download high-quality WAV files.
                </p>
              </div>
              <VoiceOverPanel />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Video Transcriber</h2>
                <p className="text-slate-400 max-w-2xl">
                  Extract accurate speech-to-text from your videos instantly using multimodal AI analysis.
                </p>
              </div>
              <VideoToTextPanel />
            </div>
          )}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-slate-900 mt-20 py-10 text-center text-slate-600 text-sm flex flex-col gap-3">
        <p>© 2024 VoxStudio AI. Powered by Google Gemini.</p>
        <p className="text-slate-500">
          idea is by <span className="text-slate-400 font-medium">Zubair Younus</span> | +923212696712 | Website and Application Developer and Designer
        </p>
      </footer>
    </div>
  );
};

export default App;
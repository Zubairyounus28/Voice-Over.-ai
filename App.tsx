
import React, { useState } from 'react';
import { AppMode } from './types';
import { VoiceOverPanel } from './components/VoiceOverPanel';
import { VideoToTextPanel } from './components/VideoToTextPanel';
import { VideoEnhancerPanel } from './components/VideoEnhancerPanel';
import { ScriptToVideoPanel } from './components/ScriptToVideoPanel';
import { AIStoryPanel } from './components/AIStoryPanel';
import { Mic, FileVideo, Sparkles, Wand2, Heart, X, Copy, Zap, Clapperboard } from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.VOICE_OVER);
  const [isDonateOpen, setIsDonateOpen] = useState<boolean>(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30">
      
      {/* Blinking Animation Styles */}
      <style>{`
        @keyframes blink-red-yellow {
          0% { background-color: #ef4444; border-color: #ef4444; }
          50% { background-color: #eab308; border-color: #eab308; color: black; }
          100% { background-color: #ef4444; border-color: #ef4444; }
        }
        .animate-blink-custom {
          animation: blink-red-yellow 1s infinite;
        }
      `}</style>

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
          
          <div className="flex items-center gap-4">
             <nav className="hidden md:flex bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto">
                <button
                onClick={() => setMode(AppMode.VOICE_OVER)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    mode === AppMode.VOICE_OVER
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
                >
                <Mic size={16} />
                Voice Generator
                </button>
                <button
                onClick={() => setMode(AppMode.VIDEO_ENHANCER)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    mode === AppMode.VIDEO_ENHANCER
                    ? 'bg-slate-800 text-white shadow-sm ring-1 ring-indigo-500/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
                >
                <Wand2 size={16} className="text-indigo-400" />
                AI Video Dubbing
                </button>
                <button
                onClick={() => setMode(AppMode.SCRIPT_TO_VIDEO)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    mode === AppMode.SCRIPT_TO_VIDEO
                    ? 'bg-slate-800 text-white shadow-sm ring-1 ring-indigo-500/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
                >
                <Zap size={16} className="text-yellow-400" />
                Smart Lip-Sync
                </button>
                <button
                onClick={() => setMode(AppMode.AI_STORY_CREATOR)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    mode === AppMode.AI_STORY_CREATOR
                    ? 'bg-slate-800 text-white shadow-sm ring-1 ring-indigo-500/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
                >
                <Clapperboard size={16} className="text-green-400" />
                AI Video Creator
                </button>
                <button
                onClick={() => setMode(AppMode.VIDEO_TO_TEXT)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    mode === AppMode.VIDEO_TO_TEXT
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
                >
                <FileVideo size={16} />
                Video to Text
                </button>
             </nav>

             <button
               onClick={() => setIsDonateOpen(true)}
               className="animate-blink-custom px-4 py-2 rounded-lg text-white text-sm font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition-transform"
             >
                <Heart size={16} fill="currentColor" />
                Donate Now
             </button>
          </div>
        </div>
      </header>
      
      {/* Mobile Nav (if screen is small) */}
       <div className="md:hidden px-6 py-2 bg-slate-900 border-b border-slate-800 overflow-x-auto flex gap-2">
            <button
                onClick={() => setMode(AppMode.VOICE_OVER)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium ${mode === AppMode.VOICE_OVER ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
            >Voice Generator</button>
            <button
                onClick={() => setMode(AppMode.VIDEO_ENHANCER)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium ${mode === AppMode.VIDEO_ENHANCER ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
            >AI Dubbing</button>
             <button
                onClick={() => setMode(AppMode.SCRIPT_TO_VIDEO)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium ${mode === AppMode.SCRIPT_TO_VIDEO ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
            >Smart Lip-Sync</button>
            <button
                onClick={() => setMode(AppMode.AI_STORY_CREATOR)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium ${mode === AppMode.AI_STORY_CREATOR ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
            >AI Video Creator</button>
             <button
                onClick={() => setMode(AppMode.VIDEO_TO_TEXT)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium ${mode === AppMode.VIDEO_TO_TEXT ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
            >Video to Text</button>
       </div>

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
          ) : mode === AppMode.VIDEO_ENHANCER ? (
            <div className="space-y-4">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">AI Video Dubbing & Enhancer</h2>
                <p className="text-slate-400 max-w-2xl">
                   Upload a video to automatically enhance the speaker's accent and grammar while preserving their unique voice style. <span className="text-indigo-400 text-xs uppercase tracking-wide border border-indigo-500/30 px-2 py-0.5 rounded ml-2">Beta</span>
                </p>
              </div>
              <VideoEnhancerPanel />
            </div>
          ) : mode === AppMode.SCRIPT_TO_VIDEO ? (
            <div className="space-y-4">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Smart Lip-Sync (Script-to-Video)</h2>
                <p className="text-slate-400 max-w-2xl">
                   Upload a video, type any new script, and the AI will clone the voice and automatically adjust the video playback speed to match your new text perfectly.
                </p>
              </div>
              <ScriptToVideoPanel />
            </div>
          ) : mode === AppMode.AI_STORY_CREATOR ? (
            <div className="space-y-4">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">AI Video Creator</h2>
                <p className="text-slate-400 max-w-2xl">
                   Create complete videos from scratch. Enter a script, select your native language and voice (Kids, Men, Women), and the AI will generate both the visuals (Veo) and the voiceover.
                </p>
              </div>
              <AIStoryPanel />
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

      {/* Donate Popup */}
      {isDonateOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-yellow-500 to-red-500 animate-pulse"></div>
              
              <button 
                onClick={() => setIsDonateOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
              >
                 <X size={20} />
              </button>

              <div className="p-8 text-center space-y-6">
                 <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-red-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-orange-500/30">
                    <Heart size={32} className="text-white animate-pulse" fill="currentColor" />
                 </div>
                 
                 <div>
                    <h3 className="text-2xl font-bold text-white mb-2">Support the Developer</h3>
                    <p className="text-slate-300 leading-relaxed">
                       Donate your happy amount for developer he want to more efforts for your business.
                    </p>
                 </div>

                 <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 text-left space-y-4">
                    <div>
                       <div className="text-xs font-bold text-slate-500 uppercase mb-1">Jazzcash</div>
                       <div className="flex items-center justify-between group">
                          <div className="text-white font-mono text-sm">+923343018989</div>
                          <button onClick={() => copyToClipboard('03343018989')} className="text-slate-500 hover:text-indigo-400"><Copy size={14}/></button>
                       </div>
                       <div className="text-xs text-slate-400 mt-1">Title: Zubair Younus</div>
                    </div>
                    
                    <div className="h-px bg-slate-800"></div>

                    <div>
                       <div className="text-xs font-bold text-slate-500 uppercase mb-1">Meezan Bank</div>
                       <div className="text-xs text-slate-400 mb-1">BARADARINORTHKARACHI</div>
                       <div className="flex items-center justify-between group mb-1">
                          <div className="text-white font-mono text-sm break-all">99390103254707</div>
                          <button onClick={() => copyToClipboard('99390103254707')} className="text-slate-500 hover:text-indigo-400"><Copy size={14}/></button>
                       </div>
                       <div className="flex items-center justify-between group">
                          <div className="text-slate-400 font-mono text-xs break-all">PK81MEZN0099390103254707</div>
                          <button onClick={() => copyToClipboard('PK81MEZN0099390103254707')} className="text-slate-500 hover:text-indigo-400"><Copy size={14}/></button>
                       </div>
                    </div>
                 </div>
                 
                 <button 
                    onClick={() => setIsDonateOpen(false)}
                    className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
                 >
                    Close
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;


import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Pause, Wand2, Download, Video, Mic2, RefreshCw, Languages, User, Globe } from 'lucide-react';
import { fileToBase64, decodeBase64, decodeAudioData } from '../utils/audioUtils';
import { transcribeVideo, analyzeVoiceSample, improveScript, generateSpeech } from '../services/geminiService';
import { VoiceOption, SpeakingStyle } from '../types';

export const VideoEnhancerPanel: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  // Processing States
  const [step, setStep] = useState<number>(0); // 0: Upload, 1: Analyze, 2: Configure, 3: Processing, 4: Done
  const [statusMsg, setStatusMsg] = useState<string>('');
  
  // Data
  const [transcription, setTranscription] = useState<string>('');
  const [enhancedScript, setEnhancedScript] = useState<string>('');
  const [voiceProfile, setVoiceProfile] = useState<VoiceOption | null>(null);
  const [targetAccent, setTargetAccent] = useState<string>('Standard Professional');
  
  // Audio Playback
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
    return () => { audioContextRef.current?.close(); };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setVideoUrl(URL.createObjectURL(f));
      setStep(1);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setStep(2); // Move to loading UI
    setStatusMsg('Analyzing video audio, language, age, accent, and voice characteristics...');
    
    try {
      const base64 = await fileToBase64(file);
      
      // 1. Transcribe
      const text = await transcribeVideo(base64, file.type);
      setTranscription(text || "");
      
      // 2. Analyze Voice Style
      const analysis = await analyzeVoiceSample(base64, file.type);
      const clonedVoice: VoiceOption = {
        id: 'cloned_temp',
        name: 'Original Voice Clone',
        description: analysis.description,
        gender: analysis.gender,
        geminiVoiceName: analysis.baseVoice,
        recommendedPitch: analysis.pitch,
        isCloned: true,
        stylePrompt: analysis.stylePrompt,
        age: analysis.age,
        accent: analysis.accent,
        language: analysis.language
      };
      setVoiceProfile(clonedVoice);
      setEnhancedScript(text || ""); // Default to original
      
      setStep(3); // Ready for config
      setStatusMsg('');
    } catch (e) {
      alert("Analysis failed. Try a shorter video.");
      setStep(1);
    }
  };

  const handleEnhanceAndGenerate = async () => {
    if (!transcription || !voiceProfile) return;
    setStep(4);
    setStatusMsg('Enhancing script grammar and style...');

    try {
      // Determine detected language (fallback to English if undefined)
      const detectedLang = voiceProfile.language || "English";

      // 1. Improve Script
      // If targetAccent is "Original", we pass "Natural and Grammatically Correct in [Detected Language]".
      let scriptStyle = targetAccent;
      if (targetAccent === 'Original (Preserve)') {
         scriptStyle = `Natural, Relaxing, and Grammatically Correct in ${detectedLang}`;
      }
      
      const improved = await improveScript(transcription, scriptStyle);
      setEnhancedScript(improved);
      
      setStatusMsg('Generating high-fidelity cloned audio...');
      
      // 2. Generate Audio (Dub)
      // Modify the style prompt based on user request logic
      let accentPrompt = "";
      
      if (targetAccent === 'Original (Preserve)') {
        // Specific user requirement: 
        // "If an Urdu video is uploaded, generate a voice-over in Urdu with the same accent, pitch, tone, emotions, and a natural, relaxing delivery.
        //  If an English video is uploaded, the dubbing should be in English with the same vocal characteristics."
        accentPrompt = `Speak in ${detectedLang}. Maintain the speaker's original ${voiceProfile.accent} accent, ${voiceProfile.age} voice characteristics, pitch, tone, and emotions. The delivery must be natural and relaxing.`;
      } else if (targetAccent === 'English (Urdu Accent)') {
         accentPrompt = `Speak in English with a perfect Urdu/Pakistani accent. Keep the speaker's ${voiceProfile.age} voice characteristics.`;
      } else {
        // Switch accent but keep voice quality
        accentPrompt = `Keep the speaker's ${voiceProfile.age} voice quality (pitch/tone) but speak in perfect ${targetAccent}.`;
      }
      
      const modifiedVoice = {
         ...voiceProfile,
         stylePrompt: `${voiceProfile.stylePrompt}. ${accentPrompt}`
      };

      const base64Audio = await generateSpeech(improved, modifiedVoice.id, SpeakingStyle.STANDARD, modifiedVoice);
      
      // 3. Decode
      const rawBytes = decodeBase64(base64Audio);
      if (audioContextRef.current) {
         const buffer = await decodeAudioData(rawBytes, audioContextRef.current);
         setAudioBuffer(buffer);
      }
      
      setStep(5); // Done
    } catch (e) {
      console.error(e);
      alert("Generation failed.");
      setStep(3);
    }
  };

  const togglePlayback = () => {
    if (!videoRef.current || !audioBuffer || !audioContextRef.current) return;

    if (isPlaying) {
      // Pause
      videoRef.current.pause();
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch(e){}
      }
      setIsPlaying(false);
    } else {
      // Play
      videoRef.current.currentTime = 0; // Restart for sync simplicity in this demo
      videoRef.current.muted = true; // Mute original
      videoRef.current.play();

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start(0);
      sourceNodeRef.current = source;
      
      source.onended = () => setIsPlaying(false);
      setIsPlaying(true);
    }
  };

  return (
    <div className="h-full flex flex-col gap-6">
      
      {/* Top Section: Steps */}
      <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
         <div className={`flex items-center gap-2 ${step >= 1 ? 'text-indigo-400' : 'text-slate-500'}`}>
            <span className="w-6 h-6 rounded-full border flex items-center justify-center text-xs">1</span>
            <span className="text-sm font-medium">Upload</span>
         </div>
         <div className="h-px bg-slate-700 w-10"></div>
         <div className={`flex items-center gap-2 ${step >= 3 ? 'text-indigo-400' : 'text-slate-500'}`}>
            <span className="w-6 h-6 rounded-full border flex items-center justify-center text-xs">2</span>
            <span className="text-sm font-medium">Analyze</span>
         </div>
         <div className="h-px bg-slate-700 w-10"></div>
         <div className={`flex items-center gap-2 ${step >= 5 ? 'text-indigo-400' : 'text-slate-500'}`}>
            <span className="w-6 h-6 rounded-full border flex items-center justify-center text-xs">3</span>
            <span className="text-sm font-medium">Result</span>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
         
         {/* Left Panel: Configuration */}
         <div className="lg:col-span-4 space-y-6">
            
            {/* Upload Area */}
            {step === 0 && (
              <div className="border-2 border-dashed border-slate-700 rounded-2xl h-64 flex flex-col items-center justify-center bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer relative">
                <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" accept="video/*" />
                <Upload size={40} className="text-slate-400 mb-4" />
                <p className="text-slate-300 font-medium">Upload Video to Enhance</p>
                <p className="text-slate-500 text-sm mt-2">Max 20MB</p>
              </div>
            )}

            {/* Analysis Loading */}
            {step === 2 && (
               <div className="bg-slate-800 rounded-2xl p-8 text-center border border-slate-700 h-64 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                  <p className="text-indigo-300 animate-pulse">{statusMsg}</p>
               </div>
            )}

            {/* Configuration */}
            {step === 3 && (
               <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 space-y-6 animate-fade-in">
                  <div>
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">Detected Voice Profile</h3>
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 space-y-3">
                       <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white shrink-0">
                              <Mic2 size={20} />
                           </div>
                           <div>
                              <div className="text-sm font-bold text-white">{voiceProfile?.name}</div>
                              <div className="text-xs text-slate-500">{voiceProfile?.description}</div>
                           </div>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                             <User size={12} className="text-indigo-400" />
                             <span>Age: <span className="text-slate-200">{voiceProfile?.age}</span></span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                             <Globe size={12} className="text-indigo-400" />
                             <span>Lang: <span className="text-slate-200">{voiceProfile?.language || 'Auto'}</span></span>
                          </div>
                       </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">Target Improvement</h3>
                    <div className="grid grid-cols-1 gap-2">
                       <button 
                            onClick={() => setTargetAccent('Original (Preserve)')}
                            className={`p-3 text-left rounded-lg text-sm border transition-all ${targetAccent === 'Original (Preserve)' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                       >
                            <span className="font-bold">Original (Preserve)</span>
                            <span className="block text-xs opacity-70">Keep Language, Accent & Tone</span>
                       </button>

                       {['Standard Professional', 'American Accent', 'British Accent', 'English (Urdu Accent)', 'Urdu (Native)', 'Energetic Promo'].map(style => (
                          <button 
                            key={style}
                            onClick={() => setTargetAccent(style)}
                            className={`p-3 text-left rounded-lg text-sm border transition-all ${targetAccent === style ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                          >
                             {style}
                          </button>
                       ))}
                    </div>
                  </div>

                  <button 
                    onClick={handleAnalyze} 
                    className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-medium text-sm"
                  >
                     Re-Analyze Video
                  </button>

                  <button 
                    onClick={handleEnhanceAndGenerate}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
                  >
                     <Wand2 size={18} />
                     Generate Enhanced Dub
                  </button>
               </div>
            )}

            {step === 4 && (
                <div className="bg-slate-800 rounded-2xl p-8 text-center border border-slate-700 h-64 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4"></div>
                  <p className="text-purple-300 animate-pulse">{statusMsg}</p>
               </div>
            )}

            {step === 5 && (
               <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 space-y-4 animate-fade-in">
                  <div className="text-center mb-4">
                     <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Wand2 size={24} />
                     </div>
                     <h3 className="text-lg font-bold text-white">Enhancement Complete!</h3>
                     <p className="text-sm text-slate-400">Audio improved and dubbed.</p>
                  </div>
                  
                  <button 
                    onClick={() => setStep(3)}
                    className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2"
                  >
                     <RefreshCw size={16} />
                     Try Another Style
                  </button>
               </div>
            )}
         </div>

         {/* Right Panel: Preview */}
         <div className="lg:col-span-8 bg-black/40 rounded-2xl border border-slate-700 p-1 flex flex-col overflow-hidden relative">
            {videoUrl ? (
               <div className="relative flex-1 bg-black flex items-center justify-center">
                  <video 
                     ref={videoRef}
                     src={videoUrl}
                     className="max-h-full max-w-full"
                     onLoadedMetadata={step === 1 ? handleAnalyze : undefined}
                     controls={false}
                  />
                  {/* Overlay Controls */}
                  {step === 5 && (
                     <div className="absolute inset-0 flex items-center justify-center bg-black/20 group hover:bg-black/40 transition-colors">
                        <button 
                           onClick={togglePlayback}
                           className="w-20 h-20 bg-white/90 hover:bg-white text-slate-900 rounded-full flex items-center justify-center transform hover:scale-105 transition-all shadow-xl"
                        >
                           {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                        </button>
                     </div>
                  )}
                  {step < 5 && step > 0 && (
                     <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                        <p className="text-white font-medium bg-slate-900/80 px-4 py-2 rounded-lg">Preview Available After Processing</p>
                     </div>
                  )}
               </div>
            ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                  <Video size={48} className="mb-4 opacity-50" />
                  <p>No video loaded</p>
               </div>
            )}
            
            {/* Script Preview (Only if finished) */}
            {step === 5 && (
               <div className="h-40 bg-slate-900 border-t border-slate-800 p-4 overflow-y-auto">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Enhanced Script</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">{enhancedScript}</p>
               </div>
            )}
         </div>

      </div>
    </div>
  );
};

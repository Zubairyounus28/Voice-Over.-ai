
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Pause, Wand2, Video, Mic2, Zap, Film, Edit3, User, Globe, AlertCircle } from 'lucide-react';
import { fileToBase64, decodeBase64, decodeAudioData } from '../utils/audioUtils';
import { analyzeVoiceSample, generateSpeech } from '../services/geminiService';
import { SpeakingStyle } from '../types';

export const ScriptToVideoPanel: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  // Processing States
  // 0: Upload, 1: Analyze Voice, 2: Input Script, 3: Generating, 4: Result
  const [step, setStep] = useState<number>(0); 
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [isRendering, setIsRendering] = useState<boolean>(false);
  
  // Data
  const [scriptText, setScriptText] = useState<string>('');
  const [voiceProfile, setVoiceProfile] = useState<any | null>(null); 
  const [isSyncEnabled, setIsSyncEnabled] = useState<boolean>(true);
  
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
    setStep(1); 
    setStatusMsg('Cloning voice, accent, and intonation...');
    
    try {
      const base64 = await fileToBase64(file);
      const analysis = await analyzeVoiceSample(base64, file.type);
      
      const clonedVoice = {
        id: 'cloned_sync_voice',
        name: 'Detected Voice',
        description: analysis.description,
        gender: analysis.gender,
        geminiVoiceName: analysis.baseVoice,
        recommendedPitch: analysis.pitch,
        isCloned: true,
        stylePrompt: analysis.stylePrompt,
        age: analysis.age,
        accent: analysis.accent,
        language: analysis.language,
        intonation: analysis.intonation, 
        rhythm: analysis.rhythm 
      };
      setVoiceProfile(clonedVoice);
      setStep(2); // Move to Script Input
      setStatusMsg('');
    } catch (e) {
      alert("Voice analysis failed. Ensure the video has clear speech.");
      setStep(0);
    }
  };

  const handleGenerate = async () => {
    if (!scriptText.trim() || !voiceProfile) return;
    setStep(3);
    setStatusMsg('Synthesizing speech with cloned voice & sync...');

    try {
      // 1. Generate Audio (Dub)
      // Enforce the cloned style
      const modifiedVoice = {
         ...voiceProfile,
         stylePrompt: `${voiceProfile.stylePrompt}. Maintain exact ${voiceProfile.accent} accent and ${voiceProfile.age} vocal characteristics.`
      };

      const base64Audio = await generateSpeech(scriptText, modifiedVoice.id, SpeakingStyle.STANDARD, modifiedVoice);
      
      // 2. Decode
      const rawBytes = decodeBase64(base64Audio);
      if (audioContextRef.current) {
         const buffer = await decodeAudioData(rawBytes, audioContextRef.current);
         setAudioBuffer(buffer);
      }
      
      setStep(4); // Done
    } catch (e) {
      console.error(e);
      alert("Audio generation failed. Please try a different script.");
      setStep(2);
    }
  };

  const togglePlayback = () => {
    if (!videoRef.current || !audioBuffer || !audioContextRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch(e){}
      }
      setIsPlaying(false);
    } else {
      videoRef.current.currentTime = 0; 
      videoRef.current.muted = true; 
      
      // --- Smart Lip Sync Logic (Speed Shift) ---
      if (isSyncEnabled && videoRef.current.duration && audioBuffer.duration) {
          const videoDur = videoRef.current.duration;
          const audioDur = audioBuffer.duration;
          const rate = videoDur / audioDur;
          // Clamp rate to avoid ridiculous speeds
          const clampedRate = Math.max(0.5, Math.min(rate, 2.0));
          videoRef.current.playbackRate = clampedRate;
      } else {
          videoRef.current.playbackRate = 1.0;
      }

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

  const handleDownloadVideo = () => {
    if (!videoRef.current || !audioBuffer || !audioContextRef.current) return;

    setIsRendering(true);
    setIsPlaying(false);
    
    videoRef.current.pause();
    if(sourceNodeRef.current) { try { sourceNodeRef.current.stop() } catch(e){} }

    try {
        const videoStream = videoRef.current.captureStream();
        const audioDest = audioContextRef.current.createMediaStreamDestination();
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioDest);
        
        const combinedStream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioDest.stream.getAudioTracks()
        ]);

        const recorder = new MediaRecorder(combinedStream, {
            mimeType: 'video/webm;codecs=vp9,opus' 
        });
        
        const chunks: BlobPart[] = [];
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };
        
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'smart_lipsync_video.webm';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            setIsRendering(false);
            if (videoRef.current) {
                videoRef.current.muted = true;
                videoRef.current.playbackRate = 1.0;
                videoRef.current.currentTime = 0;
            }
        };

        if (isSyncEnabled && videoRef.current.duration && audioBuffer.duration) {
             const rate = videoRef.current.duration / audioBuffer.duration;
             videoRef.current.playbackRate = Math.max(0.5, Math.min(rate, 2.0));
        } else {
             videoRef.current.playbackRate = 1.0;
        }

        videoRef.current.currentTime = 0;
        videoRef.current.muted = true; 

        recorder.start();
        videoRef.current.play();
        source.start(0);

        source.onended = () => {
            recorder.stop();
            videoRef.current?.pause();
        };

    } catch (e) {
        console.error("Recording failed", e);
        alert("Video export failed.");
        setIsRendering(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 relative">
      
      {/* Rendering Overlay */}
      {isRendering && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl animate-fade-in">
              <div className="w-16 h-16 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin mb-6"></div>
              <h3 className="text-2xl font-bold text-white mb-2">Rendering Video...</h3>
              <p className="text-slate-400">Recording synchronized output.</p>
          </div>
      )}

      {/* Top Section: Steps */}
      <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
         <div className={`flex items-center gap-2 ${step >= 1 ? 'text-indigo-400' : 'text-slate-500'}`}>
            <span className="w-6 h-6 rounded-full border flex items-center justify-center text-xs">1</span>
            <span className="text-sm font-medium">Upload</span>
         </div>
         <div className="h-px bg-slate-700 w-10"></div>
         <div className={`flex items-center gap-2 ${step >= 2 ? 'text-indigo-400' : 'text-slate-500'}`}>
            <span className="w-6 h-6 rounded-full border flex items-center justify-center text-xs">2</span>
            <span className="text-sm font-medium">Script</span>
         </div>
         <div className="h-px bg-slate-700 w-10"></div>
         <div className={`flex items-center gap-2 ${step >= 4 ? 'text-indigo-400' : 'text-slate-500'}`}>
            <span className="w-6 h-6 rounded-full border flex items-center justify-center text-xs">3</span>
            <span className="text-sm font-medium">Sync & Save</span>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
         
         {/* Left Panel: Configuration */}
         <div className="lg:col-span-5 space-y-6">
            
            {/* Upload Area */}
            {step === 0 && (
              <div className="border-2 border-dashed border-slate-700 rounded-2xl h-64 flex flex-col items-center justify-center bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer relative">
                <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" accept="video/*" />
                <Upload size={40} className="text-slate-400 mb-4" />
                <p className="text-slate-300 font-medium">Upload Video</p>
                <p className="text-slate-500 text-sm mt-2">Max 20MB</p>
              </div>
            )}

            {/* Analysis Loading */}
            {step === 1 && (
               <div className="bg-slate-800 rounded-2xl p-8 text-center border border-slate-700 h-64 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                  <p className="text-indigo-300 animate-pulse">{statusMsg || 'Analyzing...'}</p>
               </div>
            )}

            {/* Script Input & Config */}
            {step === 2 && (
               <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 space-y-6 animate-fade-in flex flex-col h-full">
                  <div>
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">Cloned Voice Profile</h3>
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                       <div className="flex items-center gap-3 mb-2">
                           <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white shrink-0">
                              <Mic2 size={16} />
                           </div>
                           <div>
                              <div className="text-sm font-bold text-white">{voiceProfile?.name}</div>
                              <div className="text-[10px] text-slate-400">
                                 {voiceProfile?.gender} • {voiceProfile?.age} • {voiceProfile?.accent}
                              </div>
                           </div>
                       </div>
                       <div className="text-[10px] text-slate-500 italic border-t border-slate-800 pt-2">
                         "{voiceProfile?.description}"
                       </div>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col">
                     <label className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex justify-between">
                        <span>New Script</span>
                        <span className="text-slate-600">{scriptText.length} chars</span>
                     </label>
                     <textarea 
                        className="flex-1 w-full bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-slate-200 resize-none focus:outline-none focus:border-indigo-500"
                        placeholder="Type what you want the person in the video to say..."
                        value={scriptText}
                        onChange={(e) => setScriptText(e.target.value)}
                     />
                  </div>

                  <div className="flex items-start gap-2 bg-yellow-900/20 p-3 rounded-lg border border-yellow-700/30">
                     <AlertCircle size={16} className="text-yellow-500 mt-0.5" />
                     <p className="text-xs text-yellow-200/80">
                        <strong>Smart Sync:</strong> The video speed will automatically adjust to match the length of your new script.
                     </p>
                  </div>

                  <button 
                    onClick={handleGenerate}
                    disabled={!scriptText.trim()}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                     <Wand2 size={18} />
                     Generate Lip-Sync Dub
                  </button>
               </div>
            )}

            {step === 3 && (
                <div className="bg-slate-800 rounded-2xl p-8 text-center border border-slate-700 h-64 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4"></div>
                  <p className="text-purple-300 animate-pulse">{statusMsg}</p>
               </div>
            )}

            {step === 4 && (
               <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 space-y-4 animate-fade-in">
                  <div className="text-center mb-4">
                     <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Zap size={24} />
                     </div>
                     <h3 className="text-lg font-bold text-white">Sync Complete!</h3>
                     <p className="text-sm text-slate-400">Video adapted to script length.</p>
                  </div>

                  {/* Smart Sync Toggle */}
                  <div className="bg-slate-900 rounded-lg p-3 flex items-center justify-between border border-slate-700">
                      <div className="flex items-center gap-2">
                          <Zap size={16} className={isSyncEnabled ? "text-yellow-400" : "text-slate-500"} />
                          <div className="text-sm font-medium text-slate-300">Smart Playback Rate</div>
                      </div>
                      <button 
                        onClick={() => setIsSyncEnabled(!isSyncEnabled)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${isSyncEnabled ? 'bg-indigo-600' : 'bg-slate-700'}`}
                      >
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isSyncEnabled ? 'left-6' : 'left-1'}`}></div>
                      </button>
                  </div>
                  
                  <div className="flex gap-2">
                     <button 
                        onClick={handleDownloadVideo}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                     >
                        <Film size={16} />
                        Download Video
                     </button>
                     
                     <button 
                        onClick={() => setStep(2)}
                        className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2"
                     >
                        <Edit3 size={16} />
                        Edit Script
                     </button>
                  </div>
               </div>
            )}
         </div>

         {/* Right Panel: Preview */}
         <div className="lg:col-span-7 bg-black/40 rounded-2xl border border-slate-700 p-1 flex flex-col overflow-hidden relative">
            {videoUrl ? (
               <div className="relative flex-1 bg-black flex items-center justify-center">
                  <video 
                     ref={videoRef}
                     src={videoUrl}
                     className="max-h-full max-w-full"
                     onLoadedMetadata={step === 1 ? handleAnalyze : undefined}
                     controls={false}
                     crossOrigin="anonymous" 
                  />
                  {/* Overlay Controls */}
                  {step === 4 && !isRendering && (
                     <div className="absolute inset-0 flex items-center justify-center bg-black/20 group hover:bg-black/40 transition-colors pointer-events-none">
                        <button 
                           onClick={togglePlayback}
                           className="w-20 h-20 bg-white/90 hover:bg-white text-slate-900 rounded-full flex items-center justify-center transform hover:scale-105 transition-all shadow-xl pointer-events-auto"
                        >
                           {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                        </button>
                     </div>
                  )}
                  {step < 4 && step > 0 && (
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
            
            {/* Script Readout */}
            {step === 4 && (
               <div className="h-40 bg-slate-900 border-t border-slate-800 p-4 overflow-y-auto">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Dubbed Script</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">{scriptText}</p>
               </div>
            )}
         </div>

      </div>
    </div>
  );
};

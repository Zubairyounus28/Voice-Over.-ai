
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Wand2, Download, Video, Film, Smile, User, CheckCircle2, Clapperboard, RefreshCw } from 'lucide-react';
import { AVAILABLE_VOICES, VoiceGender, SpeakingStyle, VoiceOption } from '../types';
// Fix: Members are now exported from geminiService
import { generateSpeech, translateScript, generateVisualPrompt, generateVeoVideo } from '../services/geminiService';
import { decodeBase64, decodeAudioData } from '../utils/audioUtils';

export const AIStoryPanel: React.FC = () => {
  // State
  const [script, setScript] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [selectedGender, setSelectedGender] = useState<VoiceGender>(VoiceGender.MALE);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
  
  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  
  // Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  const LANGUAGES = ['English', 'Urdu', 'Hindi', 'Spanish', 'French', 'German', 'Arabic', 'Chinese', 'Japanese'];

  useEffect(() => {
    // Set default voice based on gender when component mounts or gender changes
    const defaultVoice = AVAILABLE_VOICES.find(v => v.gender === selectedGender);
    if (defaultVoice) setSelectedVoiceId(defaultVoice.id);
    
    // Init Audio
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
    return () => { audioContextRef.current?.close(); };
  }, [selectedGender]);

  // Fix: Implement mandatory API Key selection for Veo models as per guidelines
  const handleGenerate = async () => {
    if (!script.trim()) return;

    try {
      const win = window as any;
      if (win.aistudio) {
        const hasKey = await win.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await win.aistudio.openSelectKey();
          // GUIDELINE: Assume success after openSelectKey to avoid race conditions
        }
      }
    } catch (e) {
      console.warn("API Key check error", e);
    }

    setIsProcessing(true);
    setStatusMsg('Initializing creative process...');
    
    try {
        let finalScript = script;
        
        // 1. Translate if needed
        if (selectedLanguage !== 'English') {
            setStatusMsg(`Translating script to ${selectedLanguage}...`);
            const translatedText = await translateScript(script, selectedLanguage);
            if (translatedText) finalScript = translatedText;
        }

        // 2. Audio Generation
        setStatusMsg('Generating high-quality AI Voiceover...');
        const voice = AVAILABLE_VOICES.find(v => v.id === selectedVoiceId) || AVAILABLE_VOICES[0];
        const base64Audio = await generateSpeech(finalScript, voice.id, SpeakingStyle.FICTION, voice);
        
        // Decode Audio
        const rawBytes = decodeBase64(base64Audio);
        if (audioContextRef.current) {
            const buffer = await decodeAudioData(rawBytes, audioContextRef.current);
            setAudioBuffer(buffer);
        }

        // 3. Visual Analysis & Generation (Veo)
        setStatusMsg('Analyzing script scenes & composing visuals...');
        // Fix: Use the correctly implemented generateVisualPrompt
        const visualPrompt = await generateVisualPrompt(script); 
        
        setStatusMsg('Generating AI video footage (Veo)... This takes 2-4 minutes.');
        // Fix: Use the correctly implemented generateVeoVideo with polling logic
        const videoUrl = await generateVeoVideo(visualPrompt);
        setGeneratedVideoUrl(videoUrl);

        setStatusMsg('');
    } catch (e: any) {
        console.error(e);
        alert(`Generation failed: ${e.message || "Check your API key status and billing."}`);
    } finally {
        setIsProcessing(false);
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
      videoRef.current.loop = true; // Background video loop
      videoRef.current.play();

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start(0);
      sourceNodeRef.current = source;
      
      source.onended = () => {
          setIsPlaying(false);
          videoRef.current?.pause();
      };
      setIsPlaying(true);
    }
  };

  const handleDownload = () => {
    if (!videoRef.current || !audioBuffer || !audioContextRef.current) return;

    setIsRendering(true);
    setIsPlaying(false);
    videoRef.current.pause();
    if(sourceNodeRef.current) { try { sourceNodeRef.current.stop() } catch(e){} }

    try {
        const videoStream = (videoRef.current as any).captureStream();
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
            a.download = `story_video_${Date.now()}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            setIsRendering(false);
            if (videoRef.current) {
                videoRef.current.loop = true;
                videoRef.current.currentTime = 0;
            }
        };

        videoRef.current.currentTime = 0;
        videoRef.current.loop = true;
        
        recorder.start();
        videoRef.current.play();
        source.start(0);

        source.onended = () => {
            recorder.stop();
            videoRef.current?.pause();
        };

    } catch (e) {
        console.error(e);
        alert("Download failed.");
        setIsRendering(false);
    }
  };

  const filteredVoices = AVAILABLE_VOICES.filter(v => v.gender === selectedGender);

  return (
    <div className="h-full flex flex-col gap-6 relative">
      
      {isRendering && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl animate-fade-in">
              <div className="w-16 h-16 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin mb-6"></div>
              <h3 className="text-2xl font-bold text-white mb-2">Rendering Final Video...</h3>
              <p className="text-slate-400">Combining AI visuals and voiceover.</p>
          </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
          
          <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 flex-1 flex flex-col">
                  
                  <div className="mb-6">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Language</label>
                      <select 
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                      >
                          {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                  </div>

                  <div className="mb-6">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Voice Type</label>
                      <div className="flex bg-slate-900 p-1 rounded-xl">
                          <button 
                             onClick={() => setSelectedGender(VoiceGender.CHILD)}
                             className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${selectedGender === VoiceGender.CHILD ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                          >
                             <Smile size={14} /> Kids
                          </button>
                          <button 
                             onClick={() => setSelectedGender(VoiceGender.FEMALE)}
                             className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${selectedGender === VoiceGender.FEMALE ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                          >
                             <User size={14} /> Women
                          </button>
                          <button 
                             onClick={() => setSelectedGender(VoiceGender.MALE)}
                             className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${selectedGender === VoiceGender.MALE ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                          >
                             <User size={14} /> Men
                          </button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar mb-6 min-h-[150px]">
                      <div className="space-y-2">
                          {filteredVoices.map(voice => (
                              <button
                                key={voice.id}
                                onClick={() => setSelectedVoiceId(voice.id)}
                                className={`w-full flex items-center p-3 rounded-xl border text-left transition-all ${
                                    selectedVoiceId === voice.id 
                                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-200' 
                                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-700'
                                }`}
                              >
                                  <div className={`w-3 h-3 rounded-full mr-3 ${selectedVoiceId === voice.id ? 'bg-indigo-400' : 'bg-slate-600'}`}></div>
                                  <div>
                                      <div className="font-bold text-sm">{voice.name}</div>
                                      <div className="text-[10px] opacity-70 truncate max-w-[200px]">{voice.description}</div>
                                  </div>
                              </button>
                          ))}
                      </div>
                  </div>

                  <button 
                    onClick={handleGenerate}
                    disabled={isProcessing || !script}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                     {isProcessing ? (
                         <>
                           <RefreshCw size={18} className="animate-spin" />
                           <span className="text-xs">Processing...</span>
                         </>
                     ) : (
                         <>
                           <Clapperboard size={18} />
                           Create Video
                         </>
                     )}
                  </button>
                  {isProcessing && <div className="text-center mt-2 text-xs text-indigo-300 animate-pulse">{statusMsg}</div>}
                  <div className="mt-4 text-[10px] text-center text-slate-500">
                    Veo requires a <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-indigo-400 underline">paid API key</a>.
                  </div>
              </div>
          </div>

          <div className="lg:col-span-8 flex flex-col gap-4">
              
              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-1">
                 <textarea 
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    placeholder="Enter your story idea or script..."
                    className="w-full bg-slate-900/50 rounded-xl p-4 text-slate-200 text-lg resize-none focus:outline-none focus:bg-slate-900 transition-colors h-40"
                 />
              </div>

              <div className="flex-1 bg-black rounded-2xl border border-slate-800 relative overflow-hidden flex items-center justify-center group">
                  {generatedVideoUrl ? (
                      <video 
                        ref={videoRef}
                        src={generatedVideoUrl}
                        className="w-full h-full object-contain"
                        loop
                        muted 
                        playsInline
                      />
                  ) : (
                      <div className="text-slate-600 flex flex-col items-center">
                          <Film size={64} className="mb-4 opacity-20" />
                          <p>AI Video Preview</p>
                      </div>
                  )}

                  {generatedVideoUrl && audioBuffer && !isRendering && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                             onClick={togglePlayback}
                             className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                           >
                              {isPlaying ? <Pause size={24} className="text-black" /> : <Play size={24} className="text-black ml-1" />}
                           </button>
                      </div>
                  )}
              </div>

              {generatedVideoUrl && audioBuffer && (
                  <div className="bg-slate-800 rounded-xl p-4 flex justify-between items-center animate-fade-in-up">
                      <div className="flex items-center gap-3">
                          <CheckCircle2 size={20} className="text-green-400" />
                          <div className="text-sm">
                              <div className="font-bold text-white">Ready to Export</div>
                              <div className="text-slate-400 text-xs">Video & Voiceover synchronized</div>
                          </div>
                      </div>
                      <button 
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm transition-colors"
                      >
                          <Download size={16} />
                          Download WebM
                      </button>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

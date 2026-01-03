
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Wand2, Mic, User, Smile, BookOpen, Globe, Users, Sparkles, RefreshCw, MoonStar, Image as ImageIcon, Video, FileText, Youtube, Hash, Copy, Fingerprint } from 'lucide-react';
import { AVAILABLE_VOICES, AVAILABLE_PODCAST_PAIRS, VoiceOption, VoiceGender, SpeakingStyle } from '../types';
import { generateSpeech, translateToUrdu, generatePodcastScript, generateStoryScript, generateSoloStoryScript, analyzeVoiceSample, optimizeScriptForSpeech, generateStoryImage, generateStoryTitle, generateYouTubeMetadata } from '../services/geminiService';
import { decodeBase64, decodeAudioData, audioBufferToWav, fileToBase64 } from '../utils/audioUtils';

export const VoiceOverPanel: React.FC = () => {
  const [text, setText] = useState<string>('');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(AVAILABLE_VOICES[0].id);
  const [selectedPairId, setSelectedPairId] = useState<string>(AVAILABLE_PODCAST_PAIRS[0].id);
  const [pitch, setPitch] = useState<number>(0); 
  const [speakingStyle, setSpeakingStyle] = useState<SpeakingStyle>(SpeakingStyle.STANDARD);
  const [podcastLang, setPodcastLang] = useState<'ENGLISH' | 'URDU'>('ENGLISH');
  const [isEnhancementEnabled, setIsEnhancementEnabled] = useState<boolean>(true);
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");

  // Custom Voice State
  const [clonedVoices, setClonedVoices] = useState<VoiceOption[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  
  // Generation States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessingScript, setIsProcessingScript] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [isRenderingVideo, setIsRenderingVideo] = useState<boolean>(false);

  // Content Data
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [storyImageUrl, setStoryImageUrl] = useState<string | null>(null);
  const [storyTitle, setStoryTitle] = useState<string>("");
  const [youtubeMeta, setYoutubeMeta] = useState<{title: string, description: string, tags: string} | null>(null);
  
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  // Audio Context Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
    gainNodeRef.current = audioContextRef.current.createGain();
    gainNodeRef.current.connect(audioContextRef.current.destination);
    return () => { audioContextRef.current?.close(); };
  }, []);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setIsLoading(true);
    setStoryImageUrl(null); 
    setStoryTitle("");
    setYoutubeMeta(null);
    stopAudio(); 

    try {
      let finalText = text;
      if (isEnhancementEnabled && speakingStyle !== SpeakingStyle.PODCAST && speakingStyle !== SpeakingStyle.STORY && speakingStyle !== SpeakingStyle.SOLO_STORY) {
         finalText = await optimizeScriptForSpeech(text);
         setText(finalText);
      }

      const isMultiSpeaker = speakingStyle === SpeakingStyle.PODCAST || speakingStyle === SpeakingStyle.STORY;
      const idToUse = isMultiSpeaker ? selectedPairId : selectedVoiceId;
      const customVoice = clonedVoices.find(v => v.id === selectedVoiceId);
      
      const promises: Promise<any>[] = [
         generateSpeech(finalText, idToUse, speakingStyle, customVoice)
      ];

      if (speakingStyle === SpeakingStyle.STORY || speakingStyle === SpeakingStyle.SOLO_STORY) {
         setIsGeneratingImage(true);
         promises.push(generateStoryImage(finalText, aspectRatio).catch(() => null));
         promises.push(generateStoryTitle(finalText).catch(() => "Story"));
         promises.push(generateYouTubeMetadata(finalText).catch(() => null));
      }

      const results = await Promise.all(promises);
      const base64Audio = results[0];
      
      const rawBytes = decodeBase64(base64Audio);
      if (audioContextRef.current) {
        const decodedBuffer = await decodeAudioData(rawBytes, audioContextRef.current);
        setAudioBuffer(decodedBuffer);
      }

      if (speakingStyle === SpeakingStyle.STORY || speakingStyle === SpeakingStyle.SOLO_STORY) {
          if (results[1]) setStoryImageUrl(`data:image/png;base64,${results[1]}`);
          if (results[2]) setStoryTitle(results[2]);
          if (results[3]) setYoutubeMeta(results[3]);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
      setIsGeneratingImage(false);
    }
  };

  const handleTranslate = async () => {
    if (!text.trim()) return;
    setIsTranslating(true);
    try {
      const translatedText = await translateToUrdu(text, true); // Use Roman Urdu by default
      setText(translatedText);
      setPodcastLang('URDU'); 
    } finally {
      setIsTranslating(false);
    }
  };

  const handleGenerateScript = async () => {
      if (!text.trim()) return;
      setIsProcessingScript(true);
      try {
          let script = "";
          if (speakingStyle === SpeakingStyle.SOLO_STORY) {
            script = await generateSoloStoryScript(text, podcastLang);
          } else if (speakingStyle === SpeakingStyle.STORY) {
            script = await generateStoryScript(text, selectedPairId, podcastLang);
          } else {
            script = await generatePodcastScript(text, selectedPairId, podcastLang);
          }
          setText(script);
      } finally {
          setIsProcessingScript(false);
      }
  };

  const playAudio = () => {
    if (!audioBuffer || !audioContextRef.current || !gainNodeRef.current) return;
    stopAudio();
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    if (speakingStyle !== SpeakingStyle.PODCAST && speakingStyle !== SpeakingStyle.STORY) {
        source.detune.value = pitch; 
    }
    source.connect(gainNodeRef.current);
    source.onended = () => setIsPlaying(false);
    source.start(0);
    sourceNodeRef.current = source;
    setIsPlaying(true);
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch(e) {}
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  };

  const togglePlayback = () => isPlaying ? stopAudio() : playAudio();

  const handleDownload = () => {
    if (!audioBuffer) return;
    const wavBlob = audioBufferToWav(audioBuffer);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${storyTitle || 'voxstudio_audio'}.wav`;
    a.click();
  };

  const drawToCanvas = async (canvas: HTMLCanvasElement): Promise<void> => {
    if (!storyImageUrl) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.src = storyImageUrl;
    await new Promise(r => img.onload = r);
    canvas.width = aspectRatio === "9:16" ? 720 : 1280;
    canvas.height = aspectRatio === "9:16" ? 1280 : 720;
    const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
    ctx.drawImage(img, (canvas.width - img.width * scale) / 2, (canvas.height - img.height * scale) / 2, img.width * scale, img.height * scale);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, canvas.height - 200, canvas.width, 200);
    ctx.font = 'bold 48px Inter, sans-serif';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(storyTitle || "VoxStudio AI", canvas.width / 2, canvas.height - 100);
  };

  const handleDownloadStoryVideo = async () => {
    if (!audioBuffer || !storyImageUrl || !canvasRef.current) return;
    setIsRenderingVideo(true);
    try {
        const canvas = canvasRef.current;
        await drawToCanvas(canvas);
        const videoStream = canvas.captureStream(30);
        const audioDest = audioContextRef.current!.createMediaStreamDestination();
        const source = audioContextRef.current!.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioDest);
        const combined = new MediaStream([...videoStream.getVideoTracks(), ...audioDest.stream.getAudioTracks()]);
        const mime = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
        const recorder = new MediaRecorder(combined, { mimeType: mime });
        const chunks: Blob[] = [];
        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: mime });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${storyTitle || 'vox_story'}.${mime.split('/')[1]}`;
            a.click();
            setIsRenderingVideo(false);
        };
        recorder.start();
        source.start(0);
        source.onended = () => recorder.stop();
    } catch (e) {
        setIsRenderingVideo(false);
        alert("Export failed.");
    }
  };

  const grouped = {
    MALE: AVAILABLE_VOICES.filter(v => v.gender === VoiceGender.MALE),
    FEMALE: AVAILABLE_VOICES.filter(v => v.gender === VoiceGender.FEMALE),
    CHILD: AVAILABLE_VOICES.filter(v => v.gender === VoiceGender.CHILD),
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[650px] relative">
      <canvas ref={canvasRef} className="hidden" />
      {isRenderingVideo && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
              <div className="w-16 h-16 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin mb-6"></div>
              <h3 className="text-2xl font-bold text-white mb-2">Exporting Master Video...</h3>
              <p className="text-slate-400">Merging high-fidelity audio with story art.</p>
          </div>
      )}

      {/* Configuration Sidebar */}
      <div className="lg:col-span-4 flex flex-col gap-4 overflow-hidden h-full">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 flex flex-col h-full overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
             <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">Configuration</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
            
            {/* Style Selector */}
            <section>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-3 tracking-widest">App Mode</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: SpeakingStyle.STANDARD, label: 'Single Voice', icon: Mic },
                  { id: SpeakingStyle.SOLO_STORY, label: 'Solo Story', icon: BookOpen },
                  { id: SpeakingStyle.STORY, label: 'Story Duo', icon: MoonStar },
                  { id: SpeakingStyle.PODCAST, label: 'Podcast Duo', icon: Users },
                ].map(s => (
                  <button key={s.id} onClick={() => setSpeakingStyle(s.id as SpeakingStyle)} className={`flex flex-col items-center p-3 rounded-xl border transition-all ${speakingStyle === s.id ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-950 text-slate-500 border-slate-800 hover:bg-slate-800'}`}>
                    <s.icon size={20} className="mb-1" />
                    <span className="text-[10px] font-bold">{s.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {(speakingStyle === SpeakingStyle.STORY || speakingStyle === SpeakingStyle.PODCAST || speakingStyle === SpeakingStyle.SOLO_STORY) && (
              <section className="animate-fade-in space-y-4">
                 <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Language Choice</h3>
                    <div className="flex bg-slate-800 rounded-lg p-0.5">
                       <button onClick={() => setPodcastLang('ENGLISH')} className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${podcastLang === 'ENGLISH' ? 'bg-white text-slate-900' : 'text-slate-400'}`}>ENGLISH</button>
                       <button onClick={() => setPodcastLang('URDU')} className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${podcastLang === 'URDU' ? 'bg-green-600 text-white' : 'text-slate-400'}`}>ROMAN URDU</button>
                    </div>
                 </div>
                 
                 {(speakingStyle === SpeakingStyle.STORY || speakingStyle === SpeakingStyle.PODCAST) && (
                   <div className="space-y-2">
                     {AVAILABLE_PODCAST_PAIRS.map(p => (
                       <button key={p.id} onClick={() => setSelectedPairId(p.id)} className={`w-full p-4 rounded-xl border text-left transition-all group ${selectedPairId === p.id ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}>
                          <div className="font-bold text-sm mb-1 flex items-center justify-between">
                            {p.name}
                            {selectedPairId === p.id && <Sparkles size={14} className="animate-pulse text-indigo-400" />}
                          </div>
                          <div className="text-[10px] opacity-60 leading-relaxed">{p.description}</div>
                       </button>
                     ))}
                   </div>
                 )}
              </section>
            )}

            {speakingStyle !== SpeakingStyle.STORY && speakingStyle !== SpeakingStyle.PODCAST && (
              <section className="space-y-6">
                 {/* Voice Lists */}
                 {(['CHILD', 'FEMALE', 'MALE'] as VoiceGender[]).map(cat => (
                   <div key={cat} className="space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-1 flex items-center gap-2 mb-2">
                         {cat === 'CHILD' && <Smile size={12} className="text-orange-400"/>}
                         {cat === 'FEMALE' && <User size={12} className="text-pink-400"/>}
                         {cat === 'MALE' && <User size={12} className="text-blue-400"/>}
                         {cat}
                      </h4>
                      <div className="grid grid-cols-1 gap-1">
                        {grouped[cat].map(v => (
                          <button 
                            key={v.id} 
                            onClick={() => { setSelectedVoiceId(v.id); setPitch(v.recommendedPitch); }} 
                            className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${selectedVoiceId === v.id ? 'bg-indigo-600/10 border-indigo-500 text-indigo-300' : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-800'}`}
                          >
                             <div className={`w-2 h-2 rounded-full ${selectedVoiceId === v.id ? 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]' : 'bg-slate-800'}`} />
                             <div className="flex-1">
                                <div className="text-xs font-bold flex items-center gap-2">
                                  {v.name}
                                  {v.isUrdu && <span className="bg-green-600/20 text-green-400 text-[8px] px-1 rounded">URDU</span>}
                                </div>
                                <div className="text-[9px] opacity-50 truncate">{v.description}</div>
                             </div>
                          </button>
                        ))}
                      </div>
                   </div>
                 ))}
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Editor & Results Area */}
      <div className="lg:col-span-8 flex flex-col gap-4 h-full">
        {/* Editor */}
        <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col shadow-2xl relative overflow-hidden">
           <div className="flex justify-between items-center mb-4">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2"><FileText size={14}/> Script Editor</label>
              <div className="flex gap-2">
                 {(speakingStyle === SpeakingStyle.STORY || speakingStyle === SpeakingStyle.PODCAST || speakingStyle === SpeakingStyle.SOLO_STORY) && (
                   <button onClick={handleGenerateScript} disabled={isProcessingScript || !text} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[10px] font-bold text-white flex items-center gap-2 disabled:opacity-50 transition-all">
                     {isProcessingScript ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12}/>} AI Write {podcastLang === 'URDU' ? 'Roman Urdu' : 'English'} Story
                   </button>
                 )}
                 <button onClick={handleTranslate} disabled={isTranslating} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold text-slate-300 flex items-center gap-2 transition-all">
                   {isTranslating ? <RefreshCw size={12} className="animate-spin" /> : <Globe size={12}/>} Translate Urdu (Roman)
                 </button>
              </div>
           </div>
           
           <div className="flex gap-4 h-full">
              <textarea 
                className={`flex-1 bg-slate-950 border border-slate-800 rounded-xl p-6 text-slate-200 text-lg focus:ring-2 focus:ring-indigo-500/30 outline-none resize-none placeholder-slate-700 transition-all ${podcastLang === 'URDU' ? 'text-left tracking-wide' : ''}`}
                placeholder={podcastLang === 'URDU' ? "Story ka topic likhein..." : "Type your story idea here, e.g., 'A lion and a mouse become best friends'..."}
                value={text}
                onChange={e => setText(e.target.value)}
              />
              {(speakingStyle === SpeakingStyle.STORY || speakingStyle === SpeakingStyle.SOLO_STORY) && (storyImageUrl || isGeneratingImage) && (
                 <div className="w-1/3 flex flex-col gap-3 animate-fade-in">
                    <div className="flex-1 bg-black rounded-xl border border-slate-800 relative overflow-hidden group shadow-inner">
                       {storyImageUrl ? <img src={storyImageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" /> : (
                         <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                           <RefreshCw size={24} className="animate-spin mb-2" />
                           <span className="text-[10px]">Painting Art...</span>
                         </div>
                       )}
                    </div>
                    {storyImageUrl && (
                      <div className="flex flex-col gap-2">
                         <button onClick={handleDownloadStoryVideo} className="w-full py-3 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 border-b-2 border-red-800 uppercase tracking-tighter">Download Video</button>
                      </div>
                    )}
                 </div>
              )}
           </div>

           <div className="mt-6 flex justify-end">
              <button onClick={handleGenerate} disabled={isLoading || !text} className="px-12 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl text-white font-black text-xl shadow-xl shadow-indigo-500/20 flex items-center gap-3 transform active:scale-95 transition-all hover:scale-[1.02]">
                {isLoading ? <RefreshCw size={24} className="animate-spin" /> : <Wand2 size={24}/>}
                {isLoading ? 'Generating Audio...' : 'Generate Voiceover'}
              </button>
           </div>
        </div>

        {/* Result & High Visibility Download */}
        <div className={`bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col gap-4 transition-all duration-500 ${audioBuffer ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}`}>
           <div className="flex items-center gap-4">
              <button onClick={togglePlayback} className="w-16 h-16 bg-white text-slate-950 rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-all active:scale-95">
                {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
              </button>
              <div className="flex-1">
                 <div className="flex justify-between items-baseline mb-2">
                    <h3 className="text-base font-bold text-white">Result Audio</h3>
                    <span className="text-xs font-mono text-indigo-400">{audioBuffer?.duration.toFixed(1)}s</span>
                 </div>
                 <div className="h-8 flex items-center gap-1 opacity-20">
                   {Array.from({length: 80}).map((_, i) => <div key={i} className="flex-1 bg-indigo-500 rounded-full" style={{height: isPlaying ? `${10 + Math.random()*90}%` : '15%'}} />)}
                 </div>
              </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <button onClick={handleDownload} className="w-full py-6 bg-green-600 hover:bg-green-500 rounded-2xl text-white text-xl font-black flex items-center justify-center gap-3 shadow-xl shadow-green-500/20 transition-all active:scale-95 border-b-4 border-green-800 uppercase tracking-tighter">
                <Download size={28}/> Download Voiceover MP3
              </button>
              {storyImageUrl && (
                 <button onClick={handleDownloadStoryVideo} className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-white text-xl font-black flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/20 transition-all active:scale-95 border-b-4 border-indigo-800 uppercase tracking-tighter">
                    <Video size={28}/> Download Story Video
                 </button>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

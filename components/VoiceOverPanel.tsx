
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Wand2, Mic, Volume2, Music, User, Smile, BookOpen, Newspaper, MessageSquare, Settings2, Languages, Globe, Users, PenTool, Sparkles, Upload, Fingerprint, CheckCircle2, MoonStar, Image as ImageIcon, Video, Monitor, Smartphone, Youtube, Hash, Copy, FileText, Check, RefreshCw } from 'lucide-react';
import { AVAILABLE_VOICES, AVAILABLE_PODCAST_PAIRS, VoiceOption, PodcastPair, VoiceGender, SpeakingStyle } from '../types';
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
  
  // Canvas Ref for Video Generation
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
      const translatedText = await translateToUrdu(text);
      setText(translatedText);
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

  const handleVoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsAnalyzing(true);
      try {
        const base64 = await fileToBase64(e.target.files[0]);
        const voice = await analyzeVoiceSample(base64, e.target.files[0].type);
        const newVoice: VoiceOption = { ...voice, id: `custom_${Date.now()}`, isCloned: true };
        setClonedVoices(prev => [...prev, newVoice]);
        setSelectedVoiceId(newVoice.id);
        setPitch(newVoice.recommendedPitch);
      } finally {
        setIsAnalyzing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
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
    a.download = `${storyTitle || 'voiceover'}.wav`;
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
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, canvas.height - 180, canvas.width, 180);
      ctx.font = 'bold 45px Inter, sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText(storyTitle || "Story", canvas.width / 2, canvas.height - 90);
  }

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
              a.download = `${storyTitle || 'story'}.${mime.split('/')[1]}`;
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

  const handleDownloadThumbnail = async () => {
    if (!canvasRef.current) return;
    await drawToCanvas(canvasRef.current);
    const link = document.createElement('a');
    link.href = canvasRef.current.toDataURL('image/jpeg', 0.9);
    link.download = 'story_thumbnail.jpg';
    link.click();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied!");
  };

  const allVoices = [...AVAILABLE_VOICES, ...clonedVoices];
  const grouped = {
    MALE: allVoices.filter(v => v.gender === VoiceGender.MALE),
    FEMALE: allVoices.filter(v => v.gender === VoiceGender.FEMALE),
    CHILD: allVoices.filter(v => v.gender === VoiceGender.CHILD),
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[600px] relative">
      <canvas ref={canvasRef} className="hidden" />
      {isRenderingVideo && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
              <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
              <h3 className="text-2xl font-bold text-white mb-2">Creating Final Video...</h3>
              <p className="text-slate-400">Merging story art with your voiceover.</p>
          </div>
      )}

      {/* Configuration Sidebar */}
      <div className="lg:col-span-4 flex flex-col gap-4 overflow-hidden h-full">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 flex flex-col h-full overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
             <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Settings2 size={16}/> Configuration</h2>
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
                  <button key={s.id} onClick={() => setSpeakingStyle(s.id as SpeakingStyle)} className={`flex flex-col items-center p-3 rounded-xl border transition-all ${speakingStyle === s.id ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'}`}>
                    <s.icon size={20} className="mb-1" />
                    <span className="text-[10px] font-bold">{s.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {speakingStyle === SpeakingStyle.STORY || speakingStyle === SpeakingStyle.PODCAST ? (
              <section className="animate-fade-in space-y-4">
                 <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Duo</h3>
                    <div className="flex bg-slate-700 rounded-lg p-0.5">
                       <button onClick={() => setPodcastLang('ENGLISH')} className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${podcastLang === 'ENGLISH' ? 'bg-white text-slate-900' : 'text-slate-400'}`}>ENG</button>
                       <button onClick={() => setPodcastLang('URDU')} className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${podcastLang === 'URDU' ? 'bg-green-600 text-white' : 'text-slate-400'}`}>URDU</button>
                    </div>
                 </div>
                 <div className="space-y-2">
                   {AVAILABLE_PODCAST_PAIRS.map(p => (
                     <button key={p.id} onClick={() => setSelectedPairId(p.id)} className={`w-full p-3 rounded-xl border text-left transition-all ${selectedPairId === p.id ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                        <div className="font-bold text-sm">{p.name}</div>
                        <div className="text-[10px] opacity-60">{p.description}</div>
                     </button>
                   ))}
                 </div>
              </section>
            ) : (
              <section className="space-y-6">
                 {/* Voice Upload */}
                 <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400">Clone Custom Voice</span>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleVoiceUpload} />
                    <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1 bg-indigo-600 rounded text-[10px] font-bold text-white flex items-center gap-1">
                       {isAnalyzing ? <RefreshCw size={12} className="animate-spin" /> : <Fingerprint size={12}/>} Clone
                    </button>
                 </div>
                 {/* Voice Lists */}
                 {(['CHILD', 'FEMALE', 'MALE'] as VoiceGender[]).map(cat => (
                   <div key={cat} className="space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-1 flex items-center gap-2">
                         {cat === 'CHILD' && <Smile size={12} className="text-orange-400"/>}
                         {cat === 'FEMALE' && <User size={12} className="text-pink-400"/>}
                         {cat === 'MALE' && <User size={12} className="text-blue-400"/>}
                         {cat}
                      </h4>
                      <div className="grid grid-cols-1 gap-1">
                        {grouped[cat].map(v => (
                          <button key={v.id} onClick={() => { setSelectedVoiceId(v.id); setPitch(v.recommendedPitch); }} className={`w-full p-2 rounded-lg border text-left flex items-center gap-3 ${selectedVoiceId === v.id ? 'bg-indigo-600/10 border-indigo-500 text-indigo-300' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-900'}`}>
                             <div className={`w-2 h-2 rounded-full ${selectedVoiceId === v.id ? 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]' : 'bg-slate-700'}`} />
                             <div className="flex-1">
                                <div className="text-xs font-bold">{v.name}</div>
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
        <div className="flex-1 bg-slate-800 rounded-2xl border border-slate-700 p-6 flex flex-col shadow-2xl relative overflow-hidden">
           <div className="flex justify-between items-center mb-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><FileText size={14}/> Script Editor</label>
              <div className="flex gap-2">
                 {(speakingStyle === SpeakingStyle.STORY || speakingStyle === SpeakingStyle.PODCAST || speakingStyle === SpeakingStyle.SOLO_STORY) && (
                   <button onClick={handleGenerateScript} disabled={isProcessingScript || !text} className="px-3 py-1.5 bg-indigo-600 rounded-lg text-[10px] font-bold text-white flex items-center gap-2 disabled:opacity-50">
                     {isProcessingScript ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12}/>} AI Write {speakingStyle === SpeakingStyle.SOLO_STORY ? 'Story' : 'Script'}
                   </button>
                 )}
                 <button onClick={handleTranslate} className="px-3 py-1.5 bg-slate-700 rounded-lg text-[10px] font-bold text-slate-300 flex items-center gap-2">
                   <Globe size={12}/> Translate
                 </button>
              </div>
           </div>
           
           <div className="flex gap-4 h-full">
              <textarea 
                className={`flex-1 bg-slate-900 border border-slate-700 rounded-xl p-6 text-slate-200 text-lg focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none placeholder-slate-600 ${podcastLang === 'URDU' ? 'text-right' : ''}`}
                placeholder="Enter text or use AI script writer..."
                value={text}
                onChange={e => setText(e.target.value)}
              />
              {(speakingStyle === SpeakingStyle.STORY || speakingStyle === SpeakingStyle.SOLO_STORY) && (storyImageUrl || isGeneratingImage) && (
                 <div className="w-1/3 flex flex-col gap-3 animate-fade-in">
                    <div className="flex-1 bg-slate-900 rounded-xl border border-slate-700 relative overflow-hidden group">
                       {storyImageUrl ? <img src={storyImageUrl} className="w-full h-full object-cover" /> : (
                         <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                           <RefreshCw size={24} className="animate-spin mb-2" />
                           <span className="text-[10px]">Creating Art...</span>
                         </div>
                       )}
                    </div>
                    {storyImageUrl && (
                      <div className="flex flex-col gap-2">
                         <button onClick={handleDownloadStoryVideo} className="w-full py-2.5 bg-red-600 hover:bg-red-500 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"><Video size={14}/> Save as Video</button>
                         <button onClick={handleDownloadThumbnail} className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold text-slate-300 flex items-center justify-center gap-2 transition-all active:scale-95"><ImageIcon size={14}/> Save Artwork</button>
                      </div>
                    )}
                 </div>
              )}
           </div>

           <div className="mt-6 flex justify-end">
              <button onClick={handleGenerate} disabled={isLoading || !text} className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-white font-bold text-lg shadow-xl shadow-indigo-500/20 flex items-center gap-3 transform active:scale-95 transition-all">
                {isLoading ? <RefreshCw size={24} className="animate-spin" /> : <Wand2 size={24}/>}
                {isLoading ? 'Generating Audio...' : 'Generate Voiceover'}
              </button>
           </div>
        </div>

        {/* Player Bar */}
        <div className={`bg-slate-900 rounded-2xl border border-slate-800 p-4 flex items-center gap-4 transition-all duration-500 ${audioBuffer ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
           <button onClick={togglePlayback} className="w-14 h-14 bg-white text-slate-950 rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-all">
             {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
           </button>
           <div className="flex-1">
              <div className="flex justify-between items-baseline mb-1">
                 <h3 className="text-sm font-bold text-slate-200">Result Audio</h3>
                 <span className="text-xs font-mono text-indigo-400">{audioBuffer?.duration.toFixed(1)}s</span>
              </div>
              <div className="h-6 flex items-center gap-0.5 opacity-30">
                {Array.from({length: 50}).map((_, i) => <div key={i} className="flex-1 bg-indigo-500 rounded-full" style={{height: isPlaying ? `${Math.random()*100}%` : '20%'}} />)}
              </div>
           </div>
           <button onClick={handleDownload} className="px-8 py-4 bg-green-600 hover:bg-green-500 rounded-xl text-white text-base font-bold flex items-center gap-2 shadow-lg shadow-green-500/20 transition-all active:scale-95">
             <Download size={20}/> Download WAV
           </button>
        </div>

        {/* YouTube Metadata Section */}
        {youtubeMeta && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 animate-fade-in">
                <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-3">
                    <Youtube className="text-red-500" size={20} />
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">YouTube SEO Metadata</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                           <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">Video Title</span>
                              <button onClick={() => copyToClipboard(youtubeMeta.title)} className="text-indigo-400 hover:text-white"><Copy size={12}/></button>
                           </div>
                           <p className="text-sm text-white font-medium">{youtubeMeta.title}</p>
                        </div>
                        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                           <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">Description</span>
                              <button onClick={() => copyToClipboard(youtubeMeta.description)} className="text-indigo-400 hover:text-white"><Copy size={12}/></button>
                           </div>
                           <p className="text-xs text-slate-400 leading-relaxed h-20 overflow-y-auto">{youtubeMeta.description}</p>
                        </div>
                    </div>
                    <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                           <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Hash size={12}/> SEO Tags</span>
                           <button onClick={() => copyToClipboard(youtubeMeta.tags)} className="text-indigo-400 hover:text-white"><Copy size={12}/></button>
                        </div>
                        <div className="flex-1 text-[10px] text-slate-500 font-mono leading-relaxed h-32 overflow-y-auto italic">
                           {youtubeMeta.tags}
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

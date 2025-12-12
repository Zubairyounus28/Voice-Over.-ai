
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Wand2, Mic, Volume2, Music, User, Smile, BookOpen, Newspaper, MessageSquare, Settings2, Languages, Globe, Users, PenTool, Sparkles, Upload, Fingerprint } from 'lucide-react';
import { AVAILABLE_VOICES, AVAILABLE_PODCAST_PAIRS, VoiceOption, PodcastPair, VoiceGender, SpeakingStyle } from '../types';
import { generateSpeech, translateToUrdu, generatePodcastScript, analyzeVoiceSample } from '../services/geminiService';
import { decodeBase64, decodeAudioData, audioBufferToWav, fileToBase64 } from '../utils/audioUtils';

export const VoiceOverPanel: React.FC = () => {
  const [text, setText] = useState<string>('');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(AVAILABLE_VOICES[1].id);
  const [selectedPairId, setSelectedPairId] = useState<string>(AVAILABLE_PODCAST_PAIRS[0].id);
  const [pitch, setPitch] = useState<number>(0); // detune in cents
  const [speakingStyle, setSpeakingStyle] = useState<SpeakingStyle>(SpeakingStyle.STANDARD);
  const [podcastLang, setPodcastLang] = useState<'ENGLISH' | 'URDU'>('ENGLISH');
  
  // Custom Voice State
  const [clonedVoices, setClonedVoices] = useState<VoiceOption[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessingScript, setIsProcessingScript] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  // Audio Context Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initialize AudioContext
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
    gainNodeRef.current = audioContextRef.current.createGain();
    gainNodeRef.current.connect(audioContextRef.current.destination);

    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setIsLoading(true);
    stopAudio(); 

    try {
      // If Podcast mode, use selectedPairId, else use selectedVoiceId
      const idToUse = speakingStyle === SpeakingStyle.PODCAST ? selectedPairId : selectedVoiceId;
      
      // Pass custom voice data if using a cloned voice
      const customVoice = clonedVoices.find(v => v.id === selectedVoiceId);
      
      const base64Audio = await generateSpeech(text, idToUse, speakingStyle, customVoice);
      const rawBytes = decodeBase64(base64Audio);
      
      if (audioContextRef.current) {
        const decodedBuffer = await decodeAudioData(rawBytes, audioContextRef.current);
        setAudioBuffer(decodedBuffer);
      }
    } catch (error) {
      alert("Failed to generate voice. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!text.trim()) return;
    setIsTranslating(true);
    try {
      const translatedText = await translateToUrdu(text);
      setText(translatedText);
      // Automatically switch to Urdu voice if regular mode
      if (speakingStyle !== SpeakingStyle.PODCAST) {
        const urduVoice = AVAILABLE_VOICES.find(v => v.isUrdu);
        if (urduVoice && selectedVoiceId !== urduVoice.id) {
          handleVoiceSelect(urduVoice);
        }
      }
    } catch (error) {
      alert("Translation failed.");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleGenerateScript = async () => {
      if (!text.trim()) return;
      setIsProcessingScript(true);
      try {
          const script = await generatePodcastScript(text, selectedPairId, podcastLang);
          setText(script);
      } catch (error) {
          alert("Failed to create script.");
      } finally {
          setIsProcessingScript(false);
      }
  };

  const handleVoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        alert("File too large. Please upload an audio sample under 10MB.");
        return;
      }

      setIsAnalyzing(true);
      try {
        const base64 = await fileToBase64(file);
        const analysis = await analyzeVoiceSample(base64, file.type);
        
        const newVoice: VoiceOption = {
          id: `custom_${Date.now()}`,
          name: analysis.name,
          gender: analysis.gender,
          description: analysis.description,
          geminiVoiceName: analysis.baseVoice,
          recommendedPitch: analysis.pitch,
          isCloned: true,
          stylePrompt: analysis.stylePrompt
        };

        setClonedVoices(prev => [...prev, newVoice]);
        handleVoiceSelect(newVoice);
      } catch (error) {
        alert("Failed to analyze voice sample. Please try a clearer recording.");
      } finally {
        setIsAnalyzing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleVoiceSelect = (voice: VoiceOption) => {
    setSelectedVoiceId(voice.id);
    setPitch(voice.recommendedPitch);
  };

  const playAudio = () => {
    if (!audioBuffer || !audioContextRef.current || !gainNodeRef.current) return;

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {}
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    
    // Disable pitch shifting for Podcast mode as it's multi-speaker mixed
    if (speakingStyle !== SpeakingStyle.PODCAST) {
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
      try {
        sourceNodeRef.current.stop();
      } catch (e) {}
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      playAudio();
    }
  };

  const handleDownload = () => {
    if (!audioBuffer) return;
    
    // For Podcast or zero pitch, direct download. For modified pitch, render offline.
    if (pitch === 0 || speakingStyle === SpeakingStyle.PODCAST) {
      const wavBlob = audioBufferToWav(audioBuffer);
      downloadBlob(wavBlob, 'voice-over.wav');
    } else {
      renderOfflineWithPitch(audioBuffer, pitch).then(renderedBuffer => {
        const wavBlob = audioBufferToWav(renderedBuffer);
        downloadBlob(wavBlob, 'voice-over-modified.wav');
      });
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderOfflineWithPitch = async (buffer: AudioBuffer, detuneVal: number): Promise<AudioBuffer> => {
    const rate = Math.pow(2, detuneVal / 1200);
    const newDuration = buffer.duration / rate;
    
    const offlineCtx = new OfflineAudioContext(
      buffer.numberOfChannels,
      Math.ceil(newDuration * buffer.sampleRate),
      buffer.sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;
    source.detune.value = detuneVal;
    source.connect(offlineCtx.destination);
    source.start(0);

    return await offlineCtx.startRendering();
  };

  // Group voices by gender for UI
  const allVoices = [...AVAILABLE_VOICES, ...clonedVoices];
  const groupedVoices = {
    [VoiceGender.MALE]: allVoices.filter(v => v.gender === VoiceGender.MALE),
    [VoiceGender.FEMALE]: allVoices.filter(v => v.gender === VoiceGender.FEMALE),
    [VoiceGender.CHILD]: allVoices.filter(v => v.gender === VoiceGender.CHILD),
  };

  const currentVoice = allVoices.find(v => v.id === selectedVoiceId);
  const currentPair = AVAILABLE_PODCAST_PAIRS.find(p => p.id === selectedPairId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[600px]">
      
      {/* LEFT SIDEBAR - SETTINGS */}
      <div className="lg:col-span-4 flex flex-col gap-4 h-full overflow-hidden">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-700 bg-slate-800/80 backdrop-blur-sm z-10 flex justify-between items-center">
             <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
               <Settings2 size={16} />
               Configuration
             </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
            
            {/* Style Selection */}
            <section className={currentVoice?.isUrdu && speakingStyle !== SpeakingStyle.PODCAST ? 'opacity-50 pointer-events-none grayscale' : ''}>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex justify-between">
                <span>Speaking Style</span>
                {currentVoice?.isUrdu && speakingStyle !== SpeakingStyle.PODCAST && <span className="text-[10px] text-amber-500">Auto-set for Urdu</span>}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: SpeakingStyle.STANDARD, label: 'Standard', icon: MessageSquare },
                  { id: SpeakingStyle.FICTION, label: 'Fiction', icon: BookOpen },
                  { id: SpeakingStyle.NON_FICTION, label: 'Docu', icon: Newspaper },
                  { id: SpeakingStyle.SINGING, label: 'Singing', icon: Music },
                  { id: SpeakingStyle.PODCAST, label: 'Podcast', icon: Users },
                ].map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSpeakingStyle(style.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                      speakingStyle === style.id
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20'
                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600 hover:bg-slate-800'
                    }`}
                  >
                    <style.icon size={20} className="mb-1" />
                    <span className="text-xs font-medium">{style.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {speakingStyle === SpeakingStyle.PODCAST ? (
              /* PODCAST SETTINGS */
              <section className="animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                   <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Podcast Duo</h3>
                   <div className="flex items-center bg-slate-700 rounded-lg p-0.5">
                      <button 
                        onClick={() => setPodcastLang('ENGLISH')}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${podcastLang === 'ENGLISH' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'}`}
                      >
                        ENG
                      </button>
                      <button 
                        onClick={() => setPodcastLang('URDU')}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${podcastLang === 'URDU' ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      >
                        URDU
                      </button>
                   </div>
                </div>
                
                <div className="space-y-2">
                   {AVAILABLE_PODCAST_PAIRS.map(pair => (
                     <button
                        key={pair.id}
                        onClick={() => setSelectedPairId(pair.id)}
                        className={`w-full flex items-center p-3 rounded-xl border transition-all text-left group ${
                          selectedPairId === pair.id
                            ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                            : 'bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300'
                        }`}
                     >
                       <div className="flex-1">
                          <div className="text-sm font-bold">{pair.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{pair.description}</div>
                          <div className="flex gap-2 mt-2">
                             <span className="text-[10px] bg-slate-800 border border-slate-600 px-1.5 py-0.5 rounded text-slate-400">{pair.speaker1.label}</span>
                             <span className="text-[10px] bg-slate-800 border border-slate-600 px-1.5 py-0.5 rounded text-slate-400">{pair.speaker2.label}</span>
                          </div>
                       </div>
                     </button>
                   ))}
                </div>
              </section>
            ) : (
              /* SINGLE VOICE SETTINGS */
              <>
                <section>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Voice Persona</h3>
                        <div className="relative">
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="audio/*,video/*"
                                onChange={handleVoiceUpload}
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isAnalyzing}
                                className="flex items-center gap-1.5 px-2 py-1 bg-slate-700 hover:bg-indigo-600 text-white text-[10px] font-bold uppercase rounded transition-colors"
                            >
                                {isAnalyzing ? <span className="animate-spin">⌛</span> : <Fingerprint size={12} />}
                                {isAnalyzing ? 'Analyzing...' : 'Clone Voice'}
                            </button>
                        </div>
                    </div>
                  
                  <div className="space-y-4">
                    {(['MALE', 'FEMALE', 'CHILD'] as VoiceGender[]).map((category) => {
                      const voices = groupedVoices[category];
                      if (!voices.length) return null;
                      
                      let label = '';
                      let icon = null;
                      if (category === VoiceGender.CHILD) { label = 'Kids'; icon = <Smile size={14} className="text-yellow-400" />; }
                      if (category === VoiceGender.FEMALE) { label = 'Women'; icon = <User size={14} className="text-pink-400" />; }
                      if (category === VoiceGender.MALE) { label = 'Men'; icon = <User size={14} className="text-blue-400" />; }

                      return (
                        <div key={category}>
                          <div className="flex items-center gap-2 mb-2 px-1">
                            {icon}
                            <span className="text-xs font-medium text-slate-400">{label}</span>
                          </div>
                          <div className="space-y-1">
                            {voices.map((voice) => (
                              <button
                                key={voice.id}
                                onClick={() => handleVoiceSelect(voice)}
                                className={`w-full flex items-center p-2 rounded-lg border transition-all text-left group ${
                                  selectedVoiceId === voice.id
                                    ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300'
                                    : 'bg-transparent border-transparent hover:bg-slate-700/50 text-slate-300'
                                }`}
                              >
                                <div className={`w-2 h-2 rounded-full mr-3 shrink-0 ${
                                  selectedVoiceId === voice.id ? 'bg-indigo-400' : 'bg-slate-600'
                                } ${voice.isCloned ? 'animate-pulse' : ''}`} />
                                <div className="flex-1">
                                  <div className="text-sm font-medium flex items-center gap-2">
                                    {voice.name}
                                    {voice.isUrdu && <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded uppercase tracking-wider">Urdu</span>}
                                    {voice.isCloned && <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded uppercase tracking-wider">Clone</span>}
                                  </div>
                                  <div className="text-[10px] text-slate-500 truncate max-w-[180px]">{voice.description}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Pitch Control */}
                <section>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pitch Shift</h3>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${pitch !== 0 ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-700 text-slate-400'}`}>
                      {pitch > 0 ? '+' : ''}{pitch}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-1200"
                    max="1200"
                    step="50"
                    value={pitch}
                    onChange={(e) => setPitch(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-600 mt-1 font-medium">
                    <span>Deep</span>
                    <span>Natural</span>
                    <span>High</span>
                  </div>
                </section>
              </>
            )}

          </div>
        </div>
      </div>

      {/* RIGHT AREA - WORKSPACE */}
      <div className="lg:col-span-8 flex flex-col gap-4 h-full">
        
        {/* Editor */}
        <div className="flex-1 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <label className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
               <span>Script Editor</span>
               <span className="text-xs font-normal text-slate-500 border-l border-slate-600 pl-2 ml-2">{text.length} chars</span>
            </label>
            
            <div className="flex gap-2">
              {speakingStyle === SpeakingStyle.PODCAST && (
                  <button 
                  onClick={handleGenerateScript}
                  disabled={isProcessingScript || !text}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors border border-indigo-500 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                >
                  {isProcessingScript ? (
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Sparkles size={14} />
                  )}
                  Auto-Script
                </button>
              )}
              
              <button 
                onClick={handleTranslate}
                disabled={isTranslating || !text || speakingStyle === SpeakingStyle.PODCAST}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                    speakingStyle === SpeakingStyle.PODCAST 
                    ? 'opacity-0 pointer-events-none' 
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600'
                }`}
              >
                {isTranslating ? (
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Globe size={14} />
                )}
                Translate to Urdu
              </button>
            </div>
          </div>
          
          <textarea
            className={`flex-1 w-full bg-slate-900/50 border border-slate-700 rounded-xl p-6 text-lg text-slate-100 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none resize-none transition-all placeholder-slate-600 leading-relaxed ${
              currentVoice?.isUrdu || podcastLang === 'URDU' ? 'text-right font-[Inter]' : ''
            }`}
            style={{ direction: currentVoice?.isUrdu || (speakingStyle === SpeakingStyle.PODCAST && podcastLang === 'URDU') ? 'rtl' : 'ltr' }}
            placeholder={
              speakingStyle === SpeakingStyle.PODCAST ? `Enter a topic or a script...\n\nExample Format:\n${currentPair?.speaker1.name}: Hello there!\n${currentPair?.speaker2.name}: Hi! How are you?\n\n(Or just click 'Auto-Script' to convert raw text)` :
              speakingStyle === SpeakingStyle.FICTION ? "Once upon a time, in a land far away..." :
              "Enter your text here..."
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <div className="mt-6 flex justify-end">
             <button
              onClick={handleGenerate}
              disabled={isLoading || !text}
              className={`flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-lg transition-all transform active:scale-95 ${
                isLoading || !text 
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-500/25 ring-1 ring-white/10'
              }`}
             >
               {isLoading ? (
                 <>
                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                   <span>Generating Audio...</span>
                 </>
               ) : (
                 <>
                   <Wand2 size={20} />
                   <span>Generate Voice Over</span>
                 </>
               )}
             </button>
          </div>
        </div>

        {/* Player Bar */}
        <div className={`bg-slate-900 rounded-2xl border border-slate-800 p-4 flex items-center gap-4 transition-all duration-500 ${audioBuffer ? 'opacity-100 translate-y-0' : 'opacity-50 translate-y-4 pointer-events-none'}`}>
             <button 
                  onClick={togglePlayback}
                  className="w-14 h-14 flex items-center justify-center rounded-full bg-white text-slate-950 hover:scale-105 transition-all shadow-lg shadow-white/10 shrink-0"
                >
                  {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
            </button>
            
            <div className="flex-1 overflow-hidden">
                <div className="flex items-baseline justify-between mb-1">
                  <h3 className="font-semibold text-slate-200 truncate flex items-center gap-2">
                    {speakingStyle === SpeakingStyle.PODCAST ? (
                        <><Users size={14} className="text-purple-400" /> Podcast: {currentPair?.name}</>
                    ) : (
                        <>{speakingStyle === SpeakingStyle.FICTION ? 'Story' : speakingStyle === SpeakingStyle.SINGING ? 'Song' : 'Speech'} Audio</>
                    )}
                     
                     {(currentVoice?.isUrdu || (speakingStyle === SpeakingStyle.PODCAST && podcastLang === 'URDU')) && <span className="text-[10px] bg-green-900 text-green-300 px-1.5 rounded border border-green-800">Urdu</span>}
                     {currentVoice?.isCloned && <span className="text-[10px] bg-purple-900 text-purple-300 px-1.5 rounded border border-purple-800">Cloned</span>}
                  </h3>
                  <span className="text-xs text-indigo-400 font-mono">
                    {audioBuffer ? `${audioBuffer.duration.toFixed(1)}s` : '--:--'}
                  </span>
                </div>
                {/* Mock Waveform Visualization */}
                <div className="h-8 flex items-center gap-0.5 opacity-50">
                  {Array.from({ length: 40 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="flex-1 bg-indigo-500 rounded-full transition-all duration-300"
                      style={{ 
                        height: isPlaying ? `${Math.random() * 100}%` : '20%',
                        opacity: isPlaying ? 1 : 0.3
                      }} 
                    />
                  ))}
                </div>
            </div>

            <div className="h-10 w-px bg-slate-800 mx-2"></div>

            <button 
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors font-medium shrink-0"
            >
              <Download size={18} />
              <span>Save WAV</span>
            </button>
        </div>

      </div>
    </div>
  );
};

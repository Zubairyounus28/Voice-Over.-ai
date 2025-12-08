
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Wand2, Mic, Volume2, Music, User, Smile, BookOpen, Newspaper, MessageSquare, Settings2 } from 'lucide-react';
import { AVAILABLE_VOICES, VoiceOption, VoiceGender, SpeakingStyle } from '../types';
import { generateSpeech } from '../services/geminiService';
import { decodeBase64, decodeAudioData, audioBufferToWav } from '../utils/audioUtils';

export const VoiceOverPanel: React.FC = () => {
  const [text, setText] = useState<string>('');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(AVAILABLE_VOICES[1].id);
  const [pitch, setPitch] = useState<number>(0); // detune in cents
  const [speakingStyle, setSpeakingStyle] = useState<SpeakingStyle>(SpeakingStyle.STANDARD);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  // Audio Context Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

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
    stopAudio(); // Stop any current playback

    try {
      const base64Audio = await generateSpeech(text, selectedVoiceId, speakingStyle);
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

  const handleVoiceSelect = (voice: VoiceOption) => {
    setSelectedVoiceId(voice.id);
    setPitch(voice.recommendedPitch);
  };

  const playAudio = () => {
    if (!audioBuffer || !audioContextRef.current || !gainNodeRef.current) return;

    // Close previous source if running
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {}
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    
    // Apply pitch (detune)
    source.detune.value = pitch; 

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
    
    // To download with the PITCH shift applied, we render offline.
    if (pitch === 0) {
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
    // Estimate new duration (detune affects playback rate)
    // Rate = 2 ^ (cents / 1200)
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
  const groupedVoices = {
    [VoiceGender.MALE]: AVAILABLE_VOICES.filter(v => v.gender === VoiceGender.MALE),
    [VoiceGender.FEMALE]: AVAILABLE_VOICES.filter(v => v.gender === VoiceGender.FEMALE),
    [VoiceGender.CHILD]: AVAILABLE_VOICES.filter(v => v.gender === VoiceGender.CHILD),
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[600px]">
      
      {/* LEFT SIDEBAR - SETTINGS */}
      <div className="lg:col-span-4 flex flex-col gap-4 h-full overflow-hidden">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-700 bg-slate-800/80 backdrop-blur-sm z-10">
             <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
               <Settings2 size={16} />
               Configuration
             </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
            
            {/* Style Selection */}
            <section>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Speaking Style</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: SpeakingStyle.STANDARD, label: 'Standard', icon: MessageSquare },
                  { id: SpeakingStyle.FICTION, label: 'Fiction', icon: BookOpen },
                  { id: SpeakingStyle.NON_FICTION, label: 'Docu', icon: Newspaper },
                  { id: SpeakingStyle.SINGING, label: 'Singing', icon: Music },
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

            {/* Voice Selection */}
            <section>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Voice Persona</h3>
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
                            }`} />
                            <div className="flex-1">
                              <div className="text-sm font-medium">{voice.name}</div>
                              <div className="text-[10px] text-slate-500">{voice.description}</div>
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

          </div>
        </div>
      </div>

      {/* RIGHT AREA - WORKSPACE */}
      <div className="lg:col-span-8 flex flex-col gap-4 h-full">
        
        {/* Editor */}
        <div className="flex-1 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl flex flex-col relative overflow-hidden">
          <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex justify-between">
             <span>Script Editor</span>
             <span className="text-xs font-normal text-slate-500">{text.length} characters</span>
          </label>
          
          <textarea
            className="flex-1 w-full bg-slate-900/50 border border-slate-700 rounded-xl p-6 text-lg text-slate-100 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none resize-none transition-all placeholder-slate-600 leading-relaxed"
            placeholder={
              speakingStyle === SpeakingStyle.FICTION ? "Once upon a time, in a land far away..." :
              speakingStyle === SpeakingStyle.NON_FICTION ? "The distinct characteristics of the species..." :
              speakingStyle === SpeakingStyle.SINGING ? "Happy birthday to you..." :
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
                  <h3 className="font-semibold text-slate-200 truncate">
                    {speakingStyle === SpeakingStyle.FICTION ? 'Story Audio' : 
                     speakingStyle === SpeakingStyle.NON_FICTION ? 'Documentary Audio' : 
                     speakingStyle === SpeakingStyle.SINGING ? 'Song Audio' : 'Speech Audio'}
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

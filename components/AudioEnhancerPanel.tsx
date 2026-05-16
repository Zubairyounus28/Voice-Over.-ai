
import React, { useState, useRef } from 'react';
import { Upload, Music, Play, Pause, Download, RefreshCw, Volume2, Check, Sparkles, Briefcase, Zap, Headphones } from 'lucide-react';
import { decodeAudioData, audioBufferToWav } from '../utils/audioUtils';

interface BackgroundMusic {
  id: string;
  name: string;
  url: string;
  genre: string;
}

const BACKGROUND_MUSIC_TRACKS: BackgroundMusic[] = [
  { 
    id: 'corporate_1', 
    name: 'Corporate Success', 
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 
    genre: 'Corporate' 
  },
  { 
    id: 'energetic_1', 
    name: 'Modern Energy', 
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', 
    genre: 'Energetic' 
  },
  { 
    id: 'smooth_1', 
    name: 'Smooth Business', 
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', 
    genre: 'Smooth' 
  },
  { 
    id: 'minimal_1', 
    name: 'Minimal Tech', 
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', 
    genre: 'Tech' 
  }
];

export const AudioEnhancerPanel: React.FC = () => {
  const [voiceAudio, setVoiceAudio] = useState<File | null>(null);
  const [customMusic, setCustomMusic] = useState<File | null>(null);
  const [selectedMusicId, setSelectedMusicId] = useState<string>(BACKGROUND_MUSIC_TRACKS[0].id);
  const [isProcessing, setIsProcessing] = useState(false);
  const [enhancedAudioUrl, setEnhancedAudioUrl] = useState<string | null>(null);
  const [musicVolume, setMusicVolume] = useState(0.2);
  const [voiceVolume, setVoiceVolume] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVoiceAudio(e.target.files[0]);
      setEnhancedAudioUrl(null);
    }
  };

  const handleCustomMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCustomMusic(e.target.files[0]);
      setSelectedMusicId('custom');
      setEnhancedAudioUrl(null);
    }
  };

  const processAudio = async () => {
    if (!voiceAudio) return;

    setIsProcessing(true);
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // 1. Load Voice Audio
      let voiceBuffer: AudioBuffer;
      try {
        const voiceArrayBuffer = await voiceAudio.arrayBuffer();
        voiceBuffer = await audioCtx.decodeAudioData(voiceArrayBuffer);
      } catch (e) {
        console.error("Voice decoding error:", e);
        throw new Error("Could not decode your uploaded voice file. Please ensure it is a valid MP3, WAV, or M4A file.");
      }

      // 2. Load Music Audio
      let musicBuffer: AudioBuffer;
      
      if (selectedMusicId === 'custom' && customMusic) {
        try {
          const musicArrayBuffer = await customMusic.arrayBuffer();
          musicBuffer = await audioCtx.decodeAudioData(musicArrayBuffer);
        } catch (e) {
          console.error("Custom music decoding error:", e);
          throw new Error("Could not decode your custom background music. Please try a different audio file.");
        }
      } else {
        const selectedMusic = BACKGROUND_MUSIC_TRACKS.find(m => m.id === selectedMusicId)!;
        try {
          // Use the server-side proxy to bypass CORS
          const proxyUrl = `/api/proxy-audio?url=${encodeURIComponent(selectedMusic.url)}`;
          const musicResponse = await fetch(proxyUrl);
          
          if (!musicResponse.ok) {
            throw new Error(`Failed to download music track via proxy (Status: ${musicResponse.status}). Please try uploading your own background music below.`);
          }
          const musicArrayBuffer = await musicResponse.arrayBuffer();
          musicBuffer = await audioCtx.decodeAudioData(musicArrayBuffer);
        } catch (e: any) {
          console.error("Music fetch/decoding error:", e);
          const msg = e.message.includes('Failed to fetch') 
            ? "Network error: The background music could not be downloaded. Please use the 'Upload Custom Music' option to provide your own background track."
            : e.message;
          throw new Error(msg);
        }
      }

      // 3. Setup Offline Context for Mixing
      const offlineCtx = new OfflineAudioContext(
        2, // Stereo
        voiceBuffer.length, // Match voice length
        voiceBuffer.sampleRate
      );

      // Voice Source
      const voiceSource = offlineCtx.createBufferSource();
      voiceSource.buffer = voiceBuffer;
      const voiceGain = offlineCtx.createGain();
      voiceGain.gain.value = voiceVolume;
      voiceSource.connect(voiceGain);
      voiceGain.connect(offlineCtx.destination);

      // Music Source
      const musicSource = offlineCtx.createBufferSource();
      musicSource.buffer = musicBuffer;
      musicSource.loop = true; // Loop music if shorter than voice
      const musicGain = offlineCtx.createGain();
      musicGain.gain.value = musicVolume;
      musicSource.connect(musicGain);
      
      // Mastering Chain (Simple Compression for professional feel)
      const compressor = offlineCtx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-24, offlineCtx.currentTime);
      compressor.knee.setValueAtTime(40, offlineCtx.currentTime);
      compressor.ratio.setValueAtTime(12, offlineCtx.currentTime);
      compressor.attack.setValueAtTime(0.003, offlineCtx.currentTime);
      compressor.release.setValueAtTime(0.25, offlineCtx.currentTime);

      // Connect everything to compressor then to destination
      voiceGain.connect(compressor);
      musicGain.connect(compressor);
      compressor.connect(offlineCtx.destination);

      // Start both
      voiceSource.start(0);
      musicSource.start(0);

      // Render
      const renderedBuffer = await offlineCtx.startRendering();
      
      // Convert to WAV
      const blob = audioBufferToWav(renderedBuffer);
      const url = URL.createObjectURL(blob);
      setEnhancedAudioUrl(url);
      
    } catch (error) {
      console.error("Audio mixing error:", error);
      alert("Failed to process audio. Please try a different file or music track.");
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Headphones className="text-indigo-400" /> Audio Enhancer
          </h2>
          <p className="text-xs text-slate-400 mt-1">Add professional background music and effects to your voiceovers.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Upload & Settings */}
          <div className="space-y-6">
            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">1. Upload Voiceover</h3>
              <div className="relative group">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center gap-3 ${voiceAudio ? 'border-green-500/50 bg-green-500/5' : 'border-slate-800 bg-slate-950 group-hover:border-indigo-500/50 group-hover:bg-indigo-500/5'}`}>
                  <div className={`p-4 rounded-full ${voiceAudio ? 'bg-green-500/20 text-green-400' : 'bg-slate-900 text-slate-500'}`}>
                    <Upload size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-white">
                      {voiceAudio ? voiceAudio.name : "Click or drag to upload audio"}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">MP3, WAV, or M4A supported</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">2. Select Background Music</h3>
              <div className="grid grid-cols-2 gap-3">
                {BACKGROUND_MUSIC_TRACKS.map(track => (
                  <button
                    key={track.id}
                    onClick={() => setSelectedMusicId(track.id)}
                    className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden group ${selectedMusicId === track.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                  >
                    <div className="relative z-10">
                      <div className="text-[10px] font-bold uppercase opacity-60 mb-1">{track.genre}</div>
                      <div className="text-xs font-bold">{track.name}</div>
                    </div>
                    <Music size={40} className={`absolute -right-2 -bottom-2 opacity-10 transition-transform group-hover:scale-110 ${selectedMusicId === track.id ? 'text-white' : 'text-slate-500'}`} />
                  </button>
                ))}
                
                {/* Custom Music Option */}
                <div className="relative group col-span-2">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleCustomMusicUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className={`p-4 rounded-xl border border-dashed transition-all flex items-center justify-between gap-3 ${selectedMusicId === 'custom' ? 'bg-green-600/20 border-green-500 text-green-400' : 'bg-slate-950 border-slate-800 text-slate-500 group-hover:border-indigo-500/50 group-hover:bg-indigo-500/5'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${selectedMusicId === 'custom' ? 'bg-green-500/20' : 'bg-slate-900'}`}>
                        <Upload size={16} />
                      </div>
                      <div className="text-left">
                        <div className="text-[10px] font-bold uppercase opacity-60">Custom Track</div>
                        <div className="text-xs font-bold">{customMusic ? customMusic.name : "Upload your own music"}</div>
                      </div>
                    </div>
                    {selectedMusicId === 'custom' && <Check size={16} className="text-green-400" />}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">3. Mix Settings</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                    <span className="text-slate-400">Music Volume</span>
                    <span className="text-indigo-400">{Math.round(musicVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.01"
                    value={musicVolume}
                    onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                    <span className="text-slate-400">Voice Volume</span>
                    <span className="text-indigo-400">{Math.round(voiceVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.01"
                    value={voiceVolume}
                    onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>
              </div>
            </section>

            <button
              onClick={processAudio}
              disabled={!voiceAudio || isProcessing}
              className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${!voiceAudio || isProcessing ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'}`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  Processing Audio...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Enhance & Mix Audio
                </>
              )}
            </button>
          </div>

          {/* Right Column: Preview & Results */}
          <div className="space-y-6">
            <section className="h-full flex flex-col">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Preview & Result</h3>
              
              <div className="flex-1 bg-slate-950 rounded-3xl border border-slate-800 p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
                {enhancedAudioUrl ? (
                  <div className="space-y-8 w-full animate-fade-in">
                    <div className="relative">
                      <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full animate-pulse" />
                      <div className="relative bg-slate-900 w-32 h-32 rounded-full mx-auto flex items-center justify-center border-4 border-indigo-500 shadow-2xl">
                        <Volume2 size={48} className="text-indigo-400" />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xl font-bold text-white">Audio Enhanced!</h4>
                      <p className="text-sm text-slate-400 mt-2">Your voiceover is now mixed with professional background music.</p>
                    </div>

                    <div className="space-y-4">
                      <audio
                        ref={audioRef}
                        src={enhancedAudioUrl}
                        onEnded={() => setIsPlaying(false)}
                        className="hidden"
                      />
                      
                      <div className="flex items-center justify-center gap-4">
                        <button
                          onClick={togglePlayback}
                          className="w-16 h-16 rounded-full bg-white text-slate-900 flex items-center justify-center hover:scale-105 transition-transform shadow-xl"
                        >
                          {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                        </button>
                        
                        <a
                          href={enhancedAudioUrl}
                          download="enhanced_corporate_audio.wav"
                          className="w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:scale-105 transition-transform shadow-xl"
                        >
                          <Download size={24} />
                        </a>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-slate-800/50">
                      <div className="flex items-center justify-center gap-6">
                        <div className="flex flex-col items-center gap-1">
                          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                            <Briefcase size={16} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Corporate</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                            <Zap size={16} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">High Energy</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                            <Check size={16} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Mastered</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 opacity-40">
                    <div className="w-24 h-24 rounded-full border-4 border-dashed border-slate-700 mx-auto flex items-center justify-center">
                      <Music size={32} className="text-slate-600" />
                    </div>
                    <p className="text-sm text-slate-500 font-medium">Upload and process to see the result</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

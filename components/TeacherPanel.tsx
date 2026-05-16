
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Wand2, GraduationCap, FileText, Globe, RefreshCw, Image as ImageIcon, Copy, Check, Youtube, Hash } from 'lucide-react';
import { AVAILABLE_VOICES, VoiceOption, SpeakingStyle } from '../types';
import { decodeBase64, decodeAudioData, audioBufferToWav } from '../utils/audioUtils';
import { generateTeacherLesson, generateTeacherMeta, generateSpeech } from '../services/geminiService';

export const TeacherPanel: React.FC = () => {
  const [topic, setTopic] = useState<string>('');
  const [urduLesson, setUrduLesson] = useState<string>('');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(AVAILABLE_VOICES.find(v => v.id === 'urdu_male_narrator')?.id || AVAILABLE_VOICES[0].id);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState<boolean>(false);
  
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [youtubeMeta, setYoutubeMeta] = useState<{title: string, description: string, tags: string} | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [copied, setCopied] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
    gainNodeRef.current = audioContextRef.current.createGain();
    gainNodeRef.current.connect(audioContextRef.current.destination);
    return () => { audioContextRef.current?.close(); };
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const generateLesson = async () => {
    if (!topic.trim()) return;
    setIsLoading(true);
    try {
      const lesson = await generateTeacherLesson(topic);
      setUrduLesson(lesson);
    } catch (error) {
      console.error(error);
      alert("Failed to generate lesson.");
    } finally {
      setIsLoading(false);
    }
  };

  const generateThumbnail = async () => {
    if (!urduLesson.trim()) return;
    setIsGeneratingThumbnail(true);
    try {
      const data = await generateTeacherMeta(urduLesson);
      if (data.imageUrl) setThumbnailUrl(`data:image/png;base64,${data.imageUrl}`);
      if (data.metadata) setYoutubeMeta(data.metadata);
    } catch (error) {
      console.error(error);
      alert("Failed to generate thumbnail.");
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

  const generateAudio = async () => {
    if (!urduLesson.trim()) return;
    setIsGeneratingAudio(true);
    stopAudio();
    try {
      const base64Audio = await generateSpeech(urduLesson, selectedVoiceId);
      if (base64Audio) {
        const rawBytes = decodeBase64(base64Audio);
        if (audioContextRef.current) {
          const decoded = await decodeAudioData(rawBytes, audioContextRef.current);
          setAudioBuffer(decoded);
        }
      }
    } catch (error) {
      console.error(error);
      alert("Failed to generate audio.");
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const playAudio = () => {
    if (!audioBuffer || !audioContextRef.current || !gainNodeRef.current) return;
    stopAudio();
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
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
    a.download = `teacher_lesson_urdu.wav`;
    a.click();
  };

  const teacherVoices = AVAILABLE_VOICES.filter(v => v.isUrdu);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
      {/* Input Section */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6">
          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
              <FileText size={14} /> Lesson Topic
            </h3>
            <textarea
              className="w-full h-48 bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 text-sm focus:ring-2 focus:ring-yellow-500/30 outline-none resize-none placeholder-slate-700"
              placeholder="Paste your English lesson or topic here..."
              value={topic}
              onChange={e => setTopic(e.target.value)}
            />
            <button
              onClick={generateLesson}
              disabled={isLoading || !topic.trim()}
              className="w-full mt-4 py-3 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <Wand2 size={18} />}
              Generate Urdu Lesson
            </button>
          </section>

          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
              <GraduationCap size={14} /> Teacher Voice
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
              {teacherVoices.map(v => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVoiceId(v.id)}
                  className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${selectedVoiceId === v.id ? 'bg-yellow-600/10 border-yellow-500 text-yellow-300' : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-800'}`}
                >
                  <div className={`w-2 h-2 rounded-full ${selectedVoiceId === v.id ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]' : 'bg-slate-800'}`} />
                  <div className="flex-1">
                    <div className="text-xs font-bold">{v.name}</div>
                    <div className="text-[10px] opacity-50">{v.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Output Section */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        {/* Urdu Lesson Display */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl flex-1 flex flex-col min-h-[300px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Globe size={14} /> Urdu Explanation
            </h3>
            <div className="flex gap-2">
              {urduLesson && (
                <>
                  <button
                    onClick={() => handleCopy(urduLesson, 'lesson')}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all flex items-center gap-2 text-[10px] font-bold"
                  >
                    {copied === 'lesson' ? <Check size={12} /> : <Copy size={12} />}
                    {copied === 'lesson' ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={generateAudio}
                    disabled={isGeneratingAudio}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-2"
                  >
                    {isGeneratingAudio ? <RefreshCw className="animate-spin" size={12} /> : <Play size={12} />}
                    Generate Voiceover
                  </button>
                  <button
                    onClick={generateThumbnail}
                    disabled={isGeneratingThumbnail}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-2"
                  >
                    {isGeneratingThumbnail ? <RefreshCw className="animate-spin" size={12} /> : <ImageIcon size={12} />}
                    YouTube Thumbnail
                  </button>
                </>
              )}
            </div>
          </div>
          
          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-6 text-slate-200 text-lg overflow-y-auto leading-relaxed text-right font-medium">
            {urduLesson || <div className="text-slate-700 italic text-center text-sm py-20">Urdu lesson will appear here after generation...</div>}
          </div>
        </div>

        {/* Thumbnail & Meta Section */}
        {(thumbnailUrl || youtubeMeta) && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <ImageIcon size={12} /> Thumbnail Preview
              </h4>
              <div className="aspect-video bg-black rounded-xl border border-slate-800 overflow-hidden relative group">
                {thumbnailUrl ? (
                  <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                ) : isGeneratingThumbnail ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-700">
                    <RefreshCw size={24} className="animate-spin mb-2" />
                    <span className="text-[10px]">Generating...</span>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-800 bg-slate-950">
                    <ImageIcon size={24} className="mb-2 opacity-20" />
                    <span className="text-[10px] opacity-20">No image generated</span>
                  </div>
                )}
              </div>
              {thumbnailUrl && (
                <a 
                  href={thumbnailUrl} 
                  download="youtube_thumbnail.png"
                  className="inline-block text-xs text-yellow-400 hover:text-yellow-300 font-bold"
                >
                  Download Thumbnail
                </a>
              )}
            </div>

            {youtubeMeta && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Youtube size={12} /> SEO Metadata
                </h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[8px] font-bold text-slate-600 uppercase">Title</span>
                      <button onClick={() => handleCopy(youtubeMeta.title, 'meta-title')} className="text-[8px] text-indigo-400 hover:text-indigo-300">Copy</button>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-[10px] text-slate-300 line-clamp-1">{youtubeMeta.title}</div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[8px] font-bold text-slate-600 uppercase">Description</span>
                      <button onClick={() => handleCopy(youtubeMeta.description, 'meta-desc')} className="text-[8px] text-indigo-400 hover:text-indigo-300">Copy</button>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-[10px] text-slate-300 line-clamp-2 leading-relaxed">{youtubeMeta.description}</div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {youtubeMeta.tags.split(',').slice(0, 5).map((tag, i) => (
                      <span key={i} className="text-[7px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Hash size={6} /> {tag.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Audio Player Controls */}
        {audioBuffer && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl flex items-center gap-4 animate-fade-in">
            <button
              onClick={togglePlayback}
              className="w-14 h-14 bg-yellow-600 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-all"
            >
              {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
            </button>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-2">
                 <span className="text-xs font-bold text-white uppercase tracking-widest">Lesson Audio</span>
                 <span className="text-[10px] font-mono text-yellow-400">{audioBuffer.duration.toFixed(1)}s</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-500 transition-all" 
                  style={{ width: isPlaying ? '100%' : '0%', transitionDuration: isPlaying ? `${audioBuffer.duration}s` : '0s', transitionTimingFunction: 'linear' }} 
                />
              </div>
            </div>
            <button
              onClick={handleDownload}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg"
            >
              <Download size={16} /> Download Audio
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


import React, { useState, useRef, useEffect } from 'react';
import { Upload, Scissors, FileAudio, Play, Pause, Download, Archive, RefreshCw, Music, Trash2, CheckCircle2, Info, HelpCircle, Zap, ShieldCheck } from 'lucide-react';
import { audioBufferToWav } from '../utils/audioUtils';
import JSZip from 'jszip';

interface SlicedPart {
  id: number;
  blob: Blob;
  duration: number;
  url: string;
  buffer: AudioBuffer;
}

export const AudioSplitterPanel: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parts, setParts] = useState<SlicedPart[]>([]);
  const [currentPartId, setCurrentPartId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContextClass();
    return () => { audioContextRef.current?.close(); };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setParts([]);
    }
  };

  const splitAudio = async () => {
    if (!file || !audioContextRef.current) return;
    setIsProcessing(true);
    setParts([]);

    try {
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const arrayBuffer = await file.arrayBuffer();
      const fullBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      const partDuration = 7; // seconds
      const sampleRate = fullBuffer.sampleRate;
      const totalSeconds = fullBuffer.duration;
      const numParts = Math.ceil(totalSeconds / partDuration);
      
      const newParts: SlicedPart[] = [];

      for (let i = 0; i < numParts; i++) {
        const startOffset = Math.floor(i * partDuration * sampleRate);
        const endOffset = Math.floor(Math.min((i + 1) * partDuration * sampleRate, fullBuffer.length));
        const frameCount = endOffset - startOffset;
        
        if (frameCount <= 0) continue;
        
        const partBuffer = audioContextRef.current.createBuffer(
          fullBuffer.numberOfChannels,
          frameCount,
          sampleRate
        );

        for (let channel = 0; channel < fullBuffer.numberOfChannels; channel++) {
          const channelData = fullBuffer.getChannelData(channel);
          const partChannelData = partBuffer.getChannelData(channel);
          partChannelData.set(channelData.subarray(startOffset, endOffset));
        }

        const wavBlob = audioBufferToWav(partBuffer);
        newParts.push({
          id: i + 1,
          blob: wavBlob,
          duration: partBuffer.duration,
          url: URL.createObjectURL(wavBlob),
          buffer: partBuffer
        });
      }

      setParts(newParts);
    } catch (error: any) {
      console.error("Splitting error:", error);
      alert("Failed to process audio. Error: " + (error.message || String(error)));
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePartPlayback = (part: SlicedPart) => {
    if (!audioContextRef.current) return;

    if (currentPartId === part.id && isPlaying) {
      sourceNodeRef.current?.stop();
      setIsPlaying(false);
      setCurrentPartId(null);
    } else {
      sourceNodeRef.current?.stop();
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = part.buffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => {
        setIsPlaying(false);
        setCurrentPartId(null);
      };
      
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().then(() => source.start(0));
      } else {
        source.start(0);
      }
      
      sourceNodeRef.current = source;
      setIsPlaying(true);
      setCurrentPartId(part.id);
    }
  };

  const downloadPart = (part: SlicedPart) => {
    const a = document.createElement('a');
    a.href = part.url;
    a.download = `part_${part.id}.wav`;
    a.click();
  };

  const downloadAllAsZip = async () => {
    if (parts.length === 0) return;
    setIsProcessing(true);
    try {
      const zip = new JSZip();
      parts.forEach((part) => {
        zip.file(`part_${part.id.toString().padStart(3, '0')}.wav`, part.blob);
      });
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file?.name.split('.')[0] || 'audio'}_split_parts.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Failed to create ZIP archive.");
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setParts([]);
    setIsPlaying(false);
    setCurrentPartId(null);
    sourceNodeRef.current?.stop();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-220px)] min-h-[500px]">
      
      {/* Configuration Sidebar */}
      <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-6">
           
           {/* Step 1 */}
           <section>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] border border-slate-700">1</div>
                 Upload Source
              </h3>
              <div 
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer ${
                  file ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-700 bg-slate-950/50 hover:bg-slate-900'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" onChange={handleFileChange} accept="audio/*" className="hidden" />
                {file ? (
                  <div className="text-center animate-fade-in">
                    <FileAudio size={32} className="text-emerald-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-200 truncate max-w-[180px]">{file.name}</p>
                    <p className="text-[10px] text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload size={32} className="text-slate-600 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-400">Select Audio File</p>
                    <p className="text-[10px] text-slate-600 mt-1 italic">WAV, MP3, M4A supported</p>
                  </div>
                )}
              </div>
           </section>

           {/* How It Works (Instructions) */}
           <section className="bg-slate-950/50 border border-slate-800 rounded-xl p-4">
              <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                 <HelpCircle size={14} /> How it works
              </h4>
              <ul className="space-y-3">
                 <li className="flex gap-3">
                    <div className="shrink-0 w-4 h-4 rounded-full bg-indigo-500/20 flex items-center justify-center text-[9px] font-bold text-indigo-400">1</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                       <strong className="text-slate-300">Analysis:</strong> Our system decodes your audio into high-fidelity raw samples.
                    </p>
                 </li>
                 <li className="flex gap-3">
                    <div className="shrink-0 w-4 h-4 rounded-full bg-indigo-500/20 flex items-center justify-center text-[9px] font-bold text-indigo-400">2</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                       <strong className="text-slate-300">Slicing:</strong> The audio is mathematically sliced every <span className="text-emerald-400 font-bold">7.0 seconds</span>.
                    </p>
                 </li>
                 <li className="flex gap-3">
                    <div className="shrink-0 w-4 h-4 rounded-full bg-indigo-500/20 flex items-center justify-center text-[9px] font-bold text-indigo-400">3</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                       <strong className="text-slate-300">Format:</strong> Each part is exported as a <span className="text-indigo-300 font-bold underline decoration-indigo-500/30">16-bit WAV</span> to ensure zero quality loss.
                    </p>
                 </li>
                 <li className="flex gap-3">
                    <div className="shrink-0 w-4 h-4 rounded-full bg-indigo-500/20 flex items-center justify-center text-[9px] font-bold text-indigo-400">4</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                       <strong className="text-slate-300">Export:</strong> Download individual parts or bundle everything into a single <span className="text-indigo-300 font-bold">ZIP archive</span>.
                    </p>
                 </li>
              </ul>
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2">
                 <ShieldCheck size={14} className="text-emerald-500" />
                 <span className="text-[9px] text-slate-500 font-medium">Privacy Protected: Processing happens locally in your browser.</span>
              </div>
           </section>

           {/* Step 2 */}
           <section className="space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] border border-slate-700">2</div>
                 Split Action
              </h3>
              
              <button 
                onClick={splitAudio}
                disabled={!file || isProcessing}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl font-black text-lg shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-3 transition-all active:scale-95 group"
              >
                {isProcessing ? <RefreshCw className="animate-spin" size={20} /> : <Scissors size={20} className="group-hover:rotate-12 transition-transform" />}
                {isProcessing ? "Slicing..." : "Slice Audio Now"}
              </button>
              
              {parts.length > 0 && (
                <button 
                  onClick={reset}
                  className="w-full py-2 bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-400 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Trash2 size={14} /> Clear and Reset
                </button>
              )}
           </section>

           <div className="mt-auto flex items-center gap-3 text-slate-600 px-2">
              <Music size={14} />
              <p className="text-[9px] leading-relaxed">Splitting is optimized for <span className="text-slate-400">voice datasets</span> and <span className="text-slate-400">short-form TikTok/Reels content</span>.</p>
           </div>
        </div>
      </div>

      {/* Results Area */}
      <div className="lg:col-span-8 flex flex-col gap-6 overflow-hidden h-full">
        {parts.length > 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-full overflow-hidden shadow-2xl animate-fade-in">
             <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 size={18} />
                   </div>
                   <div>
                      <h2 className="text-sm font-bold text-white">Split Successful</h2>
                      <p className="text-[10px] text-slate-500">{parts.length} segments ready for download</p>
                   </div>
                </div>
                <button 
                  onClick={downloadAllAsZip}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
                >
                  <Archive size={14} /> Download All (ZIP)
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                   {parts.map((part) => (
                      <div key={part.id} className={`p-4 rounded-xl border transition-all flex items-center gap-4 group ${currentPartId === part.id ? 'bg-indigo-600/10 border-indigo-500' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}>
                         <button 
                           onClick={() => togglePartPlayback(part)}
                           className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${currentPartId === part.id ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'}`}
                         >
                            {currentPartId === part.id && isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
                         </button>
                         <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-white truncate">Part {part.id.toString().padStart(2, '0')}</div>
                            <div className="text-[10px] text-slate-500">{part.duration.toFixed(2)}s • WAV</div>
                         </div>
                         <button 
                           onClick={() => downloadPart(part)}
                           className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-600 transition-all"
                           title="Download Segment"
                         >
                            <Download size={14} />
                         </button>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl flex-1 flex flex-col items-center justify-center text-slate-700 text-center p-12">
             <div className="relative mb-6">
                <div className="absolute inset-0 bg-emerald-500/10 blur-3xl rounded-full"></div>
                <Scissors size={80} className="opacity-10 text-emerald-500 relative z-10" />
             </div>
             <p className="text-xl font-bold text-slate-300">Ready to Slice</p>
             <p className="text-sm max-w-sm mx-auto mt-2 text-slate-500 leading-relaxed">
                Upload your audio file on the left and our system will handle the rest. We use military-grade sampling to ensure every cut is precise.
             </p>
             <div className="mt-8 grid grid-cols-2 gap-4 max-w-xs">
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
                    <div className="text-emerald-400 font-bold text-lg mb-1">7s</div>
                    <div className="text-[9px] text-slate-600 uppercase font-black">Fixed Duration</div>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
                    <div className="text-indigo-400 font-bold text-lg mb-1">WAV</div>
                    <div className="text-[9px] text-slate-600 uppercase font-black">Quality First</div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

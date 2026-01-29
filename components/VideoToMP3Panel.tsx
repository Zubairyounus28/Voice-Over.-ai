
import React, { useState, useRef } from 'react';
import { Upload, FileAudio, Music, Download, Play, Pause, Trash2, RefreshCw } from 'lucide-react';
import { audioBufferToWav } from '../utils/audioUtils';

export const VideoToMP3Panel: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type.startsWith('video/')) {
        setFile(selectedFile);
        setAudioBuffer(null);
      } else {
        alert("Please select a valid video file.");
      }
    }
  };

  const processVideo = async () => {
    if (!file) return;
    setIsProcessing(true);
    
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      
      const arrayBuffer = await file.arrayBuffer();
      const decodedBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      setAudioBuffer(decodedBuffer);
    } catch (error) {
      console.error("Audio extraction failed:", error);
      alert("Failed to extract audio from video. The file might be corrupted or in an unsupported format.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith('video/')) {
        setFile(droppedFile);
        setAudioBuffer(null);
      } else {
        alert("Please drop a valid video file.");
      }
    }
  };

  const togglePlayback = () => {
    if (!audioBuffer || !audioContextRef.current) return;

    if (isPlaying) {
      sourceNodeRef.current?.stop();
      setIsPlaying(false);
    } else {
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsPlaying(false);
      source.start(0);
      sourceNodeRef.current = source;
      setIsPlaying(true);
    }
  };

  const handleDownload = () => {
    if (!audioBuffer) return;
    const wavBlob = audioBufferToWav(audioBuffer);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name.split('.')[0] || 'audio'}_extracted.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFile(null);
    setAudioBuffer(null);
    setIsPlaying(false);
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch(e) {}
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full min-h-[500px]">
      {/* Left: Input */}
      <div className="flex flex-col gap-6">
        <div 
          className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-12 transition-all cursor-pointer ${
            isDragging 
              ? 'border-pink-500 bg-pink-500/10' 
              : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="video/*" 
            className="hidden" 
          />
          
          {file ? (
             <div className="text-center animate-fade-in">
                <div className="w-16 h-16 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-pink-400">
                  <FileAudio size={32} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">{file.name}</h3>
                <p className="text-slate-500 text-sm">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); reset(); }}
                  className="mt-4 text-sm text-red-400 hover:text-red-300 flex items-center justify-center gap-1 mx-auto"
                >
                  <Trash2 size={14} /> Remove Video
                </button>
             </div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <Upload size={32} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Select Video</h3>
              <p className="text-slate-500 text-sm max-w-xs mx-auto">
                Drag and drop your MP4, WebM or MOV file here to extract the audio.
              </p>
            </div>
          )}
        </div>

        <button
          onClick={processVideo}
          disabled={!file || isProcessing || !!audioBuffer}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-3 ${
            !file || isProcessing || !!audioBuffer
              ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
              : 'bg-pink-600 hover:bg-pink-500 text-white shadow-pink-500/20 active:scale-95'
          }`}
        >
          {isProcessing ? <RefreshCw className="animate-spin" size={20} /> : <Music size={20} />}
          {isProcessing ? 'Extracting Audio Tracks...' : audioBuffer ? 'Audio Extracted' : 'Convert Video to Audio'}
        </button>
      </div>

      {/* Right: Output */}
      <div className="flex flex-col h-full bg-slate-800/30 rounded-2xl border border-slate-800 shadow-xl overflow-hidden min-h-[400px]">
        <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            <Music size={18} className="text-pink-400"/>
            Extracted Audio Preview
          </h3>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          {audioBuffer ? (
            <div className="w-full space-y-8 animate-fade-in">
              <div className="relative">
                 <div className="absolute inset-0 bg-pink-500/10 blur-3xl rounded-full"></div>
                 <div className="relative flex items-center justify-center gap-1 h-24 mb-6">
                    {Array.from({length: 40}).map((_, i) => (
                       <div 
                        key={i} 
                        className={`w-1 bg-pink-500/40 rounded-full transition-all duration-300 ${isPlaying ? 'animate-pulse' : ''}`} 
                        style={{height: isPlaying ? `${Math.random() * 80 + 20}%` : '20%'}}
                       />
                    ))}
                 </div>
              </div>

              <div className="space-y-4">
                 <button 
                   onClick={togglePlayback}
                   className="w-20 h-20 bg-white text-slate-900 rounded-full flex items-center justify-center mx-auto shadow-2xl hover:scale-110 active:scale-95 transition-all"
                 >
                    {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                 </button>
                 <div className="text-slate-400 text-sm font-medium">
                    Audio Length: {audioBuffer.duration.toFixed(1)}s
                 </div>
              </div>

              <button 
                onClick={handleDownload}
                className="w-full py-6 bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 text-white rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-xl shadow-pink-500/30 transition-all active:scale-95 border-b-4 border-pink-800 uppercase tracking-tighter"
              >
                <Download size={28} /> Download High-Quality Audio
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-700">
               <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-800">
                  <Music size={40} className="opacity-20" />
               </div>
               <p className="max-w-[240px] leading-relaxed">
                  Your extracted audio player and download options will appear here once processing is complete.
               </p>
               {isProcessing && (
                  <div className="mt-6 flex flex-col items-center gap-3">
                     <div className="w-48 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-pink-500 animate-[loading_1.5s_infinite] w-1/3 rounded-full"></div>
                     </div>
                     <span className="text-[10px] text-pink-400 font-bold uppercase tracking-widest">Ripping Audio Frames</span>
                  </div>
               )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
};

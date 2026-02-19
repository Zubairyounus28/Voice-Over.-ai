
import React, { useState, useRef } from 'react';
import { Upload, FileAudio, Copy, Check, FileText, RefreshCw, Mic } from 'lucide-react';
import { fileToBase64 } from '../utils/audioUtils';
import { transcribeAudio } from '../services/geminiService';

export const AudioToTextPanel: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 20 * 1024 * 1024) {
        alert("Please select an audio file under 20MB.");
        return;
      }
      setFile(selectedFile);
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
      if (droppedFile.type.startsWith('audio/')) {
        if (droppedFile.size > 20 * 1024 * 1024) {
          alert("Please select an audio file under 20MB.");
          return;
        }
        setFile(droppedFile);
      } else {
        alert('Please drop a valid audio file.');
      }
    }
  };

  const handleTranscribe = async () => {
    if (!file) return;
    setIsLoading(true);
    setTranscription('');

    try {
      const base64Audio = await fileToBase64(file);
      const text = await transcribeAudio(base64Audio, file.type);
      setTranscription(text || "No speech detected in audio.");
    } catch (error) {
      alert("Transcription failed. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(transcription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full min-h-[500px]">
      {/* Upload Section */}
      <div className="flex flex-col gap-6">
        <div 
          className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-12 transition-all cursor-pointer ${
            isDragging 
              ? 'border-cyan-500 bg-cyan-500/10' 
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
            accept="audio/*" 
            className="hidden" 
          />
          
          {file ? (
             <div className="text-center animate-fade-in">
                <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-cyan-400">
                  <FileAudio size={32} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">{file.name}</h3>
                <p className="text-slate-500 text-sm">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); setFile(null); setTranscription(''); }}
                  className="mt-4 text-sm text-red-400 hover:text-red-300 underline"
                >
                  Remove Audio
                </button>
             </div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <Mic size={32} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Upload Audio</h3>
              <p className="text-slate-500 text-sm max-w-xs mx-auto mb-4">
                Drag and drop your MP3, WAV or M4A file here, or click to browse.
              </p>
              <span className="text-xs px-3 py-1 bg-slate-700 rounded-full text-slate-300">Max 20MB</span>
            </div>
          )}
        </div>

        <button
          onClick={handleTranscribe}
          disabled={!file || isLoading}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-3 ${
            !file || isLoading
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-500/25 active:scale-95'
          }`}
        >
          {isLoading ? <RefreshCw className="animate-spin" size={20} /> : <FileText size={20} />}
          {isLoading ? 'Transcribing Audio...' : 'Convert Audio to Text'}
        </button>
      </div>

      {/* Result Section */}
      <div className="flex flex-col h-full bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden min-h-[400px]">
        <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            <FileText size={18} className="text-cyan-400"/>
            Transcription Result
          </h3>
          {transcription && (
            <button 
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy Text'}
            </button>
          )}
        </div>
        <div className="flex-1 p-0 relative">
          <textarea
            readOnly
            value={transcription}
            placeholder="Your audio text will appear here..."
            className="w-full h-full bg-transparent p-6 resize-none outline-none text-slate-300 leading-relaxed font-light text-lg"
          />
          {isLoading && (
             <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center flex-col gap-4">
                <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                <div className="flex items-center gap-1 h-4">
                    {[1,2,3,4,5].map(i => (
                        <div key={i} className="w-1 bg-cyan-500 animate-[wave_1s_infinite]" style={{animationDelay: `${i*0.1}s`}}></div>
                    ))}
                </div>
                <p className="text-cyan-400 text-sm font-bold uppercase tracking-widest animate-pulse">Decoding Audio Frames</p>
             </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes wave {
          0%, 100% { height: 4px; }
          50% { height: 16px; }
        }
      `}</style>
    </div>
  );
};

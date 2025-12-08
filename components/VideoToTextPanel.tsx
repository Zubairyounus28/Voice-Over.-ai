import React, { useState, useRef } from 'react';
import { Upload, FileVideo, Copy, Check, FileText } from 'lucide-react';
import { fileToBase64 } from '../utils/audioUtils';
import { transcribeVideo } from '../services/geminiService';

export const VideoToTextPanel: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
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
      } else {
        alert('Please drop a valid video file.');
      }
    }
  };

  const handleTranscribe = async () => {
    if (!file) return;
    
    // Size check (Client side limiter for demo purposes, 20MB roughly)
    if (file.size > 20 * 1024 * 1024) {
      alert("For this browser-based demo, please keep video files under 20MB.");
      return;
    }

    setIsLoading(true);
    setTranscription('');

    try {
      const base64Video = await fileToBase64(file);
      const text = await transcribeVideo(base64Video, file.type);
      setTranscription(text || "No speech detected.");
    } catch (error) {
      alert("Transcription failed. Please try a shorter video or check your connection.");
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      {/* Upload Section */}
      <div className="flex flex-col gap-6">
        <div 
          className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-12 transition-all cursor-pointer ${
            isDragging 
              ? 'border-indigo-500 bg-indigo-500/10' 
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
                <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-400">
                  <FileVideo size={32} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">{file.name}</h3>
                <p className="text-slate-500 text-sm">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); setFile(null); setTranscription(''); }}
                  className="mt-4 text-sm text-red-400 hover:text-red-300 underline"
                >
                  Remove Video
                </button>
             </div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <Upload size={32} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Upload Video</h3>
              <p className="text-slate-500 text-sm max-w-xs mx-auto mb-4">
                Drag and drop your video file here, or click to browse.
              </p>
              <span className="text-xs px-3 py-1 bg-slate-700 rounded-full text-slate-300">Max 20MB</span>
            </div>
          )}
        </div>

        <button
          onClick={handleTranscribe}
          disabled={!file || isLoading}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${
            !file || isLoading
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25'
          }`}
        >
          {isLoading ? 'Processing Video...' : 'Transcribe Video'}
        </button>
      </div>

      {/* Result Section */}
      <div className="flex flex-col h-full bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            <FileText size={18} className="text-indigo-400"/>
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
            placeholder="Transcription will appear here..."
            className="w-full h-full bg-transparent p-6 resize-none outline-none text-slate-300 leading-relaxed font-light text-lg"
          />
          {isLoading && (
             <div className="absolute inset-0 bg-slate-800/80 backdrop-blur-sm flex items-center justify-center flex-col gap-4">
                <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                <p className="text-slate-300 animate-pulse">Analyzing audio frames...</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

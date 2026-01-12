
import React, { useState, useRef } from 'react';
import { Play, Pause, Wand2, Download, Video, FileText, User, Sparkles, RefreshCw, Layers, Monitor, CheckCircle2, Copy, FileDown, Scissors } from 'lucide-react';
import { STORY_CHARACTERS, VideoCharacter, AppMode } from '../types';
import { generateShortsSegments, generateVeoVideo } from '../services/geminiService';

export const ScriptToShortsPanel: React.FC = () => {
  const [script, setScript] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState<VideoCharacter>(STORY_CHARACTERS[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [segments, setSegments] = useState<{text: string, visual_prompt: string, videoUrl?: string}[]>([]);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);

  const handleProcessScript = async () => {
    if (!script.trim()) return;
    setIsProcessing(true);
    setStatusMsg('Analyzing script & segmenting into 5s flows...');
    
    try {
      const result = await generateShortsSegments(script, selectedCharacter.visualTraits);
      setSegments(result.segments);
      setStatusMsg('Script segmented. Ready to generate video flow.');
    } catch (e: any) {
      alert("Script segmentation failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateVideoForSegment = async (index: number) => {
    const segment = segments[index];
    if (!segment) return;

    try {
      const win = window as any;
      if (win.aistudio) {
        const hasKey = await win.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await win.aistudio.openSelectKey();
        }
      }
    } catch (e) {}

    const newSegments = [...segments];
    setActiveSegmentIndex(index);
    setStatusMsg(`Generating clip ${index + 1}... This takes 2-3 mins.`);

    try {
      const videoUrl = await generateVeoVideo(segment.visual_prompt, '9:16');
      newSegments[index].videoUrl = videoUrl;
      setSegments(newSegments);
      setStatusMsg(`Clip ${index + 1} generated successfully.`);
    } catch (e: any) {
      alert(`Clip ${index + 1} failed: ${e.message}`);
    } finally {
      setActiveSegmentIndex(null);
    }
  };

  const handleGenerateAllVideos = async () => {
    for (let i = 0; i < segments.length; i++) {
      if (!segments[i].videoUrl) {
        await handleGenerateVideoForSegment(i);
      }
    }
  };

  const downloadScriptAsWord = () => {
    if (!script.trim()) return;
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>VoxStudio Script</title><style>body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; } .title { font-size: 24pt; font-weight: bold; color: #4F46E5; margin-bottom: 20pt; } .segment { margin-bottom: 20pt; padding: 15pt; border: 1pt solid #E5E7EB; border-radius: 10pt; } .text { font-size: 14pt; margin-bottom: 5pt; font-weight: bold; } .prompt { font-size: 10pt; color: #6B7280; font-style: italic; }</style></head><body>";
    const footer = "</body></html>";
    
    let content = `<div class="title">VoxStudio AI Script Export</div>`;
    content += `<div style="margin-bottom: 30pt;">Character: ${selectedCharacter.name}<br>Visual Description: ${selectedCharacter.description}</div>`;
    
    if (segments.length > 0) {
      segments.forEach((s, i) => {
        content += `<div class="segment">
          <div style="color: #6366F1; font-size: 10pt;">SEGMENT ${i + 1} (5s)</div>
          <div class="text">${s.text}</div>
          <div class="prompt">Visual Logic: ${s.visual_prompt}</div>
        </div>`;
      });
    } else {
      content += `<div class="text">${script.replace(/\n/g, '<br>')}</div>`;
    }

    const sourceHTML = header + content + footer;
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = `VoxStudio_Script_${Date.now()}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full min-h-[700px]">
      
      {/* Configuration */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col gap-6 shadow-2xl">
          
          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <User size={14} className="text-indigo-400" /> Choose Character
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {STORY_CHARACTERS.map(char => (
                <button
                  key={char.id}
                  onClick={() => setSelectedCharacter(char)}
                  className={`p-3 rounded-xl border text-left transition-all ${selectedCharacter.id === char.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'}`}
                >
                  <div className="font-bold text-xs mb-1">{char.name}</div>
                  <div className="text-[9px] opacity-70 leading-tight">{char.description}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="flex-1 flex flex-col">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center justify-between">
              <span>Script Input</span>
              <button 
                onClick={downloadScriptAsWord}
                disabled={!script}
                className="text-[10px] text-indigo-400 flex items-center gap-1 hover:text-indigo-300 disabled:opacity-30"
              >
                <FileDown size={12} /> Download .doc
              </button>
            </h3>
            <textarea
              className="flex-1 min-h-[200px] w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Paste your script here. We will automatically break it into 5-second green screen flows."
              value={script}
              onChange={(e) => setScript(e.target.value)}
            />
          </section>

          <button
            onClick={handleProcessScript}
            disabled={isProcessing || !script}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-white font-bold shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
          >
            {isProcessing ? <RefreshCw className="animate-spin" size={20} /> : <Sparkles size={20} />}
            {isProcessing ? 'Analyzing...' : 'Analyze & Segment Script'}
          </button>
          
          {statusMsg && (
            <div className="text-[10px] text-center text-indigo-300 animate-pulse bg-indigo-500/5 p-2 rounded border border-indigo-500/10">
              {statusMsg}
            </div>
          )}
        </div>
      </div>

      {/* Generation Flow Area */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        {segments.length > 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-full overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Layers size={18} />
                 </div>
                 <div>
                    <h2 className="text-sm font-bold text-white">Segment Timeline</h2>
                    <p className="text-[10px] text-slate-500">{segments.length} segments of 5s each</p>
                 </div>
              </div>
              <button 
                onClick={handleGenerateAllVideos}
                disabled={activeSegmentIndex !== null}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <Monitor size={14} /> Generate Full Flow
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
              {segments.map((seg, idx) => (
                <div 
                  key={idx} 
                  className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row gap-6 relative overflow-hidden ${activeSegmentIndex === idx ? 'bg-indigo-600/10 border-indigo-500 ring-2 ring-indigo-500/20' : 'bg-slate-950 border-slate-800'}`}
                >
                   {activeSegmentIndex === idx && (
                     <div className="absolute top-0 left-0 h-1 bg-indigo-500 animate-[loading_2s_infinite]"></div>
                   )}
                   
                   <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                           <div className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[8px] text-indigo-400 border border-slate-700">{idx + 1}</div>
                           Scene {idx + 1}
                         </span>
                         <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                           <Layers size={10} /> Green Screen
                         </span>
                      </div>
                      <p className="text-sm text-slate-200 font-medium leading-relaxed italic">"{seg.text}"</p>
                      <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800 text-[10px] text-slate-400 leading-normal">
                        <span className="font-bold text-slate-500">VISUAL PROMPT:</span> {seg.visual_prompt}
                      </div>
                   </div>

                   <div className="w-full md:w-48 aspect-[9/16] bg-black rounded-xl overflow-hidden border border-slate-800 shadow-lg relative group">
                      {seg.videoUrl ? (
                         <>
                           <video 
                              src={seg.videoUrl} 
                              className="w-full h-full object-cover" 
                              loop 
                              muted 
                              onMouseOver={e => e.currentTarget.play()} 
                              onMouseOut={e => {e.currentTarget.pause(); e.currentTarget.currentTime = 0;}}
                           />
                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                              <Play size={24} className="text-white fill-white" />
                           </div>
                           <a 
                             href={seg.videoUrl} 
                             download={`scene_${idx + 1}.mp4`}
                             className="absolute bottom-2 right-2 w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform"
                           >
                              <Download size={14} />
                           </a>
                         </>
                      ) : (
                         <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                            {activeSegmentIndex === idx ? (
                               <RefreshCw size={24} className="text-indigo-400 animate-spin" />
                            ) : (
                               <button 
                                 onClick={() => handleGenerateVideoForSegment(idx)}
                                 className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-slate-500 hover:text-indigo-400 hover:bg-slate-700 transition-all border border-slate-700"
                               >
                                  <Monitor size={20} />
                               </button>
                            )}
                            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">Preview Clip</p>
                         </div>
                      )}
                   </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl flex-1 flex flex-col items-center justify-center text-slate-700 text-center p-12">
             <div className="relative mb-8 scale-150">
                <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full"></div>
                <Video size={48} className="opacity-10 text-indigo-500 relative z-10" />
             </div>
             <p className="text-2xl font-bold text-white mb-2">AI Green Screen Shorts</p>
             <p className="text-sm max-w-sm mx-auto text-slate-500 leading-relaxed mb-8">
                Convert your scripts into professional 5-second green screen flows. Perfect for high-engagement Shorts, Reels, and TikToks.
             </p>
             
             <div className="grid grid-cols-3 gap-6 max-w-md w-full">
                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex flex-col items-center gap-2">
                   <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400">
                      <Layers size={14} />
                   </div>
                   <div className="text-[10px] font-black text-slate-500 uppercase">Chroma Key</div>
                </div>
                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex flex-col items-center gap-2">
                   <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400">
                      <monitor size={14} />
                   </div>
                   <div className="text-[10px] font-black text-slate-500 uppercase">5s Segments</div>
                </div>
                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex flex-col items-center gap-2">
                   <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400">
                      <Sparkles size={14} />
                   </div>
                   <div className="text-[10px] font-black text-slate-500 uppercase">Consistent</div>
                </div>
             </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes loading {
          0% { left: -100%; width: 50%; }
          100% { left: 100%; width: 50%; }
        }
      `}</style>
    </div>
  );
};


import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Wand2, Download, Video, FileText, User, Sparkles, RefreshCw, Layers, Monitor, CheckCircle2, FileDown, Mic, Volume2, Maximize, Smartphone, Clapperboard, Copy, Check, Plus, X, UserPlus, Fingerprint } from 'lucide-react';
import { STORY_CHARACTERS, VideoCharacter, AVAILABLE_VOICES, SpeakingStyle, VoiceGender } from '../types';
import { generateShortsSegments } from '../services/geminiService';

export const ScriptToShortsPanel: React.FC = () => {
  const [script, setScript] = useState('');
  const [customCharacters, setCustomCharacters] = useState<VideoCharacter[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<VideoCharacter>(STORY_CHARACTERS[0]);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Character Form State
  const [newChar, setNewChar] = useState({
    name: '',
    description: '',
    gender: VoiceGender.FEMALE,
    visualTraits: ''
  });

  // Load custom characters from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('voxstudio_custom_chars');
    if (saved) {
      try {
        setCustomCharacters(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse custom characters", e);
      }
    }
  }, []);

  // Save custom characters to localStorage
  useEffect(() => {
    localStorage.setItem('voxstudio_custom_chars', JSON.stringify(customCharacters));
  }, [customCharacters]);

  const allCharacters = [...STORY_CHARACTERS, ...customCharacters];

  const handleAddCharacter = () => {
    if (!newChar.name || !newChar.visualTraits) return;
    const char: VideoCharacter = {
      id: `custom_${Date.now()}`,
      ...newChar
    };
    setCustomCharacters([...customCharacters, char]);
    setSelectedCharacter(char);
    setIsModalOpen(false);
    setNewChar({ name: '', description: '', gender: VoiceGender.FEMALE, visualTraits: '' });
  };

  const [segments, setSegments] = useState<{
    text: string, 
    visual_prompt: string
  }[]>([]);

  const handleProcessScript = async () => {
    if (!script.trim()) return;
    setIsProcessing(true);
    setStatusMsg('Slicing script into 5-second segments & generating prompts...');
    setSegments([]);
    
    try {
      const characterWithRatio = `${selectedCharacter.visualTraits} The video should be in ${aspectRatio === '9:16' ? 'vertical portrait' : 'wide landscape'} format.`;
      const result = await generateShortsSegments(script, characterWithRatio);
      setSegments(result.segments);
      setStatusMsg(`Script split into ${result.segments.length} scenes.`);
    } catch (e: any) {
      alert("Script segmentation failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadScriptAsWord = () => {
    if (!script.trim()) return;
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>VoxStudio Script</title><style>body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; } .title { font-size: 24pt; font-weight: bold; color: #4F46E5; margin-bottom: 5pt; } .meta { color: #6B7280; font-size: 10pt; margin-bottom: 25pt; border-bottom: 1pt solid #E5E7EB; padding-bottom: 10pt; } .segment { margin-bottom: 20pt; padding: 15pt; border: 1pt solid #E5E7EB; border-radius: 10pt; page-break-inside: avoid; } .text { font-size: 14pt; margin-bottom: 5pt; font-weight: bold; color: #111827; } .prompt { font-size: 10pt; color: #4B5563; background: #F9FAFB; padding: 8pt; border-left: 3pt solid #6366F1; }</style></head><body>";
    const footer = "</body></html>";
    
    let content = `<div class="title">VoxStudio AI Green Screen Flow Plan</div>`;
    content += `<div class="meta">Character: ${selectedCharacter.name} | Target Ratio: ${aspectRatio}<br>Base Traits: ${selectedCharacter.visualTraits}</div>`;
    
    if (segments.length > 0) {
      segments.forEach((s, i) => {
        content += `<div class="segment">
          <div style="color: #6366F1; font-size: 9pt; font-weight: bold; text-transform: uppercase;">Scene ${i + 1} (VO Segment)</div>
          <div class="text">"${s.text}"</div>
          <div style="font-size: 9pt; color: #9CA3AF; margin-bottom: 5pt;">Visual Instruction for AI (Green Screen):</div>
          <div class="prompt">${s.visual_prompt}</div>
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
    fileDownload.download = `VoxStudio_Flow_Plan_${Date.now()}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full min-h-[750px] relative">
      
      {/* Custom Character Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="text-indigo-400" size={20} /> Add Custom Character
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Character Name</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/30"
                  placeholder="e.g. Grandma Sofia"
                  value={newChar.name}
                  onChange={e => setNewChar({...newChar, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Short Description</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/30"
                  placeholder="e.g. Kind elder woman with a story to tell"
                  value={newChar.description}
                  onChange={e => setNewChar({...newChar, description: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Gender Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {[VoiceGender.FEMALE, VoiceGender.MALE, VoiceGender.CHILD].map(g => (
                    <button
                      key={g}
                      onClick={() => setNewChar({...newChar, gender: g})}
                      className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${newChar.gender === g ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Detailed Visual Traits (AI Prompt)</label>
                <textarea 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/30 h-24 resize-none"
                  placeholder="e.g. An elderly Italian grandmother, warm wrinkled face, white hair in a bun, wearing a floral apron over a black dress, expressive hands..."
                  value={newChar.visualTraits}
                  onChange={e => setNewChar({...newChar, visualTraits: e.target.value})}
                />
                <p className="text-[9px] text-slate-500 mt-2 italic">Be very specific about clothing and features for consistency.</p>
              </div>
            </div>
            <div className="p-6 bg-slate-950 border-t border-slate-800 flex gap-3">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm">Cancel</button>
              <button onClick={handleAddCharacter} disabled={!newChar.name || !newChar.visualTraits} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm disabled:opacity-50">Create Character</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar: Config */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col gap-6 shadow-2xl h-full">
          
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <User size={14} className="text-indigo-400" /> 1. Select Character
              </h3>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="text-[10px] text-indigo-400 flex items-center gap-1 hover:text-indigo-300 font-bold bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20"
              >
                <Plus size={10} /> Add New
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
              {allCharacters.map(char => (
                <button
                  key={char.id}
                  onClick={() => setSelectedCharacter(char)}
                  className={`p-3 rounded-xl border text-left transition-all relative ${selectedCharacter.id === char.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'}`}
                >
                  <div className="font-bold text-[11px] mb-1 truncate">{char.name}</div>
                  <div className="text-[9px] opacity-70 leading-tight line-clamp-2">{char.description}</div>
                  {char.id.startsWith('custom_') && (
                    <div className="absolute top-1 right-1">
                      {/* Added missing Fingerprint icon */}
                      <Fingerprint size={10} className="text-indigo-300 opacity-50" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
               <Maximize size={14} className="text-indigo-400" /> 2. Video Ratio
            </h3>
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
               <button 
                onClick={() => setAspectRatio('9:16')}
                className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all ${aspectRatio === '9:16' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
               >
                 <Smartphone size={14} /> 9:16
               </button>
               <button 
                onClick={() => setAspectRatio('16:9')}
                className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all ${aspectRatio === '16:9' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
               >
                 <Monitor size={14} /> 16:9
               </button>
            </div>
          </section>

          <section className="flex-1 flex flex-col">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center justify-between">
              <span>3. Enter Script</span>
              <button 
                onClick={downloadScriptAsWord}
                disabled={!script}
                className="text-[10px] text-indigo-400 flex items-center gap-1 hover:text-indigo-300 disabled:opacity-30 transition-all"
              >
                <FileDown size={12} /> Save to Word
              </button>
            </h3>
            <textarea
              className="flex-1 min-h-[150px] w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-700"
              placeholder="Paste your script here... We will split it into 5-second segments and create the prompts for you."
              value={script}
              onChange={(e) => setScript(e.target.value)}
            />
          </section>

          <button
            onClick={handleProcessScript}
            disabled={isProcessing || !script}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-white font-bold shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
          >
            {isProcessing ? <RefreshCw className="animate-spin" size={20} /> : <Wand2 size={20} />}
            {isProcessing ? 'Slicing & Prompting...' : 'Split & Generate Prompts'}
          </button>
          
          {statusMsg && (
            <div className="text-[10px] text-center text-indigo-300 animate-pulse bg-indigo-500/5 p-2 rounded border border-indigo-500/10">
              {statusMsg}
            </div>
          )}
        </div>
      </div>

      {/* Main Area: Segments & Prompts */}
      <div className="lg:col-span-8 flex flex-col gap-6 overflow-hidden h-full">
        {segments.length > 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-full overflow-hidden shadow-2xl animate-fade-in">
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Layers size={18} />
                 </div>
                 <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-tight">Green Screen Flow Plan</h2>
                    <p className="text-[10px] text-slate-500">{segments.length} logical segments | 5.0s target each</p>
                 </div>
              </div>
              <button 
                onClick={downloadScriptAsWord}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95"
              >
                <FileDown size={14} /> Export All (.doc)
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
              {segments.map((seg, idx) => (
                <div 
                  key={idx} 
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-6 transition-all hover:border-indigo-500/30 group"
                >
                   <div className="flex flex-col gap-5">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                         <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                           <div className="w-5 h-5 rounded bg-indigo-600/20 flex items-center justify-center text-[10px] text-indigo-400 border border-indigo-500/20">
                             {idx + 1}
                           </div>
                           Scene Segment
                         </span>
                         <div className="flex gap-2">
                            <span className="text-[9px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase">Green Screen Ready</span>
                            <span className="text-[9px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 uppercase">5.0s</span>
                         </div>
                      </div>

                      {/* Content Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {/* Script / Voice Over Text */}
                         <div className="space-y-2">
                            <h4 className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1.5">
                               <Mic size={12} className="text-indigo-500" /> Voice Over Text
                            </h4>
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-sm text-slate-200 font-medium leading-relaxed italic">
                               "{seg.text}"
                            </div>
                         </div>

                         {/* Visual Prompt */}
                         <div className="space-y-2 relative">
                            <h4 className="text-[10px] font-bold text-slate-600 uppercase flex items-center justify-between">
                               <span className="flex items-center gap-1.5"><Clapperboard size={12} className="text-emerald-500" /> Visual Prompt</span>
                               <button 
                                 onClick={() => copyToClipboard(seg.visual_prompt, `p-${idx}`)}
                                 className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                               >
                                 {copiedId === `p-${idx}` ? <Check size={10} /> : <Copy size={10} />}
                                 {copiedId === `p-${idx}` ? 'Copied' : 'Copy Prompt'}
                               </button>
                            </h4>
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-[11px] text-slate-400 leading-normal group-hover:border-indigo-500/20 transition-colors">
                               {seg.visual_prompt}
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl flex-1 flex flex-col items-center justify-center text-slate-700 text-center p-12">
             <div className="relative mb-8 scale-150">
                <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full"></div>
                <Layers size={48} className="opacity-10 text-indigo-500 relative z-10" />
             </div>
             <p className="text-2xl font-bold text-white mb-2 tracking-tight">Flow Planner & Prompt Generator</p>
             <p className="text-sm max-w-sm mx-auto text-slate-500 leading-relaxed mb-8">
                Paste your whole script. We will slice it into perfect segments and generate high-fidelity green-screen prompts for each part.
             </p>
             
             <div className="grid grid-cols-3 gap-6 max-w-md w-full">
                <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex flex-col items-center gap-3">
                   <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                      <Layers size={18} />
                   </div>
                   <div className="text-[10px] font-black text-slate-500 uppercase">Segments</div>
                </div>
                <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex flex-col items-center gap-3">
                   <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                      <Copy size={18} />
                   </div>
                   <div className="text-[10px] font-black text-slate-500 uppercase">Copyable</div>
                </div>
                <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex flex-col items-center gap-3">
                   <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center text-yellow-400">
                      <Sparkles size={18} />
                   </div>
                   <div className="text-[10px] font-black text-slate-500 uppercase">Consistent</div>
                </div>
             </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

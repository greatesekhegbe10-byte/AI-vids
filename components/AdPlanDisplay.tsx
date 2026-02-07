
import React, { useRef, useState, useEffect } from 'react';
import { BatchItem, AdScene } from '../types';
import { Play, Pause, Volume2, Download, Layers, Mic, Layout, Tv, Music, Terminal, Scissors, Loader2, Sparkles, Activity } from 'lucide-react';

interface AdPlanDisplayProps {
  item: BatchItem;
}

export const AdPlanDisplay: React.FC<AdPlanDisplayProps> = ({ item }) => {
  const { plan, result } = item;
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [renderLog, setRenderLog] = useState<string[]>([]);

  // Simulated Render Logs to keep user engaged during wait
  useEffect(() => {
    if (item.status === 'POLLING' && !result?.videoUrl) {
      const logs = [
        "Analyzing brand visual assets...",
        "Simulating camera motion dynamics...",
        "Optimizing cinematic lighting...",
        "Applying multimodal content filters...",
        "Rendering temporal frame consistency...",
        "Upscaling to high-fidelity output...",
        "Finalizing video buffer..."
      ];
      let i = 0;
      const interval = setInterval(() => {
        if (i < logs.length) {
          setRenderLog(prev => [...prev, logs[i]].slice(-4));
          i++;
        }
      }, 15000); // New log every 15s to match typical Veo timeline
      return () => clearInterval(interval);
    }
  }, [item.status, result?.videoUrl]);

  useEffect(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v || !a) return;
    const sync = () => { if (!a.paused) a.play().catch(() => {}); setIsPlaying(true); };
    const stop = () => { a.pause(); setIsPlaying(false); };
    v.addEventListener('play', sync);
    v.addEventListener('pause', stop);
    return () => { v.removeEventListener('play', sync); v.removeEventListener('pause', stop); };
  }, [result?.videoUrl, result?.audioUrl]);

  if (!plan) return null;

  return (
    <div className="space-y-12 pb-24">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-slate-900/60 p-8 md:p-12 rounded-[56px] border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400"><Layers size={24}/></div>
                <h3 className="text-3xl font-black tracking-tighter">Modular Scene Map</h3>
              </div>
              <div className="hidden md:flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={12}/> Strategy Ready
                  </span>
                  <span className="text-[8px] text-slate-500 font-bold">Parallel Production Active</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plan.scene_map.map((scene, idx) => (
                <div key={scene.scene_id} className="group bg-slate-950/40 hover:bg-slate-950/80 p-6 rounded-[32px] border border-slate-800 transition-all cursor-default">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Scene {idx + 1} • {scene.duration_seconds}s</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                      scene.scene_goal === 'hook' ? 'bg-red-500/10 text-red-400' :
                      scene.scene_goal === 'educate' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-green-500/10 text-green-400'
                    }`}>
                      {scene.scene_goal}
                    </span>
                  </div>
                  <h4 className="text-white font-black text-sm mb-3 group-hover:text-indigo-400 transition-colors">{scene.scene_title}</h4>
                  <p className="text-slate-500 text-xs leading-relaxed mb-4 line-clamp-2">{scene.voiceover_text}</p>
                  <div className="pt-4 border-t border-slate-900 flex items-center gap-3">
                    <Tv size={12} className="text-slate-700" />
                    <span className="text-[9px] font-bold text-slate-600 truncate">{scene.visual_instruction}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/60 p-8 rounded-[56px] border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-10">
             <div className="space-y-4">
               <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Music size={14}/> Audio Strategy</h5>
               <p className="text-slate-300 text-xs font-bold">{plan.audio_strategy.voice_style}</p>
               <p className="text-slate-500 text-[10px] italic">BGM: {plan.audio_strategy.music_suggestion}</p>
             </div>
             <div className="space-y-4">
               <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Scissors size={14}/> AI Cut Derivatives</h5>
               <div className="flex flex-wrap gap-2">
                 {['15s Teaser', '30s Ad', '60s Short'].map(d => (
                   <span key={d} className="px-3 py-1 bg-black rounded-lg text-[9px] font-black text-indigo-400 border border-indigo-500/20">{d}</span>
                 ))}
               </div>
             </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900/60 p-8 rounded-[56px] border border-slate-800 shadow-2xl h-fit sticky top-28">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Activity size={14} className="text-indigo-500" /> Production Console
            </h3>
            <div className={`relative bg-black rounded-[32px] overflow-hidden border border-slate-800 ${item.data.aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'}`}>
               {result?.videoUrl ? (
                 <>
                   <video ref={videoRef} src={result.videoUrl} className="w-full h-full object-cover" loop playsInline autoPlay />
                   {result.audioUrl && <audio ref={audioRef} src={result.audioUrl} />}
                   <div className="absolute bottom-6 left-0 right-0 text-center px-4">
                      <span className="px-4 py-2 bg-indigo-600 text-white font-black text-[10px] rounded-xl uppercase shadow-2xl">
                        {plan.scene_map[0].on_screen_text}
                      </span>
                   </div>
                 </>
               ) : (
                 <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-black">
                   <div className="w-full max-w-[200px] mb-6">
                      <div className="h-1 bg-slate-900 w-full rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 animate-[shimmer_2s_infinite_linear] bg-[length:200%_100%] w-full"></div>
                      </div>
                   </div>
                   <div className="space-y-3 w-full">
                      {renderLog.length === 0 ? (
                        <p className="text-[9px] font-mono text-indigo-500 text-center uppercase tracking-widest animate-pulse">Initializing Veo Engine...</p>
                      ) : (
                        renderLog.map((log, i) => (
                          <div key={i} className={`flex items-center gap-2 text-[8px] font-mono ${i === renderLog.length - 1 ? 'text-indigo-400' : 'text-slate-700'}`}>
                            <span className="text-indigo-900">[{Math.floor(Math.random() * 90) + 10}%]</span> {log}
                          </div>
                        ))
                      )}
                   </div>
                   <div className="mt-8 flex flex-col items-center">
                     <Loader2 className="w-8 h-8 text-indigo-500/20 animate-spin" />
                     <p className="text-[7px] font-black text-slate-700 uppercase tracking-widest mt-4">Typical duration: 60-120s</p>
                   </div>
                 </div>
               )}
            </div>
            
            <div className="mt-8 p-6 bg-slate-950 rounded-3xl border border-slate-900 space-y-4">
               <div className="flex items-center gap-3">
                 <Mic size={16} className="text-indigo-500" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Hook VO Script</span>
               </div>
               <p className="text-xs text-slate-400 leading-relaxed italic">"{plan.scene_map[0].voiceover_text}"</p>
            </div>

            <div className="mt-8 space-y-3">
               <button 
                 disabled={!result?.videoUrl}
                 className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:grayscale"
               >
                 <Download size={14} /> Export Campaign Pack
               </button>
               <button className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95">
                 <Terminal size={14} /> View Advanced Logs
               </button>
            </div>
          </div>
          
          <div className="bg-indigo-600/5 p-6 rounded-[32px] border border-indigo-500/10">
            <h4 className="text-[10px] font-black text-indigo-400 uppercase mb-2">CTA Performance Block</h4>
            <p className="text-white text-sm font-black mb-3">{plan.cta_block.primary}</p>
            <div className="flex flex-wrap gap-2">
              {plan.cta_block.variants.map(v => (
                <span key={v} className="px-2 py-1 bg-slate-900 rounded text-[8px] font-bold text-slate-500 border border-slate-800">{v}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

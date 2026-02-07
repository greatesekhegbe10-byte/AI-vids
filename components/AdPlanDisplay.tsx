
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { BatchItem, AdScene } from '../types';
import { 
  Play, 
  Pause, 
  Layers, 
  Mic, 
  Tv, 
  Music, 
  Scissors, 
  Loader2, 
  Sparkles, 
  Activity, 
  FileAudio, 
  FileVideo, 
  AlertCircle,
  Video as VideoIcon,
  RefreshCw,
  Zap,
  Layout
} from 'lucide-react';
import { initiateVideoRender, pollVideoAdStatus, generateVoiceover, fetchVideoBlob } from '../services/geminiService';

interface AdPlanDisplayProps {
  item: BatchItem;
  onUpdateItem: (updates: Partial<BatchItem>) => void;
}

export const AdPlanDisplay: React.FC<AdPlanDisplayProps> = ({ item, onUpdateItem }) => {
  const { plan, thumbnails } = item;
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [activeSceneId, setActiveSceneId] = useState<string | null>(plan?.scene_map[0]?.scene_id || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [renderLogs, setRenderLogs] = useState<Record<string, string[]>>({});
  const [isDownloading, setIsDownloading] = useState(false);
  
  const activeScene = plan?.scene_map.find(s => s.scene_id === activeSceneId);

  // Scene rendering handler
  const handleRenderScene = async (sceneId: string) => {
    if (!plan) return;
    const sceneIdx = plan.scene_map.findIndex(s => s.scene_id === sceneId);
    if (sceneIdx === -1) return;

    const scene = plan.scene_map[sceneIdx];
    
    // Update state to rendering
    const newScenes = [...plan.scene_map];
    newScenes[sceneIdx] = { ...scene, renderStatus: 'RENDERING' };
    onUpdateItem({ plan: { ...plan, scene_map: newScenes } });
    
    setRenderLogs(prev => ({ ...prev, [sceneId]: ["Initiating cinematic synthesis..."] }));

    try {
      // 1. Generate Voiceover
      const audioUrl = await generateVoiceover(scene.voiceover_text, item.data.voice);
      
      // 2. Initiate Video - returns operation object
      const videoOperation = await initiateVideoRender(scene.visual_instruction, item.data.images, item.data.aspectRatio);
      
      // Update with polling info
      const pollingScenes = [...newScenes];
      pollingScenes[sceneIdx] = { 
        ...pollingScenes[sceneIdx], 
        renderStatus: 'POLLING', 
        videoOperation,
        audioUrl: audioUrl || undefined
      };
      onUpdateItem({ plan: { ...plan, scene_map: pollingScenes } });
      
      setRenderLogs(prev => ({ 
        ...prev, 
        [sceneId]: [...(prev[sceneId] || []), "Voiceover ready. Processing visual buffer..."] 
      }));

    } catch (error: any) {
      const failedScenes = [...newScenes];
      failedScenes[sceneIdx] = { ...failedScenes[sceneIdx], renderStatus: 'FAILED' };
      onUpdateItem({ plan: { ...plan, scene_map: failedScenes } });
      alert(`Render failed: ${error.message}`);
    }
  };

  // Polling logic for all POLLING scenes using the operation object
  useEffect(() => {
    if (!plan) return;
    const pollingScenes = plan.scene_map.filter(s => s.renderStatus === 'POLLING' && s.videoOperation);
    
    const intervals = pollingScenes.map(scene => {
      const run = async () => {
        try {
          const status = await pollVideoAdStatus(scene.videoOperation);
          if (status.done) {
            if (status.videoUrl) {
              const updatedScenes = [...plan.scene_map];
              const idx = updatedScenes.findIndex(s => s.scene_id === scene.scene_id);
              updatedScenes[idx] = { 
                ...updatedScenes[idx], 
                renderStatus: 'COMPLETED', 
                videoUrl: status.videoUrl,
                videoOperation: status.operation
              };
              onUpdateItem({ plan: { ...plan, scene_map: updatedScenes } });
              setRenderLogs(prev => ({ 
                ...prev, 
                [scene.scene_id]: [...(prev[scene.scene_id] || []), "Final frame consistency achieved. Playback ready."] 
              }));
            } else {
              throw new Error(status.error || "Unknown polling error");
            }
          } else {
            // Add some synthetic logs to make it feel alive
            const creativeLogs = [
              "Adjusting focal depth...",
              "Simulating ray-tracing...",
              "Optimizing temporal resolution...",
              "Filtering semantic noise..."
            ];
            setRenderLogs(prev => ({ 
              ...prev, 
              [scene.scene_id]: [...(prev[scene.scene_id] || []), creativeLogs[Math.floor(Math.random() * creativeLogs.length)]].slice(-3)
            }));
            
            // Store updated operation progress
            const updatedScenes = [...plan.scene_map];
            const idx = updatedScenes.findIndex(s => s.scene_id === scene.scene_id);
            updatedScenes[idx] = { ...updatedScenes[idx], videoOperation: status.operation };
            onUpdateItem({ plan: { ...plan, scene_map: updatedScenes } });
          }
        } catch (e) {
           const failedScenes = [...plan.scene_map];
           const idx = failedScenes.findIndex(s => s.scene_id === scene.scene_id);
           failedScenes[idx] = { ...failedScenes[idx], renderStatus: 'FAILED' };
           onUpdateItem({ plan: { ...plan, scene_map: failedScenes } });
        }
      };
      const intervalId = window.setInterval(run, 8000);
      return intervalId;
    });

    return () => intervals.forEach(id => clearInterval(id));
  }, [plan, onUpdateItem]);

  // Sync Audio/Video playback for real-time monitoring
  useEffect(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v || !a) return;

    const syncPlay = () => { if (a.paused) a.play().catch(() => {}); setIsPlaying(true); };
    const syncPause = () => { a.pause(); setIsPlaying(false); };
    const handleEnded = () => {
      v.currentTime = 0; a.currentTime = 0;
      v.play().catch(() => {});
    };

    v.addEventListener('play', syncPlay);
    v.addEventListener('pause', syncPause);
    v.addEventListener('ended', handleEnded);
    return () => {
      v.removeEventListener('play', syncPlay);
      v.removeEventListener('pause', syncPause);
      v.removeEventListener('ended', handleEnded);
    };
  }, [activeSceneId, activeScene?.videoUrl]);

  // Robust download handler
  const handleDownloadVideo = async () => {
    if (!activeScene?.videoUrl || isDownloading) return;
    
    setIsDownloading(true);
    try {
      const blobUrl = await fetchVideoBlob(activeScene.videoUrl);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${item.data.name}-scene-${activeSceneId}.mp4`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }, 100);
    } catch (error: any) {
      alert(`Download failed: ${error.message}. Ensure your project has billing enabled for Veo.`);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!plan) return null;

  return (
    <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Storyboard Panel */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-slate-900/60 p-8 md:p-12 rounded-[56px] border border-slate-800 shadow-2xl backdrop-blur-3xl">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20"><Layers size={24}/></div>
                <div>
                  <h3 className="text-3xl font-black tracking-tighter text-white">Ad Storyboard</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-1">Modular Campaign Architecture</p>
                </div>
              </div>
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={12}/> Strategy Fully Synthesized
                </span>
                <span className="text-[8px] text-slate-600 font-bold">GEMINI 3 PRO ENGINE ACTIVE</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {plan.scene_map.map((scene, idx) => (
                <div 
                  key={scene.scene_id} 
                  onPointerDown={() => setActiveSceneId(scene.scene_id)}
                  className={`group relative p-6 rounded-[32px] border transition-all cursor-pointer ${
                    activeSceneId === scene.scene_id 
                      ? 'bg-slate-800/80 border-indigo-500/40 shadow-xl ring-1 ring-indigo-500/20' 
                      : 'bg-slate-950/40 hover:bg-slate-900/60 border-slate-800/50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Scene {idx + 1} • {scene.duration_seconds}s</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-[6px] text-[8px] font-black uppercase ${
                        scene.scene_goal === 'hook' ? 'bg-red-500/10 text-red-400' :
                        scene.scene_goal === 'educate' ? 'bg-blue-500/10 text-blue-400' :
                        'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {scene.scene_goal}
                      </span>
                      {scene.renderStatus === 'COMPLETED' && <Zap size={10} className="text-yellow-400 fill-yellow-400" />}
                    </div>
                  </div>
                  
                  <div className="mb-4 aspect-video rounded-2xl overflow-hidden border border-slate-800/50 bg-black group-hover:border-indigo-500/30 transition-colors">
                    {scene.renderStatus === 'COMPLETED' && scene.videoUrl ? (
                      <video src={scene.videoUrl} muted className="w-full h-full object-cover" />
                    ) : thumbnails?.[scene.scene_id] ? (
                      <img src={thumbnails[scene.scene_id]} className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-700" alt={scene.scene_title} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-950">
                        <VideoIcon size={24} className="text-slate-900" />
                      </div>
                    )}
                  </div>

                  <h4 className="text-white font-black text-sm mb-2 line-clamp-1">{scene.scene_title}</h4>
                  <p className="text-slate-500 text-[11px] leading-relaxed mb-4 line-clamp-2 italic">"{scene.voiceover_text}"</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-900/50 mt-auto">
                    {scene.renderStatus === 'COMPLETED' ? (
                       <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5"><Zap size={10}/> Render Ready</span>
                    ) : scene.renderStatus === 'RENDERING' || scene.renderStatus === 'POLLING' ? (
                       <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 animate-pulse"><Loader2 size={10} className="animate-spin"/> Producing...</span>
                    ) : (
                      <button 
                        onPointerDown={(e) => { e.stopPropagation(); handleRenderScene(scene.scene_id); }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-xl text-[9px] font-black uppercase transition-all border border-indigo-500/20"
                      >
                        <RefreshCw size={10} /> Generate Cinematic Shot
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strategy Meta */}
          <div className="bg-slate-900/60 p-8 rounded-[56px] border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-10">
             <div className="space-y-4">
               <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Music size={14} className="text-indigo-400"/> Audio Direction</h5>
               <p className="text-white text-sm font-bold">{plan.audio_strategy.voice_style}</p>
               <div className="p-3 bg-black/40 rounded-xl border border-slate-800">
                  <p className="text-slate-500 text-[10px] leading-relaxed">Ambient Track: <span className="text-indigo-300 italic">{plan.audio_strategy.music_suggestion}</span></p>
               </div>
             </div>
             <div className="space-y-4">
               <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Scissors size={14} className="text-indigo-400"/> AI Derivative Cuts</h5>
               <div className="flex flex-wrap gap-2">
                 {Object.keys(plan.derivatives).map(d => (
                   <span key={d} className="px-4 py-2 bg-slate-950 rounded-xl text-[9px] font-black text-slate-400 border border-slate-800 hover:border-indigo-500/30 transition-colors uppercase tracking-widest">
                     {d.replace('_', ' ')}
                   </span>
                 ))}
               </div>
             </div>
          </div>
        </div>

        {/* Console Panel */}
        <div className="space-y-8">
          <div className="bg-slate-900/60 p-8 rounded-[56px] border border-slate-800 shadow-2xl h-fit sticky top-28 backdrop-blur-3xl">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-3">
              <Activity size={14} className="text-indigo-400 animate-pulse" /> Production Console
            </h3>
            
            <div className={`relative bg-black rounded-[40px] overflow-hidden border border-slate-800 shadow-inner ${item.data.aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'}`}>
               {activeScene?.videoUrl ? (
                 <>
                   <video 
                     ref={videoRef} 
                     src={activeScene.videoUrl} 
                     className="w-full h-full object-cover" 
                     loop 
                     playsInline 
                     autoPlay 
                     muted={false}
                     crossOrigin="anonymous"
                   />
                   {activeScene.audioUrl && <audio ref={audioRef} src={activeScene.audioUrl} />}
                   <div className="absolute top-6 left-6 flex items-center gap-2">
                      <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                         <span className="text-[8px] font-black text-white uppercase tracking-widest">Master Preview</span>
                      </div>
                   </div>
                   <div className="absolute bottom-8 left-0 right-0 text-center px-6">
                      <span className="px-6 py-3 bg-indigo-600/95 text-white font-black text-xs md:text-sm rounded-2xl uppercase shadow-2xl backdrop-blur-sm border border-indigo-400/20 inline-block max-w-full truncate">
                        {activeScene.on_screen_text}
                      </span>
                   </div>
                 </>
               ) : (
                 <div className="absolute inset-0 flex flex-col items-center justify-center p-10 bg-black text-center">
                   {activeScene?.renderStatus === 'RENDERING' || activeScene?.renderStatus === 'POLLING' ? (
                     <div className="w-full space-y-6">
                        <div className="w-16 h-16 mx-auto mb-4 relative">
                           <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
                           <Activity className="absolute inset-0 m-auto w-6 h-6 text-indigo-400 opacity-50" />
                        </div>
                        <div className="space-y-2">
                           {(renderLogs[activeScene.scene_id] || []).map((log, i) => (
                             <div key={i} className={`text-[8px] font-mono tracking-tighter ${i === (renderLogs[activeScene.scene_id]?.length - 1) ? 'text-indigo-400' : 'text-slate-800'}`}>
                               <span className="opacity-40">[{Math.floor(Math.random() * 9999)}]</span> {log}
                             </div>
                           ))}
                        </div>
                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest animate-pulse">Synthesizing Scene {activeSceneId}</p>
                     </div>
                   ) : (
                     <div className="opacity-30 flex flex-col items-center">
                        <Layout className="w-12 h-12 text-slate-700 mb-4" />
                        <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Select rendered scene to preview</p>
                     </div>
                   )}
                 </div>
               )}
            </div>
            
            <div className="mt-8 p-6 bg-slate-950/80 rounded-[32px] border border-slate-900 space-y-5">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <Mic size={16} className="text-indigo-400" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Dialogue Feed</span>
                 </div>
                 <span className="text-[9px] font-mono text-slate-700">VO-ENGINE-V2</span>
               </div>
               <p className="text-xs text-slate-400 leading-relaxed font-medium">
                 {activeScene ? `"${activeScene.voiceover_text}"` : "Waiting for active module sequence..."}
               </p>
            </div>

            <div className="mt-8 space-y-3">
               <button 
                 disabled={!activeScene?.videoUrl || isDownloading}
                 onPointerDown={(e) => { e.preventDefault(); handleDownloadVideo(); }}
                 className="w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white rounded-[24px] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl shadow-indigo-600/20 disabled:opacity-30 disabled:grayscale"
               >
                 {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <FileVideo size={18} />} 
                 {isDownloading ? 'Downloading...' : 'Download Shot (MP4)'}
               </button>
               <button 
                 disabled={!activeScene?.audioUrl}
                 onPointerDown={() => {
                   if (!activeScene?.audioUrl) return;
                   const a = document.createElement('a');
                   a.href = activeScene.audioUrl;
                   a.download = `${item.data.name}-vo-${activeSceneId}.wav`;
                   a.click();
                 }}
                 className="w-full py-4 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-[24px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-30"
               >
                 <FileAudio size={16} /> Export Voice Asset
               </button>
            </div>
          </div>
          
          <div className="bg-indigo-600/5 p-8 rounded-[40px] border border-indigo-500/10 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <Zap size={16} className="text-yellow-400 fill-yellow-400" />
              <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Conversion Strategy</h4>
            </div>
            <p className="text-white text-sm font-black mb-4 leading-tight">{plan.cta_block.primary}</p>
            <div className="flex flex-wrap gap-2">
              {plan.cta_block.variants.map(v => (
                <span key={v} className="px-3 py-1.5 bg-slate-900/60 rounded-xl text-[9px] font-bold text-slate-500 border border-slate-800 uppercase tracking-wider">{v}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

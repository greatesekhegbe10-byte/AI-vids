import React, { useRef, useState, useEffect } from 'react';
import { BatchItem, AdScene } from '../types';
import { 
  Layers, 
  Mic, 
  Scissors, 
  Loader2, 
  Activity, 
  Video as VideoIcon,
  RefreshCw,
  Zap,
  Hash,
  Download,
  Play,
  Pause,
  CheckCircle2,
  Type
} from 'lucide-react';
import { initiateVideoRender, pollVideoAdStatus, generateVoiceover, fetchVideoBlob } from '../services/geminiService';

interface AdPlanDisplayProps {
  item: BatchItem;
  // Updated signature to support functional updates
  onUpdateItem: (updates: Partial<BatchItem> | ((prev: BatchItem) => Partial<BatchItem>)) => void;
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

  // Scene rendering handler with functional updates
  const handleRenderScene = async (sceneId: string) => {
    if (!plan) return;
    const scene = plan.scene_map.find(s => s.scene_id === sceneId);
    if (!scene) return;
    
    // 1. Set status to RENDERING using functional update
    onUpdateItem(prev => {
      if (!prev.plan) return {};
      const newScenes = prev.plan.scene_map.map(s => 
        s.scene_id === sceneId ? { ...s, renderStatus: 'RENDERING' as const } : s
      );
      return { plan: { ...prev.plan, scene_map: newScenes } };
    });
    
    setRenderLogs(prev => ({ ...prev, [sceneId]: ["Initiating cinematic synthesis..."] }));

    try {
      // 2. Generate Voiceover
      setRenderLogs(prev => ({ ...prev, [sceneId]: [...(prev[sceneId] || []), "Synthesizing AI voiceover..."] }));
      const audioUrl = await generateVoiceover(scene.voiceover_text, item.data.voice);
      
      // 3. Initiate Video - returns operation object
      setRenderLogs(prev => ({ ...prev, [sceneId]: [...(prev[sceneId] || []), "Requesting Veo 3.1 video generation..."] }));
      const videoOperation = await initiateVideoRender(scene.visual_instruction, item.data.images, item.data.aspectRatio);
      
      // 4. Update with POLLING info using functional update
      onUpdateItem(prev => {
        if (!prev.plan) return {};
        const newScenes = prev.plan.scene_map.map(s => 
          s.scene_id === sceneId ? { 
            ...s, 
            renderStatus: 'POLLING' as const, 
            videoOperation,
            audioUrl: audioUrl || undefined
          } : s
        );
        return { plan: { ...prev.plan, scene_map: newScenes } };
      });
      
    } catch (error: any) {
      // Handle failure using functional update
      onUpdateItem(prev => {
        if (!prev.plan) return {};
        const newScenes = prev.plan.scene_map.map(s => 
          s.scene_id === sceneId ? { ...s, renderStatus: 'FAILED' as const } : s
        );
        return { plan: { ...prev.plan, scene_map: newScenes } };
      });
      setRenderLogs(prev => ({ ...prev, [sceneId]: [...(prev[sceneId] || []), `Error: ${error.message}`] }));
    }
  };

  // Polling logic for all POLLING scenes using functional updates
  useEffect(() => {
    if (!plan) return;
    
    const pollingScenes = plan.scene_map.filter(s => s.renderStatus === 'POLLING' && s.videoOperation);
    if (pollingScenes.length === 0) return;

    const intervals = pollingScenes.map(scene => {
      const run = async () => {
        try {
          const status = await pollVideoAdStatus(scene.videoOperation);
          if (status.done) {
            if (status.videoUrl) {
              // Update state with result using functional update to preserve latest state of other scenes
              onUpdateItem(prev => {
                 if (!prev.plan) return {};
                 const newScenes = prev.plan.scene_map.map(s => s.scene_id === scene.scene_id ? {
                     ...s,
                     renderStatus: 'COMPLETED' as const,
                     videoUrl: status.videoUrl,
                     videoOperation: status.operation
                 } : s);
                 return { plan: { ...prev.plan, scene_map: newScenes } };
              });
              
              setRenderLogs(prev => ({ 
                ...prev, 
                [scene.scene_id]: [...(prev[scene.scene_id] || []), "Final frame consistency achieved. Playback ready."] 
              }));
            } else {
              throw new Error(status.error || "Unknown polling error");
            }
          } else {
            // Add synthetic logs
            const creativeLogs = [
              "Adjusting focal depth...",
              "Simulating ray-tracing...",
              "Optimizing temporal resolution...",
              "Filtering semantic noise...",
              "Enhancing texture details..."
            ];
            const randomLog = creativeLogs[Math.floor(Math.random() * creativeLogs.length)];
            
            setRenderLogs(prev => {
              const logs = prev[scene.scene_id] || [];
              if (logs[logs.length - 1] === randomLog) return prev;
              return { 
                ...prev, 
                [scene.scene_id]: [...logs, randomLog].slice(-4) 
              };
            });
          }
        } catch (e: any) {
           onUpdateItem(prev => {
             if (!prev.plan) return {};
             const newScenes = prev.plan.scene_map.map(s => s.scene_id === scene.scene_id ? {
               ...s,
               renderStatus: 'FAILED' as const
             } : s);
             return { plan: { ...prev.plan, scene_map: newScenes } };
           });
           setRenderLogs(prev => ({ ...prev, [scene.scene_id]: [...(prev[scene.scene_id] || []), `Failed: ${e.message}`] }));
        }
      };
      
      const intervalId = window.setInterval(run, 5000);
      return intervalId;
    });

    return () => intervals.forEach(id => clearInterval(id));
  }, [plan, onUpdateItem]); // plan in deps is acceptable as functional updates protect against stale state within the interval

  // Sync Audio/Video playback
  useEffect(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v || !a) return;

    const syncPlay = () => { if (a.paused) a.play().catch(() => {}); setIsPlaying(true); };
    const syncPause = () => { a.pause(); setIsPlaying(false); };
    const handleEnded = () => {
      v.currentTime = 0; a.currentTime = 0;
      v.play().catch(() => {}); // Loop
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

  // Download handler
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
      alert(`Download failed: ${error.message}.`);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!plan) return null;

  return (
    <div className="space-y-8 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Top Metadata Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 bg-slate-900/60 p-6 rounded-[32px] border border-slate-800 backdrop-blur-md flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20"><Activity size={20}/></div>
              <div>
                <h3 className="text-white font-bold text-sm">Campaign Strategy</h3>
                <div className="flex items-center gap-2 mt-1">
                  {plan.hooks && plan.hooks.length > 0 && (
                     <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                       {plan.hooks.length} Hooks Generated
                     </span>
                  )}
                  {plan.job_id && (
                    <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                      <Hash size={10}/> {plan.job_id.slice(0, 8)}
                    </span>
                  )}
                </div>
              </div>
           </div>
           <div className="hidden md:block text-right">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Duration</div>
              <div className="text-xl font-black text-white">{plan.scene_map.reduce((acc, s) => acc + s.duration_seconds, 0)}s</div>
           </div>
        </div>

        <div className="bg-slate-900/60 p-6 rounded-[32px] border border-slate-800 backdrop-blur-md flex flex-col justify-center">
           <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
             <Scissors size={12}/> Shorts Cuts
           </div>
           <div className="flex gap-2">
             {plan.derivatives.teaser_15s.length > 0 && <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-[10px] font-bold rounded-lg border border-purple-500/30">15s Teaser</span>}
             {plan.derivatives.ad_30s.length > 0 && <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold rounded-lg border border-indigo-500/30">30s Ad</span>}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Scene List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Layers size={18} className="text-indigo-500"/> Scene Map
            </h3>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{plan.scene_map.length} Scenes</span>
          </div>

          <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
            {plan.scene_map.map((scene, idx) => (
              <div 
                key={scene.scene_id} 
                onClick={() => setActiveSceneId(scene.scene_id)}
                className={`group relative p-5 rounded-[28px] border transition-all cursor-pointer ${
                  activeSceneId === scene.scene_id 
                    ? 'bg-slate-800/80 border-indigo-500/50 shadow-2xl ring-1 ring-indigo-500/20' 
                    : 'bg-slate-950/40 hover:bg-slate-900/60 border-slate-800/50'
                }`}
              >
                <div className="flex gap-5">
                  {/* Thumbnail / Video Preview */}
                  <div className="w-32 aspect-video rounded-xl overflow-hidden bg-black border border-slate-800 flex-shrink-0 relative">
                    {scene.renderStatus === 'COMPLETED' && scene.videoUrl ? (
                      <video src={scene.videoUrl} className="w-full h-full object-cover" muted />
                    ) : thumbnails?.[scene.scene_id] ? (
                      <img src={thumbnails[scene.scene_id]} className="w-full h-full object-cover opacity-80" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-700">
                        <VideoIcon size={20} />
                      </div>
                    )}
                    
                    {/* Status Badge Overlay */}
                    <div className="absolute top-1 right-1">
                      {scene.renderStatus === 'COMPLETED' ? (
                        <div className="bg-emerald-500 text-white p-0.5 rounded-full"><CheckCircle2 size={10} /></div>
                      ) : (scene.renderStatus === 'RENDERING' || scene.renderStatus === 'POLLING') ? (
                        <div className="bg-indigo-500 text-white p-0.5 rounded-full animate-spin"><Loader2 size={10} /></div>
                      ) : null}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`text-sm font-bold truncate ${activeSceneId === scene.scene_id ? 'text-white' : 'text-slate-300'}`}>
                        {idx + 1}. {scene.scene_title}
                      </h4>
                      <span className="text-[9px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">{scene.duration_seconds}s</span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                      {scene.visual_instruction}
                    </p>
                    
                    <div className="flex items-center justify-between">
                       <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                         scene.scene_goal === 'hook' ? 'bg-pink-500/10 text-pink-400' :
                         scene.scene_goal === 'convert' ? 'bg-emerald-500/10 text-emerald-400' :
                         'bg-indigo-500/10 text-indigo-400'
                       }`}>
                         {scene.scene_goal}
                       </span>

                       {scene.renderStatus === 'IDLE' || !scene.renderStatus ? (
                         <button 
                           onClick={(e) => { e.stopPropagation(); handleRenderScene(scene.scene_id); }}
                           className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-bold uppercase transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                         >
                           <Zap size={10} /> Generate
                         </button>
                       ) : scene.renderStatus === 'FAILED' ? (
                         <button 
                           onClick={(e) => { e.stopPropagation(); handleRenderScene(scene.scene_id); }}
                           className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[9px] font-bold uppercase transition-all border border-red-500/20"
                         >
                           <RefreshCw size={10} /> Retry
                         </button>
                       ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Active Scene Detail */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            
            {/* Player */}
            <div className="bg-black rounded-[32px] overflow-hidden border border-slate-800 shadow-2xl relative group aspect-[9/16] max-h-[600px]">
               {activeScene?.renderStatus === 'COMPLETED' && activeScene.videoUrl ? (
                 <>
                   <video 
                     ref={videoRef}
                     src={activeScene.videoUrl} 
                     className="w-full h-full object-cover"
                     playsInline
                     loop
                   />
                   {activeScene.audioUrl && <audio ref={audioRef} src={activeScene.audioUrl} />}
                   
                   <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-[2px]">
                      <button 
                        onClick={() => {
                          if (videoRef.current?.paused) videoRef.current.play();
                          else videoRef.current?.pause();
                        }}
                        className="p-4 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md border border-white/20 transition-transform active:scale-95"
                      >
                        {isPlaying ? <Pause className="text-white fill-white" size={24}/> : <Play className="text-white fill-white ml-1" size={24}/>}
                      </button>
                   </div>

                   <button 
                      onClick={handleDownloadVideo}
                      disabled={isDownloading}
                      className="absolute bottom-4 right-4 p-2 bg-black/60 hover:bg-indigo-600 text-white rounded-xl backdrop-blur-md border border-white/10 transition-colors"
                    >
                      {isDownloading ? <Loader2 size={16} className="animate-spin"/> : <Download size={16} />}
                   </button>
                 </>
               ) : (
                 <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-slate-950">
                    {activeScene?.renderStatus === 'RENDERING' || activeScene?.renderStatus === 'POLLING' ? (
                      <>
                        <Loader2 size={48} className="text-indigo-500 animate-spin mb-6" />
                        <h4 className="text-white font-bold mb-2">Generating Scene</h4>
                        <div className="space-y-1">
                          {renderLogs[activeSceneId!]?.map((log, i) => (
                            <p key={i} className="text-[10px] text-slate-500 font-mono animate-in fade-in slide-in-from-bottom-1">
                              {log}
                            </p>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                         <VideoIcon size={48} className="text-slate-800 mb-4" />
                         <p className="text-xs text-slate-600 font-medium">Select 'Generate' to create this scene</p>
                      </>
                    )}
                 </div>
               )}
            </div>

            {/* Script & Details */}
            {activeScene && (
              <div className="bg-slate-900/60 p-6 rounded-[32px] border border-slate-800 backdrop-blur-md space-y-5">
                 <div>
                   <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                     <Mic size={10} className="text-indigo-500"/> Voiceover Script
                   </label>
                   <p className="text-sm text-slate-300 italic leading-relaxed">
                     "{activeScene.voiceover_text}"
                   </p>
                 </div>
                 
                 <div>
                   <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                     <Type size={10} className="text-purple-500"/> On-Screen Text
                   </label>
                   <p className="text-xs text-white font-bold bg-slate-950 p-3 rounded-xl border border-slate-800">
                     {activeScene.on_screen_text}
                   </p>
                 </div>

                 {plan.hooks && plan.hooks.length > 0 && (
                   <div>
                     <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                       <Zap size={10} className="text-yellow-500"/> Viral Hooks
                     </label>
                     <div className="flex flex-wrap gap-2">
                       {plan.hooks.slice(0, 2).map((hook, i) => (
                         <span key={i} className="text-[9px] text-slate-400 bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-700/50">
                           {hook}
                         </span>
                       ))}
                     </div>
                   </div>
                 )}
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
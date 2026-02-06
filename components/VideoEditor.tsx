
import React, { useRef, useState, useEffect } from 'react';
import { GeneratedResult } from '../types';
import { Play, Pause, Download, Maximize, Scissors, Type, Music, Loader2 } from './Icons';
import { extendVideo } from '../services/geminiService';

interface VideoEditorProps {
  result: GeneratedResult;
  onUpdate: (newResult: GeneratedResult) => void;
  aspectRatio: '16:9' | '9:16';
}

export const VideoEditor: React.FC<VideoEditorProps> = ({ result, onUpdate, aspectRatio }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isExtending, setIsExtending] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showMobileControls, setShowMobileControls] = useState(false);
  
  const [overlayText, setOverlayText] = useState(result.concept?.slogan || '');
  const [showOverlay, setShowOverlay] = useState(!!result.concept?.slogan);

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;
    video.volume = volume; 
    audio.volume = volume;

    const syncPlay = () => { setIsPlaying(true); if (audio.src) audio.play().catch(() => {}); };
    const syncPause = () => { setIsPlaying(false); audio.pause(); };
    const syncEnded = () => { setIsPlaying(false); video.currentTime = 0; audio.currentTime = 0; };

    video.addEventListener('play', syncPlay);
    video.addEventListener('pause', syncPause);
    video.addEventListener('ended', syncEnded);
    return () => {
      video.removeEventListener('play', syncPlay);
      video.removeEventListener('pause', syncPause);
      video.removeEventListener('ended', syncEnded);
    };
  }, [volume, result]);

  const togglePlay = (e?: React.MouseEvent | React.TouchEvent) => {
    e?.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) { videoRef.current.pause(); setShowMobileControls(true); }
      else { videoRef.current.play(); setShowMobileControls(false); }
    }
  };

  const handleExtend = async () => {
    if (!result.videoOperation) return;
    setIsExtending(true);
    try {
      const newResult = await extendVideo(result.videoOperation, "Continue the action naturally.", aspectRatio);
      onUpdate({ ...newResult, audioUrl: result.audioUrl, concept: result.concept }); 
    } catch (e) {
      alert("Extension failed. Model at capacity.");
    } finally { setIsExtending(false); }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const link = document.createElement('a');
      link.href = result.videoUrl;
      link.target = '_blank';
      link.download = `adgenius-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => setIsDownloading(false), 2000);
    } catch (e) { console.error("Download failed", e); } finally { setIsDownloading(false); }
  };

  return (
    <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn pb-12">
      <div 
        className="lg:col-span-2 bg-black rounded-[48px] overflow-hidden shadow-2xl relative group flex items-center justify-center min-h-[400px] cursor-pointer"
        onClick={() => setShowMobileControls(!showMobileControls)}
      >
        <div className={`relative ${aspectRatio === '9:16' ? 'h-full max-h-[750px] aspect-[9/16]' : 'w-full aspect-video'}`}>
           <video ref={videoRef} src={result.videoUrl} className="w-full h-full object-contain" playsInline crossOrigin="anonymous" />
           {result.audioUrl && <audio ref={audioRef} src={result.audioUrl} crossOrigin="anonymous" />}
           
           {showOverlay && overlayText && (
             <div className="absolute bottom-16 left-0 right-0 text-center px-4 pointer-events-none">
               <h2 className="text-lg md:text-3xl font-black text-white drop-shadow-2xl px-6 py-3 bg-indigo-600/90 inline-block rounded-2xl uppercase tracking-wider">
                 {overlayText}
               </h2>
             </div>
           )}

           <div className={`absolute inset-0 flex items-center justify-center transition-all ${(!isPlaying || showMobileControls) ? 'opacity-100' : 'opacity-0'}`}>
              <button onPointerDown={togglePlay} className="bg-black/40 p-10 rounded-full backdrop-blur-xl border border-white/20 active:scale-90">
                {isPlaying ? <Pause className="w-12 h-12 text-white fill-white" /> : <Play className="w-12 h-12 text-white fill-white ml-1" />}
              </button>
           </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-[48px] p-8 flex flex-col gap-8 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20"><Scissors size={24}/></div>
          <div>
            <h3 className="font-bold text-lg text-white">Studio Suite</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Final Touches</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
              <span className="flex items-center gap-2"><Music size={14} className="text-indigo-500"/> Audio Mix</span>
              <span className="text-indigo-400 font-mono">{Math.round(volume * 100)}%</span>
            </label>
            <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-full accent-indigo-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
          </div>

          <div className="space-y-4">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Type size={14} className="text-indigo-500"/> Overlay Text</label>
            <input type="text" value={overlayText} onChange={(e) => setOverlayText(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-indigo-500" />
            <button onPointerDown={() => setShowOverlay(!showOverlay)} className={`w-full py-4 rounded-2xl font-bold text-xs transition-all ${showOverlay ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
              {showOverlay ? 'HIDE OVERLAY' : 'SHOW OVERLAY'}
            </button>
          </div>
        </div>

        <div className="mt-auto space-y-4">
           <button onPointerDown={handleExtend} disabled={isExtending} className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold flex items-center justify-center gap-3 border border-slate-700 disabled:opacity-50">
             {isExtending ? <Loader2 className="animate-spin text-indigo-400" size={20}/> : <Maximize size={20} className="text-indigo-400"/>}
             Extend Video (+5s)
           </button>
           <button onPointerDown={handleDownload} disabled={isDownloading} className="w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-2xl disabled:opacity-70">
             {isDownloading ? <Loader2 size={22} className="animate-spin" /> : <Download size={22} />}
             EXPORT VIDEO
           </button>
        </div>
      </div>
    </div>
  );
};

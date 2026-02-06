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
  
  // Editor State
  const [overlayText, setOverlayText] = useState('');
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;

    video.volume = volume; 
    audio.volume = volume;

    const syncPlay = () => { 
      setIsPlaying(true); 
      if (audio.src) audio.play().catch(() => {}); 
    };
    const syncPause = () => { 
      setIsPlaying(false); 
      audio.pause(); 
    };
    const syncEnded = () => { 
      setIsPlaying(false); 
      video.currentTime = 0; 
      audio.currentTime = 0; 
    };

    video.addEventListener('play', syncPlay);
    video.addEventListener('pause', syncPause);
    video.addEventListener('ended', syncEnded);
    
    return () => {
      video.removeEventListener('play', syncPlay);
      video.removeEventListener('pause', syncPause);
      video.removeEventListener('ended', syncEnded);
    };
  }, [volume, result]);

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setShowMobileControls(true);
      } else {
        videoRef.current.play();
        setShowMobileControls(false);
      }
    }
  };

  const handleContainerClick = () => {
    setShowMobileControls(!showMobileControls);
  };

  const handleExtend = async () => {
    if (!result.videoOperation) return;
    setIsExtending(true);
    try {
      const newResult = await extendVideo(result.videoOperation, "Continue the action naturally.", aspectRatio);
      onUpdate({
        ...newResult,
        audioUrl: result.audioUrl
      }); 
    } catch (e) {
      console.error(e);
      alert("Extension failed. This can happen if the AI model is currently at capacity.");
    } finally {
      setIsExtending(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(result.videoUrl, { 
        cache: 'no-store',
        headers: { 'Accept': 'video/mp4' }
      });
      
      if (!response.ok) throw new Error("Stream connection failed");
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `adgenius-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(link);
      }, 500);
    } catch (e) {
      console.warn("Direct download failed, attempting browser fallback:", e);
      window.open(result.videoUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn pb-12">
      {/* Main Player */}
      <div 
        className="lg:col-span-2 bg-black rounded-3xl overflow-hidden shadow-2xl relative group flex items-center justify-center min-h-[400px] cursor-pointer"
        onClick={handleContainerClick}
      >
        <div className={`relative ${aspectRatio === '9:16' ? 'h-full max-h-[750px] aspect-[9/16]' : 'w-full aspect-video'}`}>
           <video 
             ref={videoRef} 
             src={result.videoUrl} 
             className="w-full h-full object-contain" 
             playsInline
             crossOrigin="anonymous"
           />
           {result.audioUrl && <audio ref={audioRef} src={result.audioUrl} crossOrigin="anonymous" />}
           
           {/* Text Overlay Layer */}
           {showOverlay && overlayText && (
             <div className="absolute bottom-16 left-0 right-0 text-center pointer-events-none px-4">
               <h2 className="text-lg md:text-3xl font-black text-white drop-shadow-[0_2px_15px_rgba(0,0,0,1)] px-5 py-2.5 bg-indigo-600 inline-block rounded-xl uppercase tracking-wider">
                 {overlayText}
               </h2>
             </div>
           )}

           {/* Central Toggle UI (Mobile & Desktop) */}
           <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${(!isPlaying || showMobileControls) ? 'opacity-100' : 'opacity-0'}`}>
              <button 
                onClick={togglePlay}
                className="bg-black/40 p-8 md:p-10 rounded-full backdrop-blur-xl border border-white/20 active:scale-90 transition-transform shadow-2xl"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 md:w-12 md:h-12 text-white fill-white" />
                ) : (
                  <Play className="w-8 h-8 md:w-12 md:h-12 text-white fill-white ml-1" />
                )}
              </button>
           </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col gap-6 md:gap-8 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20">
            <Scissors size={24}/>
          </div>
          <div>
            <h3 className="font-bold text-lg text-white leading-tight">Studio Suite</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Export HQ</p>
          </div>
        </div>

        {/* Controls Container */}
        <div className="space-y-6">
          <div className="space-y-4">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
              <span className="flex items-center gap-2"><Music size={14} className="text-indigo-500"/> Audio Mix</span>
              <span className="text-indigo-400 font-mono">{Math.round(volume * 100)}%</span>
            </label>
            <div className="py-2">
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Type size={14} className="text-indigo-500"/> Dynamic Slogan
            </label>
            <div className="flex flex-col gap-3">
              <input 
                type="text" 
                placeholder="Type catchphrase..."
                value={overlayText}
                onChange={(e) => setOverlayText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-slate-700"
              />
              <button 
                onClick={(e) => { e.stopPropagation(); setShowOverlay(!showOverlay); }}
                className={`w-full py-3.5 rounded-2xl font-bold text-xs tracking-widest transition-all border active:scale-95 ${showOverlay ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
              >
                {showOverlay ? 'OVERLAY ACTIVE' : 'PREVIEW OVERLAY'}
              </button>
            </div>
          </div>
        </div>

        {/* AI Action */}
        <div className="pt-6 border-t border-slate-800 space-y-4">
           <button 
             onClick={(e) => { e.stopPropagation(); handleExtend(); }}
             disabled={isExtending}
             className="w-full py-4.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-3 transition-all border border-slate-700 disabled:opacity-50 active:scale-95"
           >
             {isExtending ? <Loader2 size={20} className="animate-spin text-indigo-400"/> : <Maximize size={20} className="text-indigo-400"/>}
             Extend Ad (+5s)
           </button>
        </div>

        {/* Download Action */}
        <div className="mt-auto">
          <button 
            onClick={(e) => { e.stopPropagation(); handleDownload(); }}
            disabled={isDownloading}
            className="w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-2xl shadow-indigo-600/30 transition-all active:scale-[0.98] disabled:opacity-70"
          >
            {isDownloading ? <Loader2 size={22} className="animate-spin" /> : <Download size={22} />}
            {isDownloading ? 'EXPORTING...' : 'SAVE TO DEVICE'}
          </button>
        </div>
      </div>
    </div>
  );
};
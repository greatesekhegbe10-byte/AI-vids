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

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
    }
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
      // Use cache: 'no-store' to ensure we don't hit "disturbed" errors from browser media caching
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
      
      // Cleanup
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
    <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
      {/* Main Player */}
      <div className="lg:col-span-2 bg-black rounded-2xl overflow-hidden shadow-2xl relative group flex items-center justify-center min-h-[450px]">
        <div className={`relative ${aspectRatio === '9:16' ? 'h-full max-h-[750px] aspect-[9/16]' : 'w-full aspect-video'}`}>
           <video 
             ref={videoRef} 
             src={result.videoUrl} 
             className="w-full h-full object-contain" 
             onClick={togglePlay}
             playsInline
             crossOrigin="anonymous"
           />
           {result.audioUrl && <audio ref={audioRef} src={result.audioUrl} crossOrigin="anonymous" />}
           
           {/* Text Overlay Layer */}
           {showOverlay && overlayText && (
             <div className="absolute bottom-16 left-0 right-0 text-center pointer-events-none">
               <h2 className="text-xl md:text-3xl font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,1)] px-6 py-2 bg-indigo-600/70 inline-block rounded-lg backdrop-blur-md uppercase tracking-wide">
                 {overlayText}
               </h2>
             </div>
           )}

           {/* Play/Pause UI */}
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {!isPlaying && (
                <div className="bg-black/60 p-6 rounded-full backdrop-blur-xl border border-white/20">
                  <Play className="w-10 h-10 text-white fill-white" />
                </div>
              )}
           </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
            <Scissors size={20}/>
          </div>
          <div>
            <h3 className="font-bold text-white leading-tight">Studio Suite</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Edit & Export</p>
          </div>
        </div>

        {/* Audio Mix */}
        <div className="space-y-4">
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-2"><Music size={14}/> Audio Level</span>
              <span className="text-indigo-400">{Math.round(volume * 100)}%</span>
            </label>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 flex items-center gap-2"><Type size={14}/> Add Slogan</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Enter slogan..."
                value={overlayText}
                onChange={(e) => setOverlayText(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
              />
              <button 
                onClick={() => setShowOverlay(!showOverlay)}
                className={`px-4 rounded-xl font-bold text-xs transition-all border ${showOverlay ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}
              >
                {showOverlay ? 'LIVE' : 'ADD'}
              </button>
            </div>
          </div>
        </div>

        {/* AI Sequence Extension */}
        <div className="pt-6 border-t border-slate-800 space-y-4">
           <h4 className="text-xs font-bold text-slate-500 uppercase tracking-tight">AI Generation</h4>
           <button 
             onClick={handleExtend}
             disabled={isExtending}
             className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border border-slate-700 disabled:opacity-50"
           >
             {isExtending ? <Loader2 size={18} className="animate-spin text-indigo-400"/> : <Maximize size={18} className="text-indigo-400"/>}
             Extend Video (+5s)
           </button>
           <p className="text-[10px] text-slate-600 text-center italic">
             AI analyzes frames to continue the sequence seamlessly.
           </p>
        </div>

        {/* Download Action */}
        <div className="mt-auto pt-6 border-t border-slate-800">
          <button 
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-black text-sm flex items-center justify-center gap-3 shadow-2xl shadow-indigo-500/20 transition-all active:scale-[0.98] disabled:opacity-70"
          >
            {isDownloading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
            {isDownloading ? 'EXPORTING...' : 'DOWNLOAD MP4'}
          </button>
        </div>
      </div>
    </div>
  );
};
import React, { useRef, useState, useEffect } from 'react';
// Import Sparkles from lucide-react to fix missing reference
import { Download, RefreshCw, Loader2, Volume2, VolumeX, FileAudio, FileVideo, Sparkles } from 'lucide-react';

interface VideoResultProps {
  videoUrl: string;
  audioUrl: string | null;
  onReset: () => void;
  aspectRatio: '16:9' | '9:16';
  productName?: string;
}

export const VideoResult: React.FC<VideoResultProps> = ({ videoUrl, audioUrl, onReset, aspectRatio, productName = "ad-genius" }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isDownloading, setIsDownloading] = useState<'video' | 'audio' | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;

    const handlePlay = () => {
      if (audio.paused) audio.play().catch(e => console.log("Audio play prevented", e));
    };
    const handlePause = () => audio.pause();
    const handleSeek = () => { 
      if (Math.abs(audio.currentTime - video.currentTime) > 0.1) {
        audio.currentTime = video.currentTime;
      }
    };
    const handleEnded = () => {
      video.currentTime = 0;
      audio.currentTime = 0;
      video.play().catch(() => {});
      audio.play().catch(() => {});
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeking', handleSeek);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeking', handleSeek);
      video.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl, videoUrl]);

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const downloadAsset = async (type: 'video' | 'audio') => {
    const url = type === 'video' ? videoUrl : audioUrl;
    if (!url) return;

    setIsDownloading(type);
    try {
      const response = await fetch(url, { cache: 'no-store' });
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const safeName = productName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      a.download = `${safeName}-${type}-${Date.now()}.${type === 'video' ? 'mp4' : 'wav'}`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
      }, 100);
    } catch (error) {
      console.error("Download failed", error);
    } finally {
      setIsDownloading(null);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-fadeIn">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Your Video Ad</h2>
          <p className="text-xs text-slate-500 uppercase font-black tracking-widest mt-1">Multi-Asset Export Ready</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all active:scale-95"
          >
            <RefreshCw size={14} /> New
          </button>
          
          <button
            onClick={() => downloadAsset('video')}
            disabled={isDownloading !== null}
            className="flex-grow md:flex-grow-0 flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-70"
          >
            {isDownloading === 'video' ? <Loader2 size={14} className="animate-spin" /> : <FileVideo size={14} />}
            Video MP4
          </button>

          {audioUrl && (
            <button
              onClick={() => downloadAsset('audio')}
              disabled={isDownloading !== null}
              className="flex-grow md:flex-grow-0 flex items-center justify-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-70"
            >
              {isDownloading === 'audio' ? <Loader2 size={14} className="animate-spin" /> : <FileAudio size={14} />}
              Audio WAV
            </button>
          )}
        </div>
      </div>

      <div className="bg-black/50 rounded-[32px] border border-slate-700 p-3 backdrop-blur-sm shadow-2xl">
         <div className={`relative w-full mx-auto ${aspectRatio === '9:16' ? 'max-w-[400px]' : 'max-w-full'}`}>
           <div className={`relative overflow-hidden rounded-[24px] bg-black ${aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'}`}>
             <video
               ref={videoRef}
               src={videoUrl}
               controls
               autoPlay
               playsInline
               className="w-full h-full object-cover"
             >
               Your browser does not support the video tag.
             </video>
             
             {audioUrl && <audio ref={audioRef} src={audioUrl} preload="auto" />}

             {audioUrl && (
               <button 
                 onClick={toggleMute}
                 className="absolute bottom-16 right-4 z-10 p-3 bg-black/60 hover:bg-black/80 rounded-full text-white backdrop-blur-xl transition-all border border-white/10"
               >
                 {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
               </button>
             )}
           </div>
         </div>
      </div>
      
      <div className="mt-8 p-5 bg-slate-900/60 rounded-[24px] border border-slate-800 flex items-start gap-4">
        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
           <Sparkles size={16} />
        </div>
        <div>
          <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest mb-1">Production Details</h3>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Assets generated using Veo 3.1 (Video) and Gemini 2.5 Flash (Voice). For optimal results, ensure your project is saved before closing.
          </p>
        </div>
      </div>
    </div>
  );
};
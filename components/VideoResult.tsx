import React, { useRef, useState, useEffect } from 'react';
import { Download, RefreshCw, Loader2, Volume2, VolumeX } from 'lucide-react';

interface VideoResultProps {
  videoUrl: string;
  audioUrl: string | null;
  onReset: () => void;
  aspectRatio: '16:9' | '9:16';
}

export const VideoResult: React.FC<VideoResultProps> = ({ videoUrl, audioUrl, onReset, aspectRatio }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Synchronize Audio with Video
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
    video.loop = false; 
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

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(videoUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error("Network response was not ok");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ad-genius-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
    } catch (error) {
      console.error("Download failed", error);
      // Final fallback
      window.open(videoUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Your Video Ad</h2>
        <div className="flex gap-3">
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw size={16} />
            Create New
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isDownloading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            {isDownloading ? 'Downloading...' : 'Download MP4'}
          </button>
        </div>
      </div>

      <div className="bg-black/50 rounded-2xl border border-slate-700 p-2 backdrop-blur-sm shadow-2xl">
         <div className={`relative w-full mx-auto ${aspectRatio === '9:16' ? 'max-w-[400px]' : 'max-w-full'}`}>
           <div className={`relative overflow-hidden rounded-xl bg-black ${aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'}`}>
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
                 className="absolute bottom-16 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-md transition-all"
               >
                 {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
               </button>
             )}
           </div>
         </div>
      </div>
      
      <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-300 mb-1">AI Usage Note</h3>
        <p className="text-xs text-slate-500">
          This video was generated using Gemini Veo 3.1. The voiceover was generated using Gemini 2.5 Flash TTS.
        </p>
      </div>
    </div>
  );
};
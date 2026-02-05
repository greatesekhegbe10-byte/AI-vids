import React, { useRef, useState } from 'react';
import { Download, RefreshCw, Loader2 } from 'lucide-react';

interface VideoResultProps {
  videoUrl: string;
  onReset: () => void;
  aspectRatio: '16:9' | '9:16';
}

export const VideoResult: React.FC<VideoResultProps> = ({ videoUrl, onReset, aspectRatio }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error("Network response was not ok");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ad-genius-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed", error);
      alert("Could not download automatically. Please right-click the video player and select 'Save Video As...'.");
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
               loop
               className="w-full h-full object-cover"
             >
               Your browser does not support the video tag.
             </video>
           </div>
         </div>
      </div>
      
      <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-300 mb-1">AI Usage Note</h3>
        <p className="text-xs text-slate-500">
          This video was generated using Google's Veo 3.1 model (720p Fast Preview). The visuals are AI interpretations of your product images.
          For commercial use, ensure you review the content for accuracy.
        </p>
      </div>
    </div>
  );
};
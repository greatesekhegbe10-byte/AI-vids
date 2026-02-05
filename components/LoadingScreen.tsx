import React, { useEffect, useState } from 'react';
import { Loader2, Wand2 } from 'lucide-react';

export const LoadingScreen: React.FC = () => {
  const [stage, setStage] = useState(0);
  
  const stages = [
    "Analyzing product image...",
    "Applying cinematic motion...",
    "Rendering lighting effects...",
    "Finalizing video..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStage((prev) => (prev + 1) % stages.length);
    }, 4000); // Change text every 4 seconds (faster updates for faster model)
    return () => clearInterval(interval);
  }, [stages.length]);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 rounded-full animate-pulse"></div>
        <div className="relative bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        </div>
        <div className="absolute -top-2 -right-2 bg-purple-600 p-2 rounded-lg rotate-12 animate-bounce">
           <Wand2 className="w-5 h-5 text-white" />
        </div>
      </div>
      
      <h3 className="text-2xl font-bold text-white mb-2">Creating Magic</h3>
      <p className="text-indigo-300 font-medium text-lg mb-8 min-h-[28px] transition-all duration-500 ease-in-out">
        {stages[stage]}
      </p>
      
      <div className="w-full max-w-md bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 w-1/3 animate-[shimmer_1.5s_infinite_linear] bg-[length:200%_100%]"></div>
      </div>
      
      <p className="text-slate-500 text-xs mt-6 max-w-xs">
        Using Gemini Veo Fast mode for quicker results.
      </p>
    </div>
  );
};
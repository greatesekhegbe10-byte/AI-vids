import React from 'react';
import { Video } from './Icons';

export const Header: React.FC = () => {
  return (
    <header className="w-full py-6 px-8 flex items-center justify-between border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg shadow-indigo-500/20">
          <Video className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            AdGenius
          </h1>
          <p className="text-xs text-slate-500 font-medium tracking-wide">AI VIDEO COMMERCIALS</p>
        </div>
      </div>
      <div className="hidden md:flex items-center gap-4 text-sm text-slate-400">
        <span>Powered by Gemini Veo</span>
      </div>
    </header>
  );
};
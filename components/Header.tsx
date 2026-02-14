import React from 'react';
import { Video } from './Icons';

export const Header: React.FC = () => {
  return (
    <header className="w-full py-4 px-4 md:py-6 md:px-12 flex items-center justify-between border-b border-slate-800/40 bg-slate-950/90 backdrop-blur-3xl sticky top-0 z-[100]">
      {/* Brand Identity */}
      <div className="flex items-center gap-4 cursor-default group select-none">
        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[18px] md:rounded-[22px] shadow-2xl shadow-indigo-500/20 group-hover:scale-105 transition-transform">
          <Video className="w-5 h-5 md:w-8 md:h-8 text-white" />
        </div>
        <div>
          <h1 className="text-xl md:text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            AdGenius
          </h1>
          <p className="hidden md:block text-[9px] text-slate-600 font-black tracking-[0.6em] uppercase pl-1">Autonomous Creative</p>
        </div>
      </div>
    </header>
  );
};
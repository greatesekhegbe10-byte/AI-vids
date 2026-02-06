
import React from 'react';
import { Video, Key } from './Icons';

interface HeaderProps {
  onSelectKey: () => void;
  apiKeyReady: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onSelectKey, apiKeyReady }) => {
  return (
    <header className="w-full py-5 px-5 md:py-7 md:px-10 flex items-center justify-between border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-2xl sticky top-0 z-[60]">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-xl shadow-indigo-500/20 relative">
          <div className="absolute inset-0 bg-white/10 rounded-2xl"></div>
          <Video className="w-6 h-6 md:w-7 md:h-7 text-white relative z-10" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-600">
            AdGenius
          </h1>
          <p className="hidden md:block text-[9px] text-slate-600 font-black tracking-[0.5em] uppercase pl-1">Pro Studio</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button 
          onClick={(e) => {
            e.preventDefault();
            onSelectKey();
          }}
          className={`flex items-center gap-3 px-6 py-3.5 md:px-5 md:py-2.5 rounded-2xl md:rounded-xl text-xs font-black uppercase tracking-widest transition-all border active:scale-90 touch-manipulation pointer-events-auto ${
            apiKeyReady 
              ? 'bg-slate-900/50 border-slate-800 text-indigo-400' 
              : 'bg-indigo-600 border-indigo-400 text-white shadow-2xl shadow-indigo-500/30'
          }`}
        >
          <Key size={16} />
          <span className="hidden sm:inline">{apiKeyReady ? 'Change Key' : 'Select Key'}</span>
          <span className="sm:hidden">{apiKeyReady ? 'Key' : 'Setup'}</span>
        </button>
      </div>
    </header>
  );
};

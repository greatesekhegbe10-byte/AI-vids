import React from 'react';
import { Video, Key } from './Icons';

interface HeaderProps {
  onSelectKey: () => void;
  apiKeyReady: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onSelectKey, apiKeyReady }) => {
  return (
    <header className="w-full py-4 px-4 md:py-6 md:px-8 flex items-center justify-between border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
          <Video className="w-5 h-5 md:w-6 md:h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500">
            AdGenius
          </h1>
          <p className="hidden md:block text-[10px] text-slate-600 font-bold tracking-[0.3em] uppercase">AI Video</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 md:gap-4">
        <button 
          onClick={onSelectKey}
          className={`flex items-center gap-2 px-5 py-3 md:px-4 md:py-2 rounded-2xl md:rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider transition-all border active:scale-95 ${
            apiKeyReady 
              ? 'bg-slate-800/50 border-slate-700 text-slate-300' 
              : 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-500/20'
          }`}
        >
          <Key size={14} />
          <span className="whitespace-nowrap">{apiKeyReady ? 'API Ready' : 'Select Key'}</span>
        </button>
      </div>
    </header>
  );
};
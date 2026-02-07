
import React from 'react';
import { Video, Key } from './Icons';

interface HeaderProps {
  onSelectKey: () => void;
  apiKeyReady: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onSelectKey, apiKeyReady }) => {
  return (
    <header className="w-full py-5 px-5 md:py-8 md:px-12 flex items-center justify-between border-b border-slate-800/40 bg-slate-950/90 backdrop-blur-3xl sticky top-0 z-[100] pointer-events-auto touch-none md:touch-auto">
      <div className="flex items-center gap-4">
        <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[22px] shadow-2xl shadow-indigo-500/20">
          <Video className="w-6 h-6 md:w-8 md:h-8 text-white" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-700">
            AdGenius
          </h1>
          <p className="hidden md:block text-[9px] text-slate-600 font-black tracking-[0.6em] uppercase pl-1">Autonomous Creative</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button 
          onClick={(e) => { 
            // Standard click event ensures 'trusted' context for popups and works correctly with mobile tap synthesis
            e.stopPropagation(); 
            onSelectKey(); 
          }}
          type="button"
          className={`relative flex items-center justify-center gap-3 px-6 py-4 md:px-6 md:py-3 rounded-2xl md:rounded-[20px] text-[10px] md:text-xs font-black uppercase tracking-widest transition-all border active:scale-95 touch-manipulation cursor-pointer min-h-[48px] min-w-[120px] select-none ${
            apiKeyReady 
              ? 'bg-slate-900/60 border-slate-800 text-indigo-400 active:bg-slate-800' 
              : 'bg-indigo-600 border-indigo-400 text-white shadow-2xl shadow-indigo-500/40 active:bg-indigo-700'
          }`}
        >
          <Key size={16} />
          <span className="hidden sm:inline">{apiKeyReady ? 'Update Key' : 'Configure Key'}</span>
          <span className="sm:hidden">{apiKeyReady ? 'Key' : 'Setup'}</span>
        </button>
      </div>
    </header>
  );
};

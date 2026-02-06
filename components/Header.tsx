import React from 'react';
import { Video, Key } from './Icons';

interface HeaderProps {
  onSelectKey: () => void;
  apiKeyReady: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onSelectKey, apiKeyReady }) => {
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
      
      <div className="flex items-center gap-4">
        <button 
          onClick={onSelectKey}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
            apiKeyReady 
              ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' 
              : 'bg-indigo-600 border-indigo-500 text-white animate-pulse'
          }`}
        >
          <Key size={14} />
          {apiKeyReady ? 'Change API Key' : 'Select API Key'}
        </button>
        <div className="hidden md:block h-4 w-px bg-slate-800"></div>
        <div className="hidden md:flex items-center gap-4 text-sm text-slate-400">
          <span>Powered by Gemini Veo</span>
        </div>
      </div>
    </header>
  );
};
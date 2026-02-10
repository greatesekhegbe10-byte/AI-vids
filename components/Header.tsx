import React from 'react';
import { Video, Settings, Layout } from './Icons';

interface HeaderProps {
  currentView: 'dashboard' | 'settings';
  onViewChange: (view: 'dashboard' | 'settings') => void;
  apiKeyReady: boolean;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onViewChange, apiKeyReady }) => {
  return (
    <header className="w-full py-4 px-4 md:py-6 md:px-12 flex items-center justify-between border-b border-slate-800/40 bg-slate-950/90 backdrop-blur-3xl sticky top-0 z-[100]">
      {/* Brand Identity */}
      <div 
        className="flex items-center gap-4 cursor-pointer group" 
        onClick={() => onViewChange('dashboard')}
      >
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
      
      {/* Navigation Tabs */}
      <div className="flex bg-slate-900/80 p-1 rounded-2xl border border-slate-800 shadow-inner">
        <button
          onClick={() => onViewChange('dashboard')}
          className={`px-4 py-2 md:px-6 md:py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            currentView === 'dashboard' 
              ? 'bg-slate-800 text-white shadow-lg border border-slate-700' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Layout size={14} />
          <span className="hidden md:inline">Dashboard</span>
        </button>
        <button
          onClick={() => onViewChange('settings')}
          className={`px-4 py-2 md:px-6 md:py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 relative ${
            currentView === 'settings' 
              ? 'bg-slate-800 text-white shadow-lg border border-slate-700' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Settings size={14} className={!apiKeyReady ? "text-amber-500 animate-pulse" : ""} />
          <span className="hidden md:inline">Settings</span>
          {!apiKeyReady && (
            <span className="absolute top-1 right-1 md:top-2 md:right-2 w-2 h-2 bg-amber-500 rounded-full animate-ping" />
          )}
        </button>
      </div>
    </header>
  );
};
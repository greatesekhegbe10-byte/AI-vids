import React from 'react';
import { Key, CheckCircle2, AlertCircle, ExternalLink, Shield } from 'lucide-react';

interface SettingsViewProps {
  apiKeyReady: boolean;
  onSelectKey: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ apiKeyReady, onSelectKey }) => {
  return (
    <div className="w-full max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="mb-8">
        <h2 className="text-3xl font-black text-white mb-2">Settings</h2>
        <p className="text-slate-400">Manage your AI connection and preferences.</p>
      </div>

      <div className="space-y-6">
        {/* API Key Section */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-[32px] overflow-hidden backdrop-blur-md">
          <div className="p-8 border-b border-slate-800/50">
             <div className="flex items-center gap-4 mb-6">
               <div className={`p-4 rounded-2xl ${apiKeyReady ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                 <Key size={24} />
               </div>
               <div>
                 <h3 className="text-lg font-bold text-white">Google Cloud API Key</h3>
                 <p className="text-sm text-slate-500">Required for Veo 3.1 & Gemini 2.5 models</p>
               </div>
               <div className="ml-auto">
                 {apiKeyReady ? (
                   <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-bold border border-emerald-500/20">
                     <CheckCircle2 size={12} /> Active
                   </span>
                 ) : (
                   <span className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full text-xs font-bold border border-amber-500/20">
                     <AlertCircle size={12} /> Action Required
                   </span>
                 )}
               </div>
             </div>

             <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800 mb-6">
               <p className="text-sm text-slate-400 leading-relaxed mb-4">
                 AdGenius requires a paid Google Cloud Project API key to access the advanced video generation capabilities of <strong>Veo</strong>. 
                 The key is stored securely within your Google IDX environment variables.
               </p>
               <div className="flex items-center gap-2 text-xs text-slate-500">
                 <Shield size={12} />
                 <span>Your key is never sent to our servers, only to Google AI endpoints.</span>
               </div>
             </div>

             <button
               onClick={onSelectKey}
               className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
             >
               {apiKeyReady ? 'Change API Key' : 'Select Project & API Key'}
             </button>
          </div>
          
          <div className="p-4 bg-slate-950/30 flex items-center justify-center gap-2 text-xs font-medium text-slate-500 hover:text-indigo-400 transition-colors">
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="flex items-center gap-2">
              View Billing Documentation <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* App Info Section */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-[32px] p-8 backdrop-blur-md">
           <h3 className="text-lg font-bold text-white mb-4">Application Info</h3>
           <div className="space-y-4">
             <div className="flex justify-between items-center py-3 border-b border-slate-800/50">
               <span className="text-sm text-slate-400">Version</span>
               <span className="text-sm font-mono text-white">v2.4.0 (Beta)</span>
             </div>
             <div className="flex justify-between items-center py-3 border-b border-slate-800/50">
               <span className="text-sm text-slate-400">Video Model</span>
               <span className="text-sm font-mono text-indigo-400">veo-3.1-fast-generate-preview</span>
             </div>
             <div className="flex justify-between items-center py-3">
               <span className="text-sm text-slate-400">Environment</span>
               <span className="text-sm font-mono text-emerald-400">Project IDX</span>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

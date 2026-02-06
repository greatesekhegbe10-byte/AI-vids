
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { InputForm } from './components/InputForm';
import { BatchQueue } from './components/BatchQueue';
import { VideoEditor } from './components/VideoEditor';
import { LoadingScreen } from './components/LoadingScreen';
import { generateVideoAd } from './services/geminiService';
import { ProductData, BatchItem } from './types';
import { AlertCircle, Key, Clock, ExternalLink, ShieldCheck } from 'lucide-react';

const App: React.FC = () => {
  const [queue, setQueue] = useState<BatchItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [apiKeyReady, setApiKeyReady] = useState<boolean>(true); // Default to true if env key exists
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    checkApiKey();
    const interval = setInterval(checkApiKey, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const processQueue = async () => {
      const nextItem = queue.find(item => item.status === 'PENDING');
      if (!nextItem || processingId) return;

      setProcessingId(nextItem.id);
      updateItemStatus(nextItem.id, 'GENERATING');

      if (!selectedItemId) setSelectedItemId(nextItem.id);

      try {
        const result = await generateVideoAd(
          nextItem.data.name,
          nextItem.data.description,
          nextItem.data.images,
          nextItem.data.aspectRatio,
          nextItem.data.websiteUrl,
          nextItem.data.voice,
          nextItem.data.introText,
          nextItem.data.outroText,
          nextItem.data.targetAudience
        );
        
        setQueue(prev => prev.map(i => 
          i.id === nextItem.id ? { ...i, status: 'COMPLETED', result } : i
        ));
      } catch (error: any) {
        console.error(error);
        const errorMessage = error.message || "Unknown Studio Error";
        
        if (errorMessage.includes("entity was not found")) {
          updateItemStatus(nextItem.id, 'FAILED', "Invalid Project Key. Please re-select a paid project.");
          handleSelectKey();
        } else {
          updateItemStatus(nextItem.id, 'FAILED', errorMessage);
        }
      } finally {
        setProcessingId(null);
      }
    };

    processQueue();
  }, [queue, processingId, selectedItemId]);

  const updateItemStatus = (id: string, status: BatchItem['status'], error?: string) => {
    setQueue(prev => prev.map(i => i.id === id ? { ...i, status, error: error || i.error } : i));
  };

  const checkApiKey = async () => {
    const aistudio = (window as any).aistudio;
    const hasEnvKey = !!process.env.API_KEY && process.env.API_KEY !== "";
    
    if (aistudio && aistudio.hasSelectedApiKey) {
      const hasSelected = await aistudio.hasSelectedApiKey();
      setApiKeyReady(hasSelected || hasEnvKey);
    } else {
      setApiKeyReady(hasEnvKey);
    }
  };

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && aistudio.openSelectKey) {
      try {
        await aistudio.openSelectKey();
        setApiKeyReady(true);
      } catch (e) {
        console.error("Studio Setup Error:", e);
      }
    }
  };

  const handleAddToQueue = (data: ProductData) => {
    const newItem: BatchItem = {
      id: data.id,
      data,
      status: 'PENDING'
    };
    setQueue(prev => [...prev, newItem]);
  };

  const handleRemoveFromQueue = (id: string) => {
    setQueue(prev => prev.filter(i => i.id !== id));
    if (selectedItemId === id) setSelectedItemId(null);
  };

  const selectedItem = queue.find(i => i.id === selectedItemId);

  // Only block with gateway if we have NO key at all
  if (!apiKeyReady && (!process.env.API_KEY || process.env.API_KEY === "")) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8 relative overflow-hidden" style={{ isolation: 'isolate' }}>
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/10 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[-15%] left-[-10%] w-[60%] h-[60%] bg-purple-600/10 blur-[150px] rounded-full"></div>

        <div className="max-w-md w-full text-center space-y-12 animate-fadeIn relative z-[60] pointer-events-auto">
          <div className="space-y-6">
             <div className="bg-slate-900 border border-slate-700/50 p-10 rounded-[48px] shadow-2xl inline-block">
                <Key className="w-20 h-20 text-indigo-400 mx-auto" />
             </div>
             <div className="space-y-3">
               <h1 className="text-5xl font-black text-white tracking-tight pt-4">AdGenius</h1>
               <p className="text-slate-500 text-lg font-medium leading-relaxed max-w-xs mx-auto">
                 Setup your studio key to begin generating professional AI commercials.
               </p>
             </div>
          </div>

          <div className="space-y-4">
            <button 
              onClick={(e) => { e.preventDefault(); handleSelectKey(); }}
              onTouchStart={(e) => { /* handleSelectKey trigger */ }}
              className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[32px] font-black text-xl shadow-2xl shadow-indigo-600/40 transition-all active:scale-95 flex items-center justify-center gap-4 border border-indigo-400/20 cursor-pointer pointer-events-auto touch-manipulation min-h-[72px]"
            >
              <Key size={24} />
              Setup Studio Key
            </button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full py-4.5 bg-slate-900/40 hover:bg-slate-800 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all border border-slate-800 shadow-inner min-h-[56px]"
            >
              Learn about Paid Tier Keys
              <ExternalLink size={14} />
            </a>
          </div>
          
          <div className="pt-4 flex items-center justify-center gap-3 text-slate-800 font-black uppercase tracking-[0.3em] text-[10px]">
            <ShieldCheck size={16} />
            Professional Workspace
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      <Header onSelectKey={handleSelectKey} apiKeyReady={apiKeyReady} />

      <main className="flex-grow container mx-auto px-6 py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16 items-start">
          <InputForm onSubmit={handleAddToQueue} isProcessing={!!processingId} />
          
          <div className="space-y-10">
            <div className="bg-slate-900/30 p-8 md:p-10 rounded-[48px] border border-slate-800/40 shadow-inner h-full min-h-[500px] flex flex-col">
               <div className="flex items-center justify-between mb-8 px-2">
                 <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Active Queue</h2>
                 <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/20"></div>
               </div>
               
               {queue.length === 0 ? (
                 <div className="flex-grow flex flex-col items-center justify-center text-slate-800 text-center px-12">
                   <div className="p-8 bg-slate-950 rounded-[40px] mb-8 opacity-40 border border-slate-900 shadow-2xl">
                     <AlertCircle size={48} />
                   </div>
                   <p className="text-sm font-black uppercase tracking-[0.3em]">No Active Tasks</p>
                   <p className="text-xs mt-3 opacity-60 font-medium">Ready for your next campaign brief.</p>
                 </div>
               ) : (
                 <BatchQueue 
                   items={queue} 
                   onRemove={handleRemoveFromQueue} 
                   onSelect={(item) => setSelectedItemId(item.id)}
                   processingId={processingId}
                 />
               )}
            </div>
          </div>
        </div>

        <div className="pt-12 border-t border-slate-900/30">
          {!selectedItem && queue.length > 0 && (
            <div className="py-28 text-center opacity-30">
              <p className="text-slate-500 font-black uppercase tracking-[0.5em] text-[10px]">Tap a project above to enter Studio</p>
            </div>
          )}

          {selectedItem && selectedItem.status === 'PENDING' && (
            <div className="max-w-xl mx-auto py-28 text-center space-y-8 animate-fadeIn">
              <div className="p-8 bg-indigo-500/5 inline-block rounded-[40px] border border-indigo-500/10 mb-2">
                <Clock className="w-14 h-14 text-indigo-500 animate-pulse" />
              </div>
              <div className="space-y-3">
                <h3 className="text-4xl font-black text-white tracking-tight">On Hold</h3>
                <p className="text-slate-500 text-lg font-medium max-w-sm mx-auto">Production is busy with another campaign. Your ad will start in moments.</p>
              </div>
            </div>
          )}

          {selectedItem && selectedItem.status === 'GENERATING' && (
            <div className="py-16">
              <LoadingScreen />
            </div>
          )}

          {selectedItem && selectedItem.status === 'FAILED' && (
            <div className="max-w-xl mx-auto py-16 text-center space-y-8 px-8">
              <div className="bg-red-500/5 border border-red-500/10 p-12 md:p-16 rounded-[48px] shadow-2xl">
                <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-8 opacity-80" />
                <h3 className="text-4xl font-black text-white mb-4 tracking-tighter">Render Halted</h3>
                <p className="text-slate-500 text-lg font-medium leading-relaxed mb-12">
                  {selectedItem.error || "The AI studio encountered a capacity issue. Please check your credentials or retry."}
                </p>
                <div className="flex flex-col gap-4">
                  <button 
                    onClick={() => updateItemStatus(selectedItem.id, 'PENDING')}
                    className="w-full py-5.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[32px] font-black text-lg shadow-2xl shadow-indigo-600/40 active:scale-95 transition-all min-h-[64px]"
                  >
                    Retry Render
                  </button>
                  <button 
                    onClick={(e) => { e.preventDefault(); handleSelectKey(); }}
                    className="w-full py-4.5 bg-slate-900 border border-slate-800 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 cursor-pointer touch-manipulation min-h-[56px]"
                  >
                    Change AI Project Key
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedItem && selectedItem.status === 'COMPLETED' && selectedItem.result && (
            <div className="animate-fadeIn px-2 md:px-0">
              <div className="text-center mb-12 space-y-3">
                 <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-800">
                    Production Suite
                 </h2>
                 <p className="text-indigo-400 font-black uppercase tracking-[0.6em] text-[9px] opacity-80">Final Mastering & Post-Production</p>
              </div>
              <VideoEditor 
                result={selectedItem.result} 
                aspectRatio={selectedItem.data.aspectRatio}
                onUpdate={(newResult) => {
                   setQueue(prev => prev.map(i => i.id === selectedItem.id ? { ...i, result: newResult } : i));
                }}
              />
            </div>
          )}
        </div>
      </main>

      <footer className="py-16 border-t border-slate-900/30 text-center space-y-6">
        <div className="flex items-center justify-center gap-4 text-slate-800">
          <div className="w-12 h-px bg-slate-900"></div>
          <p className="uppercase tracking-[0.5em] font-black text-[10px]">AI-Powered Marketing</p>
          <div className="w-12 h-px bg-slate-900"></div>
        </div>
        <p className="text-slate-600 text-[10px] font-bold">&copy; {new Date().getFullYear()} AdGenius AI Studio. Powered by Google Veo & Gemini 2.5.</p>
      </footer>
    </div>
  );
};

export default App;

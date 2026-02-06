
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
  const [apiKeyReady, setApiKeyReady] = useState<boolean>(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    checkApiKey();
    // Periodically check if API key selection state changed outside React
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
          nextItem.data.targetAudience // Pass the new field
        );
        
        setQueue(prev => prev.map(i => 
          i.id === nextItem.id ? { ...i, status: 'COMPLETED', result } : i
        ));
      } catch (error: any) {
        console.error(error);
        const errorMessage = error.message || "";
        
        if (errorMessage.includes("Requested entity was not found")) {
          setApiKeyReady(false);
          updateItemStatus(nextItem.id, 'FAILED', "Invalid API Key. Please select a valid project.");
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
    if (aistudio && aistudio.hasSelectedApiKey) {
      const hasKey = await aistudio.hasSelectedApiKey();
      setApiKeyReady(hasKey);
    } else {
      setApiKeyReady(!!process.env.API_KEY); 
    }
  };

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && aistudio.openSelectKey) {
      try {
        await aistudio.openSelectKey();
        // Assume success after dialog trigger for better mobile UX
        setApiKeyReady(true);
      } catch (e) {
        console.error("API Key Dialog Error:", e);
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

  if (!apiKeyReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Animated Background Gradients for Mobile Flair */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full"></div>

        <div className="max-w-md w-full text-center space-y-10 animate-fadeIn relative z-10">
          <div className="space-y-4">
             <div className="bg-slate-900 border border-slate-700 p-8 rounded-[40px] shadow-2xl inline-block">
                <Key className="w-16 h-16 text-indigo-400 mx-auto" />
             </div>
             <h1 className="text-4xl font-black text-white tracking-tight pt-4">AdGenius</h1>
             <p className="text-slate-400 text-lg leading-relaxed max-w-xs mx-auto">
               Set your API key to start generating professional AI commercials.
             </p>
          </div>

          <div className="space-y-4">
            <button 
              onClick={handleSelectKey} 
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-3xl font-black text-xl shadow-2xl shadow-indigo-600/40 transition-all active:scale-95 flex items-center justify-center gap-4 border border-indigo-400/20"
            >
              <Key size={24} />
              Set API Key
            </button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full py-4 bg-slate-900/50 hover:bg-slate-800 text-slate-400 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all border border-slate-800"
            >
              View Billing Setup
              <ExternalLink size={14} />
            </a>
          </div>
          
          <div className="flex items-center justify-center gap-3 text-slate-700 font-bold uppercase tracking-widest text-[10px]">
            <ShieldCheck size={14} />
            Secure Studio Access
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      <Header onSelectKey={handleSelectKey} apiKeyReady={apiKeyReady} />

      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12 items-start">
          <InputForm onSubmit={handleAddToQueue} isProcessing={!!processingId} />
          
          <div className="space-y-8">
            <div className="bg-slate-900/40 p-6 md:p-8 rounded-[40px] border border-slate-800/60 shadow-inner h-full min-h-[450px]">
               <h2 className="text-xl md:text-2xl font-black mb-6 text-white px-2">Work Queue</h2>
               {queue.length === 0 ? (
                 <div className="h-64 flex flex-col items-center justify-center text-slate-700 text-center px-10">
                   <div className="p-6 bg-slate-950 rounded-full mb-6 opacity-40 border border-slate-800 shadow-xl">
                     <AlertCircle size={40} />
                   </div>
                   <p className="text-sm font-bold uppercase tracking-widest">Studio is ready</p>
                   <p className="text-xs mt-2 opacity-60">Complete the form to start production.</p>
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

        <div className="pt-10 border-t border-slate-900/50">
          {!selectedItem && queue.length > 0 && (
            <div className="py-24 text-center">
              <p className="text-slate-600 font-bold uppercase tracking-[0.3em] text-xs">Select a Project Above</p>
            </div>
          )}

          {selectedItem && selectedItem.status === 'PENDING' && (
            <div className="max-w-xl mx-auto py-24 text-center space-y-6">
              <div className="p-6 bg-indigo-500/5 inline-block rounded-[32px] border border-indigo-500/10 mb-2">
                <Clock className="w-12 h-12 text-indigo-400 animate-pulse" />
              </div>
              <h3 className="text-3xl font-black text-white">Scheduled</h3>
              <p className="text-slate-400 text-lg leading-relaxed max-w-sm mx-auto">Rendering queue active. Your ad will start production automatically.</p>
            </div>
          )}

          {selectedItem && selectedItem.status === 'GENERATING' && (
            <div className="py-12">
              <LoadingScreen />
            </div>
          )}

          {selectedItem && selectedItem.status === 'FAILED' && (
            <div className="max-w-xl mx-auto py-12 text-center space-y-6 px-6">
              <div className="bg-red-500/5 border border-red-500/20 p-10 md:p-14 rounded-[40px] shadow-2xl">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-8" />
                <h3 className="text-3xl font-black text-white mb-4 tracking-tight">Render Error</h3>
                <p className="text-slate-400 text-lg leading-relaxed mb-10">
                  {selectedItem.error || "Generation interrupted. Check your API project status or try again."}
                </p>
                <div className="flex flex-col gap-4">
                  <button 
                    onClick={() => updateItemStatus(selectedItem.id, 'PENDING')}
                    className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-3xl font-black text-lg transition-all active:scale-95 shadow-2xl shadow-indigo-600/30"
                  >
                    Retry Render
                  </button>
                  <button 
                    onClick={handleSelectKey}
                    className="w-full py-4 bg-slate-900 border border-slate-800 text-slate-300 rounded-2xl font-bold active:scale-95"
                  >
                    Change API Key
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedItem && selectedItem.status === 'COMPLETED' && selectedItem.result && (
            <div className="animate-fadeIn px-2 md:px-0">
              <div className="text-center mb-10 space-y-2">
                 <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-600">
                    Creative Studio
                 </h2>
                 <p className="text-indigo-400 font-black uppercase tracking-[0.4em] text-[10px]">Production Approved</p>
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

      <footer className="py-12 border-t border-slate-900/40 text-center space-y-4">
        <p className="uppercase tracking-[0.4em] font-black text-slate-700 text-[10px]">AI-Native Commercial Studio</p>
        <p className="text-slate-600 text-xs">&copy; {new Date().getFullYear()} AdGenius AI. Powered by Veo & Gemini.</p>
      </footer>
    </div>
  );
};

export default App;

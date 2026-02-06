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
  }, []);

  // BATCH PROCESSOR
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
          nextItem.data.outroText
        );
        
        setQueue(prev => prev.map(i => 
          i.id === nextItem.id ? { ...i, status: 'COMPLETED', result } : i
        ));
      } catch (error: any) {
        console.error(error);
        const errorMessage = error.message || "";
        
        if (errorMessage.includes("Requested entity was not found")) {
          setApiKeyReady(false);
          updateItemStatus(nextItem.id, 'FAILED', "Invalid API Key. Please select a paid GCP project key.");
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
        // Proceed after dialog as per standard AI Studio flow
        setApiKeyReady(true);
      } catch (e) {
        console.error(e);
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

  // If no API key is set, show a full-screen mobile-ready gateway
  if (!apiKeyReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-8 animate-fadeIn">
          <div className="relative inline-block">
             <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20"></div>
             <div className="relative bg-slate-900 border border-slate-700 p-6 rounded-3xl shadow-2xl">
                <Key className="w-12 h-12 text-indigo-400 mx-auto" />
             </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-3xl font-black text-white tracking-tight">AdGenius Studio</h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Unlock professional AI video generation by selecting your Gemini API key.
            </p>
          </div>

          <div className="space-y-4 pt-4">
            <button 
              onClick={handleSelectKey} 
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg shadow-2xl shadow-indigo-600/30 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <Key size={20} />
              Set Up API Key
            </button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              Billing Requirements
              <ExternalLink size={16} />
            </a>
          </div>
          
          <div className="pt-8 flex items-center justify-center gap-2 text-slate-600">
            <ShieldCheck size={14} />
            <span className="text-xs uppercase tracking-widest font-bold">Secure AI Processing</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      <Header onSelectKey={handleSelectKey} apiKeyReady={apiKeyReady} />

      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 items-start">
          <InputForm onSubmit={handleAddToQueue} isProcessing={!!processingId} />
          
          <div className="space-y-6">
            <div className="bg-slate-900/30 p-6 rounded-3xl border border-slate-800 h-full min-h-[400px]">
               <h2 className="text-xl font-bold mb-4 text-white px-2">Production Queue</h2>
               {queue.length === 0 ? (
                 <div className="h-64 flex flex-col items-center justify-center text-slate-600 text-center px-6">
                   <div className="p-4 bg-slate-900 rounded-full mb-3 opacity-20">
                     <AlertCircle size={32} />
                   </div>
                   <p className="text-sm">Queue is empty. Add product details to begin.</p>
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

        <div className="pt-8 border-t border-slate-900 min-h-[500px]">
          {!selectedItem && queue.length > 0 && (
            <div className="py-20 text-center text-slate-500">
              <p>Select a queued project to view progress or edit.</p>
            </div>
          )}

          {selectedItem && selectedItem.status === 'PENDING' && (
            <div className="max-w-xl mx-auto py-20 text-center space-y-4">
              <div className="p-5 bg-indigo-500/10 inline-block rounded-full mb-2">
                <Clock className="w-10 h-10 text-indigo-400 animate-pulse" />
              </div>
              <h3 className="text-2xl font-bold text-white">Scheduled for Generation</h3>
              <p className="text-slate-400">Your ad is in line. Production starts as soon as the current project finishes.</p>
            </div>
          )}

          {selectedItem && selectedItem.status === 'GENERATING' && (
            <div className="py-12">
              <LoadingScreen />
            </div>
          )}

          {selectedItem && selectedItem.status === 'FAILED' && (
            <div className="max-w-xl mx-auto py-12 text-center space-y-4 px-4">
              <div className="bg-red-500/10 border border-red-500/30 p-8 md:p-12 rounded-3xl">
                <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-white mb-2">Generation Failed</h3>
                <p className="text-slate-400 mb-8 leading-relaxed">
                  {selectedItem.error || "A connection error occurred. This often happens when the AI servers are at peak load."}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button 
                    onClick={() => updateItemStatus(selectedItem.id, 'PENDING')}
                    className="w-full sm:w-auto px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all active:scale-95 shadow-xl shadow-indigo-600/20"
                  >
                    Retry Project
                  </button>
                  {selectedItem.error?.includes("entity was not found") && (
                    <button 
                      onClick={handleSelectKey}
                      className="w-full sm:w-auto px-10 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl font-bold transition-all border border-slate-700 active:scale-95"
                    >
                      New API Key
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedItem && selectedItem.status === 'COMPLETED' && selectedItem.result && (
            <div className="animate-fadeIn px-2 md:px-0">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-8 text-center bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500">
                Studio View
              </h2>
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

      <footer className="py-10 border-t border-slate-900 text-center text-slate-600 text-[10px] md:text-xs">
        <p className="uppercase tracking-[0.2em] mb-2 font-bold opacity-60">Professional Video Production Suite</p>
        <p>&copy; {new Date().getFullYear()} AdGenius AI. Powered by Google Veo Technology.</p>
      </footer>
    </div>
  );
};

export default App;
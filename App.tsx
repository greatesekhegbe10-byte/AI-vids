import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { InputForm } from './components/InputForm';
import { BatchQueue } from './components/BatchQueue';
import { VideoEditor } from './components/VideoEditor';
import { LoadingScreen } from './components/LoadingScreen';
import { generateVideoAd } from './services/geminiService';
import { AppState, ProductData, BatchItem } from './types';
import { AlertCircle, Key, Clock, ExternalLink } from 'lucide-react';

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
      // Find next PENDING item
      const nextItem = queue.find(item => item.status === 'PENDING');
      if (!nextItem || processingId) return;

      setProcessingId(nextItem.id);
      updateItemStatus(nextItem.id, 'GENERATING');

      // Auto-select if nothing is selected yet
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
        
        // Handle specific API key error as per instructions
        if (errorMessage.includes("Requested entity was not found")) {
          setApiKeyReady(false);
          updateItemStatus(nextItem.id, 'FAILED', "Invalid API Key or Project. Please select a valid key from a paid GCP project.");
          handleSelectKey(); // Prompt user again immediately
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
      // Fallback for non-aistudio environments if necessary, 
      // though instructions imply it's always available.
      setApiKeyReady(!!process.env.API_KEY); 
    }
  };

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && aistudio.openSelectKey) {
      try {
        await aistudio.openSelectKey();
        // Race condition: Assume success after opening dialog as per instructions
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      <Header onSelectKey={handleSelectKey} apiKeyReady={apiKeyReady} />

      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        {!apiKeyReady && (
           <div className="max-w-2xl mx-auto mb-12 p-10 bg-indigo-900/10 border border-indigo-500/20 rounded-3xl text-center backdrop-blur-sm relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
             <Key className="w-12 h-12 mx-auto text-indigo-400 mb-4" />
             <h3 className="text-2xl font-bold text-white mb-3">API Setup Required</h3>
             <p className="text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
               To generate professional video ads with Gemini Veo, you must select an API key from a paid GCP project.
             </p>
             <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
               <button 
                onClick={handleSelectKey} 
                className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2"
               >
                 <Key size={18} />
                 Select API Key
               </button>
               <a 
                 href="https://ai.google.dev/gemini-api/docs/billing" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="w-full sm:w-auto px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
               >
                 Billing Docs
                 <ExternalLink size={14} />
               </a>
             </div>
           </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 items-start">
          <InputForm onSubmit={handleAddToQueue} isProcessing={!!processingId} />
          
          <div className="space-y-6">
            <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-800 h-full min-h-[400px]">
               <h2 className="text-xl font-bold mb-4 text-white">Production Queue</h2>
               {queue.length === 0 ? (
                 <div className="h-64 flex flex-col items-center justify-center text-slate-600 text-center px-6">
                   <div className="p-4 bg-slate-900 rounded-full mb-3 opacity-20">
                     <AlertCircle size={32} />
                   </div>
                   <p className="text-sm">No projects in queue. Upload product details and images to start generating ads.</p>
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

        {/* Workspace Area */}
        <div className="pt-8 border-t border-slate-900 min-h-[500px]">
          {!selectedItem && queue.length > 0 && (
            <div className="py-20 text-center text-slate-500">
              <p>Select an item from the queue to view its progress or result.</p>
            </div>
          )}

          {selectedItem && selectedItem.status === 'PENDING' && (
            <div className="max-w-xl mx-auto py-20 text-center space-y-4">
              <div className="p-4 bg-indigo-500/10 inline-block rounded-full mb-2">
                <Clock className="w-8 h-8 text-indigo-400 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-white">Waiting in Queue</h3>
              <p className="text-slate-400 text-sm">We process ads one by one for maximum quality. This project will start automatically.</p>
            </div>
          )}

          {selectedItem && selectedItem.status === 'GENERATING' && (
            <div className="py-12">
              <LoadingScreen />
            </div>
          )}

          {selectedItem && selectedItem.status === 'FAILED' && (
            <div className="max-w-xl mx-auto py-12 text-center space-y-4">
              <div className="bg-red-500/10 border border-red-500/30 p-8 rounded-2xl">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Generation Failed</h3>
                <p className="text-slate-400 text-sm mb-6">
                  {selectedItem.error || "The model encountered an error. This usually happens when the AI servers are at maximum capacity."}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button 
                    onClick={() => updateItemStatus(selectedItem.id, 'PENDING')}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-indigo-600/20"
                  >
                    Retry Generation
                  </button>
                  {selectedItem.error?.includes("entity was not found") && (
                    <button 
                      onClick={handleSelectKey}
                      className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition-all border border-slate-700"
                    >
                      Update API Key
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedItem && selectedItem.status === 'COMPLETED' && selectedItem.result && (
            <div className="animate-fadeIn">
              <h2 className="text-3xl font-bold text-white mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-slate-400">Creative Studio</h2>
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

      <footer className="py-8 border-t border-slate-900 text-center text-slate-600 text-xs">
        <p>&copy; {new Date().getFullYear()} AdGenius AI. All video and audio elements generated by Google Gemini.</p>
      </footer>
    </div>
  );
};

export default App;
import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { InputForm } from './components/InputForm';
import { BatchQueue } from './components/BatchQueue';
import { VideoEditor } from './components/VideoEditor';
import { LoadingScreen } from './components/LoadingScreen';
import { generateVideoAd } from './services/geminiService';
import { AppState, ProductData, BatchItem } from './types';
import { AlertCircle, Key } from 'lucide-react';

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
        
        // Auto-select if it's the first one
        if (!selectedItemId) setSelectedItemId(nextItem.id);

      } catch (error: any) {
        console.error(error);
        setQueue(prev => prev.map(i => 
          i.id === nextItem.id ? { ...i, status: 'FAILED', error: error.message } : i
        ));
      } finally {
        setProcessingId(null);
      }
    };

    processQueue();
  }, [queue, processingId]);

  const updateItemStatus = (id: string, status: BatchItem['status']) => {
    setQueue(prev => prev.map(i => i.id === id ? { ...i, status } : i));
  };

  const checkApiKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && aistudio.hasSelectedApiKey) {
      const hasKey = await aistudio.hasSelectedApiKey();
      setApiKeyReady(hasKey);
    } else {
      setApiKeyReady(true); 
    }
  };

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && aistudio.openSelectKey) {
      try {
        await aistudio.openSelectKey();
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
      <Header />

      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        {!apiKeyReady && (
           <div className="max-w-xl mx-auto mb-8 p-6 bg-indigo-900/20 border border-indigo-500/30 rounded-2xl text-center">
             <Key className="w-8 h-8 mx-auto text-indigo-400 mb-3" />
             <h3 className="text-lg font-semibold text-white mb-2">API Key Required</h3>
             <button onClick={handleSelectKey} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium">Select API Key</button>
           </div>
        )}

        {/* Input & Queue Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 items-start">
          <InputForm onSubmit={handleAddToQueue} isProcessing={false} />
          
          <div className="space-y-6">
            <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-800 h-full min-h-[400px]">
               <h2 className="text-xl font-bold mb-4 text-white">Production Queue</h2>
               {queue.length === 0 ? (
                 <div className="h-64 flex flex-col items-center justify-center text-slate-600">
                   <div className="p-4 bg-slate-900 rounded-full mb-3"><Key size={24} className="opacity-0"/></div>
                   <p>No projects in queue</p>
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

        {/* Active Workspace / Editor */}
        {processingId && !selectedItem && (
          <div className="py-12">
            <LoadingScreen />
          </div>
        )}

        {selectedItem && selectedItem.status === 'COMPLETED' && selectedItem.result && (
          <div className="pt-8 border-t border-slate-900">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Studio Editor</h2>
            <VideoEditor 
              result={selectedItem.result} 
              aspectRatio={selectedItem.data.aspectRatio}
              onUpdate={(newResult) => {
                 setQueue(prev => prev.map(i => i.id === selectedItem.id ? { ...i, result: newResult } : i));
              }}
            />
          </div>
        )}
      </main>

      <footer className="py-6 border-t border-slate-900 text-center text-slate-600 text-sm">
        <p>&copy; {new Date().getFullYear()} AdGenius. Powered by Google Gemini.</p>
      </footer>
    </div>
  );
};

export default App;

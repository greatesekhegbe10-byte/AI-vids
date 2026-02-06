
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { InputForm } from './components/InputForm';
import { BatchQueue } from './components/BatchQueue';
import { VideoEditor } from './components/VideoEditor';
import { LoadingScreen } from './components/LoadingScreen';
import { generateCreativeConcept, initiateVideoRender, pollVideoAdStatus, generateVoiceover } from './services/geminiService';
import { ProductData, BatchItem, CreativeConcept } from './types';
import { AlertCircle, Key, Clock, ExternalLink, ShieldCheck, FileText, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [queue, setQueue] = useState<BatchItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [apiKeyReady, setApiKeyReady] = useState<boolean>(true);
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  
  const pollingIntervals = useRef<Record<string, number>>({});
  const processingRef = useRef<boolean>(false);

  useEffect(() => {
    checkApiKey();
    const interval = setInterval(checkApiKey, 5000);
    return () => clearInterval(interval);
  }, []);

  const updateItemStatus = useCallback((id: string, status: BatchItem['status'], error?: string) => {
    setQueue(prev => prev.map(i => i.id === id ? { ...i, status, error: error || i.error } : i));
  }, []);

  const stopPolling = useCallback((id: string) => {
    if (pollingIntervals.current[id]) {
      window.clearInterval(pollingIntervals.current[id]);
      delete pollingIntervals.current[id];
    }
  }, []);

  // Main Queue Processor
  useEffect(() => {
    if (processingRef.current) return;

    const processQueue = async () => {
      const nextItem = queue.find(item => item.status === 'PENDING');
      if (!nextItem) {
        setIsQueueRunning(false);
        return;
      }

      processingRef.current = true;
      setIsQueueRunning(true);
      updateItemStatus(nextItem.id, 'INITIATING');

      if (!selectedItemId) setSelectedItemId(nextItem.id);

      try {
        // Step 1: Generate Concept (Script, Storyboard, etc.) - Fast/Reliable
        const concept = await generateCreativeConcept(
          nextItem.data.name,
          nextItem.data.websiteUrl,
          nextItem.data.description,
          nextItem.data.targetAudience,
          nextItem.data.slogan
        );

        // Store concept immediately so user can see it
        setQueue(prev => prev.map(i => i.id === nextItem.id ? { ...i, concept } : i));

        // Step 2: Generate Voiceover
        const audioUrl = await generateVoiceover(concept.voiceoverScript, nextItem.data.voice);

        // Step 3: Attempt Video Render
        try {
          const operationName = await initiateVideoRender(concept, nextItem.data.images, nextItem.data.aspectRatio);
          setQueue(prev => prev.map(i => 
            i.id === nextItem.id ? { 
              ...i, 
              status: 'POLLING', 
              operationName,
              result: { videoUrl: '', audioUrl, concept } 
            } : i
          ));
        } catch (videoError: any) {
          if (videoError.message.includes('429') || videoError.message.includes('RESOURCE_EXHAUSTED')) {
            updateItemStatus(nextItem.id, 'QUOTA_WAIT', "Quota Exhausted. Waiting to retry video render...");
          } else {
            throw videoError;
          }
        }
      } catch (error: any) {
        console.error("Initiation error:", error);
        updateItemStatus(nextItem.id, 'FAILED', error.message || "Production Failed");
      } finally {
        processingRef.current = false;
      }
    };

    processQueue();
  }, [queue, selectedItemId, updateItemStatus]);

  // Unified Polling Handler
  useEffect(() => {
    const activePollingItems = queue.filter(item => (item.status === 'POLLING' || item.status === 'QUOTA_WAIT') && item.operationName);
    
    activePollingItems.forEach(item => {
      if (!pollingIntervals.current[item.id]) {
        const runPoll = async () => {
          try {
            const status = await pollVideoAdStatus(item.operationName!);
            if (status.done) {
              stopPolling(item.id);
              if (status.error) {
                updateItemStatus(item.id, 'FAILED', status.error);
              } else if (status.result) {
                setQueue(prev => prev.map(i => i.id === item.id ? {
                  ...i,
                  status: 'COMPLETED',
                  result: { ...status.result!, audioUrl: i.result?.audioUrl || null, concept: i.concept }
                } : i));
              }
            } else if (status.isQuotaExhausted) {
              updateItemStatus(item.id, 'QUOTA_WAIT');
            } else {
              if (item.status === 'QUOTA_WAIT') updateItemStatus(item.id, 'POLLING');
            }
          } catch (e) {
            console.error(`Poll error for item ${item.id}:`, e);
          }
        };

        pollingIntervals.current[item.id] = window.setInterval(runPoll, 20000); // Slower polling for quota safety
        runPoll(); 
      }
    });

    return () => {};
  }, [queue, stopPolling, updateItemStatus]);

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
      } catch (e) { console.error("Studio Setup Error:", e); }
    }
  };

  const handleAddToQueue = (data: ProductData) => {
    setQueue(prev => [...prev, { id: data.id, data, status: 'PENDING' }]);
  };

  const handleRemoveFromQueue = (id: string) => {
    stopPolling(id);
    setQueue(prev => prev.filter(i => i.id !== id));
    if (selectedItemId === id) setSelectedItemId(null);
  };

  const selectedItem = queue.find(i => i.id === selectedItemId);

  if (!apiKeyReady && (!process.env.API_KEY || process.env.API_KEY === "")) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8 text-white relative">
        <div className="max-w-md w-full text-center space-y-12 animate-fadeIn relative z-[100]">
           <div className="bg-slate-900 border border-slate-700/50 p-10 rounded-[48px] shadow-2xl inline-block">
              <Key className="w-20 h-20 text-indigo-400 mx-auto" />
           </div>
           <h1 className="text-5xl font-black">AdGenius</h1>
           <p className="text-slate-500">Setup your studio key to begin.</p>
           <button 
             onPointerDown={handleSelectKey}
             className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[32px] font-black text-xl shadow-2xl transition-all min-h-[72px]"
           >
             Setup Studio Key
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-x-hidden relative">
      <Header onSelectKey={handleSelectKey} apiKeyReady={apiKeyReady} />

      <main className="flex-grow container mx-auto px-6 py-10 md:py-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16 items-start">
          <InputForm onSubmit={handleAddToQueue} isProcessing={isQueueRunning} />
          
          <div className="space-y-10">
            <div className="bg-slate-900/30 p-8 rounded-[48px] border border-slate-800/40 shadow-inner min-h-[500px] flex flex-col pointer-events-auto">
               <h2 className="text-2xl font-black text-white mb-8">Active Queue</h2>
               {queue.length === 0 ? (
                 <div className="flex-grow flex flex-col items-center justify-center text-slate-800">
                   <AlertCircle size={48} className="mb-4 opacity-40" />
                   <p className="uppercase tracking-[0.3em] text-[10px]">No Tasks</p>
                 </div>
               ) : (
                 <BatchQueue items={queue} onRemove={handleRemoveFromQueue} onSelect={(item) => setSelectedItemId(item.id)} processingId={processingRef.current ? 'active' : null} />
               )}
            </div>
          </div>
        </div>

        <div className="pt-12 border-t border-slate-900/30">
          {selectedItem && (
            <div className="space-y-12">
               {/* Concept/Storyboard Preview (Always visible if generated) */}
               {selectedItem.concept && (
                 <div className="max-w-4xl mx-auto bg-slate-900/80 border border-slate-700/50 p-8 md:p-12 rounded-[48px] shadow-2xl animate-fadeIn">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400"><FileText size={24}/></div>
                      <div>
                        <h3 className="text-2xl font-black text-white">Ad Blueprint</h3>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">AI Creative Plan</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                       <div className="space-y-6">
                          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Voiceover Script</h4>
                          <p className="text-slate-300 leading-relaxed italic text-lg">"{selectedItem.concept.voiceoverScript}"</p>
                          <div className="pt-4">
                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Visual Style</h4>
                            <p className="text-slate-400 text-sm leading-relaxed">{selectedItem.concept.visualPrompt}</p>
                          </div>
                       </div>
                       
                       <div className="space-y-6">
                          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Sequence Breakdown</h4>
                          <div className="space-y-4">
                            {selectedItem.concept.scenes.map((scene, idx) => (
                              <div key={idx} className="bg-slate-950/50 border border-slate-800 p-4 rounded-2xl">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Scene 0{idx+1}</span>
                                  <span className="text-[10px] font-mono text-slate-600">{scene.duration}</span>
                                </div>
                                <p className="text-xs text-slate-400 mb-2">{scene.description}</p>
                                <div className="text-[10px] font-bold text-white uppercase bg-slate-800 px-2 py-1 rounded inline-block">Overlay: {scene.textOverlay}</div>
                              </div>
                            ))}
                          </div>
                       </div>
                    </div>
                 </div>
               )}

               {/* Video Result or Status */}
               {selectedItem.status === 'COMPLETED' && selectedItem.result ? (
                 <VideoEditor 
                    result={selectedItem.result} 
                    aspectRatio={selectedItem.data.aspectRatio}
                    onUpdate={(newResult) => setQueue(prev => prev.map(i => i.id === selectedItem.id ? { ...i, result: newResult } : i))}
                 />
               ) : selectedItem.status === 'QUOTA_WAIT' ? (
                 <div className="max-w-2xl mx-auto py-20 text-center space-y-8 px-8">
                    <div className="bg-amber-500/5 border border-amber-500/10 p-12 rounded-[48px] shadow-2xl animate-pulse">
                      <RefreshCw className="w-16 h-16 text-amber-500 mx-auto mb-6 animate-spin-slow" />
                      <h3 className="text-3xl font-black text-white mb-2">Quota Limit Reached</h3>
                      <p className="text-slate-500 text-lg font-medium">The AI is currently cooling down. We've saved your Blueprint above and will automatically render the video once the quota window reopens.</p>
                    </div>
                 </div>
               ) : (selectedItem.status === 'INITIATING' || selectedItem.status === 'POLLING') ? (
                 <LoadingScreen progress={selectedItem.status === 'POLLING' ? 'AI is busy building your sequence...' : 'Analyzing product and writing script...'} />
               ) : selectedItem.status === 'FAILED' ? (
                 <div className="max-w-xl mx-auto py-16 text-center">
                    <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-8" />
                    <h3 className="text-4xl font-black text-white mb-4">Render Halted</h3>
                    <p className="text-slate-500 mb-12">{selectedItem.error}</p>
                    <button onPointerDown={() => updateItemStatus(selectedItem.id, 'PENDING')} className="px-12 py-5 bg-indigo-600 text-white rounded-[32px] font-black uppercase">Retry Render</button>
                 </div>
               ) : null}
            </div>
          )}
        </div>
      </main>

      <footer className="py-16 border-t border-slate-900/30 text-center relative z-10 text-slate-600 text-[10px] font-bold uppercase tracking-[0.2em]">
        AdGenius AI Studio
      </footer>
    </div>
  );
};

export default App;

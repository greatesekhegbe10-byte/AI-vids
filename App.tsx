
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { InputForm } from './components/InputForm';
import { BatchQueue } from './components/BatchQueue';
import { AdPlanDisplay } from './components/AdPlanDisplay';
import { generateAdPlan, initiateVideoRender, pollVideoAdStatus, generateVoiceover } from './services/geminiService';
import { ProductData, BatchItem, AdPlan } from './types';
import { Cpu, Video, Loader2, Key, ExternalLink } from 'lucide-react';

const App: React.FC = () => {
  const [queue, setQueue] = useState<BatchItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [apiKeyReady, setApiKeyReady] = useState<boolean>(true);
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  
  const pollingIntervals = useRef<Record<string, number>>({});
  const processingRef = useRef<boolean>(false);

  useEffect(() => {
    const checkKey = async () => {
      const aistudio = (window as any).aistudio;
      const hasEnvKey = !!process.env.API_KEY;
      if (aistudio?.hasSelectedApiKey) {
        setApiKeyReady(await aistudio.hasSelectedApiKey() || hasEnvKey);
      } else setApiKeyReady(hasEnvKey);
    };
    checkKey();
    const interval = setInterval(checkKey, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio?.openSelectKey) {
      await aistudio.openSelectKey();
      setApiKeyReady(true);
    }
  };

  const updateItemStatus = useCallback((id: string, status: BatchItem['status'], error?: string) => {
    setQueue(prev => prev.map(i => i.id === id ? { ...i, status, error: error || i.error } : i));
  }, []);

  const handleAddToQueue = (data: ProductData) => {
    setQueue(prev => [...prev, { id: data.id, data, status: 'PENDING' }]);
  };

  // MAIN PRODUCTION PIPELINE
  useEffect(() => {
    if (processingRef.current) return;
    
    const processQueue = async () => {
      const nextItem = queue.find(item => item.status === 'PENDING');
      if (!nextItem) { setIsQueueRunning(false); return; }
      
      processingRef.current = true;
      setIsQueueRunning(true);
      updateItemStatus(nextItem.id, 'INITIATING');
      if (!selectedItemId) setSelectedItemId(nextItem.id);

      try {
        // PHASE 1: STRATEGY GENERATION (FAST)
        const plan = await generateAdPlan(
          nextItem.data.name, nextItem.data.websiteUrl, nextItem.data.description,
          nextItem.data.targetAudience, nextItem.data.slogan,
          nextItem.data.goal, nextItem.data.tone, nextItem.data.platform, nextItem.data.maxDuration,
          nextItem.data.images
        );

        // Update UI immediately with the Plan
        setQueue(prev => prev.map(i => i.id === nextItem.id ? { 
          ...i, 
          plan, 
          status: 'POLLING', // Moving to polling immediately for the render phase
          result: { videoUrl: '', audioUrl: null, plan } 
        } : i));

        // PHASE 2: PARALLEL RENDERING (SLOW)
        const hookScene = plan.scene_map.find(s => s.scene_goal === 'hook') || plan.scene_map[0];
        
        // Start Render and TTS in parallel
        const [videoOpName] = await Promise.all([
          initiateVideoRender(hookScene.visual_instruction, nextItem.data.images, nextItem.data.aspectRatio),
          generateVoiceover(hookScene.voiceover_text, nextItem.data.voice).then(audioUrl => {
            setQueue(prev => prev.map(i => i.id === nextItem.id ? { 
              ...i, 
              result: { ...(i.result || { videoUrl: '', audioUrl: null }), audioUrl } 
            } : i));
          })
        ]);

        // Update the item with the operation name so polling starts
        setQueue(prev => prev.map(i => i.id === nextItem.id ? { 
          ...i, 
          operationName: videoOpName 
        } : i));

      } catch (error: any) {
        updateItemStatus(nextItem.id, 'FAILED', error.message || "Engine failure");
      } finally { 
        processingRef.current = false; 
      }
    };
    processQueue();
  }, [queue, selectedItemId, updateItemStatus]);

  // STABLE POLLING LOOP
  useEffect(() => {
    const active = queue.filter(item => item.status === 'POLLING' && item.operationName);
    active.forEach(item => {
      if (!pollingIntervals.current[item.id]) {
        const run = async () => {
          const status = await pollVideoAdStatus(item.operationName!);
          if (status.done) {
            window.clearInterval(pollingIntervals.current[item.id]);
            delete pollingIntervals.current[item.id];
            if (status.result) {
              setQueue(prev => prev.map(i => i.id === item.id ? { 
                ...i, 
                status: 'COMPLETED', 
                result: { ...status.result!, audioUrl: i.result?.audioUrl || null, plan: i.plan } 
              } : i));
            } else {
              updateItemStatus(item.id, 'FAILED', status.error);
            }
          }
        };
        // Shorter poll interval (8s) for faster feeling transition
        pollingIntervals.current[item.id] = window.setInterval(run, 8000);
        run();
      }
    });
  }, [queue, updateItemStatus]);

  const selectedItem = queue.find(i => i.id === selectedItemId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      <Header onSelectKey={handleSelectKey} apiKeyReady={apiKeyReady} />
      
      {!apiKeyReady && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-md:max-w-md bg-slate-900 border border-slate-800 rounded-[40px] p-8 md:p-12 shadow-3xl animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center text-indigo-400 mb-8 border border-indigo-500/20">
                <Key size={40} />
              </div>
              <h2 className="text-3xl font-black tracking-tighter text-white mb-4">Configuration Required</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-8">
                To power AdGenius and the Veo 3.1 video engine, you must connect a paid Google Gemini API key.
              </p>
              
              <div className="w-full space-y-4">
                <button 
                  onClick={handleSelectKey}
                  className="w-full py-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black rounded-2xl shadow-2xl active:scale-95 transition-all uppercase tracking-widest text-xs"
                >
                  Configure API Key
                </button>
                <div className="pt-2">
                  <a 
                    href="https://ai.google.dev/gemini-api/docs/billing" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-400 text-[10px] font-black uppercase tracking-widest transition-colors"
                  >
                    Billing Documentation <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-grow container mx-auto px-6 py-12 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <InputForm onSubmit={handleAddToQueue} isProcessing={isQueueRunning} />
          <div className="bg-slate-900/40 p-8 rounded-[48px] border border-slate-800/60 shadow-inner flex flex-col min-h-[500px]">
             <h2 className="text-xl font-black mb-8 flex items-center gap-3"><Cpu size={18} className="text-indigo-400"/> Production Pipeline</h2>
             {queue.length === 0 ? (
               <div className="flex-grow flex flex-col items-center justify-center text-slate-800 opacity-20">
                 <Video size={64} className="mb-4"/>
                 <p className="text-xs font-black uppercase tracking-[0.4em]">Engine Standby</p>
               </div>
             ) : (
               <BatchQueue items={queue} onRemove={(id) => setQueue(q => q.filter(i => i.id !== id))} onSelect={(item) => setSelectedItemId(item.id)} processingId={null} />
             )}
          </div>
        </div>

        {selectedItem && (
          <div className="mt-16 animate-fadeIn">
            {selectedItem.plan ? (
              <AdPlanDisplay item={selectedItem} />
            ) : (
              <div className="flex flex-col items-center py-20 bg-slate-900/40 rounded-[48px] border border-slate-800/60">
                 <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Synthesizing Creative Logic...</p>
                 <span className="text-[8px] text-slate-700 mt-2">Gemini 3 Flash is performing brand analysis</span>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;

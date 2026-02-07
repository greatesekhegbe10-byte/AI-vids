
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { InputForm } from './components/InputForm';
import { BatchQueue } from './components/BatchQueue';
import { AdPlanDisplay } from './components/AdPlanDisplay';
import { generateAdPlan, generateSceneThumbnails } from './services/geminiService';
import { ProductData, BatchItem } from './types';
import { Cpu, Video, Loader2, Key, ExternalLink, Sparkles } from 'lucide-react';

const App: React.FC = () => {
  const [queue, setQueue] = useState<BatchItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [apiKeyReady, setApiKeyReady] = useState<boolean>(true);
  const [isProcessingPlan, setIsProcessingPlan] = useState(false);
  
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

  const handleAddToQueue = (data: ProductData) => {
    const newItem: BatchItem = { id: data.id, data, status: 'PENDING' };
    setQueue(prev => [...prev, newItem]);
    if (!selectedItemId) setSelectedItemId(newItem.id);
  };

  const handleUpdateItem = useCallback((id: string, updates: Partial<BatchItem>) => {
    setQueue(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  }, []);

  // Effect to process the PENDING plans
  useEffect(() => {
    if (processingRef.current) return;
    
    const processPlan = async () => {
      const nextItem = queue.find(item => item.status === 'PENDING');
      if (!nextItem) { setIsProcessingPlan(false); return; }
      
      processingRef.current = true;
      setIsProcessingPlan(true);
      handleUpdateItem(nextItem.id, { status: 'INITIATING' });

      try {
        const plan = await generateAdPlan(
          nextItem.data.name, nextItem.data.websiteUrl, nextItem.data.description,
          nextItem.data.targetAudience, nextItem.data.slogan,
          nextItem.data.goal, nextItem.data.tone, nextItem.data.platform, nextItem.data.maxDuration,
          nextItem.data.images
        );

        handleUpdateItem(nextItem.id, { 
          plan, 
          status: 'COMPLETED' 
        });

        // Generate high-quality thumbnails for the storyboard in background
        generateSceneThumbnails(plan.scene_map, nextItem.data.aspectRatio).then(thumbnails => {
           handleUpdateItem(nextItem.id, { thumbnails });
        });

      } catch (error: any) {
        handleUpdateItem(nextItem.id, { status: 'FAILED', error: error.message || "Synthesis Engine Failure" });
      } finally { 
        processingRef.current = false; 
      }
    };
    processPlan();
  }, [queue, handleUpdateItem]);

  const selectedItem = queue.find(i => i.id === selectedItemId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      <Header onSelectKey={handleSelectKey} apiKeyReady={apiKeyReady} />
      
      {!apiKeyReady && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[48px] p-10 md:p-14 shadow-3xl animate-in fade-in zoom-in duration-500">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-[32px] flex items-center justify-center text-indigo-400 mb-8 border border-indigo-500/20 shadow-2xl">
                <Key size={48} className="animate-pulse" />
              </div>
              <h2 className="text-3xl font-black tracking-tighter text-white mb-4">Autonomous Access Required</h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-10">
                To activate the Veo 3.1 cinematic engine and Gemini multimodal reasoning, please connect your production API key.
              </p>
              
              <div className="w-full space-y-5">
                <button 
                  onClick={handleSelectKey}
                  className="w-full py-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black rounded-2xl shadow-2xl active:scale-95 transition-all uppercase tracking-widest text-xs border border-indigo-400/20"
                >
                  Configure Production Key
                </button>
                <div>
                  <a 
                    href="https://ai.google.dev/gemini-api/docs/billing" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-slate-600 hover:text-indigo-400 text-[10px] font-black uppercase tracking-widest transition-colors"
                  >
                    Billing & Quota Docs <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-grow container mx-auto px-6 py-12 md:py-20 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <InputForm onSubmit={handleAddToQueue} isProcessing={isProcessingPlan} />
          
          <div className="bg-slate-900/40 p-10 rounded-[56px] border border-slate-800/60 shadow-2xl flex flex-col min-h-[500px] backdrop-blur-sm">
             <div className="flex items-center justify-between mb-10">
               <h2 className="text-2xl font-black flex items-center gap-4 text-white">
                 <Cpu size={22} className="text-indigo-400"/> Production Pipeline
               </h2>
               {queue.some(i => i.status === 'INITIATING') && (
                 <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 rounded-lg border border-indigo-500/20 animate-pulse">
                   <Sparkles size={12} className="text-indigo-400" />
                   <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Logic Stream Active</span>
                 </div>
               )}
             </div>

             {queue.length === 0 ? (
               <div className="flex-grow flex flex-col items-center justify-center text-slate-800 opacity-20 py-20">
                 <Video size={80} className="mb-6 stroke-[1.5px]"/>
                 <p className="text-[10px] font-black uppercase tracking-[0.5em] text-center">Engine Standby • Waiting for Brand Data</p>
               </div>
             ) : (
               <BatchQueue 
                items={queue} 
                onRemove={(id) => setQueue(q => q.filter(i => i.id !== id))} 
                onSelect={(item) => setSelectedItemId(item.id)} 
                processingId={null} 
              />
             )}
          </div>
        </div>

        {selectedItem && (
          <div className="mt-24">
            {selectedItem.plan ? (
              <AdPlanDisplay 
                item={selectedItem} 
                onUpdateItem={(updates) => handleUpdateItem(selectedItem.id, updates)} 
              />
            ) : selectedItem.status === 'FAILED' ? (
              <div className="flex flex-col items-center py-24 bg-red-950/10 rounded-[56px] border border-red-500/20">
                 <Key className="w-16 h-16 text-red-500/40 mb-6" />
                 <h3 className="text-xl font-black text-red-400 uppercase tracking-widest">Synthesis Interrupted</h3>
                 <p className="text-sm text-slate-600 mt-2">{selectedItem.error}</p>
                 <button onPointerDown={() => handleUpdateItem(selectedItem.id, { status: 'PENDING' })} className="mt-8 px-8 py-3 bg-red-500/10 text-red-400 rounded-xl font-black text-xs uppercase border border-red-500/20">Retry Production</button>
              </div>
            ) : (
              <div className="flex flex-col items-center py-32 bg-slate-900/40 rounded-[56px] border border-slate-800/60 backdrop-blur-3xl">
                 <div className="relative mb-10">
                   <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
                   <div className="absolute inset-0 m-auto w-6 h-6 bg-indigo-400 rounded-full animate-ping opacity-20" />
                 </div>
                 <h3 className="text-xl font-black uppercase tracking-[0.3em] text-white">Synthesizing Creative Strategy</h3>
                 <p className="text-[10px] text-slate-500 mt-4 max-w-sm text-center leading-relaxed font-medium">
                   Gemini is analyzing your product, market position, and imagery to construct an 8-scene high-conversion narrative.
                 </p>
              </div>
            )}
          </div>
        )}
      </main>
      
      <footer className="py-12 px-6 border-t border-slate-900/50 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-xs">AG</div>
           <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">© 2025 AdGenius Autonomous Production</span>
        </div>
        <div className="flex items-center gap-8">
          <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Veo 3.1 Preview</span>
          <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Gemini 3 Pro</span>
        </div>
      </footer>
    </div>
  );
};

export default App;

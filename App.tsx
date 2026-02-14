import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { InputForm } from './components/InputForm';
import { BatchQueue } from './components/BatchQueue';
import { AdPlanDisplay } from './components/AdPlanDisplay';
import { LoadingScreen } from './components/LoadingScreen';
import { generateAdPlan, generateSceneThumbnails, generatePlaceholderImage, base64ToFile } from './services/geminiService';
import { ProductData, BatchItem } from './types';
import { Plus, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [queue, setQueue] = useState<BatchItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isProcessingPlan, setIsProcessingPlan] = useState(false);
  
  const processingRef = useRef<boolean>(false);

  const handleAddToQueue = (data: ProductData) => {
    const newItem: BatchItem = { id: data.id, data, status: 'PENDING' };
    setQueue(prev => [...prev, newItem]);
    if (!selectedItemId) setSelectedItemId(newItem.id);
  };

  // Supports both direct object updates and functional updates to prevent race conditions
  const handleUpdateItem = useCallback((id: string, updates: Partial<BatchItem> | ((prev: BatchItem) => Partial<BatchItem>)) => {
    setQueue(prev => prev.map(i => {
      if (i.id !== id) return i;
      const newValues = typeof updates === 'function' ? updates(i) : updates;
      return { ...i, ...newValues };
    }));
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
        let validImages = [...nextItem.data.images];

        // Auto-generate image if missing (Feature requirement: "Automatic product image generation if missing")
        if (validImages.length === 0) {
           console.log("Auto-generating missing product image...");
           try {
             const { imageBytes, mimeType } = await generatePlaceholderImage(
               nextItem.data.name,
               nextItem.data.description,
               nextItem.data.websiteUrl,
               nextItem.data.aspectRatio
             );
             const file = base64ToFile(imageBytes, mimeType, "ai-generated-product.png");
             validImages = [file];
             // Update the data in the item immediately so the UI reflects the new image
             handleUpdateItem(nextItem.id, (prev) => ({ 
               data: { ...prev.data, images: validImages } 
             }));
           } catch (e) {
             console.error("Failed to auto-generate image", e);
             // Proceed without images if generation fails, though quality will suffer
           }
        }

        const plan = await generateAdPlan(
          nextItem.data.name, 
          nextItem.data.websiteUrl, 
          nextItem.data.description,
          nextItem.data.targetAudience,
          nextItem.data.slogan,
          nextItem.data.goal,
          nextItem.data.tone,
          nextItem.data.platform,
          nextItem.data.maxDuration,
          validImages
        );

        handleUpdateItem(nextItem.id, { plan, status: 'POLLING' });

        // Generate Thumbnails
        const thumbnails = await generateSceneThumbnails(plan.scene_map, nextItem.data.aspectRatio);
        
        handleUpdateItem(nextItem.id, { 
          thumbnails, 
          status: 'COMPLETED'
        });

      } catch (error: any) {
        console.error(error);
        handleUpdateItem(nextItem.id, { status: 'FAILED', error: error.message || "Strategy generation failed" });
      } finally {
        processingRef.current = false;
        setIsProcessingPlan(false);
      }
    };

    processPlan();
  }, [queue, handleUpdateItem]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar / Queue */}
          <div className="lg:col-span-3 space-y-6">
             <div className="flex items-center justify-between">
               <h3 className="font-black text-slate-500 uppercase tracking-widest text-xs">Campaign Queue</h3>
               <span className="bg-slate-900 text-slate-400 text-[10px] font-bold px-2 py-1 rounded-lg">{queue.length}</span>
             </div>
             <BatchQueue 
               items={queue} 
               onRemove={(id) => {
                  setQueue(prev => prev.filter(i => i.id !== id));
                  if (selectedItemId === id) setSelectedItemId(null);
               }}
               onSelect={(item) => setSelectedItemId(item.id)}
               processingId={isProcessingPlan ? queue.find(i => i.status === 'INITIATING' || i.status === 'POLLING')?.id || null : null}
             />
             <button 
               onClick={() => setSelectedItemId(null)}
               className="w-full py-3 border border-dashed border-slate-700 text-slate-500 rounded-2xl text-xs font-bold hover:bg-slate-900 hover:text-slate-300 transition-all flex items-center justify-center gap-2"
             >
               <Plus size={14} /> New Campaign
             </button>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9">
             {selectedItemId ? (
               (() => {
                 const item = queue.find(i => i.id === selectedItemId);
                 if (!item) return null;

                 if (item.status === 'COMPLETED' && item.plan) {
                    return (
                      <AdPlanDisplay 
                        item={item} 
                        onUpdateItem={(updates) => handleUpdateItem(item.id, updates)}
                      />
                    );
                 }
                 if (item.status === 'FAILED') {
                    return (
                      <div className="flex flex-col items-center justify-center h-[500px] bg-slate-900/50 rounded-[32px] border border-red-500/20">
                        <AlertCircle size={48} className="text-red-500 mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">Generation Failed</h3>
                        <p className="text-slate-400 max-w-md text-center mb-6">{item.error || "Unknown error occurred"}</p>
                        <button onClick={() => handleUpdateItem(item.id, { status: 'PENDING', error: undefined })} className="px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700">Retry</button>
                      </div>
                    );
                 }
                 return <LoadingScreen progress={item.status === 'INITIATING' ? undefined : "Waiting in queue..."} />;
               })()
             ) : (
               <InputForm onSubmit={handleAddToQueue} isProcessing={false} />
             )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { InputForm } from './components/InputForm';
import { VideoResult } from './components/VideoResult';
import { LoadingScreen } from './components/LoadingScreen';
import { generateVideoAd } from './services/geminiService';
import { AppState, ProductData } from './types';
import { AlertCircle, Key } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeAspectRatio, setActiveAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  
  // State to track if API Key is ready
  const [apiKeyReady, setApiKeyReady] = useState<boolean>(false);

  useEffect(() => {
    // Initial check for API Key
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && aistudio.hasSelectedApiKey) {
      const hasKey = await aistudio.hasSelectedApiKey();
      setApiKeyReady(hasKey);
    } else {
      // Fallback for dev environments where window.aistudio might not be mocked
      // In a real deployment inside the specific runner, this wouldn't be needed, 
      // but safe to have.
      console.warn("window.aistudio is not available");
      setApiKeyReady(true); 
    }
  };

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && aistudio.openSelectKey) {
      try {
        await aistudio.openSelectKey();
        // Assume success if no error, but re-check
        // Race condition mitigation: Proceed as if successful per instructions
        setApiKeyReady(true);
      } catch (e) {
        console.error("Failed to select key", e);
        setError("Failed to select API Key. Please try again.");
      }
    }
  };

  const handleFormSubmit = async (data: ProductData) => {
    if (!apiKeyReady) {
      await handleSelectKey();
      // If still not ready (user cancelled), stop
      // But we assume success as per mitigation strategy.
    }

    setAppState(AppState.GENERATING);
    setError(null);
    setActiveAspectRatio(data.aspectRatio);

    try {
      const url = await generateVideoAd(
        data.name,
        data.description,
        data.images,
        data.aspectRatio
      );
      setVideoUrl(url);
      setAppState(AppState.SUCCESS);
    } catch (e: any) {
      console.error(e);
      // If error contains "Requested entity was not found", reset key
      if (e.message && e.message.includes("Requested entity was not found")) {
         setApiKeyReady(false);
         setError("API Key invalid or expired. Please select a key again.");
      } else {
         setError(e.message || "Something went wrong while generating the video.");
      }
      setAppState(AppState.ERROR);
    }
  };

  const handleReset = () => {
    setAppState(AppState.IDLE);
    setVideoUrl(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        {/* Error Banner */}
        {error && (
          <div className="max-w-xl mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start gap-3 text-red-200 animate-fadeIn">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-grow">
              <h4 className="font-semibold text-sm">Error</h4>
              <p className="text-sm opacity-90">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-xs underline hover:text-white">Dismiss</button>
          </div>
        )}

        {/* API Key CTA if not ready and Idle */}
        {!apiKeyReady && appState === AppState.IDLE && (
           <div className="max-w-xl mx-auto mb-8 p-6 bg-indigo-900/20 border border-indigo-500/30 rounded-2xl text-center">
             <Key className="w-8 h-8 mx-auto text-indigo-400 mb-3" />
             <h3 className="text-lg font-semibold text-white mb-2">API Key Required</h3>
             <p className="text-slate-400 text-sm mb-4">
               To generate high-quality videos with Veo, you need to select a paid Google Cloud Project API key.
               <br />
               <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-indigo-400 underline hover:text-indigo-300">
                 View billing documentation
               </a>
             </p>
             <button 
               onClick={handleSelectKey}
               className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
             >
               Select API Key
             </button>
           </div>
        )}

        {/* Content Area */}
        <div className="transition-all duration-500 ease-in-out">
          {appState === AppState.IDLE && (
            <div className="animate-slideUp">
               <div className="text-center mb-10">
                 <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                   Transform Products into <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Video Ads</span>
                 </h2>
                 <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                   Upload your product images, describe the vibe, and let our AI generate a professional 4K commercial in minutes.
                 </p>
               </div>
               <InputForm onSubmit={handleFormSubmit} isGenerating={false} />
            </div>
          )}

          {appState === AppState.GENERATING && (
            <div className="animate-fadeIn">
              <LoadingScreen />
            </div>
          )}

          {appState === AppState.SUCCESS && videoUrl && (
            <VideoResult 
              videoUrl={videoUrl} 
              onReset={handleReset} 
              aspectRatio={activeAspectRatio}
            />
          )}

          {appState === AppState.ERROR && (
             <div className="text-center mt-8">
               <button 
                 onClick={handleReset}
                 className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
               >
                 Try Again
               </button>
             </div>
          )}
        </div>
      </main>

      <footer className="py-6 border-t border-slate-900 text-center text-slate-600 text-sm">
        <p>&copy; {new Date().getFullYear()} AdGenius. Built with React & Google Gemini Veo.</p>
      </footer>
    </div>
  );
};

export default App;
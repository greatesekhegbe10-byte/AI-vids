
import React, { useRef, useState } from 'react';
import { ProductData, VoiceName } from '../types';
import { Upload, X, Globe, Mic, Plus, Wand2 } from './Icons';

interface InputFormProps {
  onSubmit: (data: ProductData) => void;
  isProcessing: boolean;
}

export const InputForm: React.FC<InputFormProps> = ({ onSubmit, isProcessing }) => {
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [description, setDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [images, setImages] = useState<File[]>([]);
  const [voice, setVoice] = useState<VoiceName>('Kore');
  const [introText, setIntroText] = useState('');
  const [outroText, setOutroText] = useState('');
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImages([e.target.files[0]]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length === 0) {
      alert("Please upload at least one product image.");
      return;
    }
    
    onSubmit({
      id: crypto.randomUUID(),
      name, 
      websiteUrl, 
      description, 
      targetAudience,
      images, 
      aspectRatio,
      voice,
      introText,
      outroText
    });

    // Clear form
    setName('');
    setWebsiteUrl('');
    setDescription('');
    setTargetAudience('');
    setImages([]);
    setIntroText('');
    setOutroText('');
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-slate-800/50 border border-slate-700 p-5 md:p-6 rounded-3xl shadow-xl relative z-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl md:text-2xl font-semibold text-white">New Ad Project</h2>
        <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] md:text-xs rounded border border-indigo-500/30 font-bold uppercase tracking-wider">Veo 3.1</span>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Product Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isProcessing}
              placeholder="e.g. Aura Headphones"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Website (Optional)</label>
            <div className="relative">
              <Globe className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                disabled={isProcessing}
                placeholder="https://brand.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Target Audience <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              required
              disabled={isProcessing}
              placeholder="e.g. Gen Z Creatives"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Ad Format</label>
            <div className="flex gap-2">
              {['16:9', '9:16'].map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setAspectRatio(ratio as any)}
                  className={`flex-1 py-3.5 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                    aspectRatio === ratio 
                      ? 'border-indigo-500 bg-indigo-500/10 text-white' 
                      : 'border-slate-700 bg-slate-900 text-slate-400'
                  }`}
                >
                  {ratio === '16:9' ? 'Wide (YouTube)' : 'Tall (TikTok)'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Product Description <span className="text-red-500">*</span></label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            disabled={isProcessing}
            placeholder="What makes this product special? Describe its vibe and key features."
            rows={3}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Product Reference Photo <span className="text-red-500">*</span>
          </label>
          <div className="mb-2">
            {images.length > 0 ? (
              <div className="relative group h-32 w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700">
                <img src={URL.createObjectURL(images[0])} className="w-full h-full object-contain p-2" alt="Product" />
                <button 
                  type="button" 
                  onClick={() => setImages([])} 
                  className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-all text-white font-bold gap-2 active:opacity-100"
                >
                  <X size={20}/> Change Image
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-12 border-2 border-dashed border-slate-700 rounded-2xl text-slate-500 hover:border-indigo-500 hover:text-indigo-400 transition-all bg-slate-900/30 flex flex-col items-center justify-center gap-3 active:scale-[0.98]"
              >
                <Upload size={32} />
                <div className="text-center">
                  <span className="text-sm font-bold block">Upload Product Photo</span>
                  <span className="text-[10px] uppercase tracking-wider opacity-60">Used by Veo for visual consistency</span>
                </div>
              </button>
            )}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        </div>

        <div className="pt-2">
          <button 
            type="button" 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full py-3 text-xs font-bold text-slate-400 hover:text-indigo-400 flex items-center justify-center gap-2 mb-4 bg-slate-900/30 rounded-xl border border-slate-700/50 active:scale-95 transition-all"
          >
             <Wand2 size={14}/> {showAdvanced ? 'Hide' : 'Configure'} AI Narrator & Overlays
          </button>

          {showAdvanced && (
            <div className="space-y-4 p-5 bg-slate-900/50 rounded-2xl border border-slate-700 animate-fadeIn">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1"><Mic size={12}/> AI Voice Actor</label>
                <select 
                  value={voice}
                  onChange={(e) => setVoice(e.target.value as VoiceName)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-500"
                >
                  {['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'].map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 <div>
                   <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Intro Text</label>
                   <input 
                     type="text" 
                     placeholder="e.g. Experience the New..." 
                     value={introText}
                     onChange={e => setIntroText(e.target.value)}
                     className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white"
                   />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Outro Text</label>
                   <input 
                     type="text" 
                     placeholder="e.g. Shop Now at Brand.com" 
                     value={outroText}
                     onChange={e => setOutroText(e.target.value)}
                     className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white"
                   />
                 </div>
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          className="w-full py-4.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-indigo-600/20 uppercase tracking-widest text-sm"
        >
          <Plus size={20} />
          Create Ad Concept
        </button>
      </form>
    </div>
  );
};

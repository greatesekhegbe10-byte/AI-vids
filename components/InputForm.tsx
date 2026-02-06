
import React, { useRef, useState } from 'react';
import { ProductData, VoiceName } from '../types';
import { Upload, X, Globe, Mic, Plus, Wand2, ImageIcon } from './Icons';

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
    <div className="w-full max-w-xl mx-auto bg-slate-800/50 border border-slate-700 p-5 md:p-8 rounded-[40px] shadow-2xl relative z-10 pointer-events-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">New Ad Concept</h2>
        <div className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-[10px] font-black rounded-full border border-indigo-500/30 uppercase tracking-widest">Veo 3.1</div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5">Product Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isProcessing}
              placeholder="e.g. Lumina Pro"
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5">Website (Optional)</label>
            <div className="relative">
              <Globe className="absolute left-4 top-4.5 w-4 h-4 text-slate-600" />
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                disabled={isProcessing}
                placeholder="brand.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-11 pr-4 py-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5">Target Audience <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              required
              disabled={isProcessing}
              placeholder="e.g. Tech Enthusiasts"
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5">Ad Format</label>
            <div className="flex gap-2">
              {['16:9', '9:16'].map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setAspectRatio(ratio as any)}
                  className={`flex-1 py-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                    aspectRatio === ratio 
                      ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-lg' 
                      : 'border-slate-800 bg-slate-900/50 text-slate-500'
                  }`}
                >
                  {ratio === '16:9' ? 'Wide' : 'Tall'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5">Commercial Focus <span className="text-red-500">*</span></label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            disabled={isProcessing}
            placeholder="Describe features, key selling points, and visual mood..."
            rows={3}
            className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5 flex items-center justify-between">
            <span>Product Photo (Optional)</span>
            {images.length === 0 && <span className="text-[9px] text-indigo-400 font-black flex items-center gap-1"><Wand2 size={10}/> AI will generate if empty</span>}
          </label>
          <div className="mb-2">
            {images.length > 0 ? (
              <div className="relative group h-36 w-full bg-slate-950 rounded-[32px] overflow-hidden border border-slate-700 shadow-inner">
                <img src={URL.createObjectURL(images[0])} className="w-full h-full object-contain p-4" alt="Product" />
                <button 
                  type="button" 
                  onClick={() => setImages([])} 
                  className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-all text-white font-black text-xs uppercase tracking-widest gap-2 active:opacity-100"
                >
                  <X size={18}/> Remove Image
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-10 border-2 border-dashed border-slate-800 rounded-[32px] text-slate-600 hover:border-indigo-500 hover:text-indigo-400 transition-all bg-slate-900/20 flex flex-col items-center justify-center gap-3 active:scale-[0.98]"
              >
                <div className="p-3 bg-slate-900 rounded-2xl shadow-xl">
                  <ImageIcon size={28} />
                </div>
                <div className="text-center">
                  <span className="text-xs font-black uppercase tracking-widest block">Upload Brand Asset</span>
                  <span className="text-[10px] opacity-40">PNG, JPG or WEBP</span>
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
            className="w-full py-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-indigo-400 flex items-center justify-center gap-3 mb-4 bg-slate-950/40 rounded-2xl border border-slate-800/50 active:scale-95 transition-all"
          >
             {showAdvanced ? 'Simple Mode' : 'Advanced Creative Controls'}
          </button>

          {showAdvanced && (
            <div className="space-y-4 p-6 bg-slate-950/60 rounded-[32px] border border-slate-800 animate-fadeIn shadow-inner">
              <div>
                <label className="block text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-3 flex items-center gap-2"><Mic size={12} className="text-indigo-500"/> AI Narrator Voice</label>
                <select 
                  value={voice}
                  onChange={(e) => setVoice(e.target.value as VoiceName)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 text-xs font-bold text-white focus:ring-1 focus:ring-indigo-500 appearance-none"
                >
                  {['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'].map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 <div>
                   <label className="block text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-3">Intro Script</label>
                   <input 
                     type="text" 
                     placeholder="Fade in text..." 
                     value={introText}
                     onChange={e => setIntroText(e.target.value)}
                     className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 text-xs font-bold text-white"
                   />
                 </div>
                 <div>
                   <label className="block text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-3">Outro Script</label>
                   <input 
                     type="text" 
                     placeholder="Call to action..." 
                     value={outroText}
                     onChange={e => setOutroText(e.target.value)}
                     className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 text-xs font-bold text-white"
                   />
                 </div>
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          className="w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black rounded-3xl shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 shadow-indigo-600/30 uppercase tracking-widest text-sm border border-indigo-400/20"
        >
          <Plus size={20} />
          Start Production
        </button>
      </form>
    </div>
  );
};

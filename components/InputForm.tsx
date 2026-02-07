
import React, { useRef, useState } from 'react';
import { ProductData, VoiceName } from '../types';
import { Upload, Globe, Wand2, ImageIcon, Loader2, Target, Zap, Layout, Clock, Trash2, Plus } from './Icons';
import { generatePlaceholderImage } from '../services/geminiService';

interface InputFormProps {
  onSubmit: (data: ProductData) => void;
  isProcessing: boolean;
}

export const InputForm: React.FC<InputFormProps> = ({ onSubmit, isProcessing }) => {
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [description, setDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [slogan, setSlogan] = useState('');
  const [goal, setGoal] = useState<ProductData['goal']>('SALES');
  const [tone, setTone] = useState<ProductData['tone']>('PROFESSIONAL');
  const [platform, setPlatform] = useState<ProductData['platform']>('TIKTOK');
  const [maxDuration, setMaxDuration] = useState(10);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('9:16');
  const [images, setImages] = useState<File[]>([]);
  const [aiGeneratingImage, setAiGeneratingImage] = useState(false);
  const [voice, setVoice] = useState<VoiceName>('Kore');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAiGenerateImage = async () => {
    if (!name || !description) return alert("Enter Product Name and Description first.");
    setAiGeneratingImage(true);
    try {
      const result = await generatePlaceholderImage(name, description, aspectRatio);
      const byteString = atob(result.imageBytes);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const file = new File([new Blob([ab], { type: result.mimeType })], `${name}-ai-${Date.now()}.png`, { type: result.mimeType });
      setImages(prev => [...prev, file].slice(0, 5));
    } catch (e) { alert("AI visual failed."); } finally { setAiGeneratingImage(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setImages(prev => [...prev, ...newFiles].slice(0, 5));
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: crypto.randomUUID(),
      name, websiteUrl, description, targetAudience, slogan,
      goal, tone, platform, maxDuration,
      images, aspectRatio, voice
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900/80 border border-slate-800 p-6 md:p-10 rounded-[48px] shadow-3xl backdrop-blur-3xl pointer-events-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
          <Zap className="text-yellow-400" /> Modular Ad Studio
        </h2>
        <p className="text-slate-500 text-xs mt-1 font-bold uppercase tracking-widest">Autonomous Production Engine</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Product Name" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white placeholder:text-slate-700" />
          <div className="relative">
            <Globe className="absolute left-4 top-5 w-4 h-4 text-slate-700" />
            <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="brand.com" className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-4 text-white placeholder:text-slate-700" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Target className="absolute left-4 top-5 w-4 h-4 text-slate-700" />
            <input value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} required placeholder="Target Audience" className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-4 text-white placeholder:text-slate-700" />
          </div>
          <input value={slogan} onChange={(e) => setSlogan(e.target.value)} placeholder="Slogan / Tagline" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white placeholder:text-slate-700" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select value={goal} onChange={(e) => setGoal(e.target.value as any)} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-slate-300">
            <option value="SALES">SALES</option><option value="SIGNUPS">SIGNUPS</option><option value="AWARENESS">AWARENESS</option>
          </select>
          <select value={tone} onChange={(e) => setTone(e.target.value as any)} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-slate-300">
            <option value="PROFESSIONAL">PROFESSIONAL</option><option value="LUXURY">LUXURY</option><option value="ENERGETIC">ENERGETIC</option><option value="TECHY">TECHY</option>
          </select>
          <select value={platform} onChange={(e) => setPlatform(e.target.value as any)} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-slate-300">
            <option value="TIKTOK">TIKTOK</option><option value="INSTAGRAM">INSTAGRAM</option><option value="YOUTUBE">YOUTUBE</option>
          </select>
          <div className="relative">
            <Clock className="absolute left-3 top-3 w-3 h-3 text-slate-600" />
            <input type="number" value={maxDuration} onChange={(e) => setMaxDuration(parseInt(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-2 py-3 text-xs font-bold text-white" min="1" max="10" />
          </div>
        </div>

        <textarea value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="Provide product details... We will analyze and generate the 10-minute sequence." rows={4} className="w-full bg-slate-950 border border-slate-800 rounded-[28px] px-5 py-4 text-white placeholder:text-slate-700" />

        <div className="grid grid-cols-2 gap-4">
          <button type="button" onPointerDown={() => setAspectRatio(aspectRatio === '16:9' ? '9:16' : '16:9')} className="bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase text-indigo-400 py-4">
            <Layout size={14} /> {aspectRatio} Aspect
          </button>
          <button type="button" disabled={aiGeneratingImage} onPointerDown={handleAiGenerateImage} className="bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase py-4">
            {aiGeneratingImage ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />} AI Photo
          </button>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <ImageIcon size={14} /> Product Assets (Max 5)
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {images.map((file, idx) => (
              <div key={idx} className="relative aspect-square bg-slate-950 border border-slate-800 rounded-xl overflow-hidden group">
                <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt={`Product ${idx}`} />
                <button 
                  type="button" 
                  onClick={() => removeImage(idx)}
                  className="absolute inset-0 bg-red-600/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square border-2 border-dashed border-slate-800 rounded-xl text-slate-700 hover:border-indigo-500 hover:text-indigo-400 bg-slate-950/40 flex items-center justify-center"
              >
                <Plus size={20} />
              </button>
            )}
          </div>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/*" className="hidden" />

        <button type="submit" disabled={isProcessing} className="w-full py-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black rounded-[28px] shadow-2xl active:scale-95 uppercase tracking-widest text-xs border border-indigo-400/20">
          {isProcessing ? 'Analyzing Brand...' : 'Engineer Modular Ad Strategy'}
        </button>
      </form>
    </div>
  );
};

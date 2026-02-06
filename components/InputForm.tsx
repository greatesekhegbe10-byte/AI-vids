
import React, { useRef, useState } from 'react';
import { ProductData, VoiceName } from '../types';
import { Upload, X, Globe, Mic, Plus, Wand2, ImageIcon, Loader2 } from './Icons';
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
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [images, setImages] = useState<File[]>([]);
  const [aiGeneratingImage, setAiGeneratingImage] = useState(false);
  const [voice, setVoice] = useState<VoiceName>('Kore');
  const [introText, setIntroText] = useState('');
  const [outroText, setOutroText] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAiGenerateImage = async () => {
    if (!name || !description) {
      alert("Please enter a Product Name and Description first.");
      return;
    }
    setAiGeneratingImage(true);
    try {
      const result = await generatePlaceholderImage(name, description, targetAudience || "luxury market", aspectRatio);
      const byteString = atob(result.imageBytes);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: result.mimeType });
      const file = new File([blob], `${name.toLowerCase()}-ai-gen.png`, { type: result.mimeType });
      setImages([file]);
    } catch (e) {
      alert("AI generation failed. Try uploading manually.");
    } finally {
      setAiGeneratingImage(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: crypto.randomUUID(),
      name, websiteUrl, description, targetAudience, slogan,
      images, aspectRatio, voice, introText, outroText
    });
    setName(''); setWebsiteUrl(''); setDescription(''); setTargetAudience(''); setSlogan(''); setImages([]); setIntroText(''); setOutroText('');
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-slate-800/50 border border-slate-700 p-5 md:p-8 rounded-[40px] shadow-2xl relative z-10 pointer-events-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">AI Ad Studio</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Product Name"
            className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white min-h-[56px]"
          />
          <div className="relative">
            <Globe className="absolute left-4 top-5 w-4 h-4 text-slate-600" />
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="brand.com"
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-11 pr-4 py-4 text-white min-h-[56px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            required
            placeholder="Target Audience"
            className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white min-h-[56px]"
          />
          <input
            type="text"
            value={slogan}
            onChange={(e) => setSlogan(e.target.value)}
            placeholder="Slogan or Motto"
            className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white min-h-[56px]"
          />
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          placeholder="Product details for the 8-minute documentary sequence..."
          rows={3}
          className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white min-h-[100px]"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex gap-2 h-full">
            {['16:9', '9:16'].map((ratio) => (
              <button
                key={ratio}
                type="button"
                onPointerDown={() => setAspectRatio(ratio as any)}
                className={`flex-1 min-h-[56px] rounded-2xl border text-[10px] font-black uppercase transition-all ${
                  aspectRatio === ratio ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-slate-800 bg-slate-900/50 text-slate-500'
                }`}
              >
                {ratio === '16:9' ? 'Wide' : 'Tall'}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={aiGeneratingImage}
            onPointerDown={handleAiGenerateImage}
            className="w-full bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all min-h-[56px]"
          >
            {aiGeneratingImage ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
            {aiGeneratingImage ? 'Visualizing...' : 'AI Generate Photo'}
          </button>
        </div>

        <div className="mb-2">
          {images.length > 0 ? (
            <div className="relative h-44 w-full bg-slate-950 rounded-[32px] overflow-hidden border border-slate-700">
              <img src={URL.createObjectURL(images[0])} className="w-full h-full object-contain p-4" alt="Product" />
              <button type="button" onPointerDown={() => setImages([])} className="absolute inset-0 flex items-center justify-center bg-black/60 text-white font-black text-xs uppercase">Remove Media</button>
            </div>
          ) : (
            <button
              type="button"
              onPointerDown={() => fileInputRef.current?.click()}
              className="w-full py-10 border-2 border-dashed border-slate-800 rounded-[32px] text-slate-600 hover:border-indigo-500 hover:text-indigo-400 bg-slate-900/20 flex flex-col items-center justify-center gap-3 min-h-[140px]"
            >
              <ImageIcon size={28} />
              <span className="text-xs font-black uppercase tracking-widest">Or Upload Photo</span>
            </button>
          )}
        </div>
        <input type="file" ref={fileInputRef} onChange={(e) => { if (e.target.files?.[0]) setImages([e.target.files[0]]); }} className="hidden" />

        <button
          type="submit"
          disabled={isProcessing}
          className="w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black rounded-3xl shadow-2xl transition-all active:scale-95 uppercase tracking-widest text-sm border border-indigo-400/20 min-h-[64px]"
        >
          {isProcessing ? 'Processing Information...' : 'Produce 8-Min Ad Concept'}
        </button>
      </form>
    </div>
  );
};

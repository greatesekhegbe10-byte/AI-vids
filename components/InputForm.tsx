
import React, { useRef, useState } from 'react';
import { ProductData, VoiceName } from '../types';
import { Upload, Globe, Wand2, ImageIcon, Loader2, Target, Zap, Layout, Clock, Trash2, Plus, Type, Mic, Layers, Activity } from './Icons';
import { generatePlaceholderImage, base64ToFile } from '../services/geminiService';

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
  const [maxDuration, setMaxDuration] = useState(30);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('9:16');
  const [voice, setVoice] = useState<VoiceName>('Fenrir');
  const [images, setImages] = useState<File[]>([]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerateImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!name || !description) return alert("Please enter product name and description first");
    
    setIsGeneratingImage(true);
    try {
      const { imageBytes, mimeType } = await generatePlaceholderImage(name, description, websiteUrl, aspectRatio);
      const file = base64ToFile(imageBytes, mimeType, "ai-generated-product.png");
      setImages(prev => [...prev, file]);
    } catch (e: any) {
      console.error(e);
      alert("Failed to generate image. " + (e.message || ""));
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description) return;
    
    onSubmit({
      id: crypto.randomUUID(),
      name,
      websiteUrl,
      description,
      targetAudience,
      slogan,
      goal,
      tone,
      platform,
      maxDuration,
      images,
      aspectRatio,
      voice
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="bg-slate-900/60 p-8 md:p-10 rounded-[48px] border border-slate-800/60 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center gap-4 mb-8">
           <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20">
             <Target size={24} />
           </div>
           <div>
             <h3 className="text-xl font-black text-white">Campaign Intelligence</h3>
             <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-1">Product & Brand Data</p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-3 flex items-center gap-2">
              <Type size={12} className="text-indigo-500"/> Product Name
            </label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Lumina Smart Watch"
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
          </div>
          
          <div className="space-y-3">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-3 flex items-center gap-2">
               <Globe size={12} className="text-indigo-500"/> Website URL
             </label>
             <input 
              type="url" 
              value={websiteUrl} 
              onChange={(e) => setWebsiteUrl(e.target.value)} 
              placeholder="https://..."
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
          </div>

          <div className="md:col-span-2 space-y-3">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-3 flex items-center gap-2">
               <Layout size={12} className="text-indigo-500"/> Product Description & key selling points
             </label>
             <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Describe your product features, benefits, and unique value proposition..."
              rows={3}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none"
            />
          </div>

          <div className="space-y-3">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-3 flex items-center gap-2">
               <Activity size={12} className="text-indigo-500"/> Target Audience
             </label>
             <input 
              type="text" 
              value={targetAudience} 
              onChange={(e) => setTargetAudience(e.target.value)} 
              placeholder="e.g. Tech enthusiasts, 25-40"
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
          </div>
          
          <div className="space-y-3">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-3 flex items-center gap-2">
               <Zap size={12} className="text-indigo-500"/> Campaign Slogan
             </label>
             <input 
              type="text" 
              value={slogan} 
              onChange={(e) => setSlogan(e.target.value)} 
              placeholder="e.g. Future on your wrist"
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-3 flex items-center gap-2">
            <ImageIcon size={12} className="text-indigo-500"/> Product Imagery
          </label>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-2xl border border-dashed border-slate-700 hover:border-indigo-500/50 bg-slate-950/30 hover:bg-slate-900 flex flex-col items-center justify-center gap-2 transition-all group"
            >
              <div className="p-3 bg-slate-900 rounded-full group-hover:scale-110 transition-transform">
                <Upload size={16} className="text-indigo-400" />
              </div>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Upload</span>
            </button>

            <button 
              type="button"
              onClick={handleGenerateImage}
              disabled={isGeneratingImage}
              className="aspect-square rounded-2xl border border-dashed border-slate-700 hover:border-purple-500/50 bg-slate-950/30 hover:bg-slate-900 flex flex-col items-center justify-center gap-2 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="p-3 bg-slate-900 rounded-full group-hover:scale-110 transition-transform">
                {isGeneratingImage ? <Loader2 size={16} className="text-purple-400 animate-spin" /> : <Wand2 size={16} className="text-purple-400" />}
              </div>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center px-1">
                {isGeneratingImage ? 'Generating...' : 'AI Generate'}
              </span>
            </button>
            
            {images.map((file, idx) => (
              <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-800 group">
                <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                <button 
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-red-500/80 transition-colors backdrop-blur-sm opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            className="hidden" 
            multiple 
            accept="image/*" 
          />
        </div>
      </div>

      <div className="bg-slate-900/60 p-8 md:p-10 rounded-[48px] border border-slate-800/60 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center gap-4 mb-8">
           <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400 border border-purple-500/20">
             <Layers size={24} />
           </div>
           <div>
             <h3 className="text-xl font-black text-white">Creative Configuration</h3>
             <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-1">Format & Style Specs</p>
           </div>
        </div>

        <div className="space-y-8">
           {/* Aspect Ratio & Platform */}
           <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-3">Format</label>
              <div className="flex p-1 bg-slate-950 rounded-2xl border border-slate-800">
                {(['TIKTOK', 'INSTAGRAM', 'YOUTUBE'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatform(p)}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${platform === p ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="flex p-1 bg-slate-950 rounded-2xl border border-slate-800">
                {(['9:16', '16:9'] as const).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setAspectRatio(r)}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${aspectRatio === r ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {r} Aspect
                  </button>
                ))}
              </div>
           </div>

           {/* Duration Selection (Updated to support minutes) */}
           <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-3 flex items-center gap-2">
                <Clock size={12} className="text-indigo-500"/> Max Duration
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {([15, 30, 60, 120, 300, 600] as const).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setMaxDuration(d)}
                    className={`flex-shrink-0 px-5 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${maxDuration === d ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'}`}
                  >
                    {d >= 60 ? `${d / 60}m` : `${d}s`}
                  </button>
                ))}
              </div>
           </div>

           {/* Tone & Goal */}
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-3">Tone</label>
                <select 
                  value={tone}
                  onChange={(e) => setTone(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
                >
                  <option value="PROFESSIONAL">Professional</option>
                  <option value="ENERGETIC">Energetic</option>
                  <option value="LUXURY">Luxury</option>
                  <option value="FUN">Fun & Quirky</option>
                  <option value="TECHY">Tech-Forward</option>
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-3">Goal</label>
                <select 
                  value={goal}
                  onChange={(e) => setGoal(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
                >
                  <option value="SALES">Drive Sales</option>
                  <option value="AWARENESS">Brand Awareness</option>
                  <option value="SIGNUPS">User Signups</option>
                </select>
              </div>
           </div>
           
           {/* Voice Selection */}
           <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-3 flex items-center gap-2">
                <Mic size={12} className="text-indigo-500"/> AI Voice Talent
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {(['Fenrir', 'Kore', 'Puck', 'Charon', 'Zephyr'] as VoiceName[]).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVoice(v)}
                    className={`flex-shrink-0 px-5 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${voice === v ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
           </div>
        </div>
      </div>

      <button 
        type="submit" 
        disabled={isProcessing}
        className="w-full py-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] hover:bg-right transition-all duration-500 text-white rounded-[32px] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-indigo-500/30 flex items-center justify-center gap-4 active:scale-[0.98] disabled:opacity-70 disabled:grayscale"
      >
        {isProcessing ? (
          <>
            <Loader2 className="animate-spin" />
            Creating Strategy...
          </>
        ) : (
          <>
            <Wand2 className="animate-pulse" />
            Generate Campaign Strategy
          </>
        )}
      </button>
    </form>
  );
};

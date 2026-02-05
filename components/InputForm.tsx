import React, { useRef, useState } from 'react';
import { ProductData, VoiceName } from '../types';
import { Upload, X, Globe, Mic, Plus } from './Icons';

interface InputFormProps {
  onSubmit: (data: ProductData) => void;
  isProcessing: boolean;
}

export const InputForm: React.FC<InputFormProps> = ({ onSubmit, isProcessing }) => {
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [description, setDescription] = useState('');
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
    setImages([]);
    setIntroText('');
    setOutroText('');
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-slate-800/50 border border-slate-700 p-6 rounded-2xl shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-white">New Ad Project</h2>
        <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded border border-indigo-500/30">Batch Ready</span>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Product Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isProcessing}
              placeholder="e.g. NeoRunner 5000"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">Website (Optional)</label>
            <div className="relative">
              <Globe className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                disabled={isProcessing}
                placeholder="www.example.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div>
           <label className="block text-sm font-medium text-slate-300 mb-2">Format</label>
           <div className="flex gap-4">
              {['16:9', '9:16'].map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setAspectRatio(ratio as any)}
                  className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-all ${
                    aspectRatio === ratio 
                      ? 'border-indigo-500 bg-indigo-500/10 text-white' 
                      : 'border-slate-700 bg-slate-900 text-slate-400'
                  }`}
                >
                  {ratio === '16:9' ? 'Horizontal (16:9)' : 'Vertical (9:16)'}
                </button>
              ))}
           </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Description <span className="text-red-500">*</span></label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            disabled={isProcessing}
            placeholder="Key features, mood, setting..."
            rows={3}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Product Image <span className="text-red-500">*</span>
          </label>
          
          <div className="mb-2">
            {images.length > 0 ? (
              <div className="relative group h-24 w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
                <img src={URL.createObjectURL(images[0])} className="w-full h-full object-contain bg-black/40" alt="Product preview" />
                <button 
                  type="button" 
                  onClick={() => setImages([])} 
                  className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-all text-white font-bold gap-2"
                >
                  <X size={20}/> Remove Image
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-slate-700 rounded-lg text-slate-500 hover:border-indigo-500 hover:text-indigo-400 transition-all bg-slate-900/30 flex flex-col items-center justify-center gap-3"
              >
                <Upload size={24} />
                <div className="text-center">
                  <span className="text-sm font-semibold block">Upload Product Photo</span>
                  <span className="text-[10px] uppercase tracking-wider opacity-60">Required for generation</span>
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
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mb-4"
          >
             {showAdvanced ? 'Hide' : 'Show'} Advanced Settings (Voice, Intro/Outro)
          </button>

          {showAdvanced && (
            <div className="space-y-4 p-4 bg-slate-900/50 rounded-xl border border-slate-700 animate-fadeIn">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1"><Mic size={12}/> AI Voice</label>
                <select 
                  value={voice}
                  onChange={(e) => setVoice(e.target.value as VoiceName)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500"
                >
                  {['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'].map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="block text-xs font-medium text-slate-400 mb-1">Intro Element</label>
                   <input 
                     type="text" 
                     placeholder="e.g. Logo fade in..." 
                     value={introText}
                     onChange={e => setIntroText(e.target.value)}
                     className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-medium text-slate-400 mb-1">Outro Element</label>
                   <input 
                     type="text" 
                     placeholder="e.g. Brand tagline..." 
                     value={outroText}
                     onChange={e => setOutroText(e.target.value)}
                     className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                   />
                 </div>
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          Add to Queue
        </button>
      </form>
    </div>
  );
};
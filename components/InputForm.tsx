import React, { useRef, useState } from 'react';
import { ProductData } from '../types';
import { Upload, ImageIcon, X } from 'lucide-react';

interface InputFormProps {
  onSubmit: (data: ProductData) => void;
  isGenerating: boolean;
}

export const InputForm: React.FC<InputFormProps> = ({ onSubmit, isGenerating }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('9:16');
  const [images, setImages] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // We only take the first file for the Fast model
      const newFile = e.target.files[0];
      setImages([newFile]);
    }
  };

  const removeImage = () => {
    setImages([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length === 0) {
      alert("Please upload a product image.");
      return;
    }
    onSubmit({ name, description, images, aspectRatio });
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-slate-800/50 border border-slate-700 p-6 rounded-2xl shadow-xl">
      <h2 className="text-2xl font-semibold text-white mb-6">Create Your Ad</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Name */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Product Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isGenerating}
            placeholder="e.g. NeoRunner 5000"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
          />
        </div>

        {/* Aspect Ratio Selection */}
        <div>
           <label className="block text-sm font-medium text-slate-300 mb-2">Video Format</label>
           <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                  aspectRatio === '9:16' 
                    ? 'border-indigo-500 bg-indigo-500/10 text-white' 
                    : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="w-4 h-7 border-2 border-current rounded-sm mb-2"></div>
                <span className="text-xs font-semibold">Vertical (Stories/Reels)</span>
              </button>
              
              <button
                type="button"
                onClick={() => setAspectRatio('16:9')}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                  aspectRatio === '16:9' 
                    ? 'border-indigo-500 bg-indigo-500/10 text-white' 
                    : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="w-7 h-4 border-2 border-current rounded-sm mb-2"></div>
                <span className="text-xs font-semibold">Horizontal (YouTube)</span>
              </button>
           </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Key Features & Vibe</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            disabled={isGenerating}
            placeholder="Describe the product features, the mood (energetic, calm, luxury), and the setting."
            rows={4}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 resize-none"
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Product Image (Required)</label>
          
          <div className="mb-4">
            {images.length > 0 ? (
              <div className="relative group aspect-video w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
                <img 
                  src={URL.createObjectURL(images[0])} 
                  alt="Preview" 
                  className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity" 
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-black/60 p-2 rounded-full text-white hover:bg-red-500/80 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-video flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-lg text-slate-500 hover:border-indigo-500 hover:text-indigo-400 transition-all bg-slate-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload size={32} className="mb-2" />
                <span className="text-sm">Upload Product Image</span>
              </button>
            )}
          </div>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <ImageIcon size={12} />
            This image will be used as the starting frame for your video.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isGenerating || images.length === 0}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 transform transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isGenerating ? 'Generating Video...' : 'Generate Video Ad'}
        </button>
      </form>
    </div>
  );
};
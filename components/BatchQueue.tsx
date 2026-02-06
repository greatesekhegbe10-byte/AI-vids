import React from 'react';
import { BatchItem } from '../types';
import { Loader2, CheckCircle2, AlertCircle, Play, Trash2 } from 'lucide-react';

interface BatchQueueProps {
  items: BatchItem[];
  onRemove: (id: string) => void;
  onSelect: (item: BatchItem) => void;
  processingId: string | null;
}

export const BatchQueue: React.FC<BatchQueueProps> = ({ items, onRemove, onSelect, processingId }) => {
  if (items.length === 0) return null;

  return (
    <div className="w-full max-w-xl mx-auto mt-6">
      <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4 px-2">Batch Processing</h3>
      <div className="bg-slate-950/40 border border-slate-800 rounded-3xl overflow-hidden divide-y divide-slate-800/40 shadow-inner">
        {items.map((item) => (
          <div 
            key={item.id} 
            className={`flex items-center transition-all ${processingId === item.id ? 'bg-indigo-500/5' : 'hover:bg-slate-900/40'}`}
          >
            <button 
              className="flex items-center gap-4 p-4 md:p-5 flex-grow text-left active:bg-slate-900/60 transition-colors focus:outline-none"
              onClick={() => onSelect(item)}
            >
              <div className="w-16 h-16 bg-black rounded-2xl overflow-hidden border border-slate-800 flex-shrink-0 shadow-lg">
                {item.data.images[0] ? (
                  <img src={URL.createObjectURL(item.data.images[0])} className="w-full h-full object-cover" alt="Thumb" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-800 font-black">AI</div>
                )}
              </div>
              <div className="flex-grow">
                <h4 className="font-bold text-white text-sm md:text-base line-clamp-1">{item.data.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  {item.status === 'PENDING' && <span className="text-slate-600 text-[10px] font-bold uppercase tracking-wider">In Queue</span>}
                  {item.status === 'GENERATING' && (
                    <span className="text-indigo-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                      <Loader2 size={12} className="animate-spin"/> Rendering
                    </span>
                  )}
                  {item.status === 'COMPLETED' && (
                    <span className="text-green-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 size={12}/> Studio Ready
                    </span>
                  )}
                  {item.status === 'FAILED' && (
                    <span className="text-red-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                      <AlertCircle size={12}/> Error
                    </span>
                  )}
                </div>
              </div>
            </button>

            <div className="flex items-center pr-4 md:pr-6 gap-2">
              {item.status === 'COMPLETED' && (
                <button 
                  onClick={() => onSelect(item)} 
                  className="p-3.5 text-indigo-400 hover:text-white hover:bg-indigo-600 rounded-2xl transition-all active:scale-90"
                  aria-label="Play"
                >
                  <Play size={20} fill="currentColor" />
                </button>
              )}
              <button 
                onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
                disabled={item.status === 'GENERATING'}
                className="p-3.5 text-slate-700 hover:text-red-500 hover:bg-red-500/10 rounded-2xl disabled:opacity-20 transition-all active:scale-90"
                aria-label="Remove"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
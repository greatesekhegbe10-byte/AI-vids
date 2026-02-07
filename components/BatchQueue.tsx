
import React from 'react';
import { BatchItem } from '../types';
import { Loader2, CheckCircle2, AlertCircle, Play, Trash2, Clock, Map } from 'lucide-react';

interface BatchQueueProps {
  items: BatchItem[];
  onRemove: (id: string) => void;
  onSelect: (item: BatchItem) => void;
  processingId: string | null;
}

export const BatchQueue: React.FC<BatchQueueProps> = ({ items, onRemove, onSelect }) => {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div 
          key={item.id} 
          className="group relative bg-slate-950/40 border border-slate-800 rounded-[32px] overflow-hidden transition-all hover:border-slate-700"
        >
          <button 
            className="w-full flex items-center gap-6 p-5 text-left active:scale-[0.99] transition-all"
            onClick={() => onSelect(item)}
          >
            <div className="w-16 h-16 bg-black rounded-2xl overflow-hidden border border-slate-800 flex-shrink-0">
              {item.data.images[0] ? (
                <img src={URL.createObjectURL(item.data.images[0])} className="w-full h-full object-cover" alt="Thumb" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-800 font-black">AI</div>
              )}
            </div>
            <div className="flex-grow">
              <h4 className="font-black text-white text-sm line-clamp-1">{item.data.name}</h4>
              <div className="flex items-center gap-3 mt-1">
                {item.status === 'PENDING' && <span className="text-slate-600 text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5"><Clock size={10}/> Pending</span>}
                {(item.status === 'INITIATING' || item.status === 'POLLING') && (
                  <span className="text-indigo-400 text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                    <Loader2 size={10} className="animate-spin"/> Engine Active
                  </span>
                )}
                {item.status === 'COMPLETED' && (
                  <span className="text-emerald-500 text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <CheckCircle2 size={10}/> Strategy Ready
                  </span>
                )}
                {item.status === 'FAILED' && <span className="text-red-500 text-[8px] font-black uppercase tracking-widest">Error</span>}
              </div>
            </div>
            {item.status === 'COMPLETED' && (
              <div className="p-3 bg-indigo-600/10 rounded-xl text-indigo-400">
                <Map size={18} />
              </div>
            )}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
            className="absolute top-4 right-4 p-2 text-slate-800 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

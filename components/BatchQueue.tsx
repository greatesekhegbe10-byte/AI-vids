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
    <div className="w-full max-w-xl mx-auto mt-8">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">Processing Queue</h3>
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden divide-y divide-slate-700/50">
        {items.map((item) => (
          <div 
            key={item.id} 
            className={`p-4 flex items-center justify-between transition-colors ${processingId === item.id ? 'bg-indigo-500/10' : 'hover:bg-slate-800'}`}
          >
            <div className="flex items-center gap-4 cursor-pointer flex-grow" onClick={() => item.status === 'COMPLETED' && onSelect(item)}>
              <div className="w-12 h-12 bg-slate-900 rounded-lg overflow-hidden border border-slate-700 flex-shrink-0">
                {item.data.images[0] ? (
                  <img src={URL.createObjectURL(item.data.images[0])} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-600">AI Gen</div>
                )}
              </div>
              <div>
                <h4 className="font-medium text-white">{item.data.name}</h4>
                <div className="flex items-center gap-2 text-xs">
                  {item.status === 'PENDING' && <span className="text-slate-500">Waiting...</span>}
                  {item.status === 'GENERATING' && <span className="text-indigo-400 flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> Generating</span>}
                  {item.status === 'COMPLETED' && <span className="text-green-400 flex items-center gap-1"><CheckCircle2 size={10}/> Ready</span>}
                  {item.status === 'FAILED' && <span className="text-red-400 flex items-center gap-1"><AlertCircle size={10}/> Failed</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {item.status === 'COMPLETED' && (
                <button onClick={() => onSelect(item)} className="p-2 text-indigo-400 hover:text-white hover:bg-indigo-600 rounded-full transition-all">
                  <Play size={16} fill="currentColor" />
                </button>
              )}
              <button 
                onClick={() => onRemove(item.id)}
                disabled={item.status === 'GENERATING'}
                className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-700/50 rounded-lg disabled:opacity-30"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

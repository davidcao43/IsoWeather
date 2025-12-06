
import React, { useState, KeyboardEvent } from 'react';
import { Wand2, X } from 'lucide-react';

interface EditInputProps {
  onEdit: (prompt: string) => void;
  onCancel: () => void;
  isProcessing: boolean;
}

export const EditInput: React.FC<EditInputProps> = ({ onEdit, onCancel, isProcessing }) => {
  const [value, setValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim() && !isProcessing) {
      onEdit(value.trim());
      setValue('');
    }
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="relative bg-zinc-900/90 backdrop-blur-xl p-2 rounded-2xl shadow-2xl border border-zinc-700">
        <div className="flex items-center gap-2">
          <div className="pl-3">
             <Wand2 className={`h-5 w-5 text-purple-400 ${isProcessing ? 'animate-pulse' : ''}`} />
          </div>
          <input
            autoFocus
            type="text"
            className="flex-1 bg-transparent border-none text-white placeholder-zinc-500 focus:ring-0 text-sm py-2 px-2"
            placeholder={isProcessing ? "Generating edit..." : "Describe changes (e.g., 'Add snow', 'Make it night')"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
          />
          <button 
            onClick={onCancel}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

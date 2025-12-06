
import React, { useState } from 'react';
import { Wand2, X, Sparkles, Loader2, ArrowRight, ArrowLeft, ScrollText, Castle, History, Globe } from 'lucide-react';
import { FantasyConfig } from '../types';

interface FantasyCreatorProps {
  onCreate: (config: FantasyConfig) => void;
  onCancel: () => void;
  isProcessing: boolean;
}

export const FantasyCreator: React.FC<FantasyCreatorProps> = ({ onCreate, onCancel, isProcessing }) => {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<'fantasy' | 'historical'>('fantasy');
  
  const [config, setConfig] = useState<FantasyConfig>({
    mode: 'fantasy',
    cityName: '',
    universe: '',
    weather: 'Clear Sky',
    time: 'Sunset',
    aesthetic: 'Default',
    description: ''
  });

  const isValidStep1 = config.cityName.trim().length > 0 && config.universe.trim().length > 0;

  const handleSubmit = () => {
      if (isProcessing) return;
      onCreate({ ...config, mode });
  };

  const aestheticOptions = mode === 'fantasy' ? [
      'Default', 'Fantasy', 'Cyberpunk', 'Steampunk', 'Sci-Fi', 
      'Gothic', 'Minimal', 'Noir', 'Voxel', 'Low Poly', 
      'Studio Ghibli', 'Synthwave', 'Post-Apocalyptic', 'Watercolor', 'Retro'
  ] : [
      'Default', 'Realistic', 'Oil Painting', 'Cinematic', 'Sepia', 
      'Vintage', 'Blueprint', 'Faded Fresco', 'Mosaic', 'Ink Wash', 
      'Etching', 'Museum Diorama'
  ];

  const weatherOptions = [
      'Clear Sky', 'Stormy', 'Snow Blizzard', 'Heavy Rain', 
      'Foggy / Misty', 'Sandstorm', 'Toxic Rain', 'Cosmic Dust',
      'Meteor Shower', 'Acid Fog', 'Heatwave', 'Aurora Borealis', 'Ashfall'
  ];

  const timeOptions = [
      'Sunrise', 'High Noon', 'Sunset', 'Golden Hour', 
      'Midnight', 'Blue Hour', 'Eclipse', 'Twilight', 
      'Deep Night', 'Blood Moon', 'Starry Night'
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-zinc-950/95 border border-zinc-800 rounded-3xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative ring-1 ring-white/5">
        
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/40 backdrop-blur-md">
           <div className="flex items-center gap-4">
               <div className={`p-3 rounded-xl shadow-lg border border-white/5 ${mode === 'fantasy' ? 'bg-purple-500/10 text-purple-400' : 'bg-amber-500/10 text-amber-400'}`}>
                   {mode === 'fantasy' ? <Wand2 className="w-6 h-6" /> : <History className="w-6 h-6" />}
               </div>
               <div>
                   <h2 className="text-xl font-bold text-white tracking-tight">World Builder</h2>
                   <div className="flex items-center gap-2 mt-0.5">
                       <div className={`h-1 w-8 rounded-full ${step >= 1 ? 'bg-blue-500' : 'bg-zinc-800'}`} />
                       <div className={`h-1 w-8 rounded-full ${step >= 2 ? 'bg-blue-500' : 'bg-zinc-800'}`} />
                       <span className="text-xs text-zinc-500 font-medium ml-1">Step {step} of 2</span>
                   </div>
               </div>
           </div>
           <button 
                onClick={onCancel} 
                className="p-2.5 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
                title="Close"
           >
               <X className="w-6 h-6" />
           </button>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
            
            {/* Step 1: Identity */}
            {step === 1 && (
                <div className="animate-in slide-in-from-right-8 fade-in duration-300 space-y-8">
                    
                    {/* Mode Selection Cards */}
                    <section>
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                             1. Select Simulation Mode
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button 
                                onClick={() => setMode('fantasy')}
                                className={`group relative p-5 rounded-2xl border text-left transition-all duration-300 ${mode === 'fantasy' ? 'bg-purple-900/20 border-purple-500/50 ring-1 ring-purple-500/20' : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/80 hover:border-zinc-700'}`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`p-2 rounded-lg ${mode === 'fantasy' ? 'bg-purple-500 text-white shadow-lg shadow-purple-900/50' : 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-zinc-200'}`}>
                                        <Castle className="w-5 h-5" />
                                    </div>
                                    {mode === 'fantasy' && <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" />}
                                </div>
                                <h4 className={`text-base font-bold mb-1 ${mode === 'fantasy' ? 'text-white' : 'text-zinc-300'}`}>Fictional World</h4>
                                <p className="text-xs text-zinc-400 leading-relaxed">Create lore-accurate cities from books, movies, games, or your imagination.</p>
                            </button>

                            <button 
                                onClick={() => setMode('historical')}
                                className={`group relative p-5 rounded-2xl border text-left transition-all duration-300 ${mode === 'historical' ? 'bg-amber-900/20 border-amber-500/50 ring-1 ring-amber-500/20' : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/80 hover:border-zinc-700'}`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`p-2 rounded-lg ${mode === 'historical' ? 'bg-amber-500 text-white shadow-lg shadow-amber-900/50' : 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-zinc-200'}`}>
                                        <ScrollText className="w-5 h-5" />
                                    </div>
                                    {mode === 'historical' && <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse" />}
                                </div>
                                <h4 className={`text-base font-bold mb-1 ${mode === 'historical' ? 'text-white' : 'text-zinc-300'}`}>Ancient Civilization</h4>
                                <p className="text-xs text-zinc-400 leading-relaxed">Reconstruct historical cities, eras, and lost civilizations with accuracy.</p>
                            </button>
                        </div>
                    </section>

                    {/* Inputs Section */}
                    <section>
                         <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                             2. Target Identification
                        </h3>
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-zinc-400 ml-1">
                                        {mode === 'fantasy' ? 'City / Place Name' : 'Ancient City Name'}
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Globe className="h-4 w-4 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
                                        </div>
                                        <input 
                                            type="text" 
                                            placeholder={mode === 'fantasy' ? "e.g. Winterfell, Gondor" : "e.g. Babylon, Carthage"}
                                            className="w-full bg-zinc-900/80 border border-zinc-700 rounded-xl pl-10 pr-4 py-3.5 text-sm text-white placeholder-zinc-600 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none font-medium shadow-sm hover:bg-zinc-900"
                                            value={config.cityName}
                                            onChange={e => setConfig({...config, cityName: e.target.value})}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-zinc-400 ml-1">
                                        {mode === 'fantasy' ? 'Universe / Source' : 'Historical Era / Civilization'}
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            {mode === 'fantasy' ? (
                                                <Sparkles className="h-4 w-4 text-zinc-500 group-focus-within:text-purple-400 transition-colors" />
                                            ) : (
                                                <History className="h-4 w-4 text-zinc-500 group-focus-within:text-amber-400 transition-colors" />
                                            )}
                                        </div>
                                        <input 
                                            type="text" 
                                            placeholder={mode === 'fantasy' ? "e.g. Game of Thrones, Star Wars" : "e.g. Roman Empire, 300 BC"}
                                            className="w-full bg-zinc-900/80 border border-zinc-700 rounded-xl pl-10 pr-4 py-3.5 text-sm text-white placeholder-zinc-600 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none font-medium shadow-sm hover:bg-zinc-900"
                                            value={config.universe}
                                            onChange={e => setConfig({...config, universe: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-zinc-400 ml-1">
                                    Detailed Description <span className="text-zinc-600 font-normal">(Optional)</span>
                                </label>
                                <textarea 
                                    placeholder={mode === 'fantasy' ? "Describe specific landmarks, the current state of affairs, or specific details..." : "Describe the construction phase, specific historical event, or atmosphere..."}
                                    className="w-full bg-zinc-900/80 border border-zinc-700 rounded-xl px-4 py-3.5 text-sm text-white placeholder-zinc-600 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none h-24 min-h-[6rem] resize-y font-medium leading-relaxed shadow-sm hover:bg-zinc-900"
                                    value={config.description}
                                    onChange={e => setConfig({...config, description: e.target.value})}
                                />
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {/* Step 2: Atmosphere */}
            {step === 2 && (
                <div className="animate-in slide-in-from-right-8 fade-in duration-300 space-y-8">
                     
                     <section>
                         <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                             3. Environmental Parameters
                        </h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-zinc-400 ml-1">Weather Conditions</label>
                                <div className="relative">
                                    <select 
                                        className="w-full bg-zinc-900/80 border border-zinc-700 rounded-xl px-4 py-3.5 text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none appearance-none font-medium cursor-pointer hover:bg-zinc-900 transition-colors shadow-sm"
                                        value={config.weather}
                                        onChange={e => setConfig({...config, weather: e.target.value})}
                                    >
                                        {weatherOptions.map(opt => <option key={opt}>{opt}</option>)}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                                        <ArrowRight className="w-4 h-4 rotate-90" />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-zinc-400 ml-1">Time of Day</label>
                                 <div className="relative">
                                    <select 
                                        className="w-full bg-zinc-900/80 border border-zinc-700 rounded-xl px-4 py-3.5 text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none appearance-none font-medium cursor-pointer hover:bg-zinc-900 transition-colors shadow-sm"
                                        value={config.time}
                                        onChange={e => setConfig({...config, time: e.target.value})}
                                    >
                                        {timeOptions.map(opt => <option key={opt}>{opt}</option>)}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                                        <ArrowRight className="w-4 h-4 rotate-90" />
                                    </div>
                                </div>
                            </div>
                         </div>
                     </section>
                     
                     <section>
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                             4. Rendering Style
                        </h3>
                        <div className="flex flex-wrap gap-2.5">
                            {aestheticOptions.map(style => (
                                <button
                                    key={style}
                                    onClick={() => setConfig({...config, aesthetic: style})}
                                    className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all duration-200 ${config.aesthetic === style ? 'bg-zinc-100 border-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)] scale-105' : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 hover:border-zinc-700'}`}
                                >
                                    {style}
                                </button>
                            ))}
                        </div>
                     </section>
                </div>
            )}

        </div>

        {/* Sticky Footer */}
        <div className="flex-shrink-0 p-6 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-xl flex justify-between items-center z-20">
            {step === 2 ? (
                <button 
                    onClick={() => setStep(1)}
                    className="px-5 py-2.5 rounded-full text-zinc-400 font-bold text-sm hover:text-white transition-colors flex items-center gap-2 hover:bg-white/5 border border-transparent hover:border-zinc-700"
                >
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
            ) : (
                <div /> /* Spacer */
            )}
            
            {step === 1 ? (
                <button 
                    onClick={() => setStep(2)}
                    disabled={!isValidStep1}
                    className="px-8 py-3 bg-zinc-100 text-black rounded-full font-bold text-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                >
                    Next Step <ArrowRight className="w-4 h-4" />
                </button>
            ) : (
                <button 
                    onClick={handleSubmit}
                    disabled={isProcessing}
                    className={`px-8 py-3 rounded-full font-bold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border border-white/10 ${mode === 'fantasy' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-purple-500/30' : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:shadow-amber-500/30'} text-white`}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {mode === 'fantasy' ? 'Simulating...' : 'Reconstructing...'}
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" />
                            {mode === 'fantasy' ? 'Generate World' : 'Build City'}
                        </>
                    )}
                </button>
            )}
        </div>

      </div>
    </div>
  );
};

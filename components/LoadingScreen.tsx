
import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("Initializing environment...");
  
  const messages = [
    "Calibrating simulation grid...",
    "Erecting structural pillars...",
    "Hoisting floor plates...",
    "Installing holographic facades...",
    "Simulating wind load...",
    "Rendering lighting dynamics...",
    "Finalizing scene composition..."
  ];

  useEffect(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev; 
        const remaining = 95 - prev;
        return prev + Math.max(0.2, remaining * 0.08);
      });
    }, 100);

    let msgIndex = 0;
    const textInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setLoadingText(messages[msgIndex]);
    }, 2000);

    return () => {
      clearInterval(interval);
      clearInterval(textInterval);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-2xl p-6 animate-in fade-in duration-500 overflow-hidden">
      
      {/* Background Grid - Holographic Effect */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
            backgroundImage: `
                linear-gradient(rgba(59, 130, 246, 0.2) 1px, transparent 1px),
                linear-gradient(90deg, rgba(59, 130, 246, 0.2) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            transform: 'perspective(500px) rotateX(60deg) translateY(-100px) scale(2)',
            animation: 'gridMove 20s linear infinite'
        }}
      />
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes gridMove {
            0% { background-position: 0 0; }
            100% { background-position: 0 40px; }
        }
      `}} />

      {/* Main Holographic Construction Animation */}
      <div className="relative w-80 h-60 mb-10 flex items-end justify-center perspective-1000">
        
        {/* Central Glow */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-60 h-40 bg-blue-500/10 rounded-full blur-[60px] animate-pulse" />

        <svg viewBox="0 0 300 200" className="w-full h-full overflow-visible">
            <defs>
                <linearGradient id="isoGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.1" />
                </linearGradient>
            </defs>

            {/* Isometric Grid Base */}
            <g transform="translate(150, 150) scale(1, 0.58)">
                <g transform="rotate(45)">
                     <rect x="-80" y="-80" width="160" height="160" fill="none" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.3" />
                     <line x1="-80" y1="-40" x2="80" y2="-40" stroke="#3b82f6" strokeWidth="0.5" strokeOpacity="0.2" />
                     <line x1="-80" y1="0" x2="80" y2="0" stroke="#3b82f6" strokeWidth="0.5" strokeOpacity="0.2" />
                     <line x1="-80" y1="40" x2="80" y2="40" stroke="#3b82f6" strokeWidth="0.5" strokeOpacity="0.2" />
                     <line x1="-40" y1="-80" x2="-40" y2="80" stroke="#3b82f6" strokeWidth="0.5" strokeOpacity="0.2" />
                     <line x1="0" y1="-80" x2="0" y2="80" stroke="#3b82f6" strokeWidth="0.5" strokeOpacity="0.2" />
                     <line x1="40" y1="-80" x2="40" y2="80" stroke="#3b82f6" strokeWidth="0.5" strokeOpacity="0.2" />
                </g>
            </g>

            {/* Rising Layers */}
            <g transform="translate(150, 150)">
                {[0, 1, 2, 3, 4].map((i) => (
                    <g key={i} style={{ animation: `riseAndLock 4s cubic-bezier(0.2, 0.8, 0.2, 1) infinite`, animationDelay: `${i * 0.2}s` }}>
                        <path 
                            d={`M 0 -20 L ${40 - i*2} 0 L 0 20 L -${40 - i*2} 0 Z`}
                            fill="url(#isoGradient)" 
                            stroke="#60a5fa" 
                            strokeWidth="1.5"
                            transform={`translate(0, ${-i * 15})`} 
                            opacity="0.9"
                        />
                         {/* Side details to give thickness */}
                         <path 
                            d={`M -${40 - i*2} 0 L 0 20 L 0 ${25} L -${40 - i*2} ${5} Z`}
                            fill="#1e40af"
                            opacity="0.4"
                            transform={`translate(0, ${-i * 15})`} 
                        />
                         <path 
                            d={`M 0 20 L ${40 - i*2} 0 L ${40 - i*2} ${5} L 0 ${25} Z`}
                            fill="#1e3a8a"
                            opacity="0.6"
                            transform={`translate(0, ${-i * 15})`} 
                        />
                    </g>
                ))}
            </g>

            {/* Scanning Effect */}
            <g transform="translate(150, 150)" opacity="0.3">
                 <ellipse cx="0" cy="-40" rx="60" ry="20" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="4 4">
                     <animate attributeName="ry" values="20; 5; 20" dur="4s" repeatCount="indefinite" />
                     <animate attributeName="cy" values="40; -100; 40" dur="4s" repeatCount="indefinite" />
                     <animate attributeName="opacity" values="0; 1; 0" dur="4s" repeatCount="indefinite" />
                 </ellipse>
            </g>

        </svg>

        <style dangerouslySetInnerHTML={{__html: `
            @keyframes riseAndLock {
                0% { transform: translateY(60px) scale(0.8); opacity: 0; }
                20% { transform: translateY(0) scale(1); opacity: 1; }
                80% { transform: translateY(0) scale(1); opacity: 1; }
                100% { transform: translateY(-30px) scale(1.1); opacity: 0; }
            }
        `}} />
      </div>

      <div className="flex flex-col items-center gap-3 max-w-xs text-center z-10">
        <div className="flex items-center gap-2">
           <h2 className="text-xl font-bold text-white tracking-tight animate-pulse">Constructing World</h2>
        </div>
        <p className="text-sm text-zinc-400 font-medium h-5">
            {message || loadingText}
        </p>
        
        {/* Progress Bar */}
        <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mt-4 shadow-inner">
            <div 
            className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
            style={{ width: `${progress}%` }}
            >
                <div className="absolute inset-0 bg-white/50 w-full h-full animate-[shimmer_1.5s_infinite]" 
                    style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)' }} 
                />
            </div>
        </div>
      </div>
    </div>
  );
};

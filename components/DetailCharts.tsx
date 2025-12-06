
import React, { useState, useRef, useMemo } from 'react';

interface ChartProps {
  data: number[];
  labels: string[];
  color: string;
  unit?: string;
  minVal?: number;
  maxVal?: number;
}

// Helper to generate a smooth Bezier path from points
const getSmoothPath = (points: {x: number, y: number}[]) => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

    let d = `M ${points[0].x},${points[0].y}`;
    
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i === 0 ? 0 : i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] || p2;

        // Tension factor (0.15 reduces overshooting for smoother trends)
        const tension = 0.15;
        const cp1x = p1.x + (p2.x - p0.x) * tension; 
        const cp1y = p1.y + (p2.y - p0.y) * tension;
        
        const cp2x = p2.x - (p3.x - p1.x) * tension;
        const cp2y = p2.y - (p3.y - p1.y) * tension;

        d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
}

export const AreaChart: React.FC<ChartProps> = ({ data, labels, color, unit = '', minVal, maxVal }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const width = 300;
  const height = 120;
  const padding = 10;
  
  const safeMin = minVal !== undefined ? minVal : Math.min(...data);
  const safeMax = maxVal !== undefined ? maxVal : Math.max(...data);
  const range = safeMax - safeMin || 1;

  const points = useMemo(() => data.map((val, i) => {
    // Distribute X evenly
    const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
    // Map Y inversely (SVG coordinates)
    const y = height - ((val - safeMin) / range) * (height - padding * 2) - padding;
    return { x, y, val, label: labels[i] };
  }), [data, labels, safeMin, range]);

  const linePath = useMemo(() => getSmoothPath(points), [points]);
  const areaPath = points.length > 0 
      ? `${linePath} L ${points[points.length-1].x},${height} L ${points[0].x},${height} Z`
      : '';

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      
      const boundedX = Math.max(0, Math.min(x, rect.width));
      const relativeX = (boundedX / rect.width) * width;
      
      let closest = 0;
      let minDist = Infinity;
      points.forEach((p, i) => {
          const dist = Math.abs(p.x - relativeX);
          if (dist < minDist) {
              minDist = dist;
              closest = i;
          }
      });
      setActiveIndex(closest);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    handlePointerMove(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setActiveIndex(null);
  };

  return (
      <div 
        ref={containerRef}
        className="w-full relative touch-none cursor-crosshair select-none py-2"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
            <defs>
                <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.0" />
                </linearGradient>
            </defs>

            {/* Filled Area */}
            <path d={areaPath} fill={`url(#grad-${color})`} stroke="none" />
            
            {/* The Line */}
            <path d={linePath} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

            {/* Active Cursor */}
            {activeIndex !== null && (
                <g>
                    <line x1={points[activeIndex].x} y1={0} x2={points[activeIndex].x} y2={height} stroke="white" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                    <circle cx={points[activeIndex].x} cy={points[activeIndex].y} r="6" fill={color} stroke="white" strokeWidth="2" />
                </g>
            )}

            {/* Default Markers for min/max/endpoints */}
            {activeIndex === null && points.map((p, i) => {
                 if (p.val === safeMax || p.val === safeMin || i === 0 || i === points.length - 1) {
                     return (
                         <circle key={i} cx={p.x} cy={p.y} r="3" fill="white" stroke={color} strokeWidth="1.5" opacity="0.8" />
                     );
                 }
                 return null;
            })}
        </svg>

        <div className="flex justify-between w-full px-2 mt-2">
            {labels.filter((_, i) => i % 6 === 0).map((label, i) => (
                <span key={i} className="text-[10px] text-zinc-500 font-medium">{label}</span>
            ))}
        </div>

        {activeIndex !== null && points[activeIndex] && (
             <div 
                className="absolute bg-zinc-800/95 backdrop-blur-md text-white px-3 py-2 rounded-lg shadow-xl pointer-events-none border border-zinc-700 z-20 flex flex-col items-center transform -translate-x-1/2 -translate-y-[130%]"
                style={{ 
                    left: `${(points[activeIndex].x / width) * 100}%`, 
                    top: `${Math.min((points[activeIndex].y / height) * 100, 80)}%`
                }}
             >
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-0.5">{points[activeIndex].label}</span>
                <span className="text-base font-black">{points[activeIndex].val}{unit}</span>
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-zinc-800 rotate-45 border-r border-b border-zinc-700"></div>
             </div>
        )}
      </div>
  );
};

export const BarChart: React.FC<ChartProps> = ({ data, labels, color, unit = '' }) => {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const width = 300;
    const height = 120;
    const max = Math.max(...data, 1);

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const boundedX = Math.max(0, Math.min(x, rect.width));
        const idx = Math.floor((boundedX / rect.width) * data.length);
        
        if (idx >= 0 && idx < data.length) {
            setActiveIndex(idx);
        }
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        handlePointerMove(e);
    };
    
    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        setActiveIndex(null);
    };

    return (
        <div 
            ref={containerRef}
            className="w-full relative touch-none cursor-crosshair select-none py-2"
            style={{ touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
        >
            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                {data.map((val, i) => {
                    const barWidth = (width / data.length) * 0.7;
                    const x = (i / data.length) * width + (width / data.length - barWidth) / 2;
                    const barHeight = (val / max) * (height - 20);
                    const y = height - barHeight;
                    const isActive = activeIndex === i;
                    
                    return (
                        <g key={i}>
                             <rect 
                                x={x} y={y} 
                                width={barWidth} height={barHeight} 
                                fill={color} 
                                rx="2"
                                opacity={isActive ? 1 : 0.6}
                                className="transition-opacity duration-150"
                             />
                        </g>
                    );
                })}
            </svg>
            
            <div className="flex justify-between w-full px-1 mt-2">
                {labels.filter((_, i) => i % 6 === 0).map((label, i) => (
                    <span key={i} className="text-[10px] text-zinc-500 font-medium">{label}</span>
                ))}
            </div>

            {activeIndex !== null && data[activeIndex] !== undefined && (
                <div 
                    className="absolute bg-zinc-800/95 backdrop-blur-md text-white px-3 py-2 rounded-lg shadow-xl pointer-events-none border border-zinc-700 z-20 flex flex-col items-center transform -translate-x-1/2 -translate-y-full mb-2"
                    style={{ 
                        left: `${((activeIndex / data.length) * width + (width/data.length)/2) / width * 100}%`,
                        top: `0` 
                    }}
                 >
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-0.5">{labels[activeIndex]}</span>
                    <span className="text-base font-black">{data[activeIndex]}{unit}</span>
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-zinc-800 rotate-45 border-r border-b border-zinc-700"></div>
                 </div>
            )}
        </div>
    );
};

interface SunCycleProps {
    sunrise: string;
    sunset: string;
}

export const SunCycle: React.FC<SunCycleProps> = ({ sunrise, sunset }) => {
    const [scrubProgress, setScrubProgress] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const parseTime = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };
    
    const sr = parseTime(sunrise);
    let ss = parseTime(sunset);
    if (ss < sr) ss += 24 * 60;

    const now = new Date();
    const curr = now.getHours() * 60 + now.getMinutes();

    const start = sr - 120; // 2 hours before sunrise
    const end = ss + 120;   // 2 hours after sunset
    const total = end - start;
    
    let currentProgress = (curr - start) / total;
    currentProgress = Math.max(0, Math.min(1, currentProgress));

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const boundedX = Math.max(0, Math.min(x, rect.width));
        setScrubProgress(boundedX / rect.width);
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        handlePointerMove(e);
    };
    
    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        setScrubProgress(null);
    };

    const activeProgress = scrubProgress !== null ? scrubProgress : currentProgress;
    const activeTimeMins = Math.round(start + (activeProgress * total));
    const activeHours = Math.floor(activeTimeMins / 60) % 24;
    const activeMins = activeTimeMins % 60;
    const activeTimeStr = `${activeHours.toString().padStart(2, '0')}:${activeMins.toString().padStart(2, '0')}`;

    const angle = Math.PI - (activeProgress * Math.PI);
    const radius = 100;
    const cx = 150;
    const cy = 120;
    const sunX = cx + radius * Math.cos(angle);
    const sunY = cy - radius * Math.sin(angle);

    return (
        <div 
            ref={containerRef}
            className="w-full flex flex-col items-center py-2 relative touch-none cursor-ew-resize"
            style={{ touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
        >
            <svg width="100%" height="140" viewBox="0 0 300 140" className="overflow-visible select-none">
                 <defs>
                     <linearGradient id="skyGradient" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="0%" stopColor={scrubProgress !== null ? "#fcd34d" : "#fdba74"} stopOpacity="0.2" />
                         <stop offset="100%" stopColor="#fdba74" stopOpacity="0" />
                     </linearGradient>
                 </defs>

                 <line x1="0" y1="120" x2="300" y2="120" stroke="#3f3f46" strokeWidth="1" strokeDasharray="4 4" />
                 
                 <path d="M 50 120 A 100 100 0 0 1 250 120" fill="url(#skyGradient)" stroke="#52525b" strokeWidth="2" strokeDasharray="4 4" />
                 
                 {scrubProgress === null && (
                     <g transform={`translate(${sunX}, ${sunY})`}>
                         <circle r="12" fill="#fbbf24" className="animate-pulse shadow-lg" />
                         <circle r="6" fill="#fff" opacity="0.5" />
                     </g>
                 )}

                 {scrubProgress !== null && (
                     <g transform={`translate(${sunX}, ${sunY})`}>
                        <circle r="14" fill="transparent" stroke="#fbbf24" strokeWidth="2" strokeDasharray="2 2" />
                        <circle r="8" fill="#fbbf24" />
                     </g>
                 )}

                 <text x="50" y="140" textAnchor="middle" fill="#a1a1aa" fontSize="11" fontWeight="bold">{sunrise}</text>
                 <text x="250" y="140" textAnchor="middle" fill="#a1a1aa" fontSize="11" fontWeight="bold">{sunset}</text>
            </svg>
            
            <div className={`absolute top-0 right-2 px-2 py-1 rounded text-[10px] border transition-colors ${scrubProgress !== null ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-200' : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400'}`}>
               {scrubProgress !== null ? `Time: ${activeTimeStr}` : 'Drag to scrub'}
            </div>
        </div>
    );
};

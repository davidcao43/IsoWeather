
import React, { useState, useEffect, useRef } from 'react';
import { WeatherData, GeneratedImage, HourlyForecast, NewsItem, ViewConfig, DailyForecast } from '../types';
import { 
    RefreshCw, Wind, Droplets, Thermometer, ArrowDown, CloudRain, Sun, Activity, 
    Cloud, CloudLightning, CloudSnow, CloudFog, Eye, Gauge, 
    Sunrise, Sunset, Umbrella, X, Download, Sparkles, ArrowLeft, ArrowRight, Plus,
    Info, TrendingUp, CloudDrizzle, Calendar, Navigation, Globe, Brain, Zap, FlaskConical, Newspaper, Wand2, Loader2, Check, ChevronLeft, ChevronRight
} from 'lucide-react';
import { AreaChart, BarChart, SunCycle } from './DetailCharts';
import { editWeatherScene } from '../services/geminiService';
import { mapWmoCode } from '../services/weatherService';

interface WeatherCardProps {
  weather: WeatherData;
  image: GeneratedImage;
  loading?: boolean;
  onScroll?: (isScrolled: boolean) => void;
  onUpdateImage?: (newImage: GeneratedImage) => void;
  onRefresh?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isStackItem?: boolean;
  isPreview?: boolean;
  onSave?: () => void;
  onDrag?: (offset: number) => void;
  onUpdateView?: (viewConfig: ViewConfig) => void;
}

// Internal Component for Pan/Zoom Image Viewing with Multi-Touch Support
const PanZoomImage: React.FC<{ 
    src: string, 
    alt: string, 
    initialConfig?: ViewConfig,
    onTransformChange?: (config: ViewConfig) => void 
}> = ({ src, alt, initialConfig, onTransformChange }) => {
    // Initialize state only once from props to avoid resetting during parent renders,
    // unless initialConfig changes externally significantly (which we handle in useEffect below if needed)
    const [transform, setTransform] = useState<ViewConfig>(initialConfig || { x: 0, y: 0, scale: 1 });
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    
    // Interaction State for Multi-touch/Pinch
    const pointers = useRef<Map<number, {x: number, y: number}>>(new Map());
    const interactionStart = useRef<{
        scale: number;
        x: number;
        y: number;
        dist: number;
        center: {x: number, y: number};
    }>({ scale: 1, x: 0, y: 0, dist: 0, center: {x: 0, y: 0} });

    // Sync if initialConfig updates (e.g. from parent state change)
    useEffect(() => {
        if (initialConfig) {
             setTransform(prev => {
                 // Only update if significantly different to prevent jitter
                 if (Math.abs(prev.x - initialConfig.x) > 1 || Math.abs(prev.y - initialConfig.y) > 1 || Math.abs(prev.scale - initialConfig.scale) > 0.01) {
                     return initialConfig;
                 }
                 return prev;
             });
        }
    }, [initialConfig]);

    const getMetrics = (currentPointers: {x: number, y: number}[]) => {
        if (currentPointers.length === 0) return { center: {x:0, y:0}, dist: 0 };
        if (currentPointers.length === 1) return { center: currentPointers[0], dist: 0 };
        
        const p1 = currentPointers[0];
        const p2 = currentPointers[1];
        const center = { x: (p1.x + p2.x)/2, y: (p1.y + p2.y)/2 };
        const dist = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
        return { center, dist };
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (containerRef.current) containerRef.current.setPointerCapture(e.pointerId);
        
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        setIsDragging(true);
        
        // Recalculate interaction baseline
        const pointList = Array.from(pointers.current.values()) as {x: number, y: number}[];
        const { center, dist } = getMetrics(pointList);
        
        interactionStart.current = {
            scale: transform.scale,
            x: transform.x,
            y: transform.y,
            dist: dist,
            center: center
        };
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!pointers.current.has(e.pointerId)) return;
        e.preventDefault();
        e.stopPropagation();

        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        
        const pointList = Array.from(pointers.current.values()) as {x: number, y: number}[];
        if (pointList.length === 0) return;

        const { center, dist } = getMetrics(pointList);
        const start = interactionStart.current;

        let newScale = transform.scale;
        let newX = transform.x;
        let newY = transform.y;

        // 1. PINCH (Scale)
        if (pointList.length >= 2 && start.dist > 0) {
             const scaleChange = dist / start.dist;
             newScale = Math.min(Math.max(1, start.scale * scaleChange), 8); // Increased max zoom
        }

        // 2. PAN (Move)
        const dx = center.x - start.center.x;
        const dy = center.y - start.center.y;
        
        // Apply pan if zoomed or if multi-touch or dragging single touch
        // Allow free movement
        newX = start.x + dx;
        newY = start.y + dy;

        const config = { x: newX, y: newY, scale: newScale };
        setTransform(config);
        if (onTransformChange) onTransformChange(config);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (containerRef.current) containerRef.current.releasePointerCapture(e.pointerId);
        pointers.current.delete(e.pointerId);
        
        if (pointers.current.size === 0) {
            setIsDragging(false);
        }

        // Reset baseline to prevent jumping if switching from 2 fingers to 1
        if (pointers.current.size > 0) {
            const pointList = Array.from(pointers.current.values()) as {x: number, y: number}[];
            const { center, dist } = getMetrics(pointList);
            interactionStart.current = {
                scale: transform.scale,
                x: transform.x,
                y: transform.y,
                dist: dist,
                center: center
            };
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.stopPropagation();
        const scaleAmount = -(e.deltaY) * 0.001;
        const newScale = Math.min(Math.max(1, transform.scale + scaleAmount), 8);
        
        const config = { ...transform, scale: newScale };
        // Reset position if completely zoomed out
        if (newScale === 1) {
            config.x = 0;
            config.y = 0;
        }
        setTransform(config);
        if (onTransformChange) onTransformChange(config);
    };

    return (
        <div 
            ref={containerRef}
            className={`w-full h-full overflow-hidden flex items-center justify-center bg-black relative touch-none select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            style={{ touchAction: 'none' }}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
        >
             <img 
                src={src} 
                alt={alt}
                className="max-w-none max-h-none will-change-transform select-none pointer-events-none"
                style={{
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                    height: '100%',
                    width: 'auto',
                    objectFit: 'contain'
                }}
                draggable={false}
            />
        </div>
    );
};

interface NewsModalProps {
    newsItems: NewsItem[];
    onClose: () => void;
}

const NewsModal: React.FC<NewsModalProps> = ({ newsItems, onClose }) => {
    const mainStory = newsItems[0];
    const sideStories = newsItems.slice(1);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
             <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden max-w-md w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
                    <div className="flex items-center gap-2 text-blue-400">
                        <Newspaper className="w-5 h-5" />
                        <span className="font-black text-sm tracking-widest uppercase">Global Feed</span>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-6 scrollbar-hide">
                    {/* Main Story */}
                    <article className="mb-8">
                        <div className="inline-block px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase mb-3 border border-blue-500/20">
                            {mainStory?.category || "Breaking News"}
                        </div>
                        <h1 className="text-2xl font-black text-white leading-tight mb-4 font-serif">
                            {mainStory?.headline}
                        </h1>
                        <p className="text-zinc-300 leading-relaxed text-sm whitespace-pre-line border-l-2 border-zinc-700 pl-4">
                            {mainStory?.content}
                        </p>
                    </article>

                    {/* Side Stories */}
                    {sideStories.length > 0 && (
                        <div className="space-y-4 pt-6 border-t border-zinc-800/50">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Other Headlines</h3>
                            {sideStories.map((item, i) => (
                                <div key={i} className="group cursor-pointer">
                                    <div className="flex justify-between items-start mb-1">
                                         <span className="text-xs text-purple-400 font-bold">{item.category}</span>
                                         <span className="text-[10px] text-zinc-600">Just now</span>
                                    </div>
                                    <h4 className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">
                                        {item.headline}
                                    </h4>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-zinc-950 border-t border-zinc-800 text-center">
                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Planetary News Network • Live Feed</p>
                </div>
             </div>
        </div>
    );
};


interface DetailModalProps {
    title: string;
    value: string;
    subValue?: string;
    description: string;
    icon: React.ReactNode;
    insights: { label: string; text: string; icon?: React.ReactNode }[];
    chart?: React.ReactNode;
    onClose: () => void;
    isFictional?: boolean;
}

const DetailModal: React.FC<DetailModalProps> = ({ title, value, subValue, description, icon, insights, chart, onClose, isFictional }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 overflow-hidden max-h-[90vh] overflow-y-auto scrollbar-hide" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-zinc-800 rounded-2xl text-blue-400 border border-zinc-700">
                        {icon}
                    </div>
                    <div>
                         <h3 className="text-zinc-500 font-bold text-xs uppercase tracking-wider mb-1">{title}</h3>
                         <div className="flex items-baseline gap-2">
                             <p className="text-3xl font-black text-white tracking-tight">{value}</p>
                             {subValue && <span className="text-zinc-400 font-medium text-sm">{subValue}</span>}
                         </div>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                    <X className="w-5 h-5 text-zinc-400" />
                </button>
            </div>
            
            <div className="space-y-6">
                {/* Visual Chart Section */}
                {chart && (
                    <div className="bg-zinc-950/50 p-4 rounded-3xl border border-zinc-800/50">
                        <div className="flex items-center gap-2 mb-4 text-zinc-400 text-xs font-bold uppercase tracking-wide">
                            <Activity className="w-3 h-3" /> Trend Analysis
                        </div>
                        {chart}
                        <div className="mt-2 text-center text-[10px] text-zinc-600 italic">
                            Touch or drag graph for details
                        </div>
                    </div>
                )}

                <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50">
                    <div className="flex items-center gap-2 mb-2 text-zinc-400 text-xs font-bold uppercase">
                        <Info className="w-3 h-3" /> About
                    </div>
                    <p className="text-zinc-300 leading-relaxed text-sm">{description}</p>
                </div>

                {insights.length > 0 && (
                    <div className="space-y-3">
                         <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase">
                            <TrendingUp className="w-3 h-3" /> Insights & Forecast
                        </div>
                        {insights.map((insight, idx) => (
                            <div key={idx} className="flex gap-3 items-start p-2 hover:bg-white/5 rounded-lg transition-colors">
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                <div>
                                    <span className="text-zinc-500 text-xs font-bold uppercase block mb-0.5">{insight.label}</span>
                                    <p className="text-zinc-300 text-sm font-medium">{insight.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Source Attribution */}
                <div className="pt-4 border-t border-zinc-800 flex justify-between items-center text-[10px] text-zinc-600">
                    {isFictional ? (
                        <span className="flex items-center gap-1 text-purple-400/80"><Brain className="w-3 h-3" /> AI Simulation: Data is generated lore.</span>
                    ) : (
                        <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Data Source: Open-Meteo</span>
                    )}
                </div>
            </div>
        </div>
    </div>
);

export const WeatherCard: React.FC<WeatherCardProps> = ({ 
    weather, 
    image, 
    loading, 
    onScroll, 
    onUpdateImage,
    onRefresh,
    isExpanded = true, 
    onToggleExpand,
    isStackItem = false,
    isPreview = false,
    onSave,
    onDrag,
    onUpdateView
}) => {
  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const [displayTemp, setDisplayTemp] = useState<number>(weather.temperature);
  
  // Rich Detail State
  const [selectedMetric, setSelectedMetric] = useState<{
      title: string, 
      value: string, 
      subValue?: string,
      description: string, 
      icon: React.ReactNode,
      insights: { label: string; text: string; icon?: React.ReactNode }[],
      chart?: React.ReactNode
  } | null>(null);

  const [showFullImage, setShowFullImage] = useState(false);
  const [showAdjustInput, setShowAdjustInput] = useState(false);
  const [adjustPrompt, setAdjustPrompt] = useState("");
  const [showNewsModal, setShowNewsModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScrolledDown, setHasScrolledDown] = useState(false);
  
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDismissing, setIsDismissing] = useState(false);

  // View Config
  const [currentViewConfig, setCurrentViewConfig] = useState<ViewConfig | undefined>(image.viewConfig);
  
  // Local Edit History State
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

  // --- Conversions ---
  const toF = (c: number) => Math.round((c * 9/5) + 32);
  const toMph = (kmh: number) => Math.round(kmh * 0.621371);
  const toMiles = (km: number) => Math.round(km * 0.621371 * 10) / 10;
  const toInches = (mm: number) => Math.round(mm * 0.0393701 * 100) / 100;
  const toInHg = (hpa: number) => Math.round(hpa * 0.02953 * 100) / 100;

  useEffect(() => {
    setDisplayTemp(unit === 'F' ? toF(weather.temperature) : weather.temperature);
  }, [unit, weather.temperature]);

  useEffect(() => {
    if (!isExpanded && scrollRef.current) {
        scrollRef.current.scrollTop = 0;
        setHasScrolledDown(false);
    }
  }, [isExpanded]);

  // Sync view config when image prop changes
  useEffect(() => {
      setCurrentViewConfig(image.viewConfig);
  }, [image.viewConfig]);

  // Initialize history when full view opens
  useEffect(() => {
      if (showFullImage) {
          // If history is empty, initialize with current image
          if (history.length === 0) {
              setHistory([image]);
              setHistoryIndex(0);
          }
      } else {
          // Reset history on close
          setHistory([]);
          setHistoryIndex(0);
          setIsEditing(false);
      }
  }, [showFullImage]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (isDismissing) return;
    if (scrollRef.current && scrollRef.current.scrollTop <= 2) {
        setTouchStart(e.touches[0].clientY);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (isDismissing) return;
    if (touchStart !== null && (isPreview || isExpanded) && scrollRef.current && scrollRef.current.scrollTop <= 2) {
        const currentY = e.touches[0].clientY;
        const diff = currentY - touchStart;
        if (diff > 0) {
            setDragOffset(diff * 1.05);
            if (e.cancelable && diff < 10) e.preventDefault(); 
        } else {
             setDragOffset(0);
        }
        if (onDrag) onDrag(diff > 0 ? diff * 1.05 : 0);
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (isDismissing) return;
    if (touchStart !== null) {
        if (dragOffset > 75) {
            setIsDismissing(true);
            const exitDistance = window.innerHeight;
            setDragOffset(exitDistance);
            if (onDrag) onDrag(exitDistance); 
            setTimeout(() => {
                if (onToggleExpand) onToggleExpand(); 
            }, 300);
        } else {
             setDragOffset(0);
             if (onDrag) onDrag(0);
        }
    }
    setTouchStart(null);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (onScroll) onScroll(scrollTop > 50);
    if (isExpanded && onToggleExpand) {
        if (scrollTop > 50) setHasScrolledDown(true);
    }
  };

  // Determine currently active image
  const activeImage = history.length > 0 ? history[historyIndex] : image;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = activeImage.url;
    link.download = `isoweather-${weather.city.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCloseFullImage = () => {
    // 1. Commit View Config (Pan/Zoom)
    if (onUpdateView && currentViewConfig) {
        onUpdateView(currentViewConfig);
    }
    
    // 2. Commit the CURRENTLY SELECTED image from history
    if (activeImage && activeImage.url !== image.url && onUpdateImage) {
        onUpdateImage(activeImage);
    }

    setShowFullImage(false);
    setShowAdjustInput(false);
  };

  const handleSubmitAdjust = async () => {
      if (adjustPrompt.trim()) {
          setIsEditing(true);
          setShowAdjustInput(false);
          try {
              // Edit based on current active image
              const baseImage = activeImage;
              const newImage = await editWeatherScene(baseImage.base64, adjustPrompt);
              
              // Add to history, removing any future redo states
              const newHistory = history.slice(0, historyIndex + 1);
              newHistory.push(newImage);
              
              setHistory(newHistory);
              setHistoryIndex(newHistory.length - 1);
          } catch (e) {
              console.error("Failed to edit locally", e);
              // In a real app, show a toast or error
          } finally {
              setIsEditing(false);
              setAdjustPrompt("");
          }
      }
  };

  // --- Helper for Short Summaries ---
  const getBriefSummary = (metric: string, val: number, unitStr?: string) => {
      // Prioritize Lore-Specific Summaries
      if (weather.isFictional && weather.fictionalSummaries && weather.fictionalSummaries[metric]) {
          return weather.fictionalSummaries[metric];
      }

      switch(metric) {
          case 'Feels Like':
              const diff = val - (unit === 'F' ? toF(weather.temperature) : weather.temperature);
              return Math.abs(diff) < 2 ? "It feels exactly how it looks outside." : (diff > 0 ? "Humidity is making it feel warmer." : "The wind chill makes it feel brisk.");
          case 'Humidity': return val < 30 ? "The air is quite dry; stay hydrated." : (val > 60 ? "It feels a bit sticky and humid." : "Comfortable humidity levels right now.");
          case 'UV Index': return val > 5 ? "Don't forget sunscreen if going out!" : (val > 2 ? "Moderate UV; seek shade at noon." : "No sun protection needed right now.");
          case 'Visibility': 
              const km = unit === 'F' ? val * 1.6 : val;
              return km > 9 ? "Crystal clear views for miles." : (km < 2 ? "It's foggy, please drive carefully." : "The view is slightly hazy.");
          case 'Precipitation': return val > 0 ? "Don't forget an umbrella, it's raining." : "Conditions are dry, no rain right now.";
          case 'Cloud Cover': return val > 80 ? "The sky is completely overcast." : (val < 20 ? "Beautiful clear skies today." : "Just a few clouds drifting by.");
          case 'Pressure': return val > 1013 ? "High pressure brings fair weather." : "Low pressure might bring clouds.";
          case 'Dew Point': 
              const dpC = unit === 'F' ? (val - 32) * 5/9 : val;
              return dpC > 20 ? "It feels quite tropical and muggy." : (dpC < 10 ? "The air feels crisp and refreshing." : "It feels pleasant outside.");
          case 'Wind': return val > 20 ? "It's quite blustery, hold onto your hat!" : "Just a gentle breeze blowing.";
          case 'Air Quality': 
              const aqi = parseInt(weather.airQuality.split(' ')[0] || '0');
              return aqi > 100 ? "Air quality is poor, consider a mask." : "The air is fresh and clean.";
          default: return "";
      }
  };

  const getWeatherIcon = (code: number, className = "w-4 h-4") => {
      if (code === 0 || code === 1) return <Sun className={`${className} text-orange-400`} />;
      if (code <= 3) return <Cloud className={`${className} text-zinc-400`} />;
      if (code <= 48) return <CloudFog className={`${className} text-zinc-400`} />;
      if (code <= 67 || (code >= 80 && code <= 82)) return <CloudRain className={`${className} text-blue-400`} />;
      if (code >= 71 && code <= 77) return <CloudSnow className={`${className} text-sky-200`} />;
      if (code >= 95) return <CloudLightning className={`${className} text-purple-400`} />;
      return <Cloud className={`${className} text-zinc-400`} />;
  };

  const openDetail = (metricType: string) => {
      const isMetric = unit === 'C';
      const hourlyLabels = weather.hourlyForecast.map(h => h.time);
      
      let data: any = {
          title: metricType,
          value: '',
          subValue: '',
          description: '',
          icon: <Activity className="w-6 h-6"/>,
          insights: [],
          chart: null
      };

      switch(metricType) {
          case 'Feels Like':
            const feelsLikeVal = isMetric ? weather.feelsLike : toF(weather.feelsLike);
            const actualVal = isMetric ? weather.temperature : toF(weather.temperature);
            const diff = feelsLikeVal - actualVal;
            data = {
                title: 'Feels Like',
                value: `${feelsLikeVal}°`,
                description: "The Apparent Temperature calculates how hot or cold it actually feels by factoring in humidity, wind speed, and radiation.",
                icon: <Thermometer className="w-6 h-6"/>,
                insights: [
                    { label: "Comfort Level", text: Math.abs(diff) < 2 ? "Similar to actual temperature." : (diff > 0 ? "Feels warmer due to humidity." : "Feels colder due to wind chill.") },
                    { label: "Clothing", text: feelsLikeVal < 10 ? "Coat recommended." : (feelsLikeVal > 25 ? "Light clothing recommended." : "Sweater or light jacket.") }
                ],
                chart: <AreaChart 
                        data={weather.hourlyForecast.map(h => isMetric ? h.temp : toF(h.temp))} 
                        labels={hourlyLabels} 
                        color="#f97316" 
                        unit="°" 
                       />
            };
            break;
          case 'Humidity':
            data = {
                title: 'Humidity',
                value: `${weather.humidity}%`,
                subValue: `Dew Point: ${isMetric ? weather.dewPoint : toF(weather.dewPoint)}°`,
                description: "Relative humidity measures the water vapor in the air relative to the maximum possible at current temperature.",
                icon: <Droplets className="w-6 h-6"/>,
                insights: [
                    { label: "Dew Point Context", text: weather.dewPoint > 20 ? "The air feels muggy and uncomfortable." : (weather.dewPoint < 10 ? "The air feels dry and crisp." : "Comfortable humidity levels.") },
                    { label: "Health", text: weather.humidity < 30 ? "Dry air may irritate skin and eyes." : (weather.humidity > 70 ? "High humidity can promote mold growth." : "Ideal range for health.") }
                ],
                chart: <AreaChart 
                        data={weather.hourlyForecast.map(h => h.humidity)} 
                        labels={hourlyLabels} 
                        color="#3b82f6" 
                        unit="%" 
                        minVal={0} maxVal={100}
                       />
            };
            break;
          case 'Wind':
             const speed = isMetric ? weather.windSpeed : toMph(weather.windSpeed);
             const gusts = isMetric ? weather.windGusts : toMph(weather.windGusts);
             const speedUnit = isMetric ? 'km/h' : 'mph';
             data = {
                 title: 'Wind',
                 value: `${speed} ${speedUnit}`,
                 subValue: `${weather.windDirection}`,
                 description: "Wind speed at 10 meters above ground level.",
                 icon: <Wind className="w-6 h-6"/>,
                 insights: [
                     { label: "Gusts", text: `Occasional gusts up to ${gusts} ${speedUnit}.` },
                     { label: "Impact", text: speed > 40 ? "Walking is difficult; branches may fall." : (speed > 20 ? "Breezy; small trees sway." : "Calm to light breeze.") }
                 ],
                 chart: <AreaChart 
                        data={weather.hourlyForecast.map(h => isMetric ? h.windSpeed : toMph(h.windSpeed))} 
                        labels={hourlyLabels} 
                        color="#a1a1aa" 
                        unit={isMetric ? 'km/h' : 'mph'} 
                        minVal={0}
                       />
             };
             break;
          case 'UV Index':
              const uv = weather.uvIndex;
              let risk = "Low";
              if (uv > 2) risk = "Moderate";
              if (uv > 5) risk = "High";
              if (uv > 7) risk = "Very High";
              if (uv > 10) risk = "Extreme";
              data = {
                  title: 'UV Index',
                  value: `${uv}`,
                  subValue: risk,
                  description: "The strength of sunburn-producing ultraviolet radiation at solar noon.",
                  icon: <Sun className="w-6 h-6"/>,
                  insights: [
                      { label: "Protection", text: uv > 2 ? "Sunscreen and hat recommended." : "No protection needed." },
                      { label: "Burn Time", text: uv > 7 ? "Skin can burn in < 20 mins." : (uv > 5 ? "Burn time ~30-45 mins." : "Safe for prolonged exposure.") }
                  ],
                  chart: <BarChart 
                        data={weather.hourlyForecast.map(h => h.uvIndex)} 
                        labels={hourlyLabels} 
                        color="#facc15" 
                       />
              };
              break;
          case 'Visibility':
              const vis = isMetric ? weather.visibility : toMiles(weather.visibility);
              const visUnit = isMetric ? 'km' : 'mi';
              data = {
                  title: 'Visibility',
                  value: `${vis} ${visUnit}`,
                  description: "The greatest distance at which a prominent black object can be seen and recognized against the horizon sky.",
                  icon: <Eye className="w-6 h-6"/>,
                  insights: [
                      { label: "Condition", text: vis > 10 ? "Clear view." : (vis < 1 ? "Foggy conditions; drive carefully." : "Hazy or misty.") },
                      { label: "Flight Impact", text: vis < 5 ? "May impact VFR flights." : "Good for flying." }
                  ],
                  chart: <AreaChart 
                        data={weather.hourlyForecast.map(h => isMetric ? (h.visibility/1000) : toMiles(h.visibility/1000))} 
                        labels={hourlyLabels} 
                        color="#14b8a6" 
                        unit={visUnit} 
                       />
              };
              break;
          case 'Pressure':
              const press = isMetric ? weather.pressure : toInHg(weather.pressure);
              const pressUnit = isMetric ? 'hPa' : 'inHg';
              data = {
                  title: 'Pressure',
                  value: `${press} ${pressUnit}`,
                  description: "Atmospheric pressure at mean sea level.",
                  icon: <Gauge className="w-6 h-6"/>,
                  insights: [
                      { label: "System", text: weather.pressure > 1013 ? "High pressure system (usually fair weather)." : "Low pressure system (often brings rain/clouds)." },
                      { label: "Trend", text: "Changes in pressure can indicate approaching fronts." }
                  ],
                  chart: <AreaChart 
                        data={weather.hourlyForecast.map(h => isMetric ? h.pressure : toInHg(h.pressure))} 
                        labels={hourlyLabels} 
                        color="#8b5cf6" 
                        unit={pressUnit} 
                        minVal={isMetric ? 980 : 29}
                        maxVal={isMetric ? 1040 : 31}
                       />
              };
              break;
          case 'Precipitation':
              const precip = isMetric ? weather.precipitation : toInches(weather.precipitation);
              const precipUnit = isMetric ? 'mm' : 'in';
              const pop = weather.hourlyForecast[0]?.pop || 0;
              const precipData = weather.hourlyForecast.map(h => isMetric ? h.precipitation : toInches(h.precipitation));
              const hasPrecip = precipData.some(v => v > 0);
              
              data = {
                  title: 'Precipitation',
                  value: `${precip} ${precipUnit}`,
                  subValue: `${pop}% Chance`,
                  description: "Total accumulated water from rain, snow, or other sources in the last hour.",
                  icon: <Umbrella className="w-6 h-6"/>,
                  insights: [
                      { label: "Forecast", text: weather.precipitation > 0 ? "Precipitation is currently occurring." : `Chance of rain: ${pop}%.` },
                      { label: "Daily Total", text: `Expected ${isMetric ? weather.forecast[0].rainSum : toInches(weather.forecast[0].rainSum)} ${precipUnit} today.` }
                  ],
                  chart: hasPrecip ? (
                    <BarChart 
                        data={precipData} 
                        labels={hourlyLabels} 
                        color="#3b82f6" 
                        unit={precipUnit}
                    />
                  ) : (
                    <AreaChart 
                        data={weather.hourlyForecast.map(h => h.pop)} 
                        labels={hourlyLabels} 
                        color="#3b82f6" 
                        unit="%"
                        minVal={0}
                        maxVal={100}
                    />
                  )
              };
              break;
          case 'Air Quality':
              data = {
                  title: 'Air Quality',
                  value: weather.airQuality.split(' ')[0], 
                  subValue: weather.airQuality.split(' ').slice(1).join(' ').replace(/[()]/g, ''),
                  description: "US Air Quality Index (AQI). Measures air pollution levels.",
                  icon: <Activity className="w-6 h-6"/>,
                  insights: [
                      { label: "Health", text: "Based on PM2.5 and Ozone levels." },
                      { label: "Advice", text: parseInt(weather.airQuality) > 100 ? "Sensitive groups should reduce outdoor exertion." : "Air quality is satisfactory." }
                  ],
                  chart: weather.hourlyAqi && weather.hourlyAqi.length > 0 ? (
                      <AreaChart
                          data={weather.hourlyAqi}
                          labels={hourlyLabels}
                          color={parseInt(weather.airQuality) > 100 ? "#ef4444" : "#22c55e"}
                          unit=""
                          minVal={0}
                      />
                  ) : <div className="text-zinc-500 text-sm text-center py-4">Forecast data unavailable</div>
              };
              break;
          case 'Cloud Cover':
              data = {
                  title: 'Cloud Cover',
                  value: `${weather.cloudCover}%`,
                  description: "The fraction of the sky obscured by clouds when observed from a particular location.",
                  icon: <Cloud className="w-6 h-6"/>,
                  insights: [
                      { label: "Condition", text: weather.cloudCover > 80 ? "Overcast skies." : (weather.cloudCover < 20 ? "Mostly clear skies." : "Partly cloudy.") },
                      { label: "Solar Energy", text: weather.cloudCover > 60 ? "Reduced solar generation potential." : "High solar potential." }
                  ],
                  chart: <AreaChart 
                        data={weather.hourlyForecast.map(h => h.cloudCover)} 
                        labels={hourlyLabels} 
                        color="#9ca3af" 
                        unit="%" 
                        minVal={0} maxVal={100}
                       />
              };
              break;
          case 'Dew Point':
               const dp = isMetric ? weather.dewPoint : toF(weather.dewPoint);
               data = {
                   title: 'Dew Point',
                   value: `${dp}°`,
                   description: "The temperature to which air must be cooled to become saturated with water vapor.",
                   icon: <CloudDrizzle className="w-6 h-6"/>,
                   insights: [
                       { label: "Comfort", text: weather.dewPoint > 20 ? "Air feels oppressive." : (weather.dewPoint < 12 ? "Air feels comfortable/dry." : "Humid.") },
                       { label: "Fog Risk", text: Math.abs(weather.temperature - weather.dewPoint) < 2 ? "High risk of fog formation." : "Low risk of fog." }
                   ],
                   chart: <AreaChart 
                        data={weather.hourlyForecast.map(h => isMetric ? h.temp - 5 : toF(h.temp - 5))} 
                        labels={hourlyLabels} 
                        color="#2dd4bf" 
                        unit="°" 
                       />
               };
               break;
          case 'Sunrise':
          case 'Sunset':
              data = {
                  title: 'Sunrise & Sunset',
                  value: weather.sunrise,
                  subValue: `Sunset: ${weather.sunset}`,
                  description: "Times of appearance and disappearance of the Sun's upper limb.",
                  icon: <Sunrise className="w-6 h-6"/>,
                  insights: [
                      { label: "Day Length", text: "Calculated based on latitude and time of year." },
                      { label: "Golden Hour", text: "Best photography light ~1 hour after sunrise and before sunset." }
                  ],
                  chart: <SunCycle sunrise={weather.sunrise} sunset={weather.sunset} />
              };
              break;
          default:
              break;
      }
      setSelectedMetric(data);
  };

  const handleDailyClick = (day: DailyForecast) => {
      const isMetric = unit === 'C';
      const max = isMetric ? day.max : toF(day.max);
      const min = isMetric ? day.min : toF(day.min);
      const rain = isMetric ? day.rainSum : toInches(day.rainSum);
      const rainUnit = isMetric ? 'mm' : 'in';
      
      // Filter hourly data for this day. 
      // rawDate is YYYY-MM-DD. rawTime is ISO string.
      const dayHourly = weather.allHourly.filter(h => h.rawTime.startsWith(day.rawDate));
      
      const chart = dayHourly.length > 0 ? (
          <AreaChart 
              data={dayHourly.map(h => isMetric ? h.temp : toF(h.temp))} 
              labels={dayHourly.map(h => h.time)} 
              color="#f97316" 
              unit="°" 
          />
      ) : (
          <div className="text-zinc-500 text-sm text-center py-8">Hourly forecast not available for this date</div>
      );

      setSelectedMetric({
          title: day.fullDate,
          value: `${max}°`,
          subValue: `/ ${min}°`,
          description: `Forecast for ${day.date}: High of ${max}° and low of ${min}°. ${day.rainSum > 0 ? `Expected precipitation: ${rain} ${rainUnit}.` : 'No significant precipitation expected.'}`,
          icon: getWeatherIcon(day.code, "w-6 h-6"),
          insights: [
              { label: "Condition", text: mapWmoCode(day.code) },
              { label: "UV Index", text: `Max UV: ${day.uvIndex}` },
              { label: "Daylight", text: `Sunrise: ${day.sunrise} • Sunset: ${day.sunset}` }
          ],
          chart: chart
      });
  };

  const generatedDate = activeImage.generatedAt ? new Date(activeImage.generatedAt) : new Date();
  const timeSinceGeneration = new Date().getTime() - generatedDate.getTime();
  const isOutdated = timeSinceGeneration > 4 * 60 * 60 * 1000; 
  const formattedTime = generatedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isDraggingDown = dragOffset > 0;
  const scale = isDraggingDown ? Math.max(0.93, 1 - (dragOffset / (typeof window !== 'undefined' ? window.innerHeight * 1.5 : 1000))) : 1;
  const borderRadius = isDraggingDown ? `${Math.min(dragOffset / 5, 40)}px` : (isExpanded ? '0px' : '40px');

  // Calculate week min/max for the graph range
  const weekMax = Math.max(...weather.forecast.map(d => unit === 'C' ? d.max : toF(d.max)));
  const weekMin = Math.min(...weather.forecast.map(d => unit === 'C' ? d.min : toF(d.min)));
  const range = weekMax - weekMin || 1;

  return (
    <>
    {showFullImage && (
        <div 
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center animate-in fade-in duration-300"
            // Ensure clicking background DOES NOT close the view. Only Save closes it.
        >
            <button 
                className="absolute top-6 right-6 px-6 py-3 bg-zinc-100 hover:bg-white text-black rounded-full font-bold transition-all z-50 shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center gap-2 hover:scale-105 active:scale-95"
                onClick={(e) => { e.stopPropagation(); handleCloseFullImage(); }}
                title="Save & Close"
            >
                <Check className="w-5 h-5" />
                <span>Save</span>
            </button>
            
            {/* Interactive Pan/Zoom Image with updated multi-touch support */}
            <PanZoomImage 
                src={activeImage.url} 
                alt={`Full view of ${weather.city}`} 
                initialConfig={image.viewConfig}
                onTransformChange={setCurrentViewConfig}
            />
            
            {isEditing && (
                <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                    <Loader2 className="w-12 h-12 text-purple-400 animate-spin mb-4" />
                    <span className="text-white font-bold text-lg">Redrawing Scene...</span>
                </div>
            )}
            
            {/* Adjust Scene Popup Dialog */}
            {showAdjustInput ? (
                <div 
                    className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
                    onClick={(e) => { e.stopPropagation(); setShowAdjustInput(false); }}
                >
                    <div 
                        className="bg-zinc-900/90 border border-zinc-700 p-6 rounded-3xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                         <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                             <Sparkles className="w-5 h-5 text-purple-400" />
                             Adjust Scene
                         </h3>
                         <p className="text-sm text-zinc-400 mb-4">Describe what you want to change (e.g. "Add snow", "Make it night", "Add a dragon").</p>
                         
                         <textarea 
                             className="w-full bg-black/40 border border-zinc-700 rounded-xl p-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none h-24 mb-4 text-sm font-medium"
                             placeholder="Enter instructions..."
                             value={adjustPrompt}
                             onChange={(e) => setAdjustPrompt(e.target.value)}
                             autoFocus
                         />
                         
                         <div className="flex gap-3">
                             <button 
                                 onClick={() => setShowAdjustInput(false)}
                                 className="flex-1 py-2.5 rounded-full font-bold text-sm text-zinc-400 hover:bg-white/5 transition-colors"
                             >
                                 Cancel
                             </button>
                             <button 
                                 onClick={handleSubmitAdjust}
                                 className="flex-1 py-2.5 rounded-full font-bold text-sm bg-purple-600 text-white hover:bg-purple-500 transition-colors shadow-lg shadow-purple-900/20"
                             >
                                 Generate Preview
                             </button>
                         </div>
                    </div>
                </div>
            ) : (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 max-w-[90vw] pointer-events-auto flex items-center gap-2">
                    
                    {/* Wallpaper Button */}
                    <div className="relative group">
                        <button 
                            onClick={handleDownload}
                            className="p-3 bg-zinc-800/50 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-full transition-all hover:scale-105 active:scale-95 border border-transparent hover:border-white/10"
                            aria-label="Download Wallpaper"
                        >
                            <Download className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-6 bg-white/10 mx-1" />

                    {/* History Navigation - Only visible if history exists */}
                    {history.length > 1 && (
                        <div className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md rounded-full p-1.5 border border-white/10">
                            <button 
                                disabled={historyIndex === 0} 
                                onClick={() => setHistoryIndex(i => i-1)}
                                className="p-2 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors"
                            > 
                                <ChevronLeft className="w-5 h-5" /> 
                            </button>
                            <div className="w-px h-4 bg-white/10" />
                            <button 
                                disabled={historyIndex === history.length - 1} 
                                onClick={() => setHistoryIndex(i => i+1)}
                                className="p-2 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors"
                            > 
                                <ChevronRight className="w-5 h-5" /> 
                            </button>
                        </div>
                    )}

                    {/* Adjust Button */}
                    {onUpdateImage && (
                        <div className="relative group">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowAdjustInput(true); }}
                                className="flex items-center gap-2 px-5 py-3 bg-zinc-800/50 text-zinc-200 hover:bg-zinc-700 hover:text-white rounded-full transition-all hover:scale-105 active:scale-95 font-bold text-sm border border-transparent hover:border-white/10"
                            >
                                <Sparkles className="w-5 h-5 text-purple-400" />
                                <span>Adjust Scene</span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )}

    {showNewsModal && weather.fictionalNews && (
        <NewsModal newsItems={weather.fictionalNews} onClose={() => setShowNewsModal(false)} />
    )}

    <div 
        ref={scrollRef}
        style={{ 
            transform: dragOffset !== 0 ? `translateY(${dragOffset}px) scale(${scale})` : 'none',
            borderRadius: borderRadius,
            transition: (dragOffset === 0 || isDismissing) ? 'all 0.4s cubic-bezier(0.32, 0.72, 0, 1)' : 'none',
        }}
        className={`w-full bg-zinc-950 shadow-2xl overscroll-none
            ${isExpanded ? (dragOffset !== 0 ? 'h-full overflow-hidden' : 'h-full overflow-y-auto') : 'h-full overflow-hidden rounded-[2.5rem]'}
            ${isPreview ? 'rounded-none' : ''} 
        `}
        onScroll={handleScroll}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
    >
      <div className={`flex flex-col items-center min-h-full transition-all duration-500 ${isExpanded ? (isPreview ? 'pb-20 pt-4' : 'pb-0 pt-0') : 'pt-0 pb-0 justify-center h-full'}`}>
        
        {isExpanded && (
            <div className="absolute top-0 left-0 right-0 h-8 z-50 flex justify-center items-center pointer-events-none">
                 <div className="w-12 h-1.5 bg-white/20 rounded-full opacity-50 mix-blend-overlay"></div>
            </div>
        )}

        <div className={`w-full flex flex-col items-center justify-center relative transition-all duration-500 ${isExpanded ? 'min-h-[50dvh] p-4' : 'h-full p-0'}`}>
             
             <div className="absolute top-6 left-6 z-40 animate-in fade-in duration-500">
                {isExpanded && !isPreview && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onToggleExpand && onToggleExpand(); }}
                        className="bg-black/40 backdrop-blur-md px-3 py-2 rounded-full text-white/90 border border-white/10 shadow-lg flex items-center gap-2 hover:bg-black/60 transition-all hover:scale-105 active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="text-sm font-semibold pr-1">Return</span>
                    </button>
                )}
                {isExpanded && isPreview && (
                     <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            setIsDismissing(true);
                            setDragOffset(window.innerHeight);
                            setTimeout(() => onToggleExpand && onToggleExpand(), 300);
                        }}
                        className="bg-zinc-800/90 backdrop-blur-md px-4 py-2 rounded-full text-zinc-100 shadow-lg flex items-center gap-1 hover:bg-zinc-800 transition-all hover:scale-105 active:scale-95 font-semibold text-sm border border-zinc-700"
                    >
                        Cancel
                    </button>
                )}
             </div>

             <div className="absolute top-6 right-6 z-40 flex flex-col items-end gap-2 animate-in fade-in duration-500">
                {isExpanded && isPreview && onSave && (
                     <button 
                        onClick={(e) => { e.stopPropagation(); onSave(); }}
                        className="bg-blue-600 backdrop-blur-md px-4 py-2 rounded-full text-white shadow-lg flex items-center gap-1.5 hover:bg-blue-500 transition-all hover:scale-105 active:scale-95 font-bold text-sm ring-2 ring-blue-600/20"
                    >
                        <Plus className="w-4 h-4" />
                        Add
                    </button>
                )}
             </div>

             <div 
                onClick={(e) => {
                    if (isExpanded) {
                        e.stopPropagation();
                        setShowFullImage(true);
                    }
                }}
                className={`relative overflow-hidden bg-zinc-900 transition-all duration-700 ease-out group
                    ${isExpanded 
                        ? 'w-full max-w-[450px] aspect-[9/16] rounded-[2rem] shadow-2xl ring-4 ring-zinc-800 cursor-zoom-in active:scale-[0.98]' 
                        : 'h-full w-full rounded-none ring-0 active:scale-100 cursor-pointer'}
                `}
             >
                <div className="absolute inset-0 z-0 bg-zinc-900 overflow-hidden">
                    <img 
                        src={activeImage.url} 
                        alt={`Weather in ${weather.city}`} 
                        className={`w-full h-full transition-all duration-1000 ${loading ? 'scale-110 blur-sm grayscale-[30%]' : 'scale-100 blur-0'}`}
                        style={{
                            objectFit: 'cover',
                            transform: image.viewConfig ? `translate(${image.viewConfig.x}px, ${image.viewConfig.y}px) scale(${image.viewConfig.scale})` : 'none'
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none" />
                </div>

                {/* Top Section */}
                <div className="absolute top-0 left-0 right-0 pt-20 px-8 pb-8 z-10 text-white pointer-events-none">
                    <h1 className="text-4xl font-black tracking-tighter drop-shadow-lg leading-tight">{weather.nativeCity}</h1>
                    {weather.nativeCity !== weather.city && (
                        <p className="text-xl font-medium opacity-80 drop-shadow-md">{weather.city}</p>
                    )}
                    {/* Hide country/universe line for fictional cities if requested */}
                    {!weather.isFictional && (
                        <p className="text-sm font-medium opacity-90 drop-shadow-md mt-1">{weather.country}</p>
                    )}
                    <p className="text-sm font-medium opacity-80 drop-shadow-md mt-0.5">
                        {weather.isFictional ? weather.fictionalDate : weather.date}
                    </p>
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 p-8 z-10 text-white pointer-events-none">
                    {!loading && !isPreview && !weather.isFictional && (
                        <div 
                            className="inline-flex bg-black/40 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 shadow-sm items-center gap-1.5 cursor-help transition-colors hover:bg-black/60 mb-2 pointer-events-auto"
                            title="Image reflects weather conditions at generation time, not current local time."
                        >
                             <span className="text-[10px] font-medium text-white/90">{formattedTime}</span>
                             {isOutdated && <div className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                        </div>
                    )}

                    <div className="flex items-end justify-between">
                        <div>
                            <div className="text-6xl font-black tracking-tighter drop-shadow-xl leading-none">
                                {displayTemp}°{unit}
                            </div>
                            <div className="text-xl font-medium mt-2 drop-shadow-md flex items-center gap-2">
                                {weather.condition}
                            </div>
                        </div>
                    </div>
                </div>

                 {onRefresh && (
                     <div className="absolute bottom-8 right-8 z-20 pointer-events-auto animate-in fade-in duration-500">
                         <button 
                            onClick={(e) => { e.stopPropagation(); onRefresh(); }}
                            disabled={loading}
                            className={`bg-white/10 backdrop-blur-md p-3 rounded-full border border-white/10 shadow-lg text-white hover:bg-white/20 transition-all hover:scale-105 active:scale-95 ${loading ? 'cursor-wait opacity-50' : ''}`}
                            title="Refresh image and weather"
                        >
                             <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                )}
            </div>
            
            {isExpanded && !hasScrolledDown && (
                <div className="mt-8 flex justify-center animate-bounce opacity-40">
                    <ArrowDown className="w-5 h-5 text-white" />
                </div>
            )}
        </div>

        {isExpanded && (
            <div className="w-full max-w-[450px] px-4 z-10 space-y-4 animate-in slide-in-from-bottom-10 fade-in duration-500 pb-4">
                <div className="flex justify-between items-center px-1">
                    <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        {weather.isFictional ? (
                            <span className="text-purple-400 flex items-center gap-2"><FlaskConical className="w-4 h-4" /> Physical Simulation</span>
                        ) : (
                            "Live Forecast"
                        )}
                    </h2>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 flex items-center">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setUnit('C'); }}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${unit === 'C' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            °C
                        </button>
                        <div className="w-px h-3 bg-zinc-800 mx-0.5" />
                        <button 
                            onClick={(e) => { e.stopPropagation(); setUnit('F'); }}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${unit === 'F' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            °F
                        </button>
                    </div>
                </div>
                
                {/* Hourly Forecast */}
                <div className="bg-zinc-900/60 backdrop-blur-xl p-5 rounded-[2rem] shadow-lg border border-white/5 overflow-hidden">
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                        {weather.hourlyForecast.map((hour, i) => {
                            const temp = unit === 'F' ? toF(hour.temp) : hour.temp;
                            return (
                                <div key={i} className="flex flex-col items-center min-w-[3.5rem] gap-2 cursor-pointer hover:bg-white/5 rounded-2xl p-2 transition-all active:scale-95"
                                    onClick={() => setSelectedMetric({
                                        title: "Hourly Forecast",
                                        value: `${hour.time}`,
                                        subValue: `${temp}°`,
                                        description: `Conditions: ${hour.pop}% chance of rain.`,
                                        icon: getWeatherIcon(hour.code, "w-6 h-6"),
                                        insights: [
                                            { label: "Precipitation", text: `${hour.pop}% chance.` },
                                            { label: "Trend", text: "Hourly progression." }
                                        ],
                                        chart: <AreaChart 
                                            data={weather.hourlyForecast.map(h => unit === 'C' ? h.temp : toF(h.temp))} 
                                            labels={weather.hourlyForecast.map(h => h.time)} 
                                            color="#60a5fa" 
                                            unit="°" 
                                        />
                                    })}
                                >
                                    <span className="text-[10px] font-bold text-zinc-500 whitespace-nowrap uppercase tracking-wide">{hour.time}</span>
                                    {getWeatherIcon(hour.code, "w-6 h-6")}
                                    <span className="text-lg font-black text-zinc-200">{temp}°</span>
                                    <div className="text-[10px] font-bold text-blue-400 flex items-center bg-blue-500/10 px-1.5 py-0.5 rounded-md">
                                        <Droplets className="w-2 h-2 mr-0.5" />
                                        {hour.pop}%
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 7-Day Forecast with Range Graph */}
                <div className="bg-zinc-900/60 backdrop-blur-xl p-5 rounded-[2rem] shadow-lg border border-white/5">
                    <div className="space-y-1">
                        {weather.forecast.map((day, idx) => {
                            const isToday = idx === 0;
                            const max = unit === 'C' ? day.max : toF(day.max);
                            const min = unit === 'C' ? day.min : toF(day.min);
                            const rain = unit === 'C' ? day.rainSum : toInches(day.rainSum);
                            const rainUnit = unit === 'C' ? 'mm' : 'in';

                            // Range Bar Calc
                            const leftPct = ((min - weekMin) / range) * 100;
                            const widthPct = ((max - min) / range) * 100;
                            
                            return (
                                <div 
                                    key={idx} 
                                    className="flex items-center justify-between cursor-pointer hover:bg-white/5 p-3 rounded-2xl transition-colors group"
                                    onClick={() => handleDailyClick(day)}
                                >
                                    <div className={`w-16 text-sm font-bold ${isToday ? 'text-blue-400' : 'text-zinc-400'}`}>
                                        {isToday ? 'Today' : day.date}
                                    </div>
                                    <div className="w-8 flex justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                                         {getWeatherIcon(day.code, "w-5 h-5")}
                                    </div>
                                    <div className="flex-1 px-4 flex items-center gap-3">
                                         <span className="text-xs font-bold text-zinc-500 w-6 text-right">{min}°</span>
                                         <div className="flex-1 h-1.5 bg-zinc-800 rounded-full relative overflow-hidden">
                                             <div 
                                                className="absolute top-0 bottom-0 bg-gradient-to-r from-blue-500 to-orange-400 rounded-full opacity-80" 
                                                style={{ left: `${leftPct}%`, width: `${widthPct}%` }} 
                                             />
                                         </div>
                                         <span className="text-xs font-bold text-zinc-200 w-6">{max}°</span>
                                    </div>
                                    
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {/* CUSTOM LORE METRICS */}
                    {weather.customMetrics?.map((metric, idx) => (
                        <div key={idx} className="bg-purple-900/20 backdrop-blur-xl p-5 rounded-[2rem] shadow-lg border border-purple-500/20 col-span-1 group hover:border-purple-500/40 transition-all">
                             <div className="flex items-center gap-2 mb-3 text-purple-400 text-[10px] font-bold uppercase tracking-widest">
                                <Zap className="w-3.5 h-3.5" /> {metric.label}
                            </div>
                            <p className="text-sm font-bold text-zinc-200 mb-1 leading-snug">{metric.value}</p>
                            <p className="text-[10px] text-zinc-500 font-medium mt-2">Unique to this world</p>
                        </div>
                    ))}

                    {/* FICTIONAL NEWS TICKER */}
                    {weather.isFictional && weather.fictionalNews && weather.fictionalNews.length > 0 && (
                        <div 
                            className="bg-blue-900/20 backdrop-blur-xl p-5 rounded-[2rem] shadow-lg border border-blue-500/20 col-span-2 group cursor-pointer hover:bg-blue-900/30 transition-all"
                            onClick={() => setShowNewsModal(true)}
                        >
                             <div className="flex items-center gap-2 mb-3 text-blue-400 text-xs font-bold uppercase tracking-widest">
                                <Newspaper className="w-3.5 h-3.5" /> World Events
                            </div>
                            <p className="text-sm font-bold text-zinc-200 mb-1 leading-tight">{weather.fictionalNews[0].headline}</p>
                            {/* Shorten content for card view */}
                            <p className="text-xs text-zinc-400 font-medium mt-1 line-clamp-2">{weather.fictionalNews[0].content}</p>
                            <div className="mt-4 text-[10px] text-blue-400 font-bold uppercase tracking-wide flex items-center gap-1">
                                Read Full Story <ArrowRight className="w-3 h-3" />
                            </div>
                        </div>
                    )}

                    <div onClick={() => openDetail("Feels Like")}
                        className="bg-zinc-900/60 backdrop-blur-xl p-5 rounded-[2rem] shadow-lg border border-white/5 cursor-pointer hover:border-white/10 active:scale-[0.98] transition-all group">
                        <div className="flex items-center gap-2 mb-3 text-zinc-500 text-xs font-bold uppercase tracking-widest group-hover:text-zinc-400 transition-colors">
                            <Thermometer className="w-3.5 h-3.5" /> Feels Like
                        </div>
                        <p className="text-2xl font-black text-zinc-100 mb-1">{unit === 'F' ? toF(weather.feelsLike) : weather.feelsLike}°</p>
                        <p className="text-xs text-zinc-400 font-medium leading-relaxed">{getBriefSummary('Feels Like', weather.feelsLike)}</p>
                    </div>

                    <div onClick={() => openDetail("Humidity")}
                        className="bg-zinc-900/60 backdrop-blur-xl p-5 rounded-[2rem] shadow-lg border border-white/5 cursor-pointer hover:border-white/10 active:scale-[0.98] transition-all group">
                        <div className="flex items-center gap-2 mb-3 text-zinc-500 text-xs font-bold uppercase tracking-widest group-hover:text-zinc-400 transition-colors">
                            <Droplets className="w-3.5 h-3.5" /> Humidity
                        </div>
                        <p className="text-2xl font-black text-zinc-100 mb-1">{weather.humidity}%</p>
                        <p className="text-xs text-zinc-400 font-medium leading-relaxed">{getBriefSummary('Humidity', weather.humidity)}</p>
                    </div>

                    <div onClick={() => openDetail("UV Index")}
                        className="bg-zinc-900/60 backdrop-blur-xl p-5 rounded-[2rem] shadow-lg border border-white/5 cursor-pointer hover:border-white/10 active:scale-[0.98] transition-all group">
                        <div className="flex items-center gap-2 mb-3 text-zinc-500 text-xs font-bold uppercase tracking-widest group-hover:text-zinc-400 transition-colors">
                            <Sun className="w-3.5 h-3.5" /> UV Index
                        </div>
                        <p className="text-2xl font-black text-zinc-100 mb-1">{weather.uvIndex}</p>
                        <p className="text-xs text-zinc-400 font-medium leading-relaxed">{getBriefSummary('UV Index', weather.uvIndex)}</p>
                        <div className="w-full h-1 bg-zinc-800 rounded-full mt-3 overflow-hidden opacity-50 group-hover:opacity-100 transition-opacity">
                            <div className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500" style={{ width: `${Math.min((weather.uvIndex / 11) * 100, 100)}%` }} />
                        </div>
                    </div>

                    <div onClick={() => openDetail("Visibility")}
                        className="bg-zinc-900/60 backdrop-blur-xl p-5 rounded-[2rem] shadow-lg border border-white/5 cursor-pointer hover:border-white/10 active:scale-[0.98] transition-all group">
                        <div className="flex items-center gap-2 mb-3 text-zinc-500 text-xs font-bold uppercase tracking-widest group-hover:text-zinc-400 transition-colors">
                            <Eye className="w-3.5 h-3.5" /> Visibility
                        </div>
                        <p className="text-2xl font-black text-zinc-100 mb-1">
                             {unit === 'F' ? toMiles(weather.visibility) : weather.visibility} 
                             <span className="text-sm font-bold text-zinc-500 ml-1">{unit === 'F' ? 'mi' : 'km'}</span>
                        </p>
                         <p className="text-xs text-zinc-400 font-medium leading-relaxed">{getBriefSummary('Visibility', weather.visibility)}</p>
                    </div>

                    <div onClick={() => openDetail("Precipitation")}
                        className="bg-zinc-900/60 backdrop-blur-xl p-5 rounded-[2rem] shadow-lg border border-white/5 cursor-pointer hover:border-white/10 active:scale-[0.98] transition-all group">
                        <div className="flex items-center gap-2 mb-3 text-zinc-500 text-xs font-bold uppercase tracking-widest group-hover:text-zinc-400 transition-colors">
                            <Umbrella className="w-3.5 h-3.5" /> Precip
                        </div>
                        <p className="text-2xl font-black text-zinc-100 mb-1">
                            {unit === 'F' ? toInches(weather.precipitation) : weather.precipitation}
                            <span className="text-sm font-bold text-zinc-500 ml-1">{unit === 'F' ? 'in' : 'mm'}</span>
                        </p>
                        <p className="text-xs text-zinc-400 font-medium leading-relaxed">{getBriefSummary('Precipitation', weather.precipitation)}</p>
                    </div>

                    <div onClick={() => openDetail("Cloud Cover")}
                        className="bg-zinc-900/60 backdrop-blur-xl p-5 rounded-[2rem] shadow-lg border border-white/5 cursor-pointer hover:border-white/10 active:scale-[0.98] transition-all group">
                        <div className="flex items-center gap-2 mb-3 text-zinc-500 text-xs font-bold uppercase tracking-widest group-hover:text-zinc-400 transition-colors">
                            <Cloud className="w-3.5 h-3.5" /> Clouds
                        </div>
                        <p className="text-2xl font-black text-zinc-100 mb-1">{weather.cloudCover}%</p>
                        <p className="text-xs text-zinc-400 font-medium leading-relaxed">{getBriefSummary('Cloud Cover', weather.cloudCover)}</p>
                    </div>

                     <div onClick={() => openDetail("Pressure")}
                        className="bg-zinc-900/60 backdrop-blur-xl p-5 rounded-[2rem] shadow-lg border border-white/5 cursor-pointer hover:border-white/10 active:scale-[0.98] transition-all group">
                        <div className="flex items-center gap-2 mb-3 text-zinc-500 text-xs font-bold uppercase tracking-widest group-hover:text-zinc-400 transition-colors">
                            <Gauge className="w-3.5 h-3.5" /> Pressure
                        </div>
                        <p className="text-2xl font-black text-zinc-100 mb-1">
                             {unit === 'F' ? toInHg(weather.pressure) : weather.pressure}
                             <span className="text-sm font-bold text-zinc-500 ml-1">{unit === 'F' ? 'inHg' : 'hPa'}</span>
                        </p>
                        <p className="text-xs text-zinc-400 font-medium leading-relaxed">{getBriefSummary('Pressure', weather.pressure)}</p>
                    </div>

                     <div onClick={() => openDetail("Dew Point")}
                        className="bg-zinc-900/60 backdrop-blur-xl p-5 rounded-[2rem] shadow-lg border border-white/5 cursor-pointer hover:border-white/10 active:scale-[0.98] transition-all group">
                        <div className="flex items-center gap-2 mb-3 text-zinc-500 text-xs font-bold uppercase tracking-widest group-hover:text-zinc-400 transition-colors">
                            <CloudDrizzle className="w-3.5 h-3.5" /> Dew Point
                        </div>
                        <p className="text-2xl font-black text-zinc-100 mb-1">{unit === 'F' ? toF(weather.dewPoint) : weather.dewPoint}°</p>
                        <p className="text-xs text-zinc-400 font-medium leading-relaxed">{getBriefSummary('Dew Point', weather.dewPoint)}</p>
                    </div>

                    <div onClick={() => openDetail("Wind")}
                        className="bg-zinc-900/60 backdrop-blur-xl p-5 rounded-[2rem] shadow-lg border border-white/5 col-span-2 cursor-pointer hover:border-white/10 active:scale-[0.98] transition-all group relative overflow-hidden">
                        <div className="relative z-10 flex justify-between items-start pr-16">
                            <div>
                                <div className="flex items-center gap-2 mb-3 text-zinc-500 text-xs font-bold uppercase tracking-widest group-hover:text-zinc-400 transition-colors">
                                    <Wind className="w-3.5 h-3.5" /> Wind
                                </div>
                                <div className="flex items-baseline gap-2 mb-1">
                                    <p className="text-2xl font-black text-zinc-100">
                                        {unit === 'F' ? toMph(weather.windSpeed) : weather.windSpeed} 
                                        <span className="text-sm font-bold text-zinc-500 ml-1">{unit === 'F' ? 'mph' : 'km/h'}</span>
                                    </p>
                                    <span className="text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">{weather.windDirection}</span>
                                </div>
                                <p className="text-xs text-zinc-400 font-medium leading-relaxed">{getBriefSummary('Wind', weather.windSpeed)}</p>
                            </div>
                            
                            {/* Visual Compass */}
                            <div className="absolute right-0 top-0 w-20 h-20 opacity-30 group-hover:opacity-100 transition-opacity">
                                <div className="relative w-full h-full flex items-center justify-center border-2 border-zinc-700/50 rounded-full bg-zinc-900/50 backdrop-blur-sm">
                                    <span className="absolute top-1.5 text-[8px] font-black text-zinc-500">N</span>
                                    <span className="absolute bottom-1.5 text-[8px] font-black text-zinc-500">S</span>
                                    <span className="absolute left-1.5 text-[8px] font-black text-zinc-500">W</span>
                                    <span className="absolute right-1.5 text-[8px] font-black text-zinc-500">E</span>
                                    <div 
                                        className="w-0.5 h-14 bg-transparent absolute"
                                        style={{ transform: `rotate(${weather.windDirectionDeg}deg)` }}
                                    >
                                        {/* Needle */}
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[8px] border-b-red-500 transform rotate-180 origin-center" style={{ marginTop: '-2px'}} />
                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[8px] border-b-zinc-400" style={{ marginBottom: '-2px'}} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div onClick={() => openDetail("Air Quality")}
                        className="bg-zinc-900/60 backdrop-blur-xl p-5 rounded-[2rem] shadow-lg border border-white/5 col-span-2 cursor-pointer hover:border-white/10 active:scale-[0.98] transition-all group">
                        <div className="flex items-center gap-2 mb-3 text-zinc-500 text-xs font-bold uppercase tracking-widest group-hover:text-zinc-400 transition-colors">
                            <Activity className="w-3.5 h-3.5" /> Air Quality
                        </div>
                        <p className="text-2xl font-black text-zinc-100 mb-1">{weather.airQuality}</p>
                        <p className="text-xs text-zinc-400 font-medium leading-relaxed">{getBriefSummary('Air Quality', 0)}</p>
                    </div>
                    
                    <div className="bg-zinc-900/60 backdrop-blur-xl p-5 rounded-[2rem] shadow-lg border border-white/5 col-span-2 flex justify-between">
                        <div className="cursor-pointer flex-1 pr-6 border-r border-white/5" onClick={() => openDetail("Sunrise")}>
                            <div className="flex items-center gap-2 mb-2 text-zinc-500 text-xs font-bold uppercase tracking-widest group-hover:text-zinc-400 transition-colors">
                                <Sunrise className="w-3.5 h-3.5 text-orange-400" /> Sunrise
                            </div>
                            <p className="text-xl font-black text-zinc-100">{weather.sunrise}</p>
                        </div>
                        <div className="cursor-pointer flex-1 pl-6" onClick={() => openDetail("Sunset")}>
                            <div className="flex items-center gap-2 mb-2 text-zinc-500 text-xs font-bold uppercase tracking-widest group-hover:text-zinc-400 transition-colors">
                                <Sunset className="w-3.5 h-3.5 text-indigo-400" /> Sunset
                            </div>
                            <p className="text-xl font-black text-zinc-100">{weather.sunset}</p>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>

      {selectedMetric && (
          <DetailModal 
            title={selectedMetric.title}
            value={selectedMetric.value}
            subValue={selectedMetric.subValue}
            description={selectedMetric.description}
            icon={selectedMetric.icon}
            insights={selectedMetric.insights}
            chart={selectedMetric.chart}
            onClose={() => setSelectedMetric(null)}
            isFictional={weather.isFictional}
          />
      )}
    </div>
    </>
  );
};

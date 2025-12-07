
import React, { useState, useRef, useEffect } from 'react';
import { SearchInput } from './components/SearchInput';
import { WeatherCard } from './components/WeatherCard';
import { EditInput } from './components/EditInput';
import { LoadingScreen } from './components/LoadingScreen';
import { FantasyCreator } from './components/FantasyCreator';
import { generateWeatherScene, getCityNativeName, generateHomeBackground, generateFantasyScene, generateCreativeWeatherData, regenerateFantasyScene } from './services/geminiService';
import { getWeatherData } from './services/weatherService';
import { AppState, WeatherCardData, LocationData, FantasyConfig, ViewConfig, GeneratedImage } from './types';
import { AlertCircle, Sparkles, Wand2, X } from 'lucide-react';

const SWIPE_THRESHOLD = 100;
const DRAG_THRESHOLD = 5; // Pixels to move before considering it a drag

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [savedCards, setSavedCards] = useState<WeatherCardData[]>([]);
  const [homeBg, setHomeBg] = useState<string | null>(null);
  
  // --- INFINITE STACK STATE ---
  // Unbounded integer
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Gesture State
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number | null>(null);
  
  // Layout Metrics (Dynamic)
  const [screenWidth, setScreenWidth] = useState(375);

  // Previews & Editing
  const [previewCard, setPreviewCard] = useState<WeatherCardData | null>(null);
  const [previewDragOffset, setPreviewDragOffset] = useState(0); // Track drag to animate search bar
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [refreshingCardId, setRefreshingCardId] = useState<string | null>(null);
  
  const [showFantasy, setShowFantasy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const updateWidth = () => setScreenWidth(window.innerWidth);
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // --- BACKGROUND GENERATION ---
  useEffect(() => {
    // Updated key to v2 to force refresh with new prompt style
    const cachedBg = localStorage.getItem('iso_home_bg_v2');
    if (cachedBg) {
        setHomeBg(cachedBg);
    } else {
        generateHomeBackground().then(bg => {
            if (bg) {
                setHomeBg(bg);
                localStorage.setItem('iso_home_bg_v2', bg);
            }
        });
    }
  }, []);

  // --- INFINITE DATA HELPERS ---
  const getCardData = (index: number) => {
      if (savedCards.length === 0) return null;
      // Euclidean Modulo to handle negative indices correctly
      const wrappedIndex = ((index % savedCards.length) + savedCards.length) % savedCards.length;
      return savedCards[wrappedIndex];
  };

  // --- GESTURE HANDLERS ---
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (expandedCardId || previewCard || savedCards.length === 0) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    dragStartX.current = clientX;
    // Do NOT set isDragging to true yet. Wait for movement.
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (dragStartX.current === null || expandedCardId || previewCard) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const delta = clientX - dragStartX.current;
    
    // Only start visual dragging if moved beyond threshold
    if (!isDragging && Math.abs(delta) > DRAG_THRESHOLD) {
        setIsDragging(true);
    }

    if (isDragging) {
        setDragX(delta);
    }
  };

  const handleTouchEnd = () => {
    if (dragStartX.current === null) return;
    
    // Snap Logic only if we were actually dragging
    if (isDragging) {
        if (Math.abs(dragX) > SWIPE_THRESHOLD) {
          if (dragX > 0) {
            // Swipe Right -> Go to Previous
            setActiveIndex(prev => prev - 1);
          } else {
            // Swipe Left -> Go to Next
            setActiveIndex(prev => prev + 1);
          }
        }
    }
    
    // Reset
    setDragX(0);
    dragStartX.current = null;
    setIsDragging(false);
  };

  // --- LAYOUT ENGINE (ASYMMETRICAL) ---
  const getCardStyle = (relativeOffset: number) => {
    const cardWidth = Math.min(340, screenWidth * 0.9);
    
    // progress: normalized visual shift based on drag
    // If dragging right (+dragX), we are pulling the prev card in.
    const progress = relativeOffset + (dragX / screenWidth);

    let x = 0;
    let scale = 1;
    let opacity = 1;
    let zIndex = 50;

    // --- LEFT SIDE (Past / Discarded) ---
    // Parked just off screen with a peek
    const peekAmount = 20;
    const parkX = -(screenWidth / 2) - (cardWidth / 2) + peekAmount;

    if (progress < 0) {
        // Moving towards Left Park
        x = progress * Math.abs(parkX);
        scale = 1 + (Math.max(progress, -1) * 0.05); // Subtle scale difference
        
        // Ensure discarded card stays visually ON TOP of the stack while animating out
        // We use a high base Z-Index that increases with distance to ensure strict layering
        zIndex = 200 + Math.round(Math.abs(progress) * 10); 
        
        // FADE OUT LOGIC:
        // Relaxed fade for smoother exit logic to prevent early disappearance
        if (progress < -0.2) {
             opacity = Math.max(0, 1 - (Math.abs(progress) - 0.2) * 1.5);
        }
    } else {
        // --- RIGHT SIDE (Future / Stack) ---
        // Stacked behind center, offset by 20px
        x = progress * 20; // Tighter stack
        scale = 1 - (progress * 0.05);
        zIndex = 100 - Math.ceil(progress);
        
        // Fade in the card entering at the bottom of the stack
        // Stack limit is around 3 visual cards.
        // offset 3 -> opacity 1. offset 4 -> opacity 0.
        if (progress > 3) {
            opacity = Math.max(0, 1 - (progress - 3));
        }
    }

    // Safety clamps
    scale = Math.max(0.5, scale);

    return {
        // VERTICAL CENTERING: 
        // top: 50% puts the top edge in the middle.
        // translateY(-50%) shifts it up by half its height, centering it perfectly relative to the parent content box.
        top: '50%',
        transform: `translate3d(${x}px, -50%, 0) scale(${scale})`,
        zIndex,
        opacity,
        // Disable transition during drag for responsiveness, enable for snap
        transition: isDragging ? 'none' : 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1.0), opacity 0.4s ease-out'
    };
  };

  // --- ACTIONS ---

  const handleSearch = async (location: LocationData) => {
    // Always show loading state first for feedback
    setState(AppState.FETCHING_WEATHER);
    setErrorMsg("");
    setIsScrolled(false);
    setPreviewCard(null);
    setPreviewDragOffset(0);

    // Check duplicates based on ID
    const existingIndex = savedCards.findIndex(c => c.weather.location.id === location.id);
    if (existingIndex !== -1) {
      // Show loading for a moment then switch
      setTimeout(() => {
        const currentMod = ((activeIndex % savedCards.length) + savedCards.length) % savedCards.length;
        const diff = existingIndex - currentMod;
        setActiveIndex(prev => prev + diff);
        setExpandedCardId(savedCards[existingIndex].weather.id);
        setState(AppState.IDLE);
      }, 1000);
      return;
    }

    try {
      const weatherData = await getWeatherData(location);
      setState(AppState.GENERATING_IMAGE);
      
      const [generatedImage, nativeName] = await Promise.all([
        generateWeatherScene(weatherData),
        getCityNativeName(weatherData.city, weatherData.country)
      ]);
      
      const completeWeatherData = { ...weatherData, nativeCity: nativeName };
      
      setPreviewCard({
          weather: completeWeatherData,
          image: generatedImage
      });
      setState(AppState.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Something went wrong.");
      setState(AppState.ERROR);
    }
  };

  const handleFantasyCreate = async (config: FantasyConfig) => {
      setState(AppState.GENERATING_IMAGE);
      setErrorMsg("");
      setShowFantasy(false); // Close modal
      
      try {
          // Generate Creative Weather Data (Async AI) + Image Parallel
          const [weatherData, image] = await Promise.all([
              generateCreativeWeatherData(config),
              generateFantasyScene(config)
          ]);
          
          const newCard: WeatherCardData = {
              weather: weatherData,
              image: image
          };
          
          setPreviewCard(newCard);
          setState(AppState.SUCCESS);
      } catch (err: any) {
          console.error(err);
          setErrorMsg("Failed to construct fantasy world. The simulation grid may be unstable.");
          setState(AppState.ERROR);
      }
  };

  const handleRefresh = async (card: WeatherCardData) => {
    if (refreshingCardId) return;
    setRefreshingCardId(card.weather.id);
    try {
        if (card.weather.isFictional) {
             // Use the regeneration function which uses the persisted config
             const updatedImage = await regenerateFantasyScene(card.weather);
             const updatedCard = { ...card, image: updatedImage };
             if (previewCard?.weather.id === card.weather.id) {
                setPreviewCard(updatedCard);
             } else {
                setSavedCards(prev => prev.map(c => c.weather.id === card.weather.id ? updatedCard : c));
             }
        } else {
            // Real refresh
            const weatherData = await getWeatherData(card.weather.location);
            const [generatedImage, nativeName] = await Promise.all([
                generateWeatherScene(weatherData),
                getCityNativeName(weatherData.city, weatherData.country)
            ]);
            const updatedCard = { weather: { ...weatherData, nativeCity: nativeName }, image: generatedImage };

            if (previewCard?.weather.id === card.weather.id) {
                setPreviewCard(updatedCard);
            } else {
                setSavedCards(prev => prev.map(c => c.weather.id === card.weather.id ? updatedCard : c));
            }
        }
    } catch (err: any) {
      console.error(err);
    } finally {
      setRefreshingCardId(null);
    }
  };

  const handleRemoveCard = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSavedCards(prev => {
        const newCards = prev.filter(c => c.weather.id !== id);
        if (newCards.length === 0) {
            setState(AppState.IDLE);
            setActiveIndex(0);
        }
        return newCards;
    });
  };

  const handleImageUpdate = (newImage: GeneratedImage) => {
      let targetCard = previewCard;
      if (!targetCard && expandedCardId) {
          targetCard = savedCards.find(c => c.weather.id === expandedCardId) || null;
      }
      if (!targetCard) return;

      const updatedCard = { ...targetCard, image: newImage };
      if (previewCard) {
          setPreviewCard(updatedCard);
      } else if (expandedCardId) {
          setSavedCards(savedCards.map(c => c.weather.id === expandedCardId ? updatedCard : c));
      }
  };

  const handleUpdateView = (viewConfig: ViewConfig) => {
      let targetCard = previewCard;
      if (!targetCard && expandedCardId) {
          targetCard = savedCards.find(c => c.weather.id === expandedCardId) || null;
      }
      if (!targetCard) return;

      const updatedCard = { 
          ...targetCard, 
          image: { 
              ...targetCard.image, 
              viewConfig 
          } 
      };

      if (previewCard) {
          setPreviewCard(updatedCard);
      } else if (expandedCardId) {
          setSavedCards(savedCards.map(c => c.weather.id === expandedCardId ? updatedCard : c));
      }
  };

  const handleSavePreview = () => {
      if (previewCard) {
          setSavedCards(prev => [...prev, previewCard]);
          setActiveIndex(savedCards.length); 
          setPreviewCard(null);
          setPreviewDragOffset(0);
          setIsScrolled(false); // Reset scroll state
          setState(AppState.IDLE); // Reset state to IDLE on save to normalize UI
      }
  };

  const expandedCard = savedCards.find(c => c.weather.id === expandedCardId);

  // Calculate search bar visibility during preview drag
  // 0px drag = 0 opacity/hidden. 50px drag = 1 opacity/visible (accelerated reveal).
  const searchBarProgress = previewCard ? Math.min(Math.max(previewDragOffset, 0) / 50, 1) : 1;
  const searchBarStyle = previewCard ? {
      transform: `translateY(${-100 + (searchBarProgress * 100)}%)`,
      opacity: searchBarProgress,
      pointerEvents: searchBarProgress > 0.8 ? 'auto' : 'none'
  } as React.CSSProperties : {};

  // Determine if we are in "Welcome" state
  const isWelcome = state === AppState.IDLE && savedCards.length === 0;

  return (
    <main className="relative w-full h-full bg-zinc-950 flex flex-col overflow-hidden select-none text-zinc-50">
      
      {/* --- BACKGROUND LAYER --- */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-zinc-950">
         
         {/* Generated Background Layer - Static */}
         {homeBg && (
             <div className="absolute inset-0 z-0 animate-in fade-in duration-1000 overflow-hidden">
                 <div className="absolute inset-0">
                    <img src={homeBg} alt="Background" className="w-full h-full object-cover opacity-60" />
                 </div>
                 
                 {/* Atmosphere Overlay (Glassy) */}
                 <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-zinc-950/40 to-black/70 backdrop-blur-[1px]" />
             </div>
         )}

         {/* Fallback/Base Gradient (Visible if homeBg is null, or blend behind) */}
         <div className={`absolute inset-0 bg-zinc-950 transition-opacity duration-1000 ${homeBg ? 'opacity-0' : 'opacity-100'}`} />
         
         {/* Tech/Grid Pattern (Persistent) */}
         <div 
            className="absolute inset-0 opacity-[0.4]"
            style={{ 
                backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1.5px, transparent 1.5px)', 
                backgroundSize: '32px 32px' 
            }}
         />
      </div>

      {/* Global Loading Overlay (Covers Search Bar) */}
      {(state === AppState.FETCHING_WEATHER || state === AppState.GENERATING_IMAGE) && (
        <LoadingScreen message={state === AppState.FETCHING_WEATHER ? "Processing location data..." : "Constructing simulation..."} />
      )}

      {/* Search & Header */}
      {/* 
         Fixed positioning to ensure it stays anchored on screen regardless of Safari UI.
         Z-Index 500 to stay well above the 3D stack.
         top-8 to move higher (requested by user).
      */}
      <div 
        className={`fixed left-0 right-0 z-[500] flex items-center justify-center gap-2 px-4 pointer-events-none transform-gpu transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${isWelcome 
            ? 'top-[40%] -translate-y-1/2 flex-col' 
            : 'top-8' 
          }
          ${expandedCardId 
            ? '-translate-y-[150%] opacity-0' 
            : isWelcome
                ? '' // Welcome state handles its own positioning
                : previewCard 
                    ? '' // Preview handles positioning via inline style
                    : 'translate-y-0 opacity-100' // Stack view default
          }
        `}
        style={searchBarStyle}
      >
        {isWelcome && (
          <div className="text-center mb-8 animate-in fade-in zoom-in duration-700 pointer-events-auto">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500 tracking-tighter mb-3 drop-shadow-sm flex items-center justify-center gap-4">
                IsoWeather
                <div className="relative group animate-pulse">
                    <Sparkles className="w-8 h-8 text-blue-400" />
                </div>
            </h1>
          </div>
        )}
        
        {/* Search Container - Pointer events auto enabled for interaction */}
        <div className={`flex items-center gap-2 w-full max-w-md pointer-events-auto ${isWelcome ? 'w-full' : ''}`}>
            <SearchInput 
                onSearch={handleSearch} 
                disabled={state !== AppState.IDLE && state !== AppState.SUCCESS}
                minimized={(!isWelcome) && isScrolled && !!previewCard}
            />
            
            {/* Create Fantasy World Button */}
            {(!isScrolled || !previewCard) && (
                <button 
                    onClick={() => setShowFantasy(true)}
                    className="p-3 bg-zinc-900/90 backdrop-blur-md border border-zinc-700 rounded-full text-purple-400 hover:text-white hover:bg-purple-600 transition-all hover:scale-105 active:scale-95 shadow-lg flex-shrink-0 group relative"
                    title="Create Fictional World"
                >
                    <Wand2 className="w-5 h-5" />
                    <span className="absolute top-0 right-0 w-2 h-2 bg-purple-500 rounded-full animate-pulse border border-black"></span>
                </button>
            )}
        </div>
        {/* Card indicator removed here */}
      </div>

      {/* Main Content / Stack Container */}
      {/* pt-24 (96px) ensures stack is centered properly given the top-8 search bar */}
      <div className="flex-1 relative z-10 w-full flex items-center justify-center pt-24 pb-4">
        
        {state === AppState.ERROR && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-zinc-900/80 backdrop-blur px-4 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <h3 className="text-lg font-bold text-zinc-100">Oops!</h3>
            <p className="text-zinc-400 max-w-xs mb-6">{errorMsg}</p>
            <button onClick={() => setState(AppState.IDLE)} className="text-sm text-blue-400 font-semibold hover:underline">
                Try another city
            </button>
          </div>
        )}

        {/* --- INFINITE ASYMMETRICAL CARD STACK --- */}
        {savedCards.length > 0 && !expandedCardId && (
           <div 
                className={`relative w-full h-full flex items-center justify-center touch-pan-y transition-all duration-500 ${previewCard ? 'translate-y-[-100%] opacity-0' : ''}`}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleTouchStart}
                onMouseMove={handleTouchMove}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
           >
                {/* 
                  Render Window: Extended range to allow smooth transitions.
                */}
                {[-2, -1, 0, 1, 2, 3, 4].map((offset) => {
                    const activeLength = savedCards.length;
                    const visibleStackLimit = Math.min(activeLength, 3);
                    if (offset > 0 && offset >= visibleStackLimit) return null;
                    if (activeLength === 1 && offset !== 0) return null;

                    const absoluteIndex = activeIndex + offset;
                    const cardData = getCardData(absoluteIndex);
                    
                    if (!cardData) return null;

                    const style = getCardStyle(offset);
                    const isCenter = offset === 0;

                    return (
                        <div 
                            key={absoluteIndex}
                            className="absolute w-[85vw] max-w-[340px] aspect-[9/16] will-change-transform"
                            style={style}
                        >
                             <div 
                                className={`w-full h-full relative rounded-[2.5rem] border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden group ${isCenter ? 'cursor-pointer' : ''}`}
                                onClick={() => {
                                    // Robust Click Handling:
                                    // Only trigger if we haven't dragged significantly.
                                    if (isCenter && !isDragging) {
                                        setExpandedCardId(cardData.weather.id);
                                    } else if (!isCenter && !isDragging) {
                                        setActiveIndex(prev => prev + offset);
                                    }
                                }}
                            >
                                 <WeatherCard 
                                    weather={cardData.weather} 
                                    image={cardData.image} 
                                    loading={refreshingCardId === cardData.weather.id}
                                    isExpanded={false}
                                    isStackItem={true}
                                    onRefresh={() => handleRefresh(cardData)}
                                    isPreview={false}
                                 />
                                 
                                 {/* Remove Button */}
                                 {isCenter && (
                                     <button 
                                        onClick={(e) => handleRemoveCard(e, cardData.weather.id)}
                                        className="absolute top-5 right-5 z-50 p-2.5 bg-black/40 hover:bg-red-500 text-white rounded-full backdrop-blur-md border border-white/10 transition-all hover:scale-110 active:scale-95 shadow-lg group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 opacity-100"
                                        title="Remove card"
                                     >
                                         <X className="w-5 h-5" />
                                     </button>
                                 )}

                                 {/* Darken non-center cards */}
                                 {!isCenter && (
                                    <div className="absolute inset-0 bg-black/40 rounded-[2.5rem] pointer-events-none transition-opacity duration-300" />
                                 )}
                            </div>
                        </div>
                    );
                })}
           </div>
        )}

      </div>

      {/* Expanded & Preview Overlays (Root Level for Full Screen Coverage) */}
      
      {expandedCardId && expandedCard && (
           <div className="fixed inset-0 z-50 bg-transparent animate-in zoom-in-95 duration-300 origin-center">
               <WeatherCard 
                   weather={expandedCard.weather} 
                   image={expandedCard.image} 
                   loading={refreshingCardId === expandedCard.weather.id}
                   isExpanded={true}
                   onToggleExpand={() => {
                        setExpandedCardId(null);
                        setIsScrolled(false); // Reset scroll state when closing
                   }}
                   onUpdateImage={handleImageUpdate}
                   onRefresh={() => handleRefresh(expandedCard)}
                   onScroll={setIsScrolled}
                   onUpdateView={handleUpdateView}
                   isPreview={false}
               />
           </div>
      )}

      {previewCard && (
          // Fixed inset-0 covers EVERYTHING (z-[70] > z-[60] search bar)
          // No background on wrapper so we can see search bar reveal when dragging down
          <div className="fixed inset-0 z-[70] overflow-hidden animate-in slide-in-from-bottom duration-500">
              <WeatherCard 
                  weather={previewCard.weather} 
                  image={previewCard.image} 
                  loading={state === AppState.EDITING_IMAGE || refreshingCardId === previewCard.weather.id}
                  isExpanded={true}
                  onToggleExpand={() => { 
                      setPreviewCard(null); 
                      setPreviewDragOffset(0); 
                      setIsScrolled(false); // Reset scroll state when canceling
                  }}
                  onScroll={setIsScrolled}
                  onRefresh={() => handleRefresh(previewCard)}
                  onUpdateImage={handleImageUpdate}
                  isPreview={true}
                  onSave={() => handleSavePreview()}
                  onDrag={(offset) => setPreviewDragOffset(offset)}
                  onUpdateView={handleUpdateView}
              />
          </div>
      )}

      {showFantasy && (
          <FantasyCreator
            onCreate={handleFantasyCreate}
            onCancel={() => setShowFantasy(false)}
            isProcessing={state === AppState.GENERATING_IMAGE}
          />
      )}

    </main>
  );
};

export default App;

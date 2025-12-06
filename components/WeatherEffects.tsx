import React from 'react';

interface WeatherEffectsProps {
  condition: string;
}

export const WeatherEffects: React.FC<WeatherEffectsProps> = ({ condition }) => {
  const getEffectType = (c: string) => {
    const lower = c.toLowerCase();
    if (lower.includes('rain') || lower.includes('drizzle') || lower.includes('shower')) return 'rain';
    if (lower.includes('snow') || lower.includes('blizzard') || lower.includes('ice') || lower.includes('flurr')) return 'snow';
    if (lower.includes('storm') || lower.includes('thunder')) return 'storm';
    if (lower.includes('cloud') || lower.includes('overcast') || lower.includes('fog') || lower.includes('mist')) return 'clouds';
    if (lower.includes('sunny') || lower.includes('clear')) return 'sun';
    if (lower.includes('wind')) return 'wind';
    return 'none';
  };

  const effect = getEffectType(condition);
  const isWindy = condition.toLowerCase().includes('wind') || effect === 'storm' || effect === 'clouds';

  // Determine mood overlay color based on effect
  const getMoodColor = () => {
    switch (effect) {
      case 'rain': return 'bg-slate-900/20 mix-blend-hard-light';
      case 'storm': return 'bg-indigo-950/40 mix-blend-multiply';
      case 'snow': return 'bg-blue-50/10 mix-blend-soft-light';
      case 'sun': return 'bg-orange-500/10 mix-blend-overlay';
      case 'clouds': return 'bg-gray-400/10 mix-blend-multiply';
      case 'wind': return 'bg-cyan-900/5 mix-blend-overlay';
      default: return 'bg-transparent';
    }
  };

  if (effect === 'none' && !isWindy) return null;

  return (
    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
      
      {/* Mood Overlay: Tints the scene to match the weather */}
      <div className={`absolute inset-0 transition-colors duration-1000 ${getMoodColor()}`} />

      {/* --- RAIN EFFECT --- */}
      {effect === 'rain' && (
        <div className="rain-container w-full h-full transform -skew-x-6">
          {/* Back layer - slower, smaller */}
          {[...Array(40)].map((_, i) => (
            <div
              key={`rain-back-${i}`}
              className="absolute bg-blue-300/40 w-[1px] h-8 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-30px`,
                animation: `rain-fall ${0.8 + Math.random() * 0.4}s linear infinite`,
                animationDelay: `${Math.random() * 2}s`,
                opacity: 0.3
              }}
            />
          ))}
          {/* Front layer - faster, bigger */}
          {[...Array(50)].map((_, i) => (
            <div
              key={`rain-front-${i}`}
              className="absolute bg-blue-200/70 w-[2px] h-16 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-60px`,
                animation: `rain-fall ${0.5 + Math.random() * 0.2}s linear infinite`,
                animationDelay: `${Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      )}

      {/* --- STORM EFFECT (Rain + Lightning + Flash) --- */}
      {effect === 'storm' && (
        <>
          {/* Heavy Rain */}
          <div className="rain-container w-full h-full transform -skew-x-12">
            {[...Array(80)].map((_, i) => (
              <div
                key={`storm-rain-${i}`}
                className="absolute bg-indigo-200/60 w-[2px] h-20 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-80px`,
                  animation: `rain-fall ${0.3 + Math.random() * 0.2}s linear infinite`,
                  animationDelay: `${Math.random() * 2}s`
                }}
              />
            ))}
          </div>

          {/* Global Flash */}
          <div className="absolute inset-0 bg-white/40 animate-flash opacity-0 mix-blend-overlay" />
          
          {/* Lightning Bolts */}
          {[...Array(3)].map((_, i) => (
            <svg 
               key={`bolt-${i}`}
               viewBox="0 0 100 200" 
               className="absolute text-yellow-100 fill-current drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]"
               style={{
                   left: `${10 + Math.random() * 80}%`,
                   top: `${5 + Math.random() * 20}%`,
                   width: '60px',
                   height: '120px',
                   opacity: 0,
                   animation: `lightning-flash ${5 + Math.random() * 5}s infinite`,
                   animationDelay: `${Math.random() * 5}s`
               }}
            >
                <path d="M50 0 L0 100 L40 100 L30 200 L90 80 L50 80 Z" />
            </svg>
          ))}
        </>
      )}

      {/* --- SNOW EFFECT --- */}
      {effect === 'snow' && (
        <div className="snow-container w-full h-full">
          {[...Array(50)].map((_, i) => {
             const size = Math.random() * 5 + 2;
             const blur = Math.random() > 0.5 ? 'blur-[1px]' : 'blur-0';
             return (
              <div
                key={`snow-${i}`}
                className={`absolute bg-white/90 rounded-full ${blur}`}
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  left: `${Math.random() * 100}%`,
                  top: `-20px`,
                  animation: `snow-fall ${4 + Math.random() * 4}s linear infinite`,
                  animationDelay: `${Math.random() * 5}s`
                }}
              />
             );
          })}
        </div>
      )}

      {/* --- CLOUDS / FOG / WIND EFFECT --- */}
      {(effect === 'clouds' || effect === 'wind') && (
        <div className="clouds-container w-full h-full">
           {/* Drifting Clouds */}
           {effect === 'clouds' && [...Array(5)].map((_, i) => (
             <div 
               key={`cloud-${i}`}
               className="absolute bg-white/30 rounded-full blur-[50px]"
               style={{
                 width: '400px',
                 height: '200px',
                 top: `${Math.random() * 60}%`,
                 left: `-400px`,
                 animation: `drift ${25 + Math.random() * 20}s linear infinite`,
                 animationDelay: `${i * 5}s`
               }}
             />
           ))}
           
           {/* Wind Lines (Fast moving mist streaks) */}
           {isWindy && [...Array(15)].map((_, i) => (
              <div
                 key={`wind-${i}`}
                 className="absolute bg-white/10 h-[2px] rounded-full blur-[1px]"
                 style={{
                    width: `${100 + Math.random() * 200}px`,
                    top: `${Math.random() * 100}%`,
                    left: '-200px',
                    animation: `wind-dash ${3 + Math.random() * 2}s linear infinite`,
                    animationDelay: `${Math.random() * 3}s`
                 }}
              />
           ))}
        </div>
      )}

      {/* --- SUN EFFECT --- */}
      {effect === 'sun' && (
        <div className="sun-container w-full h-full">
           {/* Rotating Rays */}
           <div className="absolute top-[-20%] right-[-20%] w-[800px] h-[800px] animate-spin-slow opacity-30 pointer-events-none">
              <svg viewBox="0 0 100 100" className="w-full h-full fill-yellow-100">
                  {[...Array(12)].map((_, i) => (
                      <path key={i} d="M50 50 L50 0 L55 0 Z" transform={`rotate(${i * 30} 50 50)`} />
                  ))}
              </svg>
           </div>
           
           {/* Glow */}
           <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-yellow-300/30 via-orange-100/10 to-transparent blur-[100px] rounded-full mix-blend-screen" />
           
           {/* Lens Flare */}
           <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-tr from-transparent via-transparent to-yellow-500/10 mix-blend-overlay" />

           {/* Dust Particles */}
           {[...Array(15)].map((_, i) => (
              <div 
                 key={`dust-${i}`}
                 className="absolute bg-yellow-100/50 rounded-full blur-[1px]"
                 style={{
                    width: `${2 + Math.random() * 3}px`,
                    height: `${2 + Math.random() * 3}px`,
                    left: `${Math.random() * 100}%`,
                    top: `${40 + Math.random() * 60}%`,
                    animation: `float-up ${5 + Math.random() * 5}s ease-in-out infinite`,
                    animationDelay: `${Math.random() * 5}s`
                 }}
              />
           ))}
        </div>
      )}
    </div>
  );
};
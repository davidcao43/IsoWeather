
import React, { useState, KeyboardEvent, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { LocationData } from '../types';
import { searchCities } from '../services/weatherService';

interface SearchInputProps {
  onSearch: (location: LocationData) => void;
  disabled?: boolean;
  minimized?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({ onSearch, disabled, minimized }) => {
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<LocationData[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // Ref to prevent search trigger when selecting an item
  const preventSearch = useRef(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (preventSearch.current) {
        preventSearch.current = false;
        return;
      }
      
      if (value.length > 2) {
        setLoading(true);
        const results = await searchCities(value);
        setSuggestions(results);
        setLoading(false);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const handleSelect = (loc: LocationData) => {
    preventSearch.current = true; // Prevent the useEffect from reopening suggestions due to value change
    setValue(`${loc.name}${loc.country ? `, ${loc.country}` : ''}`);
    onSearch(loc);
    setShowSuggestions(false);
    // Note: We don't clear suggestions here so that if the user clicks again, 
    // the previous relevant suggestions are still available (until they type).
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (suggestions.length > 0) {
        handleSelect(suggestions[0]);
      }
    }
  };

  const handleInputClick = () => {
      if (suggestions.length > 0) {
          setShowSuggestions(true);
      }
  };

  return (
    <div 
      ref={wrapperRef}
      className={`relative mx-auto z-50 transition-all duration-500 ease-spring ${
        minimized 
          ? 'w-12 hover:w-full max-w-sm' 
          : 'w-full max-w-md'
      }`}
    >
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          {loading ? (
             <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          ) : (
             <Search className={`transition-all duration-300 ${minimized ? 'h-5 w-5 text-zinc-400' : 'h-5 w-5 text-zinc-500'}`} />
          )}
        </div>
        <input
          type="text"
          className={`block w-full py-3 bg-zinc-900/90 backdrop-blur-md border border-zinc-700/50 rounded-full text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent shadow-lg transition-all duration-300
            ${minimized 
              ? 'pl-10 pr-0 opacity-0 group-hover:opacity-100 cursor-pointer group-hover:pl-10 group-hover:pr-4 group-hover:cursor-text bg-zinc-800/60 hover:bg-zinc-900/90 shadow-sm' 
              : 'pl-11 pr-4'
            }
          `}
          placeholder={minimized ? "" : "Search city..."}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onClick={handleInputClick}
          onFocus={() => { if(suggestions.length > 0) setShowSuggestions(true); }}
          disabled={disabled}
        />
      </div>

      {showSuggestions && suggestions.length > 0 && !minimized && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900/95 backdrop-blur-xl rounded-2xl shadow-xl border border-zinc-800 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <ul>
            {suggestions.map((loc) => (
              <li key={loc.id}>
                <button
                  className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-center gap-2 text-zinc-300"
                  onClick={() => handleSelect(loc)}
                >
                  <MapPin className="w-4 h-4 text-zinc-500 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-medium text-sm text-zinc-200">{loc.name}</span>
                    <span className="text-xs text-zinc-500">
                      {[loc.admin1, loc.country].filter(Boolean).join(', ')}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

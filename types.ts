
export interface LocationData {
  id: number;
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

export interface DailyForecast {
  date: string;
  fullDate: string;
  rawDate: string; // YYYY-MM-DD for matching
  max: number;
  min: number;
  code: number;
  uvIndex: number;
  rainSum: number;
  sunrise: string;
  sunset: string;
}

export interface HourlyForecast {
  time: string; // "10 AM"
  rawTime: string; // ISO string for sorting/filtering
  temp: number;
  code: number;
  pop: number; // Probability of precipitation %
  precipitation: number; // Amount in mm
  humidity: number; // %
  windSpeed: number; // km/h
  uvIndex: number;
  pressure: number; // hPa
  cloudCover: number; // %
  visibility: number; // m
}

export interface FantasyConfig {
  mode: 'fantasy' | 'historical'; // New field
  cityName: string;
  universe: string; // e.g. "Game of Thrones" OR "Ancient Rome"
  weather: string; // e.g. "Stormy", "Sunny", "Toxic Rain"
  time: string; // e.g. "Sunset", "Midnight", "High Noon"
  aesthetic: string; // e.g. "Neon", "Steampunk", "Ethereal"
  description: string;
}

export interface NewsItem {
  headline: string;
  content: string;
  category: string; // e.g. "Politics", "Science", "Magic"
}

export interface WeatherData {
  id: string; // Unique ID for list rendering
  city: string; // English name
  nativeCity: string; // Native script name
  country: string;
  temperature: number; // Stored as Celsius number
  condition: string;
  weatherCode: number;
  date: string;
  isDay: number; // 1 for Day, 0 for Night
  isFictional?: boolean; // Flag for fantasy cities
  fantasyConfig?: FantasyConfig; // Persisted config for regeneration
  
  // Indicators
  humidity: number; // %
  windSpeed: number; // km/h
  windDirection: string; // N, NE, etc.
  windDirectionDeg: number; // Degrees 0-360
  windGusts: number; // km/h
  feelsLike: number; // Celsius
  precipitation: number; // mm
  pressure: number; // hPa
  visibility: number; // km
  cloudCover: number; // %
  uvIndex: number; 
  dewPoint: number; // Celsius
  airQuality: string; // Label + Value
  hourlyAqi: number[]; // Trend for AQI
  
  // Lore-specific data
  fictionalSummaries?: Record<string, string>; // Map of metric name to witty description
  customMetrics?: { label: string; value: string; icon: string }[]; // e.g. "Spice Level", "Dark Force"
  fictionalDate?: string; // e.g. "Year 3019", "Stardate 4502"
  fictionalNews?: NewsItem[]; // Array of news items
  
  sunrise: string;
  sunset: string;
  
  hourlyForecast: HourlyForecast[]; // Next 24 hours relative to now
  allHourly: HourlyForecast[]; // Full hourly data available (for drill-down)
  forecast: DailyForecast[];
  location: LocationData;
}

export interface ViewConfig {
    x: number;
    y: number;
    scale: number;
}

export interface GeneratedImage {
  url: string; // Data URL
  base64: string; // Raw base64 for editing
  prompt: string;
  generatedAt: string;
  viewConfig?: ViewConfig; // User's custom pan/zoom state
}

export enum AppState {
  IDLE = 'IDLE',
  FETCHING_WEATHER = 'FETCHING_WEATHER',
  GENERATING_IMAGE = 'GENERATING_IMAGE',
  EDITING_IMAGE = 'EDITING_IMAGE',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface WeatherCardData {
    weather: WeatherData;
    image: GeneratedImage;
}

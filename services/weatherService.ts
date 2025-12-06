
import { WeatherData, LocationData, DailyForecast, HourlyForecast } from '../types';

const GEO_API = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_API = "https://api.open-meteo.com/v1/forecast";
const AQI_API = "https://air-quality-api.open-meteo.com/v1/air-quality";

export const searchCities = async (query: string): Promise<LocationData[]> => {
  if (query.length < 2) return [];
  try {
    const url = `${GEO_API}?name=${encodeURIComponent(query)}&count=3&language=en&format=json`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (!data.results) return [];
    
    return data.results.map((item: any) => ({
      id: item.id,
      name: item.name,
      country: item.country,
      admin1: item.admin1,
      latitude: item.latitude,
      longitude: item.longitude,
    }));
  } catch (error) {
    console.error("Error searching cities:", error);
    return [];
  }
};

export const getWeatherData = async (location: LocationData): Promise<WeatherData> => {
  try {
    // 1. Prepare Weather API Params
    // Added: precipitation to hourly
    const weatherParams = new URLSearchParams({
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,cloud_cover,dew_point_2m,is_day",
      hourly: "temperature_2m,weather_code,precipitation_probability,precipitation,visibility,relative_humidity_2m,wind_speed_10m,uv_index,pressure_msl,cloud_cover",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_sum,sunrise,sunset",
      timezone: "auto",
      forecast_days: "8" 
    });

    // 2. Prepare Air Quality API Params
    // Requesting hourly forecast for graph
    const aqiParams = new URLSearchParams({
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      current: "us_aqi",
      hourly: "us_aqi",
      timezone: "auto",
      forecast_days: "2" // Get enough data for a trend
    });

    // 3. Fetch in parallel
    const [weatherRes, aqiRes] = await Promise.all([
      fetch(`${WEATHER_API}?${weatherParams.toString()}`),
      fetch(`${AQI_API}?${aqiParams.toString()}`)
    ]);

    const weatherData = await weatherRes.json();
    const aqiData = await aqiRes.json();

    if (!weatherData.current || !weatherData.daily || !weatherData.hourly) {
      throw new Error("Incomplete weather data received");
    }

    const current = weatherData.current;
    const daily = weatherData.daily;
    const hourly = weatherData.hourly;
    const currentAqi = aqiData.current?.us_aqi;

    // --- Process All Hourly Forecast Data ---
    const allHourly: HourlyForecast[] = hourly.time.map((t: string, i: number) => {
        const date = new Date(t);
        return {
            time: date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
            rawTime: t, // Keep ISO string for easy date matching
            temp: Math.round(hourly.temperature_2m[i]),
            code: hourly.weather_code[i],
            pop: hourly.precipitation_probability[i] || 0,
            precipitation: hourly.precipitation[i] || 0,
            humidity: hourly.relative_humidity_2m[i] || 0,
            windSpeed: hourly.wind_speed_10m[i] || 0,
            uvIndex: hourly.uv_index[i] || 0,
            pressure: hourly.pressure_msl[i] || 1013,
            cloudCover: hourly.cloud_cover[i] || 0,
            visibility: hourly.visibility ? hourly.visibility[i] : 10000
        };
    });

    // --- Process "Next 24 Hours" Slice ---
    const currentHourIndex = hourly.time.findIndex((t: string) => {
        const time = new Date(t).getTime();
        const now = new Date().getTime();
        return time >= now - 3600000; 
    });
    
    const startIndex = currentHourIndex !== -1 ? currentHourIndex : 0;
    const hourlyForecast = allHourly.slice(startIndex, startIndex + 24);

    // --- Process Hourly AQI ---
    let hourlyAqi: number[] = [];
    if (aqiData.hourly && aqiData.hourly.us_aqi) {
        const aqiStart = aqiData.hourly.time.findIndex((t: string) => {
            const time = new Date(t).getTime();
            const now = new Date().getTime();
            return time >= now - 3600000;
        });
        const idx = aqiStart !== -1 ? aqiStart : 0;
        hourlyAqi = aqiData.hourly.us_aqi.slice(idx, idx + 24);
    }

    // --- Process Daily Forecast ---
    const forecast: DailyForecast[] = daily.time.map((t: string, i: number) => ({
      date: new Date(t).toLocaleDateString('en-US', { weekday: 'short' }),
      fullDate: new Date(t).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      rawDate: t, // YYYY-MM-DD
      max: Math.round(daily.temperature_2m_max[i]),
      min: Math.round(daily.temperature_2m_min[i]),
      code: daily.weather_code[i],
      uvIndex: daily.uv_index_max[i],
      rainSum: daily.precipitation_sum[i],
      sunrise: daily.sunrise[i].split('T')[1],
      sunset: daily.sunset[i].split('T')[1]
    })).slice(0, 8); 

    // Current Visibility
    const currentVisibilityKm = hourly.visibility ? hourly.visibility[startIndex] / 1000 : 10;

    // Format AQI
    let aqiString = "--";
    if (currentAqi !== undefined && currentAqi !== null) {
        const label = getAqiLabel(currentAqi);
        aqiString = `${currentAqi} (${label})`;
    }

    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return {
      id: crypto.randomUUID(),
      city: location.name,
      nativeCity: location.name,
      country: location.country || "",
      temperature: Math.round(current.temperature_2m),
      condition: mapWmoCode(current.weather_code),
      weatherCode: current.weather_code,
      date: dateStr,
      isDay: current.is_day,
      
      humidity: current.relative_humidity_2m,
      windSpeed: Math.round(current.wind_speed_10m),
      windDirection: getWindDirection(current.wind_direction_10m),
      windDirectionDeg: current.wind_direction_10m, // Raw degrees
      windGusts: Math.round(current.wind_gusts_10m),
      feelsLike: Math.round(current.apparent_temperature),
      precipitation: current.precipitation,
      pressure: Math.round(current.pressure_msl),
      visibility: Math.round(currentVisibilityKm * 10) / 10,
      cloudCover: current.cloud_cover,
      uvIndex: daily.uv_index_max[0] || 0,
      dewPoint: Math.round(current.dew_point_2m),
      airQuality: aqiString,
      hourlyAqi, // Pass the trend data
      
      sunrise: daily.sunrise[0].split('T')[1],
      sunset: daily.sunset[0].split('T')[1],

      hourlyForecast,
      allHourly, // Store full dataset
      forecast,
      location
    };
  } catch (error) {
    console.error("Error fetching weather data:", error);
    throw error;
  }
};

const getWindDirection = (degrees: number): string => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
};

const getAqiLabel = (aqi: number): string => {
    if (aqi <= 50) return "Good";
    if (aqi <= 100) return "Moderate";
    if (aqi <= 150) return "Unhealthy for SG";
    if (aqi <= 200) return "Unhealthy";
    if (aqi <= 300) return "Very Unhealthy";
    return "Hazardous";
};

export const mapWmoCode = (code: number): string => {
  if (code === 0) return "Clear Sky";
  if (code === 1) return "Mainly Clear";
  if (code === 2) return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Foggy";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 95 && code <= 99) return "Thunderstorm";
  return "Unknown";
};

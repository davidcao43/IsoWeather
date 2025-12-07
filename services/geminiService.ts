
import { GoogleGenAI } from "@google/genai";
import { WeatherData, GeneratedImage, FantasyConfig, HourlyForecast, DailyForecast, LocationData } from "../types";

// Initialize Gemini client
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export const getCityNativeName = async (city: string, country: string): Promise<string> => {
  const ai = getClient();
  const modelId = "gemini-2.5-flash";
  
  const prompt = `Return only the name of the city "${city}" (${country}) in its native language/script. 
  If the native language uses the Latin alphabet and is the same as English, return the English name. 
  Do not add any explanation, just the name.
  Examples: 
  Tokyo -> 東京
  Paris -> Paris
  Beijing -> 北京
  Moscow -> Москва
  Cairo -> القاهرة`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    return response.text?.trim() || city;
  } catch (error) {
    console.warn("Failed to fetch native city name, using English fallback", error);
    return city;
  }
};

export const generateHomeBackground = async (): Promise<string> => {
  const ai = getClient();
  // Using Nano Banana model for background as speed is preferred here
  const modelId = "gemini-2.5-flash-image"; 
  
  const prompt = `Ultra-soft pastel gradient background, smooth color transitions, light blue fading into white, subtle atmospheric glow, minimal texture, modern mobile app UI background, no objects, no text, extremely clean, aesthetic, slight grain for depth.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: { aspectRatio: "16:9" }
      }
    });

    let base64Image = '';
    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                base64Image = part.inlineData.data;
                break;
            }
        }
    }

    if (!base64Image) throw new Error("No background generated.");
    return `data:image/png;base64,${base64Image}`;
  } catch (error) {
    console.warn("Failed to generate background", error);
    return "";
  }
};

export const generateFantasyScene = async (config: FantasyConfig): Promise<GeneratedImage> => {
  const ai = getClient();
  // UPGRADED MODEL FOR 4K SUPPORT
  const modelId = "gemini-3-pro-image-preview";

  const aestheticStyle = config.aesthetic === 'Default' ? '' : `, ${config.aesthetic} style`;

  const isHistorical = config.mode === 'historical';
  
  const researchPrompt = isHistorical 
    ? `Retrieve internal historical knowledge about "${config.cityName}" during the "${config.universe}" era. Ensure rigorous historical accuracy in architecture, clothing, and environment.`
    : `Retrieve internal knowledge about the universe of "${config.universe}" to ensure strict architectural and environmental accuracy.`;

  // EXACT PROMPT STRUCTURE REQUESTED with Lore Research Instruction
  const prompt = `${researchPrompt}
  Present a clear, 45° top-down view of a vertical (9:16) isometric miniature 3D cartoon scene of ${config.cityName} from ${config.universe}, highlighting iconic landmarks centered in the composition to showcase precise and delicate modeling.
  
  IMPORTANT: Ensure the entire scene is fully visible within the frame. Zoom out slightly to leave ample negative space around the edges. Do not cut off any corners or sides of the main subject. Center the subject perfectly.

  Scene context: ${config.weather}, ${config.time}${aestheticStyle}. ${config.description}.

  The scene features soft, refined textures with realistic PBR materials and gentle, lifelike lighting and shadow effects. Weather elements are creatively integrated into the urban architecture, establishing a dynamic interaction between the city's landscape and atmospheric conditions, creating an immersive weather ambiance.

  Use a clean, unified composition with minimalistic aesthetics and a soft, solid-colored background that highlights the main content. The overall visual style is fresh and soothing.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: { 
            aspectRatio: "9:16",
            imageSize: "4K" // Requesting highest fidelity
        }
      }
    });

    let base64Image = '';
    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                base64Image = part.inlineData.data;
                break;
            }
        }
    }

    if (!base64Image) throw new Error("No fantasy image generated.");
    const url = `data:image/png;base64,${base64Image}`;

    return {
        url,
        base64: base64Image,
        prompt: prompt,
        generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("Failed to generate fantasy scene", error);
    throw error;
  }
};

export const regenerateFantasyScene = async (weather: WeatherData): Promise<GeneratedImage> => {
    if (!weather.fantasyConfig) {
        throw new Error("Cannot regenerate: Missing fantasy configuration.");
    }
    // Call the generation function again with the saved config
    return generateFantasyScene(weather.fantasyConfig);
};

export const generateCreativeWeatherData = async (config: FantasyConfig): Promise<WeatherData> => {
    const ai = getClient();
    const modelId = "gemini-2.5-flash";

    const isHistorical = config.mode === 'historical';
    const role = isHistorical 
        ? `You are a historian and planetary climate simulator for "${config.cityName}" during the "${config.universe}" era.`
        : `You are a planetary weather computer for the universe of "${config.universe}".`;
    
    const nativeNameInst = isHistorical
        ? `5. Generate "nativeName": Provide the city's name in the script of that era (e.g. Hieroglyphs for Egypt if possible/Unicode supports, Latin for Rome, Cuneiform for Babylon). If Unicode is limited, use the romanized historical name (e.g. 'Roma' instead of 'Rome').`
        : `5. Generate "nativeName": This is CRITICAL. Retrieve the name of the city in its native fictional language/script if available in Unicode.`;

    const exaggeration = isHistorical
        ? `1. SIMULATE historically plausible weather. Do not exaggerate unnaturally, but reflect the climate of that era (e.g. Nile flooding season, Little Ice Age conditions if applicable).`
        : `1. EXAGGERATE the weather parameters to fit the fictional universe (e.g. if it's Dune, temperature should be 60°C; if it's Hoth, -50°C).`;

    const prompt = `${role}
    Generate a current weather report for the city "${config.cityName}".
    
    Context:
    - Weather Condition: ${config.weather}
    - Time of Day: ${config.time}
    - Lore/Aesthetic: ${config.aesthetic}
    - User Description: ${config.description}

    Instructions:
    ${exaggeration}
    2. Generate "fictionalSummaries" for each standard metric (Humidity, Wind, Pressure, etc.). These summaries must be 1 witty sentence referencing specific lore elements, historical figures, or events (e.g., "Pharaoh decrees good harvest", "Caesar's fleet delayed by wind").
    3. Create 2 "customMetrics" that are unique to this world/era (e.g. "Nile Flood Level", "Senate Approval", "Radiation Level").
    4. Generate "fictionalDate" string that matches the in-universe calendar/era (e.g. "Stardate 4211.5", "AUC 753", "Dynasty XVIII").
    ${nativeNameInst}
    6. Generate "fictionalNews": An array of 3 news items. 
       - Item 1: A main headline and a short paragraph (2-3 sentences) describing a major event affecting the weather or society. 
       - Item 2 & 3: Brief, one-sentence headlines of side stories.
       - Include a "category" for each (e.g. "Empire News", "Politics", "Mystic").

    Return ONLY a valid JSON object with no markdown formatting. The JSON must match this structure exactly:
    {
      "temperature": number (Celsius),
      "condition": string (Short description),
      "nativeName": string (The fictional script name or conlang name),
      "fictionalDate": string,
      "humidity": number (0-100),
      "windSpeed": number (km/h),
      "windDirection": string (Cardinal),
      "precipitation": number (mm amount),
      "pressure": number (hPa),
      "visibility": number (km),
      "uvIndex": number (0-12),
      "cloudCover": number (0-100),
      "airQuality": string (Format: "Value (Description)"),
      "sunrise": string (HH:MM),
      "sunset": string (HH:MM),
      "dailyHigh": number,
      "dailyLow": number,
      "fictionalSummaries": {
          "Feels Like": string,
          "Humidity": string,
          "Wind": string,
          "UV Index": string,
          "Visibility": string,
          "Precipitation": string,
          "Cloud Cover": string,
          "Pressure": string,
          "Dew Point": string,
          "Air Quality": string
      },
      "customMetrics": [
          { "label": string, "value": string, "icon": "activity" }
      ],
      "fictionalNews": [
          { "headline": string, "content": string, "category": string }
      ]
    }`;

    try {
        const result = await ai.models.generateContent({
            model: modelId,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        const text = result.text?.trim() || "{}";
        const data = JSON.parse(text);

        // 2. Procedurally Generate Hourly/Daily Arrays based on the AI's base values
        
        const now = new Date();
        const baseTemp = data.temperature || 20;
        const tempRange = (data.dailyHigh - data.dailyLow) || 10;
        
        // Generate 48 hours of data
        const allHourly: HourlyForecast[] = [];
        for(let i=0; i<48; i++) {
            const time = new Date(now.getTime() + i * 3600000);
            
            // Create a realistic temperature curve
            const hour = time.getHours();
            const isDay = hour > 6 && hour < 20;
            const curve = -Math.cos((hour / 24) * 2 * Math.PI); // -1 at midnight, 1 at noon
            const tempOffset = curve * (tempRange / 2);
            
            // Add some noise
            const randomFlux = (Math.random() - 0.5) * 2;
            
            allHourly.push({
                time: time.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
                rawTime: time.toISOString(),
                temp: Math.round(baseTemp + tempOffset + randomFlux),
                code: getFictionalCode(data.condition), // Map string to nearest WMO code for icons
                pop: data.precipitation > 0 ? 80 : 10,
                precipitation: data.precipitation > 0 ? (Math.random() * data.precipitation) : 0,
                humidity: Math.max(0, Math.min(100, data.humidity + (Math.random() - 0.5) * 10)),
                windSpeed: Math.max(0, data.windSpeed + (Math.random() - 0.5) * 5),
                uvIndex: isDay ? data.uvIndex : 0,
                pressure: data.pressure,
                cloudCover: data.cloudCover,
                visibility: data.visibility * 1000
            });
        }

        // Generate 7-Day Forecast
        const forecast: DailyForecast[] = Array.from({length: 8}).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + i);
            const isToday = i === 0;
            return {
                date: d.toLocaleDateString('en-US', { weekday: 'short' }),
                fullDate: d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
                rawDate: d.toISOString().split('T')[0],
                max: isToday ? data.dailyHigh : Math.round(data.dailyHigh + (Math.random() - 0.5) * 5),
                min: isToday ? data.dailyLow : Math.round(data.dailyLow + (Math.random() - 0.5) * 5),
                code: getFictionalCode(data.condition),
                uvIndex: data.uvIndex,
                rainSum: data.precipitation * 24, // Rough estimate
                sunrise: data.sunrise,
                sunset: data.sunset
            };
        });

        const location: LocationData = {
            id: Math.random(),
            name: config.cityName,
            country: config.universe,
            latitude: 0,
            longitude: 0
        };

        // Determine wind direction degrees
        const windDirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const windIdx = windDirs.indexOf(data.windDirection) !== -1 ? windDirs.indexOf(data.windDirection) : 0;
        const windDeg = windIdx * 45;

        // Parse AQI value for chart
        const aqiValue = parseInt(data.airQuality.split(' ')[0]) || 50;
        const hourlyAqi = Array(24).fill(0).map(() => Math.max(0, aqiValue + Math.round((Math.random() - 0.5) * 20)));

        return {
            id: crypto.randomUUID(),
            city: config.cityName,
            nativeCity: data.nativeName || config.cityName, // Use AI generated native name or fallback
            country: config.universe,
            temperature: data.temperature,
            condition: data.condition,
            weatherCode: getFictionalCode(data.condition),
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            isDay: config.time.toLowerCase().includes('night') || config.time.toLowerCase().includes('midnight') ? 0 : 1,
            isFictional: true,
            fantasyConfig: config, // Persist config for regeneration
            
            humidity: data.humidity,
            windSpeed: data.windSpeed,
            windDirection: data.windDirection,
            windDirectionDeg: windDeg,
            windGusts: Math.round(data.windSpeed * 1.5),
            feelsLike: data.temperature, // Simple fallback
            precipitation: data.precipitation,
            pressure: data.pressure,
            visibility: data.visibility,
            cloudCover: data.cloudCover,
            uvIndex: data.uvIndex,
            dewPoint: data.temperature - ((100 - data.humidity) / 5), // Approx calculation
            airQuality: data.airQuality,
            hourlyAqi: hourlyAqi,
            
            fictionalSummaries: data.fictionalSummaries,
            customMetrics: data.customMetrics,
            fictionalDate: data.fictionalDate,
            fictionalNews: data.fictionalNews,
            
            sunrise: data.sunrise,
            sunset: data.sunset,
            
            hourlyForecast: allHourly.slice(0, 24),
            allHourly: allHourly,
            forecast: forecast,
            location: location
        };

    } catch (error) {
        console.error("AI Weather Generation Failed:", error);
        throw new Error("Failed to contact planetary weather satellites.");
    }
};

// Helper to map creative descriptions to WMO codes for icons
const getFictionalCode = (condition: string): number => {
    const c = condition.toLowerCase();
    if (c.includes('snow') || c.includes('ice') || c.includes('hoth')) return 71;
    if (c.includes('rain') || c.includes('acid') || c.includes('drizzle')) return 61;
    if (c.includes('storm') || c.includes('thunder')) return 95;
    if (c.includes('cloud') || c.includes('overcast') || c.includes('fog') || c.includes('smog')) return 3;
    if (c.includes('clear') || c.includes('sun')) return 0;
    return 3; // Default to cloudy/unknown
};

export const generateWeatherScene = async (weather: WeatherData): Promise<GeneratedImage> => {
  const ai = getClient();
  
  // High-Quality Image Generation Model (Nano Banana Pro)
  const modelId = "gemini-3-pro-image-preview";

  const prompt = `
  Present a clear, 45° top-down view of a vertical (9:16) isometric miniature 3D cartoon scene of ${weather.city}, ${weather.country}, highlighting iconic landmarks centered in the composition to showcase precise and delicate modeling.
  
  IMPORTANT: Ensure the entire scene is fully visible within the frame. Zoom out slightly to leave ample negative space around the edges. Do not cut off any corners or sides of the main subject. Center the subject perfectly.

  Scene context: Current weather is ${weather.condition}. Time is ${weather.isDay ? 'Day' : 'Night'}. Cloud cover is ${weather.cloudCover}%.

  The scene features soft, refined textures with realistic PBR materials and gentle, lifelike lighting and shadow effects. Weather elements are creatively integrated into the urban architecture, establishing a dynamic interaction between the city's landscape and atmospheric conditions, creating an immersive weather ambiance.

  Use a clean, unified composition with minimalistic aesthetics and a soft, solid-colored background that highlights the main content. The overall visual style is fresh and soothing.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: { 
            aspectRatio: "9:16",
            imageSize: "4K" // Highest fidelity requested
        }
      }
    });

    let base64Image = '';
    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                base64Image = part.inlineData.data;
                break;
            }
        }
    }

    if (!base64Image) throw new Error("No image generated.");
    const url = `data:image/png;base64,${base64Image}`;

    return {
        url,
        base64: base64Image,
        prompt: prompt,
        generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("Failed to generate weather scene", error);
    // Return a fallback or placeholder only on strict error
    const color = '1e293b'; // slate-800
    const url = `https://placehold.co/1080x1920/${color}/fff.png?text=${encodeURIComponent(weather.city + "\nGeneration Failed")}&font=montserrat`;
    return {
        url,
        base64: "",
        prompt: "Error Fallback",
        generatedAt: new Date().toISOString()
    };
  }
};

export const editWeatherScene = async (base64Image: string, instructions: string): Promise<GeneratedImage> => {
    const ai = getClient();
    // UPGRADED to Pro for better instruction following (Nano Banana Pro)
    const modelId = "gemini-3-pro-image-preview";

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: {
                parts: [
                    { text: instructions },
                    { inlineData: { mimeType: 'image/png', data: base64Image } },
                ],
            },
            config: {
                imageConfig: { 
                    aspectRatio: "9:16",
                    imageSize: "4K" // Ensure 4K resolution for edits
                } 
            }
        });

        let newBase64 = '';
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    newBase64 = part.inlineData.data;
                    break;
                }
            }
        }

        if (!newBase64) throw new Error("No edited image generated.");
        
        return {
            url: `data:image/png;base64,${newBase64}`,
            base64: newBase64,
            prompt: instructions,
            generatedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error("Failed to edit scene", error);
        throw error;
    }
};

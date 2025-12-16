import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
export const scale = (size) => (width / 375) * size;

export const BACKGROUNDS = {
    CLEAR_DAY: 'https://images.unsplash.com/photo-1601297183305-6df142704ea2?q=80&w=1000&auto=format&fit=crop',
    CLEAR_NIGHT: 'https://images.unsplash.com/photo-1532978873691-590510492bbb?q=80&w=1000&auto=format&fit=crop',
    CLOUDY: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?q=80&w=1000&auto=format&fit=crop',
    RAIN: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=1000&auto=format&fit=crop',
    SNOW: 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?q=80&w=1000&auto=format&fit=crop',
    THUNDER: 'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?q=80&w=1000&auto=format&fit=crop',
};

// UPDATED: Brighter, Neon-like colors to fix "dullness"
export const getIconProps = (code) => {
    if (code === 0) return { name: 'weather-sunny', color: '#FFD700', label: 'Sunny' };
    if (code >= 1 && code <= 3) return { name: 'weather-partly-cloudy', color: '#00E0FF', label: 'Cloudy' }; // Bright Cyan
    if (code >= 45 && code <= 48) return { name: 'weather-fog', color: '#E0E0E0', label: 'Foggy' };
    if (code >= 51 && code <= 67) return { name: 'weather-rainy', color: '#4DA6FF', label: 'Rainy' }; // Dodger Blue
    if (code >= 71 && code <= 77) return { name: 'weather-snowy', color: '#FFFFFF', label: 'Snowy' };
    if (code >= 95) return { name: 'weather-lightning', color: '#FFCC00', label: 'Storm' }; // Deep Yellow
    return { name: 'weather-cloudy', color: '#B0C4DE', label: 'Overcast' };
};

export const getAqiColor = (aqi) => {
    if (aqi <= 50) return '#00E400';
    if (aqi <= 100) return '#FFFF00';
    if (aqi <= 150) return '#FF7E00';
    return '#FF0000';
};

// NEW: Temperature Color Logic
export const getTempColor = (t) => {
    if (t < 10) return '#2196F3'; // Cool Blue
    if (t >= 10 && t < 18) return '#4CAF50'; // Green (Mild)
    if (t >= 18 && t < 25) return '#CDDC39'; // Yellow-Green (Warm)
    if (t >= 25 && t < 32) return '#FF9800'; // Orange (Hot)
    if (t >= 32 && t < 40) return '#F44336'; // Red (Very Hot)
    return '#B71C1C'; // Dark Red (Extreme)
};
import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  StyleSheet, Text, View, ActivityIndicator, TextInput, TouchableOpacity,
  Keyboard, StatusBar, Platform, FlatList, Dimensions, ImageBackground
} from 'react-native';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// --- CONFIGURATION ---
const { width, height } = Dimensions.get('window');
const scale = (size) => (width / 375) * size;

// Free Unsplash Image URLs for Weather Backgrounds
const BACKGROUNDS = {
  CLEAR_DAY: 'https://images.unsplash.com/photo-1601297183305-6df142704ea2?q=80&w=1000&auto=format&fit=crop',
  CLEAR_NIGHT: 'https://images.unsplash.com/photo-1532978873691-590510492bbb?q=80&w=1000&auto=format&fit=crop',
  CLOUDY: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?q=80&w=1000&auto=format&fit=crop',
  RAIN: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=1000&auto=format&fit=crop',
  SNOW: 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?q=80&w=1000&auto=format&fit=crop',
  THUNDER: 'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?q=80&w=1000&auto=format&fit=crop',
};

// --- 1. SEARCH MODULE ---
const SearchModule = ({ onCitySelect, onMyLocation, isVisible, setIsVisible }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (query.length === 0) {
      setSuggestions([]);
      setIsVisible(false);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      if (query.length < 3) { setIsSearching(false); return; }
      try {
        const response = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=5&language=en&format=json`
        );
        const data = await response.json();
        if (data.results) { setSuggestions(data.results); setIsVisible(true); }
      } catch (e) { } finally { setIsSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item) => {
    Keyboard.dismiss();
    setQuery('');
    setSuggestions([]);
    setIsVisible(false);
    onCitySelect(item);
  };

  const handleGPS = () => {
    Keyboard.dismiss();
    setQuery('');
    setSuggestions([]);
    setIsVisible(false);
    onMyLocation();
  };

  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchBarGlass}>
        <TouchableOpacity onPress={handleGPS} style={styles.gpsButton}>
          <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#fff" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Search city..."
          placeholderTextColor="rgba(255,255,255,0.7)"
          value={query}
          onChangeText={setQuery}
        />
        {isSearching ? <ActivityIndicator size="small" color="#fff" /> :
          query.length > 0 ? (
            <TouchableOpacity onPress={() => { setQuery(''); setIsVisible(false); }}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#fff" />
            </TouchableOpacity>
          ) : <MaterialCommunityIcons name="magnify" size={24} color="#fff" />}
      </View>

      {isVisible && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          {suggestions.map((item, index) => (
            <TouchableOpacity key={`${item.id}-${index}`} style={styles.dropdownItem} onPress={() => handleSelect(item)}>
              <Text style={styles.dropdownText}>{item.name}, <Text style={styles.dropdownSub}>{item.country}</Text></Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

// --- 2. WEATHER COMPONENTS ---
const CurrentWeather = memo(({ current, extra, city, weatherProps, time }) => {
  if (!current) return null;
  return (
    <View style={styles.heroSection}>
      <Text style={styles.cityName}>{city}</Text>

      {/* Time & Date Badge */}
      <View style={styles.timeBadge}>
        <Text style={styles.timeText}>{time}</Text>
        <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}</Text>
      </View>

      <MaterialCommunityIcons name={weatherProps.name} size={scale(110)} color="#fff" style={styles.heroIcon} />

      <Text style={styles.temp}>{Math.round(current.temperature)}°</Text>
      <Text style={styles.condition}>{weatherProps.label}</Text>

      {/* Stats Grid with AQI */}
      <View style={styles.statsGlass}>
        <View style={styles.statsRow}>
          <StatItem icon="weather-windy" label="Wind" value={`${current.windspeed} km/h`} />
          <View style={styles.statDivider} />
          <StatItem icon="water-percent" label="Humidity" value={`${extra.humidity}%`} />
        </View>
        <View style={styles.statsRowSeparator} />
        <View style={styles.statsRow}>
          <StatItem icon="leaf" label="AQI" value={extra.aqi} color={getAqiColor(extra.aqi)} />
          <View style={styles.statDivider} />
          <StatItem icon="thermometer" label="Feels Like" value={`${Math.round(extra.feelsLike)}°`} />
        </View>
      </View>
    </View>
  );
});

const getAqiColor = (aqi) => {
  if (aqi <= 50) return '#00E400'; // Good
  if (aqi <= 100) return '#FFFF00'; // Moderate
  if (aqi <= 150) return '#FF7E00'; // Unhealthy
  return '#FF0000'; // Bad
};

const StatItem = ({ icon, label, value, color = '#fff' }) => (
  <View style={styles.statItem}>
    <MaterialCommunityIcons name={icon} size={22} color={color} />
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const ForecastRow = memo(({ item }) => {
  const getIcon = (code) => {
    if (code === 0) return 'weather-sunny';
    if (code >= 51) return 'weather-rainy';
    if (code >= 71) return 'weather-snowy';
    return 'weather-cloudy';
  };
  return (
    <View style={styles.forecastRow}>
      <Text style={styles.dayName}>{new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' })}</Text>
      <MaterialCommunityIcons name={getIcon(item.code)} size={24} color="#fff" />
      <View style={styles.tempHighLow}>
        <Text style={styles.maxTemp}>{Math.round(item.maxTemp)}°</Text>
        <Text style={styles.minTemp}>{Math.round(item.minTemp)}°</Text>
      </View>
    </View>
  );
});

// --- 3. MAIN CONTROLLER ---
export default function App() {
  return (
    <SafeAreaProvider>
      <MainScreen />
    </SafeAreaProvider>
  );
}

function MainScreen() {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [city, setCity] = useState('Locating...');
  const [searchVisible, setSearchVisible] = useState(false);
  const [bgImage, setBgImage] = useState(BACKGROUNDS.CLEAR_DAY);
  const [localTime, setLocalTime] = useState('00:00');

  useEffect(() => { getCurrentLocation(); }, []);

  const getCurrentLocation = async () => {
    setLoading(true); setError(false); setCity('Locating...');
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLoading(false); return; }
      let loc = await Location.getCurrentPositionAsync({});
      fetchWeather(loc.coords.latitude, loc.coords.longitude, 'My Location');
    } catch (e) { setError(true); setLoading(false); }
  };

  const fetchWeather = async (lat, lon, cityName) => {
    setLoading(true); setError(false); setCity(cityName);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      // Fetch Weather + Air Quality in parallel
      const [weatherRes, aqiRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&hourly=relative_humidity_2m,apparent_temperature&timezone=auto`, { signal: controller.signal }),
        fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`, { signal: controller.signal })
      ]);

      clearTimeout(timeoutId);
      if (!weatherRes.ok) throw new Error('Weather error');

      const data = await weatherRes.json();
      const aqiData = await aqiRes.json();

      // Calculate Local Time based on API Timezone
      const timeStr = new Date().toLocaleTimeString('en-US', { timeZone: data.timezone, hour: '2-digit', minute: '2-digit', hour12: true });
      setLocalTime(timeStr);

      const currentHour = new Date().getHours();
      const isNight = currentHour < 6 || currentHour > 19;
      const wCode = data.current_weather.weathercode;

      // Determine Background Image
      let bg = BACKGROUNDS.CLEAR_DAY;
      if (wCode >= 71) bg = BACKGROUNDS.SNOW;
      else if (wCode >= 51) bg = BACKGROUNDS.RAIN;
      else if (wCode >= 95) bg = BACKGROUNDS.THUNDER;
      else if (wCode >= 1 && wCode <= 48) bg = BACKGROUNDS.CLOUDY;
      else if (isNight) bg = BACKGROUNDS.CLEAR_NIGHT;
      setBgImage(bg);

      setWeatherData({
        current: data.current_weather,
        extra: {
          humidity: data.hourly.relative_humidity_2m[currentHour] || 0,
          feelsLike: data.hourly.apparent_temperature[currentHour] || 0,
          aqi: aqiData.current?.us_aqi || '--',
        },
        daily: data.daily.time.map((date, i) => ({
          key: i.toString(),
          date,
          maxTemp: data.daily.temperature_2m_max[i],
          minTemp: data.daily.temperature_2m_min[i],
          code: data.daily.weathercode[i],
        }))
      });
    } catch (e) { setError(true); } finally { setLoading(false); }
  };

  const getWeatherProps = (code) => {
    if (code === 0) return { name: 'weather-sunny', label: 'Sunny' };
    if (code >= 1 && code <= 3) return { name: 'weather-partly-cloudy', label: 'Partly Cloudy' };
    if (code >= 45 && code <= 48) return { name: 'weather-fog', label: 'Foggy' };
    if (code >= 51 && code <= 67) return { name: 'weather-rainy', label: 'Rainy' };
    if (code >= 71) return { name: 'weather-snowy', label: 'Snowy' };
    if (code >= 95) return { name: 'weather-lightning', label: 'Thunderstorm' };
    return { name: 'weather-cloudy', label: 'Cloudy' };
  };

  const weatherProps = getWeatherProps(weatherData?.current?.weathercode);

  return (
    <ImageBackground source={{ uri: bgImage }} style={styles.container} resizeMode="cover">
      {/* Dark Overlay to make text readable */}
      <View style={styles.overlay} />

      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>

        <View style={{ zIndex: 100 }}>
          <SearchModule
            onCitySelect={(item) => fetchWeather(item.latitude, item.longitude, `${item.name}, ${item.country}`)}
            onMyLocation={getCurrentLocation}
            isVisible={searchVisible}
            setIsVisible={setSearchVisible}
          />
        </View>

        <View style={{ flex: 1 }}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Fetching Atmosphere...</Text>
            </View>
          ) : error ? (
            <View style={styles.center}>
              <MaterialCommunityIcons name="wifi-off" size={60} color="rgba(255,255,255,0.6)" />
              <Text style={styles.errorTitle}>Offline</Text>
              <TouchableOpacity onPress={getCurrentLocation} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
            </View>
          ) : weatherData ? (
            <FlatList
              data={weatherData.daily}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => <ForecastRow item={item} />}
              ListHeaderComponent={
                <CurrentWeather
                  current={weatherData.current}
                  extra={weatherData.extra}
                  city={city}
                  time={localTime}
                  weatherProps={weatherProps}
                />
              }
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onScrollBeginDrag={() => { Keyboard.dismiss(); setSearchVisible(false); }}
            />
          ) : null}
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' }, // Darkens bg image
  safeArea: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#ddd', marginTop: 10 },

  // Search
  searchContainer: { marginHorizontal: 20, marginBottom: 10, marginTop: 10 },
  searchBarGlass: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 30,
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.3)', // Glassy Dark
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  gpsButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, marginRight: 10 },
  input: { flex: 1, color: '#fff', fontSize: scale(16) },
  dropdown: {
    position: 'absolute', top: 60, left: 0, right: 0,
    backgroundColor: 'rgba(20, 20, 20, 0.9)', borderRadius: 15,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden',
  },
  dropdownItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  dropdownText: { color: '#fff', fontSize: scale(14) },
  dropdownSub: { color: '#aaa' },

  // Weather Main
  heroSection: { alignItems: 'center', marginTop: 10, marginBottom: 20 },
  cityName: { fontSize: scale(28), fontWeight: '700', color: '#fff', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 10 },
  timeBadge: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20, marginTop: 10, alignItems: 'center' },
  timeText: { fontSize: scale(18), color: '#fff', fontWeight: '600' },
  dateText: { fontSize: scale(12), color: '#ccc' },
  heroIcon: { marginVertical: 10, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 20 },
  temp: { fontSize: scale(90), fontWeight: '300', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 10 },
  condition: { fontSize: scale(24), fontWeight: '500', color: '#fff', marginBottom: 20, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 5 },

  // Stats Glass Grid
  statsGlass: {
    width: '90%', paddingVertical: 20, backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statsRowSeparator: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 15, width: '80%', alignSelf: 'center' },
  statItem: { alignItems: 'center', width: '40%' },
  statLabel: { color: '#bbb', fontSize: scale(12), marginTop: 5 },
  statValue: { color: '#fff', fontSize: scale(16), fontWeight: '700', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', height: 30 },

  // Forecast
  scrollContent: { paddingBottom: 50 },
  forecastRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 15, paddingHorizontal: 20, marginHorizontal: 20, marginBottom: 5,
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 15,
  },
  dayName: { color: '#fff', fontSize: scale(16), width: 60, fontWeight: '600' },
  tempHighLow: { flexDirection: 'row', width: 90, justifyContent: 'flex-end', gap: 10 },
  maxTemp: { color: '#fff', fontWeight: '700', fontSize: scale(16) },
  minTemp: { color: '#aaa', fontSize: scale(16) },

  // Error
  errorTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 10 },
  retryBtn: { backgroundColor: '#fff', paddingHorizontal: 30, paddingVertical: 10, borderRadius: 20, marginTop: 20 },
  retryText: { color: '#333', fontWeight: 'bold' }
});
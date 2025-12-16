import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  StyleSheet, Text, View, ActivityIndicator, TextInput, TouchableOpacity,
  Keyboard, StatusBar, Platform, FlatList, Dimensions, ImageBackground, Modal, ScrollView
} from 'react-native';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// --- CONFIGURATION ---
const { width, height } = Dimensions.get('window');
const scale = (size) => (width / 375) * size;

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

// --- 2. CUSTOM GRAPH COMPONENT (Lightweight) ---
const ForecastGraph = ({ data }) => {
  if (!data || data.length === 0) return null;

  // Find min/max to scale the graph
  const temps = data.map(d => d.maxTemp);
  const max = Math.max(...temps) + 2; // Buffer
  const min = Math.min(...temps) - 2;
  const range = max - min;

  return (
    <View style={styles.graphContainer}>
      <Text style={styles.graphTitle}>Temperature Trend (7 Days)</Text>
      <View style={styles.graphBody}>
        {data.map((item, index) => {
          // Calculate height percentage relative to container
          const heightPercent = ((item.maxTemp - min) / range) * 100;
          const dayName = new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' });

          return (
            <View key={index} style={styles.graphBarWrapper}>
              <Text style={styles.graphTempText}>{Math.round(item.maxTemp)}°</Text>
              <View style={[styles.graphBar, { height: `${Math.max(heightPercent, 10)}%` }]} />
              <Text style={styles.graphDayText}>{dayName}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// --- 3. WEATHER COMPONENTS ---
const CurrentWeather = memo(({ current, extra, city, weatherProps, time }) => {
  if (!current) return null;
  return (
    <View style={styles.heroSection}>
      <Text style={styles.cityName}>{city}</Text>

      <View style={styles.timeBadge}>
        <Text style={styles.timeText}>{time}</Text>
        <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}</Text>
      </View>

      <MaterialCommunityIcons name={weatherProps.name} size={scale(110)} color="#fff" style={styles.heroIcon} />

      <Text style={styles.temp}>{Math.round(current.temperature)}°</Text>
      <Text style={styles.condition}>{weatherProps.label}</Text>

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
  if (aqi <= 50) return '#00E400';
  if (aqi <= 100) return '#FFFF00';
  if (aqi <= 150) return '#FF7E00';
  return '#FF0000';
};

const StatItem = ({ icon, label, value, color = '#fff' }) => (
  <View style={styles.statItem}>
    <MaterialCommunityIcons name={icon} size={22} color={color} />
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const ForecastRowSimple = memo(({ item, index }) => {
  const getIcon = (code) => {
    if (code === 0) return 'weather-sunny';
    if (code >= 51) return 'weather-rainy';
    if (code >= 71) return 'weather-snowy';
    return 'weather-cloudy';
  };

  // Logic to show "Today", "Tomorrow"
  let dayLabel = new Date(item.date).toLocaleDateString('en-US', { weekday: 'long' });
  if (index === 0) dayLabel = 'Today';
  if (index === 1) dayLabel = 'Tomorrow';

  return (
    <View style={styles.forecastRow}>
      <Text style={styles.dayName}>{dayLabel}</Text>
      <MaterialCommunityIcons name={getIcon(item.code)} size={24} color="#fff" />
      <View style={styles.tempHighLow}>
        <Text style={styles.maxTemp}>{Math.round(item.maxTemp)}°</Text>
        <Text style={styles.minTemp}>{Math.round(item.minTemp)}°</Text>
      </View>
    </View>
  );
});

// Detailed Row for the Modal
const ForecastRowDetailed = memo(({ item }) => {
  const getIcon = (code) => {
    if (code === 0) return 'weather-sunny';
    if (code >= 51) return 'weather-rainy';
    if (code >= 71) return 'weather-snowy';
    return 'weather-cloudy';
  };

  return (
    <View style={styles.detailedRow}>
      {/* Top: Date & Main Icon */}
      <View style={styles.detailedHeader}>
        <Text style={styles.detailedDate}>{new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons name={getIcon(item.code)} size={28} color="#fff" />
          <Text style={styles.detailedTempMain}>{Math.round(item.maxTemp)}°</Text>
        </View>
      </View>

      {/* Bottom: Details Grid */}
      <View style={styles.detailedGrid}>
        <View style={styles.dGridItem}>
          <Text style={styles.dLabel}>Feels Like</Text>
          <Text style={styles.dValue}>{Math.round(item.apparentMax)}°</Text>
        </View>
        <View style={styles.dGridItem}>
          <Text style={styles.dLabel}>Wind</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MaterialCommunityIcons name="arrow-up" size={14} color="#ccc" style={{ transform: [{ rotate: `${item.windDir}deg` }] }} />
            <Text style={styles.dValue}>{item.windSpeed} <Text style={{ fontSize: 10 }}>km/h</Text></Text>
          </View>
        </View>
      </View>
    </View>
  );
});

// --- 4. MAIN CONTROLLER ---
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

  // Modal State
  const [showFullForecast, setShowFullForecast] = useState(false);

  useEffect(() => { getCurrentLocation(); }, []);

  const getCurrentLocation = async () => {
    // Only show full loading if we have NO data yet to prevent flickering
    if (!weatherData) setLoading(true);
    setError(false);

    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLoading(false); return; }

      // Performance: Check Last Known Position first (Instant)
      let loc = await Location.getLastKnownPositionAsync({});
      if (loc) {
        fetchWeather(loc.coords.latitude, loc.coords.longitude, 'My Location');
      } else {
        let freshLoc = await Location.getCurrentPositionAsync({});
        fetchWeather(freshLoc.coords.latitude, freshLoc.coords.longitude, 'My Location');
      }
    } catch (e) { setError(true); setLoading(false); }
  };

  const fetchWeather = async (lat, lon, cityName) => {
    // We update city name immediately, but keep loading 'true' only if no data exists
    setCity(cityName);
    if (!weatherData) setLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      // UPDATED API URL: Added windspeed, winddirection, and apparent_temperature for daily
      const [weatherRes, aqiRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode,apparent_temperature_max,windspeed_10m_max,winddirection_10m_dominant&hourly=relative_humidity_2m,apparent_temperature&timezone=auto`, { signal: controller.signal }),
        fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`, { signal: controller.signal })
      ]);

      clearTimeout(timeoutId);
      if (!weatherRes.ok) throw new Error('Weather error');

      const data = await weatherRes.json();
      const aqiData = await aqiRes.json();

      const timeStr = new Date().toLocaleTimeString('en-US', { timeZone: data.timezone, hour: '2-digit', minute: '2-digit', hour12: true });
      setLocalTime(timeStr);

      const currentHour = new Date().getHours();
      const isNight = currentHour < 6 || currentHour > 19;
      const wCode = data.current_weather.weathercode;

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
          // Extra Details for Full Forecast
          apparentMax: data.daily.apparent_temperature_max[i],
          windSpeed: data.daily.windspeed_10m_max[i],
          windDir: data.daily.winddirection_10m_dominant[i],
        }))
      });
    } catch (e) {
      // Only show error if we have no data to show
      if (!weatherData) setError(true);
    } finally {
      setLoading(false);
    }
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
              // ONLY SHOW 3 DAYS IN MAIN LIST
              data={weatherData.daily.slice(0, 3)}
              keyExtractor={(item) => item.key}
              renderItem={({ item, index }) => <ForecastRowSimple item={item} index={index} />}

              ListHeaderComponent={
                <View>
                  <CurrentWeather
                    current={weatherData.current}
                    extra={weatherData.extra}
                    city={city}
                    time={localTime}
                    weatherProps={weatherProps}
                  />
                  <Text style={styles.sectionTitle}>3-Day Forecast</Text>
                </View>
              }

              ListFooterComponent={
                <TouchableOpacity style={styles.fullForecastBtn} onPress={() => setShowFullForecast(true)}>
                  <Text style={styles.fullForecastText}>7-Day Forecast</Text>
                  <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
                </TouchableOpacity>
              }

              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onScrollBeginDrag={() => { Keyboard.dismiss(); setSearchVisible(false); }}
            />
          ) : null}
        </View>

        {/* --- FULL 7-DAY FORECAST MODAL --- */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showFullForecast}
          onRequestClose={() => setShowFullForecast(false)}
        >
          <View style={styles.modalContainer}>
            {/* Blur/Dark Background */}
            <View style={styles.modalOverlay} />

            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>7-Day Forecast</Text>
                <TouchableOpacity onPress={() => setShowFullForecast(false)} style={styles.closeBtn}>
                  <MaterialCommunityIcons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              {weatherData && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* THE GRAPH */}
                  <ForecastGraph data={weatherData.daily} />

                  {/* DETAILED LIST */}
                  <View style={{ paddingBottom: 40 }}>
                    {weatherData.daily.map((item) => (
                      <ForecastRowDetailed key={item.key} item={item} />
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  safeArea: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#ddd', marginTop: 10 },

  // Search
  searchContainer: { marginHorizontal: 20, marginBottom: 10, marginTop: 10 },
  searchBarGlass: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 30,
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  gpsButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, marginRight: 10 },
  input: { flex: 1, color: '#fff', fontSize: scale(16) },
  dropdown: {
    position: 'absolute', top: 60, left: 0, right: 0,
    backgroundColor: 'rgba(30, 30, 30, 0.85)', borderRadius: 15,
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

  // Forecast List (Simple)
  scrollContent: { paddingBottom: 50 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 20, marginTop: 20, marginBottom: 10 },
  forecastRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 15, paddingHorizontal: 20, marginHorizontal: 20, marginBottom: 5,
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 15,
  },
  dayName: { color: '#fff', fontSize: scale(16), width: 90, fontWeight: '600' },
  tempHighLow: { flexDirection: 'row', width: 90, justifyContent: 'flex-end', gap: 10 },
  maxTemp: { color: '#fff', fontWeight: '700', fontSize: scale(16) },
  minTemp: { color: '#aaa', fontSize: scale(16) },

  // Buttons
  fullForecastBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 20, marginTop: 15, padding: 15, borderRadius: 15,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
  },
  fullForecastText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Error
  errorTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 10 },
  retryBtn: { backgroundColor: '#fff', paddingHorizontal: 30, paddingVertical: 10, borderRadius: 20, marginTop: 20 },
  retryText: { color: '#333', fontWeight: 'bold' },

  // --- MODAL STYLES ---
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)' },
  modalContent: {
    height: '85%', backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 20
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  closeBtn: { padding: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },

  // Graph
  graphContainer: { marginBottom: 25, padding: 15, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20 },
  graphTitle: { color: '#aaa', fontSize: 14, marginBottom: 15, fontWeight: '600' },
  graphBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100 },
  graphBarWrapper: { alignItems: 'center', flex: 1 },
  graphBar: { width: 6, backgroundColor: '#FFD700', borderRadius: 3 },
  graphTempText: { color: '#fff', fontSize: 12, marginBottom: 5, fontWeight: 'bold' },
  graphDayText: { color: '#888', fontSize: 10, marginTop: 5 },

  // Detailed Row
  detailedRow: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15,
    padding: 15, marginBottom: 10
  },
  detailedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  detailedDate: { color: '#fff', fontSize: 16, fontWeight: '600' },
  detailedTempMain: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginLeft: 10 },
  detailedGrid: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 10 },
  dGridItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dLabel: { color: '#888', fontSize: 12, marginRight: 5 },
  dValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
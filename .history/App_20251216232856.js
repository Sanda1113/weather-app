import React, { useState, useEffect, memo } from 'react';
import {
  StyleSheet, Text, View, ActivityIndicator, TextInput, TouchableOpacity,
  Keyboard, StatusBar, FlatList, Dimensions, ImageBackground, Modal, ScrollView
} from 'react-native';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

// --- CONFIGURATION ---
const { width } = Dimensions.get('window');
const scale = (size) => (width / 375) * size;

const BACKGROUNDS = {
  CLEAR_DAY: 'https://images.unsplash.com/photo-1601297183305-6df142704ea2?q=80&w=1000&auto=format&fit=crop',
  CLEAR_NIGHT: 'https://images.unsplash.com/photo-1532978873691-590510492bbb?q=80&w=1000&auto=format&fit=crop',
  CLOUDY: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?q=80&w=1000&auto=format&fit=crop',
  RAIN: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=1000&auto=format&fit=crop',
  SNOW: 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?q=80&w=1000&auto=format&fit=crop',
  THUNDER: 'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?q=80&w=1000&auto=format&fit=crop',
};

// --- HELPER: COLORFUL ICONS ---
const getIconProps = (code) => {
  if (code === 0) return { name: 'weather-sunny', color: '#FFD700', label: 'Sunny' };
  if (code >= 1 && code <= 3) return { name: 'weather-partly-cloudy', color: '#00E0FF', label: 'Cloudy' };
  if (code >= 45 && code <= 48) return { name: 'weather-fog', color: '#B0C4DE', label: 'Foggy' };
  if (code >= 51 && code <= 67) return { name: 'weather-rainy', color: '#4DA6FF', label: 'Rainy' };
  if (code >= 71 && code <= 77) return { name: 'weather-snowy', color: '#00FFFF', label: 'Snowy' };
  if (code >= 95) return { name: 'weather-lightning', color: '#FFD700', label: 'Storm' };
  return { name: 'weather-cloudy', color: '#B0C4DE', label: 'Overcast' };
};

const getAqiColor = (aqi) => {
  if (aqi <= 50) return '#00E400';
  if (aqi <= 100) return '#FFFF00';
  if (aqi <= 150) return '#FF7E00';
  return '#FF0000';
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

  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchBarGlass}>
        <TouchableOpacity onPress={onMyLocation} style={styles.gpsButton}>
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

// --- 2. FORECAST BOX (Glass Container) ---
const ForecastBox = memo(({ dailyData, onExpand }) => {
  if (!dailyData) return null;

  return (
    <View style={styles.glassBoxContainer}>
      {/* Header */}
      <View style={styles.boxHeader}>
        <MaterialCommunityIcons name="calendar-clock" size={20} color="rgba(255,255,255,0.7)" />
        <Text style={styles.boxTitle}>7-Day Forecast</Text>
      </View>

      {/* 3-Day Preview */}
      {dailyData.slice(0, 3).map((item, index) => {
        const iconProps = getIconProps(item.code);
        let label = new Date(item.date).toLocaleDateString('en-US', { weekday: 'long' });
        if (index === 0) label = 'Today';
        if (index === 1) label = 'Tomorrow';

        return (
          <View key={item.key} style={styles.previewRow}>
            <Text style={styles.dayText}>{label}</Text>
            <MaterialCommunityIcons name={iconProps.name} size={28} color={iconProps.color} />
            <View style={styles.tempGroup}>
              <Text style={styles.maxTemp}>{Math.round(item.maxTemp)}°</Text>
              <Text style={styles.minTemp}>{Math.round(item.minTemp)}°</Text>
            </View>
          </View>
        );
      })}

      {/* Button attached inside the box */}
      <TouchableOpacity style={styles.expandButton} onPress={onExpand}>
        <Text style={styles.expandText}>View Full Forecast</Text>
        <MaterialCommunityIcons name="arrow-right" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );
});

// --- 3. GRAPH COMPONENT ---
const ForecastGraph = ({ data }) => {
  if (!data || data.length === 0) return null;
  const temps = data.map(d => d.maxTemp);
  const max = Math.max(...temps) + 2;
  const min = Math.min(...temps) - 2;
  const range = max - min;

  return (
    <View style={styles.graphContainer}>
      <Text style={styles.graphTitle}>Temperature Trend</Text>
      <View style={styles.graphBody}>
        {data.map((item, index) => {
          const heightPercent = ((item.maxTemp - min) / range) * 100;
          const dayName = new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' });
          return (
            <View key={index} style={styles.graphBarWrapper}>
              <Text style={styles.graphTempText}>{Math.round(item.maxTemp)}°</Text>
              <View style={[styles.graphBar, { height: `${Math.max(heightPercent, 10)}%`, backgroundColor: getIconProps(item.code).color }]} />
              <Text style={styles.graphDayText}>{dayName}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// --- 4. CURRENT WEATHER ---
const CurrentWeather = memo(({ current, extra, city, weatherProps, time }) => {
  if (!current) return null;
  return (
    <View style={styles.heroSection}>
      <Text style={styles.cityName}>{city}</Text>
      <View style={styles.timeBadge}>
        <Text style={styles.timeText}>{time}</Text>
        <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}</Text>
      </View>

      <MaterialCommunityIcons name={weatherProps.name} size={scale(110)} color={weatherProps.color} style={styles.heroIcon} />

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

const StatItem = ({ icon, label, value, color = '#fff' }) => (
  <View style={styles.statItem}>
    <MaterialCommunityIcons name={icon} size={22} color={color} />
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const ForecastRowDetailed = memo(({ item }) => {
  const iconProps = getIconProps(item.code);
  return (
    <View style={styles.detailedRow}>
      <View style={styles.detailedHeader}>
        <Text style={styles.detailedDate}>{new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons name={iconProps.name} size={32} color={iconProps.color} />
          <Text style={styles.detailedTempMain}>{Math.round(item.maxTemp)}°</Text>
        </View>
      </View>
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

// --- 5. MAIN CONTROLLER ---
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
  const [city, setCity] = useState('Locating...');
  const [bgImage, setBgImage] = useState(BACKGROUNDS.CLEAR_DAY);
  const [localTime, setLocalTime] = useState('00:00');
  const [searchVisible, setSearchVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { getCurrentLocation(); }, []);

  const getCurrentLocation = async () => {
    if (!weatherData) setLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let loc = await Location.getLastKnownPositionAsync({});
      if (loc) fetchWeather(loc.coords.latitude, loc.coords.longitude, 'My Location');
      else {
        let fresh = await Location.getCurrentPositionAsync({});
        fetchWeather(fresh.coords.latitude, fresh.coords.longitude, 'My Location');
      }
    } catch (e) { setLoading(false); }
  };

  const fetchWeather = async (lat, lon, cityName) => {
    setCity(cityName);
    if (!weatherData) setLoading(true);

    try {
      const [weatherRes, aqiRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode,apparent_temperature_max,windspeed_10m_max,winddirection_10m_dominant&hourly=relative_humidity_2m,apparent_temperature&timezone=auto`),
        fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`)
      ]);
      const data = await weatherRes.json();
      const aqiData = await aqiRes.json();

      // 1. CALCULATE TIMEZONE CORRECTLY FOR BACKGROUND
      const cityDate = new Date().toLocaleTimeString('en-US', { timeZone: data.timezone, hour12: false, hour: 'numeric' });
      const currentHour = parseInt(cityDate);
      const isNight = currentHour < 6 || currentHour > 19;

      // 2. SET DISPLAY TIME
      setLocalTime(new Date().toLocaleTimeString('en-US', { timeZone: data.timezone, hour: '2-digit', minute: '2-digit', hour12: true }));

      const wCode = data.current_weather.weathercode;

      // 3. SET BACKGROUND BASED ON CITY TIME & WEATHER
      if (wCode >= 71) setBgImage(BACKGROUNDS.SNOW);
      else if (wCode >= 51) setBgImage(BACKGROUNDS.RAIN);
      else if (wCode >= 95) setBgImage(BACKGROUNDS.THUNDER);
      else if (wCode >= 1 && wCode <= 48) setBgImage(BACKGROUNDS.CLOUDY);
      else if (isNight) setBgImage(BACKGROUNDS.CLEAR_NIGHT);
      else setBgImage(BACKGROUNDS.CLEAR_DAY);

      // 4. SET DATA
      const localHour = new Date().getHours();
      setWeatherData({
        current: data.current_weather,
        extra: {
          humidity: data.hourly.relative_humidity_2m[localHour] || 0,
          feelsLike: data.hourly.apparent_temperature[localHour] || 0,
          aqi: aqiData.current?.us_aqi || '--',
        },
        daily: data.daily.time.map((date, i) => ({
          key: i.toString(),
          date,
          maxTemp: data.daily.temperature_2m_max[i],
          minTemp: data.daily.temperature_2m_min[i],
          code: data.daily.weathercode[i],
          apparentMax: data.daily.apparent_temperature_max[i],
          windSpeed: data.daily.windspeed_10m_max[i],
          windDir: data.daily.winddirection_10m_dominant[i],
        }))
      });
    } catch (e) { }
    finally { setLoading(false); }
  };

  const weatherProps = getIconProps(weatherData?.current?.weathercode);

  return (
    <ImageBackground source={{ uri: bgImage }} style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' }} />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>

        <SearchModule
          onCitySelect={(item) => fetchWeather(item.latitude, item.longitude, `${item.name}, ${item.country}`)}
          onMyLocation={getCurrentLocation}
          isVisible={searchVisible}
          setIsVisible={setSearchVisible}
        />

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : weatherData ? (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={() => { Keyboard.dismiss(); setSearchVisible(false); }}
          >
            <CurrentWeather
              current={weatherData.current}
              extra={weatherData.extra}
              city={city}
              time={localTime}
              weatherProps={weatherProps}
            />

            {/* THE NEW BOXED FORECAST */}
            <ForecastBox
              dailyData={weatherData.daily}
              onExpand={() => setShowModal(true)}
            />
          </ScrollView>
        ) : null}

        {weatherData && (
          <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>7-Day Forecast</Text>
                  <TouchableOpacity onPress={() => setShowModal(false)}>
                    <MaterialCommunityIcons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <ForecastGraph data={weatherData.daily} />
                  <View style={{ paddingBottom: 40 }}>
                    {weatherData.daily.map(item => (
                      <ForecastRowDetailed key={item.key} item={item} />
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}

      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  // Search
  searchContainer: { marginHorizontal: 20, marginBottom: 10, marginTop: 10, zIndex: 100 },
  searchBarGlass: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 30,
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  gpsButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, marginRight: 10 },
  input: { flex: 1, color: '#fff', fontSize: scale(16) },
  dropdown: {
    position: 'absolute', top: 60, left: 0, right: 0,
    backgroundColor: 'rgba(30, 30, 30, 0.95)', borderRadius: 15,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden',
  },
  dropdownItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  dropdownText: { color: '#fff', fontSize: scale(14) },
  dropdownSub: { color: '#aaa' },

  // Hero
  heroSection: { alignItems: 'center', marginTop: 10, marginBottom: 20 },
  cityName: { fontSize: scale(28), fontWeight: '700', color: '#fff', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 10 },
  timeBadge: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20, marginTop: 10, alignItems: 'center' },
  timeText: { fontSize: scale(18), color: '#fff', fontWeight: '600' },
  dateText: { fontSize: scale(12), color: '#ccc' },
  heroIcon: { marginVertical: 10, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 20 },
  temp: { fontSize: scale(90), fontWeight: '300', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 10 },
  condition: { fontSize: scale(24), fontWeight: '500', color: '#fff', marginBottom: 20, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 5 },

  // Stats
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

  // Glass Box Container (NEW)
  glassBoxContainer: {
    marginHorizontal: 20, padding: 20, backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', marginBottom: 50
  },
  boxHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 8 },
  boxTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '600' },
  previewRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  dayText: { color: '#fff', fontSize: scale(16), width: 100, fontWeight: '500' },
  tempGroup: { flexDirection: 'row', width: 80, justifyContent: 'flex-end', gap: 10 },
  maxTemp: { color: '#fff', fontWeight: '700', fontSize: scale(16) },
  minTemp: { color: 'rgba(255,255,255,0.6)', fontSize: scale(16) },
  expandButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 15, paddingVertical: 5, gap: 5
  },
  expandText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { height: '85%', backgroundColor: '#1a1a1a', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },

  // Graph
  graphContainer: { marginBottom: 25, padding: 15, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20 },
  graphTitle: { color: '#aaa', fontSize: 14, marginBottom: 15, fontWeight: '600' },
  graphBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100 },
  graphBarWrapper: { alignItems: 'center', flex: 1 },
  graphBar: { width: 6, borderRadius: 3 },
  graphTempText: { color: '#fff', fontSize: 12, marginBottom: 5, fontWeight: 'bold' },
  graphDayText: { color: '#888', fontSize: 10, marginTop: 5 },

  // Detailed Row
  detailedRow: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, padding: 15, marginBottom: 10 },
  detailedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  detailedDate: { color: '#fff', fontSize: 16, fontWeight: '600' },
  detailedTempMain: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginLeft: 10 },
  detailedGrid: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 10 },
  dGridItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dLabel: { color: '#888', fontSize: 12, marginRight: 5 },
  dValue: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Error
  errorTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 10 },
  retryBtn: { backgroundColor: '#fff', paddingHorizontal: 30, paddingVertical: 10, borderRadius: 20, marginTop: 20 },
  retryText: { color: '#333', fontWeight: 'bold' }
});
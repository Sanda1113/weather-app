import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  StyleSheet, Text, View, ActivityIndicator, TextInput, TouchableOpacity,
  Keyboard, StatusBar, Platform, FlatList, Dimensions, Alert
} from 'react-native';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// --- RESPONSIVE SCALING ---
const { width } = Dimensions.get('window');
const scale = (size) => (width / 375) * size;

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
      if (query.length < 3) {
        setIsSearching(false);
        return;
      }
      try {
        const response = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=5&language=en&format=json`
        );
        const data = await response.json();
        if (data.results) {
          setSuggestions(data.results);
          setIsVisible(true);
        }
      } catch (e) {
        // silent fail
      } finally {
        setIsSearching(false);
      }
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

  const handleGPSPress = () => {
    Keyboard.dismiss();
    setQuery('');
    setSuggestions([]);
    setIsVisible(false);
    onMyLocation();
  };

  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchBarGlass}>
        <TouchableOpacity onPress={handleGPSPress} style={styles.gpsButton}>
          <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#fff" />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Search city..."
          placeholderTextColor="rgba(255,255,255,0.6)"
          value={query}
          onChangeText={setQuery}
        />

        {isSearching ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : query.length > 0 ? (
          <TouchableOpacity onPress={() => { setQuery(''); setIsVisible(false); }}>
            <MaterialCommunityIcons name="close-circle" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        ) : (
          <MaterialCommunityIcons name="magnify" size={24} color="rgba(255,255,255,0.7)" />
        )}
      </View>

      {isVisible && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          {suggestions.map((item, index) => (
            <TouchableOpacity
              key={`${item.id}-${index}`}
              style={styles.dropdownItem}
              onPress={() => handleSelect(item)}
            >
              <Text style={styles.dropdownText}>
                {item.name}, <Text style={styles.dropdownSub}>{item.country}</Text>
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

// --- 2. WEATHER COMPONENTS ---
const CurrentWeather = memo(({ current, extra, city, weatherProps }) => {
  if (!current) return null;
  return (
    <View style={styles.heroSection}>
      <Text style={styles.cityName}>{city}</Text>
      <Text style={styles.date}>{new Date().toDateString()}</Text>

      <MaterialCommunityIcons
        name={weatherProps.name}
        size={scale(120)}
        color={weatherProps.color}
        style={styles.heroIcon}
      />

      <Text style={styles.temp}>{Math.round(current.temperature)}°</Text>
      <Text style={styles.condition}>
        {weatherProps.name.replace('weather-', '').replace('-', ' ').toUpperCase()}
      </Text>

      <View style={styles.statsGlass}>
        <StatItem icon="weather-windy" label="Wind" value={`${current.windspeed} km/h`} />
        <View style={styles.statDivider} />
        <StatItem icon="water-percent" label="Humidity" value={`${extra.humidity}%`} />
        <View style={styles.statDivider} />
        <StatItem icon="thermometer" label="Feels Like" value={`${Math.round(extra.feelsLike)}°`} />
      </View>
    </View>
  );
});

const StatItem = ({ icon, label, value }) => (
  <View style={styles.statItem}>
    <MaterialCommunityIcons name={icon} size={22} color="#fff" />
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const ForecastRow = memo(({ item }) => {
  const getIcon = (code) => {
    if (code === 0) return { name: 'weather-sunny', color: '#FFD700' };
    if (code >= 51) return { name: 'weather-rainy', color: '#00BFFF' };
    return { name: 'weather-cloudy', color: '#dcdcdc' };
  };
  const icon = getIcon(item.code);
  return (
    <View style={styles.forecastRow}>
      <Text style={styles.dayName}>
        {new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' })}
      </Text>
      <MaterialCommunityIcons name={icon.name} size={24} color={icon.color} />
      <View style={styles.tempHighLow}>
        <Text style={styles.maxTemp}>{Math.round(item.maxTemp)}°</Text>
        <Text style={styles.minTemp}>{Math.round(item.minTemp)}°</Text>
      </View>
    </View>
  );
});

// --- 3. MAIN APP ---
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

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    setLoading(true);
    setError(false);
    setCity('Locating...');

    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable location services.');
        setLoading(false);
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      fetchWeather(loc.coords.latitude, loc.coords.longitude, 'My Location');
    } catch (e) {
      setError(true);
      setLoading(false);
    }
  };

  const fetchWeather = async (lat, lon, cityName) => {
    setLoading(true);
    setError(false);
    setCity(cityName);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&hourly=relative_humidity_2m,apparent_temperature&timezone=auto`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error('Network error');

      const data = await res.json();
      const currentHour = new Date().getHours();
      setWeatherData({
        current: data.current_weather,
        extra: {
          humidity: data.hourly.relative_humidity_2m[currentHour] || 0,
          feelsLike: data.hourly.apparent_temperature[currentHour] || 0,
        },
        daily: data.daily.time.map((date, i) => ({
          key: i.toString(),
          date,
          maxTemp: data.daily.temperature_2m_max[i],
          minTemp: data.daily.temperature_2m_min[i],
          code: data.daily.weathercode[i],
        }))
      });
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const getWeatherProps = (code) => {
    if (code === 0) return { name: 'weather-sunny', color: '#FFD700', bg: ['#2980B9', '#6DD5FA'] };
    if (code >= 51) return { name: 'weather-rainy', color: '#00BFFF', bg: ['#2c3e50', '#4ca1af'] };
    return { name: 'weather-cloudy', color: '#dcdcdc', bg: ['#4c669f', '#3b5998', '#192f6a'] };
  };

  const weatherProps = getWeatherProps(weatherData?.current?.weathercode);

  return (
    <LinearGradient colors={weatherProps.bg} style={styles.container}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />
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
              <Text style={styles.loadingText}>Updating Forecast...</Text>
            </View>
          ) : error ? (
            <View style={styles.center}>
              <MaterialCommunityIcons name="wifi-off" size={60} color="rgba(255,255,255,0.6)" />
              <Text style={styles.errorTitle}>No Connection</Text>
              <TouchableOpacity onPress={getCurrentLocation} style={styles.retryBtn}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
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
                  weatherProps={weatherProps}
                />
              }
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onScrollBeginDrag={() => {
                Keyboard.dismiss();
                setSearchVisible(false);
              }}
            />
          ) : null}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#ddd', marginTop: 10 },

  // Search
  searchContainer: { marginHorizontal: 20, marginBottom: 10, marginTop: 10 },
  searchBarGlass: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 30,
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  gpsButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    marginRight: 10,
  },
  input: { flex: 1, color: '#fff', fontSize: scale(16) },
  dropdown: {
    position: 'absolute', top: 60, left: 0, right: 0,
    // UPDATED: Darker background (0.85 opacity) for better readability
    backgroundColor: 'rgba(30, 30, 30, 0.85)',
    borderRadius: 15,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', overflow: 'hidden',
  },
  dropdownItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  dropdownText: { color: '#fff', fontSize: scale(14) },
  dropdownSub: { color: '#aaa' },

  // Weather
  heroSection: { alignItems: 'center', marginTop: 10, marginBottom: 20 },
  cityName: { fontSize: scale(30), fontWeight: '700', color: '#fff', textAlign: 'center' },
  date: { fontSize: scale(14), color: '#ddd', marginTop: 5 },
  heroIcon: { marginVertical: 20 },
  temp: { fontSize: scale(80), fontWeight: '300', color: '#fff' },
  condition: { fontSize: scale(20), fontWeight: '500', color: '#eee', marginBottom: 20 },

  statsGlass: {
    flexDirection: 'row', justifyContent: 'space-between', width: '90%',
    paddingVertical: 15, backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  statItem: { alignItems: 'center', flex: 1 },
  statLabel: { color: '#aaa', fontSize: scale(11), marginTop: 5 },
  statValue: { color: '#fff', fontSize: scale(15), fontWeight: '700' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)', height: '80%' },

  scrollContent: { paddingBottom: 50 },
  forecastRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 20, marginHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  dayName: { color: '#fff', fontSize: scale(15), width: 60, fontWeight: '600' },
  tempHighLow: { flexDirection: 'row', width: 80, justifyContent: 'flex-end', gap: 10 },
  maxTemp: { color: '#fff', fontWeight: '700', fontSize: scale(15) },
  minTemp: { color: '#aaa', fontSize: scale(15) },

  errorTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 10 },
  retryBtn: { backgroundColor: '#fff', paddingHorizontal: 30, paddingVertical: 10, borderRadius: 20, marginTop: 20 },
  retryText: { color: '#333', fontWeight: 'bold' }
});
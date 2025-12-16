import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  StyleSheet, Text, View, ActivityIndicator, TextInput, TouchableOpacity,
  Keyboard, Alert, StatusBar, Platform, FlatList, RefreshControl, Dimensions
} from 'react-native';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// --- OPTIMIZATION 1: Move static helpers OUTSIDE the component ---
// This prevents React from recreating these functions 60 times a second.

const getWeatherIconProps = (code) => {
  if (code === 0) return { name: 'weather-sunny', color: '#FFD700' };
  if (code >= 1 && code <= 3) return { name: 'weather-partly-cloudy', color: '#dcdcdc' };
  if (code >= 45 && code <= 48) return { name: 'weather-fog', color: '#B0C4DE' };
  if (code >= 51 && code <= 67) return { name: 'weather-rainy', color: '#00BFFF' };
  if (code >= 71 && code <= 77) return { name: 'weather-snowy', color: '#E0FFFF' };
  if (code >= 95) return { name: 'weather-lightning', color: '#FF8C00' };
  return { name: 'weather-cloudy', color: '#dcdcdc' };
};

const getGradientColors = (code) => {
  if ((code >= 51 && code <= 67) || (code >= 95)) return ['#2c3e50', '#4ca1af'];
  if (code === 0) return ['#2980B9', '#6DD5FA'];
  return ['#4c669f', '#3b5998', '#192f6a'];
};

const getDayName = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

// --- OPTIMIZATION 2: Memoize List Items ---
// This component will ONLY re-render if its specific data changes.
const ForecastItem = memo(({ item }) => {
  const dayIcon = getWeatherIconProps(item.code);
  return (
    <View style={styles.forecastRow}>
      <Text style={styles.dayName}>{getDayName(item.date)}</Text>
      <View style={styles.dayIconRow}>
        <MaterialCommunityIcons name={dayIcon.name} size={24} color={dayIcon.color} />
      </View>
      <View style={styles.tempHighLow}>
        <Text style={styles.maxTemp}>{Math.round(item.maxTemp)}°</Text>
        <Text style={styles.minTemp}>{Math.round(item.minTemp)}°</Text>
      </View>
    </View>
  );
});

export default function App() {
  // State
  const [currentWeather, setCurrentWeather] = useState(null);
  const [dailyForecast, setDailyForecast] = useState([]);
  const [extraData, setExtraData] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [displayedCity, setDisplayedCity] = useState('Locating...');

  // Search State
  const [citySearch, setCitySearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // OPTIMIZATION 3: Refs for Debouncing
  const debounceTimer = useRef(null);

  useEffect(() => {
    getCurrentLocationWeather();
  }, []);

  const getCurrentLocationWeather = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLoading(false);
      return;
    }
    let userLocation = await Location.getCurrentPositionAsync({});
    fetchWeather(userLocation.coords.latitude, userLocation.coords.longitude, 'My Location');
  };

  const fetchWeather = async (lat, lon, cityName) => {
    if (!refreshing) setLoading(true);
    setDisplayedCity(cityName || 'Custom Location');
    setShowSuggestions(false);
    setCitySearch('');
    Keyboard.dismiss();

    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&hourly=relative_humidity_2m,apparent_temperature&timezone=auto`
      );
      const data = await response.json();

      setCurrentWeather(data.current_weather);

      const currentHour = new Date().getHours();
      setExtraData({
        humidity: data.hourly.relative_humidity_2m[currentHour] || 0,
        feelsLike: data.hourly.apparent_temperature[currentHour] || data.current_weather.temperature,
      });

      const formattedForecast = data.daily.time.map((date, index) => ({
        date: date,
        maxTemp: data.daily.temperature_2m_max[index],
        minTemp: data.daily.temperature_2m_min[index],
        code: data.daily.weathercode[index],
        key: index.toString(),
      }));
      setDailyForecast(formattedForecast);

    } catch (error) {
      // Silent fail or simple alert
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // --- FAST SEARCH LOGIC ---
  const handleSearchTextChange = (text) => {
    setCitySearch(text); // Update UI immediately so typing feels fast

    // Clear previous timer if user keeps typing
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    // Only hit the API if user stops typing for 400ms
    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(text);
    }, 400);
  };

  const fetchSuggestions = async (text) => {
    if (text.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${text}&count=5&language=en&format=json`
      );
      const data = await response.json();
      if (data.results) {
        setSuggestions(data.results);
        setShowSuggestions(true);
      }
    } catch (e) { /* ignore */ }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    getCurrentLocationWeather();
  }, []);

  const renderHeader = useCallback(() => {
    if (!currentWeather) return null;
    const weatherProps = getWeatherIconProps(currentWeather.weathercode);

    return (
      <View>
        <View style={styles.heroSection}>
          <Text style={styles.cityName}>{displayedCity}</Text>
          <Text style={styles.date}>{new Date().toDateString()}</Text>
          <View style={styles.heroIconContainer}>
            <MaterialCommunityIcons name={weatherProps.name} size={140} color={weatherProps.color} />
          </View>
          <Text style={styles.temp}>{Math.round(currentWeather.temperature)}°</Text>
          <Text style={styles.condition}>
            {weatherProps.name.replace('weather-', '').replace('-', ' ').toUpperCase()}
          </Text>
        </View>

        <View style={styles.statsContainerWrapper}>
          <View style={styles.statsGlass}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="weather-windy" size={24} color="#A4B0BE" />
              <Text style={styles.statLabel}>Wind</Text>
              <Text style={styles.statValue}>{currentWeather.windspeed} km/h</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="water-percent" size={24} color="#74B9FF" />
              <Text style={styles.statLabel}>Humidity</Text>
              <Text style={styles.statValue}>{extraData.humidity}%</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="thermometer" size={24} color="#FF7675" />
              <Text style={styles.statLabel}>Feels Like</Text>
              <Text style={styles.statValue}>{Math.round(extraData.feelsLike)}°</Text>
            </View>
          </View>
        </View>
        <Text style={styles.sectionTitle}>7-Day Forecast</Text>
      </View>
    );
  }, [currentWeather, displayedCity, extraData]);

  const gradientColors = getGradientColors(currentWeather?.weathercode);

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Search Header */}
      <View style={styles.headerContainer}>
        <View style={styles.searchBarGlass}>
          <MaterialCommunityIcons name="magnify" size={24} color="rgba(255,255,255,0.7)" />
          <TextInput
            style={styles.input}
            placeholder="Search city..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={citySearch}
            onChangeText={handleSearchTextChange}
          />
          {citySearch.length > 0 && (
            <TouchableOpacity onPress={() => {
              setCitySearch('');
              setShowSuggestions(false);
            }}>
              <MaterialCommunityIcons name="close-circle" size={20} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Suggestion Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((item, index) => (
            <TouchableOpacity
              key={`${item.id}-${index}`}
              style={styles.suggestionItem}
              onPress={() => fetchWeather(item.latitude, item.longitude, `${item.name}, ${item.country}`)}
            >
              <MaterialCommunityIcons name="map-marker" size={18} color="#fff" style={{ marginRight: 10 }} />
              <View>
                <Text style={styles.suggestionText}>{item.name}</Text>
                <Text style={styles.suggestionSubText}>{item.admin1 ? `${item.admin1}, ` : ''}{item.country}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Fetching Weather...</Text>
        </View>
      ) : (
        <FlatList
          data={dailyForecast}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => <ForecastItem item={item} />} // Using Memoized Component
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
          }
          // OPTIMIZATION 4: FlatList Performance Props
          initialNumToRender={7} // Only render what fits on screen first
          windowSize={3} // Reduce memory usage for off-screen items
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    marginTop: Platform.OS === 'ios' ? 60 : 40,
    marginHorizontal: 20,
    zIndex: 20,
    marginBottom: 10,
  },
  searchBarGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 30,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 115 : 95,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(30, 30, 30, 0.98)',
    borderRadius: 15,
    zIndex: 100,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  suggestionText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  suggestionSubText: { color: '#aaa', fontSize: 12 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: 'rgba(255,255,255,0.7)', marginTop: 15, fontSize: 16 },
  scrollContent: { paddingBottom: 50 },
  heroSection: { alignItems: 'center', marginTop: 10, marginBottom: 30 },
  cityName: { fontSize: 34, fontWeight: '700', color: '#fff', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.1)', textShadowRadius: 10 },
  date: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 5 },
  heroIconContainer: { marginVertical: 20 },
  temp: { fontSize: 90, fontWeight: '300', color: '#fff', includeFontPadding: false },
  condition: { fontSize: 24, fontWeight: '500', color: 'rgba(255,255,255,0.9)', letterSpacing: 1 },
  statsContainerWrapper: { marginHorizontal: 20, marginBottom: 30 },
  statsGlass: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statItem: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)', height: '80%' },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 5, fontWeight: '600', textTransform: 'uppercase' },
  statValue: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 2 },
  sectionTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 18, fontWeight: '600', marginBottom: 10, marginLeft: 25 },
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dayName: { color: '#fff', fontSize: 16, fontWeight: '600', width: 50 },
  dayIconRow: { flex: 1, alignItems: 'center' },
  tempHighLow: { flexDirection: 'row', width: 80, justifyContent: 'flex-end' },
  maxTemp: { color: '#fff', fontSize: 16, fontWeight: '700', marginLeft: 10 },
  minTemp: { color: 'rgba(255,255,255,0.6)', fontSize: 16, marginLeft: 10 }
});
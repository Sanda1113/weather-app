import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, TouchableOpacity, ImageBackground, ScrollView, StatusBar, Keyboard, Alert, Modal } from 'react-native';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Import our files
import { BACKGROUNDS, getIconProps } from './src/helpers';
import SearchModule from './src/SearchModule';
import CurrentWeather from './src/CurrentWeather';
import ForecastBox from './src/ForecastBox';
import HourlyForecast from './src/HourlyForecast';

// --- GRAPH & MODAL LOGIC ---
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

const ForecastRowDetailed = ({ item }) => {
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
};

export default function App() {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('Locating...');
  const [bgImage, setBgImage] = useState(BACKGROUNDS.CLEAR_DAY);

  const [now, setNow] = useState(new Date());
  const [timezone, setTimezone] = useState('UTC');

  const [searchVisible, setSearchVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Track if we are in "Manual Search" mode or "GPS" mode
  // If manual, we don't update GPS location, just weather.
  const isManualSearch = useRef(false);
  const currentCoords = useRef(null);

  useEffect(() => {
    // Initial Load
    getFullUpdate();

    // TIMER 1: Clock (Every 1 Second)
    const clockInterval = setInterval(() => setNow(new Date()), 1000);

    // TIMER 2: Full Sync (Location + Weather) Every 10 Seconds
    const syncInterval = setInterval(() => {
      getFullUpdate(true); // 'true' means silent update (no loading spinner)
    }, 10000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(syncInterval);
    };
  }, []);

  const getFullUpdate = async (isSilent = false) => {
    // If user searched for a city manually, we DO NOT overwrite it with GPS
    if (isManualSearch.current && currentCoords.current) {
      fetchWeather(currentCoords.current.lat, currentCoords.current.lon, currentCoords.current.cityName, isSilent);
      return;
    }

    // Otherwise, Get Fresh GPS Location
    try {
      if (!isSilent && !weatherData) setLoading(true);

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

      // Update our ref so we know where we are
      currentCoords.current = { lat: loc.coords.latitude, lon: loc.coords.longitude, cityName: 'My Location' };

      fetchWeather(loc.coords.latitude, loc.coords.longitude, 'My Location', isSilent);
    } catch (e) {
      if (!isSilent) setLoading(false);
    }
  };

  const fetchWeather = async (lat, lon, cityName, isSilent = false) => {
    setCity(cityName);
    if (!isSilent && !weatherData) setLoading(true);

    try {
      // UPDATED API: We now ask for "current" variables explicitly including precipitation
      const [weatherRes, aqiRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,weather_code,wind_speed_10m,wind_direction_10m&daily=temperature_2m_max,temperature_2m_min,weather_code,apparent_temperature_max,windspeed_10m_max,winddirection_10m_dominant&hourly=temperature_2m,weather_code,relative_humidity_2m,apparent_temperature,windspeed_10m,winddirection_10m&forecast_hours=24&timezone=auto`),
        fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`)
      ]);
      const data = await weatherRes.json();
      const aqiData = await aqiRes.json();

      setTimezone(data.timezone);

      // --- INTELLIGENT WEATHER CODE LOGIC ---
      // If the API says "Cloudy" (codes 1-3) but there is actual rain (precipitation > 0),
      // we FORCE the code to be Rain (61) to match reality.
      let currentCode = data.current.weather_code;
      const isRainingNow = (data.current.rain > 0 || data.current.showers > 0 || data.current.precipitation > 0);

      if (isRainingNow && (currentCode === 0 || currentCode === 1 || currentCode === 2 || currentCode === 3)) {
        currentCode = 61; // Force "Rainy" state
      }

      const isNight = data.current.is_day === 0;

      // Update Background based on the NEW corrected code
      if (currentCode >= 71) setBgImage(BACKGROUNDS.SNOW);
      else if (currentCode >= 51) setBgImage(BACKGROUNDS.RAIN); // This will now catch the forced rain
      else if (currentCode >= 95) setBgImage(BACKGROUNDS.THUNDER);
      else if (currentCode >= 1 && currentCode <= 48) setBgImage(BACKGROUNDS.CLOUDY);
      else if (isNight) setBgImage(BACKGROUNDS.CLEAR_NIGHT);
      else setBgImage(BACKGROUNDS.CLEAR_DAY);

      setWeatherData({
        current: {
          temperature: data.current.temperature_2m,
          windspeed: data.current.wind_speed_10m,
          weathercode: currentCode, // Use our corrected code
          is_day: data.current.is_day
        },
        hourly: data.hourly.time.map((time, i) => ({
          key: time,
          time: new Date(time).toLocaleTimeString('en-GB', {
            timeZone: data.timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }),
          temp: Math.round(data.hourly.temperature_2m[i]),
          code: data.hourly.weather_code[i],
          windSpeed: data.hourly.windspeed_10m[i],
          windDir: data.hourly.winddirection_10m[i],
        })),
        extra: {
          humidity: data.current.relative_humidity_2m,
          feelsLike: data.current.apparent_temperature,
          aqi: aqiData.current?.us_aqi || '--',
        },
        daily: data.daily.time.map((date, i) => ({
          key: i.toString(),
          date,
          maxTemp: data.daily.temperature_2m_max[i],
          minTemp: data.daily.temperature_2m_min[i],
          code: data.daily.weather_code[i],
          apparentMax: data.daily.apparent_temperature_max[i],
          windSpeed: data.daily.windspeed_10m_max[i],
          windDir: data.daily.winddirection_10m_dominant[i],
        }))
      });
    } catch (e) {
      if (!isSilent) Alert.alert("Error", "Could not fetch weather");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const onManualCitySelect = (item) => {
    isManualSearch.current = true; // Stop GPS updates
    currentCoords.current = { lat: item.latitude, lon: item.longitude, cityName: `${item.name}, ${item.country}` };
    fetchWeather(item.latitude, item.longitude, `${item.name}, ${item.country}`);
  };

  const onReturnToGPS = () => {
    isManualSearch.current = false; // Resume GPS updates
    getFullUpdate();
  };

  const weatherProps = getIconProps(weatherData?.current?.weathercode);

  const displayTime = now.toLocaleTimeString('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return (
    <ImageBackground source={{ uri: bgImage }} style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' }} />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>

          <SearchModule
            onCitySelect={onManualCitySelect}
            onMyLocation={onReturnToGPS}
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
                time={displayTime}
                weatherProps={weatherProps}
              />

              <HourlyForecast hourlyData={weatherData.hourly} />

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
      </SafeAreaProvider>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { height: '80%', backgroundColor: '#1a1a1a', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 },
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
});
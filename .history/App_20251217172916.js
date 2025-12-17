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

// --- CONFIGURATION ---
const API_KEY = 'd2c940169fd15b6353bf26314c3b6b81'; // Sanda's Key

// --- GRAPH & MODAL LOGIC ---
const ForecastGraph = ({ data }) => {
  if (!data || data.length === 0) return null;
  const temps = data.map(d => d.maxTemp);
  const max = Math.max(...temps) + 2;
  const min = Math.min(...temps) - 2;
  const range = max - min;

  return (
    <View style={styles.graphContainer}>
      <Text style={styles.graphTitle}>Temperature Trend (5 Days)</Text>
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
  const [timezoneOffset, setTimezoneOffset] = useState(0);

  const [searchVisible, setSearchVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const isManualSearch = useRef(false);
  const currentCoords = useRef(null);

  useEffect(() => {
    // Initial Load
    getFullUpdate();

    // CLOCK TIMER (1s)
    const clockInterval = setInterval(() => setNow(new Date()), 1000);

    // WEATHER SYNC TIMER (15s)
    const syncInterval = setInterval(() => {
      getFullUpdate(true);
    }, 15000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(syncInterval);
    };
  }, []);

  const getFullUpdate = async (isSilent = false) => {
    // If user manually searched a city, keep updating that city
    if (isManualSearch.current && currentCoords.current) {
      fetchWeather(currentCoords.current.lat, currentCoords.current.lon, currentCoords.current.cityName, isSilent);
      return;
    }

    // GPS LOGIC
    try {
      if (!isSilent && !weatherData) setLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      // ACCURACY FIX: Request Highest Accuracy (Uses GPS hardware)
      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });

      currentCoords.current = { lat: loc.coords.latitude, lon: loc.coords.longitude, cityName: 'Detecting...' };
      fetchWeather(loc.coords.latitude, loc.coords.longitude, null, isSilent); // Pass null name to auto-detect
    } catch (e) {
      if (!isSilent) setLoading(false);
    }
  };

  const mapOWMCode = (id) => {
    if (id >= 200 && id < 300) return 95; // Thunderstorm
    if (id >= 300 && id < 400) return 61; // Drizzle
    if (id >= 500 && id < 600) return 61; // Rain
    if (id >= 600 && id < 700) return 71; // Snow
    if (id >= 700 && id < 800) return 45; // Fog/Atmosphere
    if (id === 800) return 0; // Clear
    if (id > 800) return 3; // Clouds
    return 3;
  };

  const getDetailedLabel = (id, main, forceRain = false, forceSnow = false) => {
    if (forceSnow) return "Chance of Snow";
    if (forceRain) return "Chance of Rain";

    if (id >= 200 && id <= 232) return "Thunderstorm";
    if (id >= 300 && id <= 321) return "Drizzle";
    if (id === 500) return "Light Rain";
    if (id === 501) return "Moderate Rain";
    if (id >= 502 && id <= 504) return "Heavy Rain";
    if (id === 511) return "Freezing Rain";
    if (id >= 520 && id <= 531) return "Shower Rain";
    if (id >= 600 && id <= 622) return "Snow";
    if (id >= 701 && id <= 781) return "Fog / Mist";
    if (id === 800) return "Clear Sky";
    if (id === 801) return "Partly Cloudy";
    if (id >= 802) return "Cloudy";

    return main;
  };

  const fetchWeather = async (lat, lon, cityName, isSilent = false) => {
    if (!isSilent && !weatherData) setLoading(true);

    try {
      const currentRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
      const forecastRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
      const aqiRes = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`);

      if (currentRes.status !== 200) throw new Error("API Error");

      const currentData = await currentRes.json();
      const forecastData = await forecastRes.json();
      const aqiData = await aqiRes.json();

      setTimezoneOffset(currentData.timezone);

      // --- LIVE ACCURACY ENGINE ---
      let codeId = currentData.weather[0].id;
      let temp = currentData.main.temp;
      let forceRain = false;
      let forceSnow = false;

      // 1. Check RAIN VOLUME (Most Accurate)
      // If there is recorded rain in the last 1h, it IS raining, regardless of code.
      if (currentData.rain && (currentData.rain['1h'] > 0 || currentData.rain['3h'] > 0)) {
        if (codeId >= 800) { codeId = 500; forceRain = true; } // Force Rain ID
      }

      // 2. Check FORECAST PROBABILITY (Predictive Correction)
      // If no volume data, but POP (Probability of Precipitation) is high (>20%)
      const immediateForecast = forecastData.list[0];
      if (codeId >= 800 && immediateForecast.pop > 0.2) {
        if (temp < 0) { codeId = 600; forceSnow = true; }
        else { codeId = 500; forceRain = true; }
      }

      // 3. SEVERITY CHECK (Multi-condition)
      // Prioritize: Thunder > Snow > Rain > Fog > Clouds
      if (currentData.weather.length > 1) {
        const sorted = [...currentData.weather].sort((a, b) => {
          // Custom weight: Thunder(2xx)=100, Snow(6xx)=90, Rain(5xx)=80, Fog(7xx)=70, Drizzle(3xx)=60
          const getWeight = (id) => (Math.floor(id / 100) === 2 ? 100 : Math.floor(id / 100) === 6 ? 90 : Math.floor(id / 100) === 5 ? 80 : 0);
          return getWeight(b.id) - getWeight(a.id);
        });
        if (Math.floor(sorted[0].id / 100) <= 6) { // If severe weather found
          codeId = sorted[0].id;
        }
      }

      const displayLabel = getDetailedLabel(codeId, currentData.weather[0].main, forceRain, forceSnow);
      const mappedCode = mapOWMCode(codeId);
      const isNight = currentData.weather[0].icon.includes('n');

      // Background
      if (codeId >= 200 && codeId < 300) setBgImage(BACKGROUNDS.THUNDER);
      else if (codeId >= 600 && codeId < 700) setBgImage(BACKGROUNDS.SNOW);
      else if (codeId >= 300 && codeId < 600) setBgImage(BACKGROUNDS.RAIN);
      else if (codeId >= 700 && codeId < 800) setBgImage(BACKGROUNDS.CLOUDY);
      else if (codeId >= 801) setBgImage(BACKGROUNDS.CLOUDY);
      else if (isNight) setBgImage(BACKGROUNDS.CLEAR_NIGHT);
      else setBgImage(BACKGROUNDS.CLEAR_DAY);

      // --- HOURLY ACCURACY ---
      const hourly = forecastData.list.slice(0, 8).map(item => {
        const utcDate = new Date(item.dt * 1000);
        const localDate = new Date(utcDate.getTime() + (currentData.timezone * 1000));
        const hourStr = localDate.getUTCHours().toString().padStart(2, '0') + ':00';

        // Smart Hourly Icon
        let hCode = item.weather[0].id;
        if (hCode >= 800 && item.pop > 0.25) hCode = (item.main.temp < 0) ? 600 : 500;

        return {
          key: item.dt.toString(),
          time: hourStr,
          temp: Math.round(item.main.temp),
          code: mapOWMCode(hCode),
          windSpeed: (item.wind.speed * 3.6).toFixed(1),
          windDir: item.wind.deg,
        };
      });

      // --- DAILY PREDICTION ACCURACY (The "Worst Case" Aggregator) ---
      const dailyMap = {};
      forecastData.list.forEach(item => {
        const date = new Date((item.dt + currentData.timezone) * 1000).toISOString().split('T')[0];
        if (!dailyMap[date]) {
          dailyMap[date] = {
            date: new Date(item.dt * 1000),
            temps: [], codes: [], windSpeeds: [], windDirs: [], feels_like: [], pops: []
          };
        }
        dailyMap[date].temps.push(item.main.temp);
        dailyMap[date].codes.push(item.weather[0].id); // Capture ALL codes for the day
        dailyMap[date].windSpeeds.push(item.wind.speed);
        dailyMap[date].windDirs.push(item.wind.deg);
        dailyMap[date].feels_like.push(item.main.feels_like);
        dailyMap[date].pops.push(item.pop);
      });

      const daily = Object.values(dailyMap).slice(0, 5).map((d, i) => {
        // Find the "Severe" weather for the day (Thunder > Snow > Rain > Clear)
        // We do NOT want to show "Sunny" if it rains at 5 PM.
        let worstCodeId = 800;
        let maxSeverity = 0;

        const severity = (id) => {
          if (id >= 200 && id < 300) return 100; // Thunder
          if (id >= 600 && id < 700) return 90;  // Snow
          if (id >= 500 && id < 600) return 80;  // Rain
          if (id >= 300 && id < 400) return 70;  // Drizzle
          if (id >= 700 && id < 800) return 60;  // Fog
          if (id > 800) return 10;               // Clouds
          return 0;                              // Clear
        };

        d.codes.forEach(c => {
          if (severity(c) > maxSeverity) {
            maxSeverity = severity(c);
            worstCodeId = c;
          }
        });

        // Safety Check: If forecast probability > 40% anytime, force Rain icon if we missed it
        const highRainChance = d.pops.some(p => p > 0.40);
        if (maxSeverity < 70 && highRainChance) {
          worstCodeId = (d.maxTemp < 0) ? 600 : 500;
        }

        return {
          key: i.toString(),
          date: d.date,
          maxTemp: Math.max(...d.temps),
          minTemp: Math.min(...d.temps),
          code: mapOWMCode(worstCodeId),
          apparentMax: Math.max(...d.feels_like),
          windSpeed: Math.round(Math.max(...d.windSpeeds) * 3.6),
          windDir: d.windDirs[0],
        };
      });

      setWeatherData({
        current: {
          temperature: currentData.main.temp,
          windspeed: Math.round(currentData.wind.speed * 3.6),
          weathercode: mappedCode,
        },
        hourly: hourly,
        extra: {
          humidity: currentData.main.humidity,
          feelsLike: currentData.main.feels_like,
          aqi: aqiData.list?.[0]?.main?.aqi * 50 || 0,
        },
        daily: daily,
        customLabel: displayLabel
      });

      // LOCATION CORRECTNESS: Use the API's returned city name if we are in GPS mode
      // This ensures the user sees exactly where the weather data is coming from.
      if (isManualSearch.current && cityName) {
        setCity(cityName);
      } else {
        setCity(`${currentData.name}, ${currentData.sys.country}`);
      }

    } catch (e) {
      if (!isSilent) Alert.alert("Connection Issue", "Retrying...");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const onManualCitySelect = (item) => {
    isManualSearch.current = true;
    currentCoords.current = { lat: item.latitude, lon: item.longitude, cityName: `${item.name}, ${item.country}` };
    fetchWeather(item.latitude, item.longitude, item.name);
  };

  const onReturnToGPS = () => {
    isManualSearch.current = false;
    getFullUpdate();
  };

  const weatherProps = getIconProps(weatherData?.current?.weathercode);
  if (weatherData?.customLabel) {
    weatherProps.label = weatherData.customLabel;
  }

  // CLOCK
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const cityTimeDate = new Date(utc + (timezoneOffset * 1000));
  const displayTime = cityTimeDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

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
                    <Text style={styles.modalTitle}>5-Day Forecast</Text>
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
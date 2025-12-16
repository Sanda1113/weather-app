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
const API_KEY = 'd2c940169fd15b6353bf26314c3b6b81'; // Your Key

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
    getFullUpdate();

    const clockInterval = setInterval(() => setNow(new Date()), 1000);
    const syncInterval = setInterval(() => {
      getFullUpdate(true);
    }, 10000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(syncInterval);
    };
  }, []);

  const getFullUpdate = async (isSilent = false) => {
    if (isManualSearch.current && currentCoords.current) {
      fetchWeather(currentCoords.current.lat, currentCoords.current.lon, currentCoords.current.cityName, isSilent);
      return;
    }

    try {
      if (!isSilent && !weatherData) setLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      currentCoords.current = { lat: loc.coords.latitude, lon: loc.coords.longitude, cityName: 'My Location' };
      fetchWeather(loc.coords.latitude, loc.coords.longitude, 'My Location', isSilent);
    } catch (e) {
      if (!isSilent) setLoading(false);
    }
  };

  // --- HELPER: CONVERT OWM CODES TO OUR FORMAT ---
  const mapOWMCode = (id) => {
    if (id >= 200 && id < 300) return 95; // Thunderstorm
    if (id >= 300 && id < 600) return 61; // Drizzle/Rain
    if (id >= 600 && id < 700) return 71; // Snow
    if (id >= 700 && id < 800) return 45; // Fog/Mist
    if (id === 800) return 0; // Clear
    if (id > 800) return 3; // Clouds
    return 3;
  };

  const fetchWeather = async (lat, lon, cityName, isSilent = false) => {
    if (!isSilent && !weatherData) setLoading(true);

    try {
      // 1. Fetch Current Weather
      const currentRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
      const currentData = await currentRes.json();

      // 2. Fetch Forecast
      const forecastRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
      const forecastData = await forecastRes.json();

      // 3. Fetch Air Quality (FIXED: Now uses HTTPS)
      const aqiRes = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
      const aqiData = await aqiRes.json();

      if (currentData.cod !== 200 || forecastData.cod !== "200") throw new Error("API Error");

      setTimezoneOffset(currentData.timezone);

      const codeId = currentData.weather[0].id;
      const isNight = currentData.weather[0].icon.includes('n');
      const mappedCode = mapOWMCode(codeId);

      if (codeId >= 600 && codeId < 700) setBgImage(BACKGROUNDS.SNOW);
      else if (codeId >= 200 && codeId < 600) setBgImage(BACKGROUNDS.RAIN);
      else if (codeId >= 801) setBgImage(BACKGROUNDS.CLOUDY);
      else if (isNight) setBgImage(BACKGROUNDS.CLEAR_NIGHT);
      else setBgImage(BACKGROUNDS.CLEAR_DAY);

      // Process Hourly
      const hourly = forecastData.list.slice(0, 8).map(item => ({
        key: item.dt.toString(),
        time: new Date((item.dt + currentData.timezone) * 1000).toISOString().substr(11, 5), // Basic time formatting
        temp: Math.round(item.main.temp),
        code: mapOWMCode(item.weather[0].id),
        windSpeed: Math.round(item.wind.speed * 3.6),
        windDir: item.wind.deg,
        localTimeObj: new Date((item.dt + currentData.timezone) * 1000)
      }));

      // Fix Hourly Display Time
      const processedHourly = hourly.map(h => {
        const d = new Date(h.localTimeObj.getTime() + (new Date().getTimezoneOffset() * 60000));
        return {
          ...h,
          time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        };
      });

      // Process Daily
      const dailyMap = {};
      forecastData.list.forEach(item => {
        const date = new Date((item.dt + currentData.timezone) * 1000).toISOString().split('T')[0];
        if (!dailyMap[date]) {
          dailyMap[date] = {
            date: new Date(item.dt * 1000),
            temps: [],
            codes: [],
            windSpeeds: [],
            windDirs: [],
            feels_like: []
          };
        }
        dailyMap[date].temps.push(item.main.temp);
        dailyMap[date].codes.push(item.weather[0].id);
        dailyMap[date].windSpeeds.push(item.wind.speed);
        dailyMap[date].windDirs.push(item.wind.deg);
        dailyMap[date].feels_like.push(item.main.feels_like);
      });

      const daily = Object.values(dailyMap).slice(0, 5).map((d, i) => ({
        key: i.toString(),
        date: d.date,
        maxTemp: Math.max(...d.temps),
        minTemp: Math.min(...d.temps),
        code: mapOWMCode(d.codes[Math.floor(d.codes.length / 2)]),
        apparentMax: Math.max(...d.feels_like),
        windSpeed: Math.round(Math.max(...d.windSpeeds) * 3.6),
        windDir: d.windDirs[0],
      }));

      setWeatherData({
        current: {
          temperature: currentData.main.temp,
          windspeed: Math.round(currentData.wind.speed * 3.6),
          weathercode: mappedCode,
        },
        hourly: processedHourly,
        extra: {
          humidity: currentData.main.humidity,
          feelsLike: currentData.main.feels_like,
          aqi: aqiData.list[0].main.aqi * 50,
        },
        daily: daily
      });

      if (isManualSearch.current) {
        setCity(`${currentData.name}, ${currentData.sys.country}`);
      }

    } catch (e) {
      if (!isSilent) Alert.alert("Error", "Check API Key or Internet.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const onManualCitySelect = (item) => {
    isManualSearch.current = true;
    currentCoords.current = { lat: item.latitude, lon: item.longitude, cityName: item.name };
    fetchWeather(item.latitude, item.longitude, item.name);
  };

  const onReturnToGPS = () => {
    isManualSearch.current = false;
    getFullUpdate();
  };

  const weatherProps = getIconProps(weatherData?.current?.weathercode);

  // Clock Logic
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
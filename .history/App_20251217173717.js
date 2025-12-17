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
const API_KEY = '683c583fe5e94bc8b4b120145251712'; // WeatherAPI.com Key

// --- GRAPH & MODAL LOGIC ---
const ForecastGraph = ({ data }) => {
  if (!data || data.length === 0) return null;
  const temps = data.map(d => d.maxTemp);
  const max = Math.max(...temps) + 2;
  const min = Math.min(...temps) - 2;
  const range = max - min;

  return (
    <View style={styles.graphContainer}>
      <Text style={styles.graphTitle}>Temperature Trend (7 Days)</Text>
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
          <Text style={styles.dLabel}>Chance of Rain</Text>
          <Text style={styles.dValue}>{item.chanceOfRain}%</Text>
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

  const [localTime, setLocalTime] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const isManualSearch = useRef(false);
  const currentCoords = useRef(null);

  useEffect(() => {
    // Initial Load
    getFullUpdate();

    // Update Weather every 60 seconds (API limit friendly)
    const syncInterval = setInterval(() => {
      getFullUpdate(true);
    }, 60000);

    return () => clearInterval(syncInterval);
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

      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });

      currentCoords.current = { lat: loc.coords.latitude, lon: loc.coords.longitude, cityName: 'Detecting...' };
      fetchWeather(loc.coords.latitude, loc.coords.longitude, null, isSilent);
    } catch (e) {
      if (!isSilent) setLoading(false);
    }
  };

  // --- MAPPING WEATHERAPI CODES TO OUR ICONS ---
  // WeatherAPI.com uses different codes than OpenWeatherMap
  const mapWeatherAPICode = (code, isDay) => {
    // 1000 = Sunny/Clear
    if (code === 1000) return 0;
    // 1003-1009 = Cloudy/Overcast
    if (code >= 1003 && code <= 1009) return 3;
    // 1030, 1135, 1147 = Mist/Fog
    if (code === 1030 || code === 1135 || code === 1147) return 45;
    // 1063, 1150-1201 = Rain/Drizzle
    if ([1063, 1150, 1153, 1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(code)) return 61;
    // 1066-1072, 1114-1117, 1210-1225 = Snow/Ice
    if ([1066, 1069, 1072, 1114, 1117, 1204, 1207, 1210, 1213, 1216, 1219, 1222, 1225, 1237, 1249, 1252, 1255, 1258, 1261, 1264].includes(code)) return 71;
    // 1087, 1273-1282 = Thunder
    if ([1087, 1273, 1276, 1279, 1282].includes(code)) return 95;

    return 3; // Default to Cloudy
  };

  const fetchWeather = async (lat, lon, cityName, isSilent = false) => {
    if (!isSilent && !weatherData) setLoading(true);

    try {
      // WeatherAPI.com Forecast Endpoint (7 days)
      // q = lat,lon
      const res = await fetch(`http://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${lat},${lon}&days=7&aqi=yes&alerts=no`);

      if (res.status !== 200) throw new Error("API Error");
      const data = await res.json();

      const current = data.current;
      const forecast = data.forecast.forecastday;
      const location = data.location;

      // --- BACKGROUND LOGIC ---
      const code = current.condition.code;
      const isDay = current.is_day === 1;
      const mappedCode = mapWeatherAPICode(code, isDay);

      if (mappedCode === 95) setBgImage(BACKGROUNDS.THUNDER);
      else if (mappedCode === 71) setBgImage(BACKGROUNDS.SNOW);
      else if (mappedCode === 61) setBgImage(BACKGROUNDS.RAIN);
      else if (mappedCode === 45) setBgImage(BACKGROUNDS.CLOUDY); // Fog -> Cloudy BG
      else if (mappedCode === 3) setBgImage(BACKGROUNDS.CLOUDY);
      else if (!isDay) setBgImage(BACKGROUNDS.CLEAR_NIGHT);
      else setBgImage(BACKGROUNDS.CLEAR_DAY);

      // --- HOURLY PROCESSING (Next 24 Hours) ---
      // WeatherAPI gives us hour-by-hour arrays for each day. We need to flatten them.
      // We take the remaining hours of today + hours of tomorrow.
      let allHours = [];
      const currentEpoch = current.last_updated_epoch;

      forecast.forEach(day => {
        day.hour.forEach(h => {
          if (h.time_epoch > currentEpoch) {
            allHours.push(h);
          }
        });
      });

      const hourly = allHours.slice(0, 24).map(h => ({
        key: h.time_epoch.toString(),
        time: new Date(h.time_epoch * 1000).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
        temp: Math.round(h.temp_c),
        code: mapWeatherAPICode(h.condition.code, h.is_day),
        windSpeed: Math.round(h.wind_kph),
        windDir: h.wind_degree,
        // Accurate "Will it Rain" property from API
        willRain: h.will_it_rain === 1
      }));

      // --- DAILY PROCESSING (7 Days) ---
      const daily = forecast.map((d, i) => ({
        key: i.toString(),
        date: d.date, // YYYY-MM-DD
        maxTemp: Math.round(d.day.maxtemp_c),
        minTemp: Math.round(d.day.mintemp_c),
        code: mapWeatherAPICode(d.day.condition.code, true),
        apparentMax: Math.round(d.day.avgtemp_c), // Approx
        windSpeed: Math.round(d.day.maxwind_kph),
        windDir: 0, // Daily avg dir not provided, default 0
        chanceOfRain: d.day.daily_chance_of_rain
      }));

      // --- CUSTOM LABEL FOR "CHANCE OF RAIN" ---
      // If it's cloudy but API says it WILL rain, change label
      let customLabel = current.condition.text;
      const willRainNow = forecast[0].day.daily_will_it_rain === 1; // Basic daily check

      // More aggressive check: if chance of rain > 40% and it says "Cloudy", change to "Chance of Rain"
      if (forecast[0].day.daily_chance_of_rain > 40 && customLabel.toLowerCase().includes("cloudy")) {
        customLabel = "Chance of Rain";
      }

      setWeatherData({
        current: {
          temperature: current.temp_c,
          windspeed: Math.round(current.wind_kph),
          weathercode: mappedCode,
        },
        hourly: hourly,
        extra: {
          humidity: current.humidity,
          feelsLike: current.feelslike_c,
          aqi: Math.round(current.air_quality['us-epa-index'] * 50) || 0, // Approx scale
        },
        daily: daily,
        customLabel: customLabel
      });

      setCity(`${location.name}, ${location.country}`);
      // Update local time for display
      setLocalTime(location.localtime.split(' ')[1]);

    } catch (e) {
      if (!isSilent) Alert.alert("Error", "Check API Key or Connection");
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
                time={localTime}
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
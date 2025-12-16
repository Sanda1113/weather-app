import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, TouchableOpacity, ImageBackground, ScrollView, StatusBar, Keyboard, Alert, Modal } from 'react-native';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Import our files
import { BACKGROUNDS, getIconProps } from './src/helpers';
import SearchModule from './src/SearchModule';
import CurrentWeather from './src/CurrentWeather';
import ForecastBox from './src/ForecastBox';
// Import the new component
import HourlyForecast from './src/HourlyForecast';

// --- GRAPH & MODAL LOGIC (Kept here for simplicity) ---
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
      // UPDATED API CALL: Added &hourly=temperature_2m,weathercode&forecast_hours=24
      const [weatherRes, aqiRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode,apparent_temperature_max,windspeed_10m_max,winddirection_10m_dominant&hourly=temperature_2m,weathercode,relative_humidity_2m,apparent_temperature&forecast_hours=24&timezone=auto`),
        fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`)
      ]);
      const data = await weatherRes.json();
      const aqiData = await aqiRes.json();

      setLocalTime(new Date().toLocaleTimeString('en-US', { timeZone: data.timezone, hour: '2-digit', minute: '2-digit', hour12: true }));

      const wCode = data.current_weather.weathercode;
      const cityDate = new Date().toLocaleTimeString('en-US', { timeZone: data.timezone, hour12: false, hour: 'numeric' });
      const currentHour = parseInt(cityDate);
      const isNight = currentHour < 6 || currentHour > 19;

      if (wCode >= 71) setBgImage(BACKGROUNDS.SNOW);
      else if (wCode >= 51) setBgImage(BACKGROUNDS.RAIN);
      else if (wCode >= 95) setBgImage(BACKGROUNDS.THUNDER);
      else if (wCode >= 1 && wCode <= 48) setBgImage(BACKGROUNDS.CLOUDY);
      else if (isNight) setBgImage(BACKGROUNDS.CLEAR_NIGHT);
      else setBgImage(BACKGROUNDS.CLEAR_DAY);

      setWeatherData({
        current: data.current_weather,
        // PROCESS HOURLY DATA
        hourly: data.hourly.time.map((time, i) => ({
          key: time,
          time: new Date(time).toLocaleTimeString('en-US', { timeZone: data.timezone, hour: 'numeric', hour12: true }),
          temp: Math.round(data.hourly.temperature_2m[i]),
          code: data.hourly.weathercode[i],
        })),
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
          apparentMax: data.daily.apparent_temperature_max[i],
          windSpeed: data.daily.windspeed_10m_max[i],
          windDir: data.daily.winddirection_10m_dominant[i],
        }))
      });
    } catch (e) { Alert.alert("Error", "Could not fetch weather"); }
    finally { setLoading(false); }
  };

  const weatherProps = getIconProps(weatherData?.current?.weathercode);

  return (
    <ImageBackground source={{ uri: bgImage }} style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' }} />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <SafeAreaProvider>
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

              {/* ADDED: 24-Hour Forecast Section */}
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
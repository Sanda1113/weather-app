import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, TouchableOpacity, ImageBackground, ScrollView, StatusBar, Keyboard, Alert } from 'react-native';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Import our new files
import { BACKGROUNDS, getIconProps } from './src/helpers';
import SearchModule from './src/SearchModule';
import CurrentWeather from './src/CurrentWeather';
import ForecastBox from './src/ForecastBox';
import ForecastModal from './src/ForecastModal'; // (This assumes you copy the modal code from previous step into a file, or keep it here if small)

// --- GRAPH & MODAL LOGIC (Kept here for simplicity or move to src/ForecastModal.js) ---
import { Modal } from 'react-native';
// Re-using the graph code from previous response for src/ForecastModal.js ...

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
      const [weatherRes, aqiRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode,apparent_temperature_max,windspeed_10m_max,winddirection_10m_dominant&hourly=relative_humidity_2m,apparent_temperature&timezone=auto`),
        fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`)
      ]);
      const data = await weatherRes.json();
      const aqiData = await aqiRes.json();

      setLocalTime(new Date().toLocaleTimeString('en-US', { timeZone: data.timezone, hour: '2-digit', minute: '2-digit', hour12: true }));

      const wCode = data.current_weather.weathercode;
      const isNight = new Date().getHours() < 6 || new Date().getHours() > 19;

      // Select Background
      if (wCode >= 71) setBgImage(BACKGROUNDS.SNOW);
      else if (wCode >= 51) setBgImage(BACKGROUNDS.RAIN);
      else if (wCode >= 95) setBgImage(BACKGROUNDS.THUNDER);
      else if (wCode >= 1 && wCode <= 48) setBgImage(BACKGROUNDS.CLOUDY);
      else if (isNight) setBgImage(BACKGROUNDS.CLEAR_NIGHT);
      else setBgImage(BACKGROUNDS.CLEAR_DAY);

      const currentHour = new Date().getHours();
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

              {/* NEW: The Boxed Forecast */}
              <ForecastBox
                dailyData={weatherData.daily}
                onExpand={() => setShowModal(true)}
              />
            </ScrollView>
          ) : null}

          {/* Modal Implementation would typically be in src/ForecastModal.js, imported here */}
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
                  <ScrollView>
                    {weatherData.daily.map(item => (
                      <View key={item.key} style={styles.modalRow}>
                        <Text style={{ color: '#fff', fontSize: 16, width: 100 }}>{new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                        <MaterialCommunityIcons name={getIconProps(item.code).name} size={28} color={getIconProps(item.code).color} />
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{Math.round(item.maxTemp)}°</Text>
                      </View>
                    ))}
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
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }
});
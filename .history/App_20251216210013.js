import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import * as Location from 'expo-location';

export default function App() {
  const [location, setLocation] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWeather = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Get Permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setLoading(false);
        return;
      }

      // 2. Get Location
      let userLocation = await Location.getCurrentPositionAsync({});
      setLocation(userLocation);
      const { latitude, longitude } = userLocation.coords;

      // 3. Fetch Weather from Open-Meteo (No API Key needed)
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
      );
      const data = await response.json();
      setWeather(data.current_weather);

    } catch (error) {
      setErrorMsg('Error fetching weather data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWeather();
  };

  // Weather Code Interpretation (Simple version)
  const getWeatherDescription = (code) => {
    if (code === 0) return 'Clear Sky ☀️';
    if (code >= 1 && code <= 3) return 'Partly Cloudy ⛅';
    if (code >= 45 && code <= 48) return 'Foggy 🌫️';
    if (code >= 51 && code <= 67) return 'Rainy 🌧️';
    if (code >= 71) return 'Snowy ❄️';
    return 'Weather Conditions';
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>Simple Weather</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : errorMsg ? (
          <Text style={styles.errorText}>{errorMsg}</Text>
        ) : (
          <View style={styles.weatherCard}>
            <Text style={styles.temp}>
              {weather?.temperature} {weather?.windspeed ? '°C' : ''}
            </Text>
            <Text style={styles.condition}>
              {getWeatherDescription(weather?.weathercode)}
            </Text>
            <Text style={styles.wind}>
              Wind: {weather?.windspeed} km/h
            </Text>
          </View>
        )}

        <Text style={styles.footer}>Pull down to refresh</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87CEEB', // Sky blue
  },
  scrollContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 50,
  },
  weatherCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  temp: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#333',
  },
  condition: {
    fontSize: 24,
    color: '#555',
    marginTop: 10,
    marginBottom: 20,
  },
  wind: {
    fontSize: 16,
    color: '#777',
  },
  errorText: {
    color: 'red',
    fontSize: 18,
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 10,
    borderRadius: 5,
  },
  footer: {
    marginTop: 50,
    color: '#fff',
    opacity: 0.8,
  }
});
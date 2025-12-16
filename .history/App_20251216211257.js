import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ActivityIndicator, ScrollView,
  TextInput, TouchableOpacity, FlatList, Keyboard, Alert
} from 'react-native';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function App() {
  const [location, setLocation] = useState(null); // Stores lat/lon
  const [currentWeather, setCurrentWeather] = useState(null);
  const [dailyForecast, setDailyForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [citySearch, setCitySearch] = useState('');
  const [displayedCity, setDisplayedCity] = useState('My Location');

  // 1. Initialize: Get Current Location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Allow location access to see local weather.');
        setLoading(false);
        return;
      }

      let userLocation = await Location.getCurrentPositionAsync({});
      setLocation(userLocation.coords);
      fetchWeather(userLocation.coords.latitude, userLocation.coords.longitude);
    })();
  }, []);

  // 2. Fetch Weather Data (Current + 7-Day Forecast)
  const fetchWeather = async (lat, lon) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max&timezone=auto`
      );
      const data = await response.json();

      setCurrentWeather(data.current_weather);

      // Format 7-Day Forecast Data
      const formattedForecast = data.daily.time.map((date, index) => ({
        date: date,
        maxTemp: data.daily.temperature_2m_max[index],
        minTemp: data.daily.temperature_2m_min[index],
        code: data.daily.weathercode[index],
        rainChance: data.daily.precipitation_probability_max[index],
        key: index.toString(), // For FlatList
      }));

      setDailyForecast(formattedForecast);

    } catch (error) {
      Alert.alert('Error', 'Could not fetch weather data.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Search for a City (Geocoding API)
  const searchCity = async () => {
    if (!citySearch.trim()) return;
    Keyboard.dismiss();
    setLoading(true);

    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${citySearch}&count=1&language=en&format=json`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const { latitude, longitude, name, country } = data.results[0];
        setDisplayedCity(`${name}, ${country}`);
        fetchWeather(latitude, longitude);
        setCitySearch('');
      } else {
        Alert.alert('Not Found', 'City not found. Please try again.');
        setLoading(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not search city.');
      setLoading(false);
    }
  };

  // Helper: Get Icon name based on WMO code
  const getIcon = (code) => {
    if (code === 0) return 'weather-sunny';
    if (code >= 1 && code <= 3) return 'weather-partly-cloudy';
    if (code >= 45 && code <= 48) return 'weather-fog';
    if (code >= 51 && code <= 67) return 'weather-rainy';
    if (code >= 71 && code <= 77) return 'weather-snowy';
    if (code >= 95) return 'weather-lightning';
    return 'weather-cloudy';
  };

  // Helper: Get Day Name from Date String
  const getDayName = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Search city (e.g. Paris)"
          placeholderTextColor="#ddd"
          value={citySearch}
          onChangeText={setCitySearch}
          onSubmitEditing={searchCity}
        />
        <TouchableOpacity onPress={searchCity} style={styles.searchButton}>
          <MaterialCommunityIcons name="magnify" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 50 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>

          {/* Main Weather Card */}
          <Text style={styles.cityName}>{displayedCity}</Text>
          <View style={styles.currentCard}>
            <MaterialCommunityIcons
              name={getIcon(currentWeather?.weathercode)}
              size={100}
              color="#fff"
            />
            <Text style={styles.temp}>{currentWeather?.temperature}°</Text>
            <Text style={styles.desc}>Wind: {currentWeather?.windspeed} km/h</Text>
          </View>

          {/* 7-Day Forecast Title */}
          <Text style={styles.sectionTitle}>7-Day Forecast</Text>

          {/* Forecast List */}
          <View style={styles.forecastContainer}>
            {dailyForecast.map((day) => (
              <View key={day.key} style={styles.forecastItem}>
                <Text style={styles.dayText}>{getDayName(day.date)}</Text>
                <MaterialCommunityIcons name={getIcon(day.code)} size={24} color="#fff" />
                <View style={styles.tempRange}>
                  <Text style={styles.highLow}>{Math.round(day.maxTemp)}°</Text>
                  <Text style={[styles.highLow, { opacity: 0.6 }]}>{Math.round(day.minTemp)}°</Text>
                </View>
              </View>
            ))}
          </View>

        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4A90E2', // Darker professional blue
    paddingTop: 50,
  },
  searchContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 15,
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 50,
    color: '#fff',
    fontSize: 16,
  },
  searchButton: {
    padding: 10,
  },
  content: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  cityName: {
    fontSize: 28,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  currentCard: {
    alignItems: 'center',
    marginBottom: 30,
  },
  temp: {
    fontSize: 80,
    fontWeight: 'bold',
    color: '#fff',
  },
  desc: {
    fontSize: 18,
    color: '#eee',
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginBottom: 15,
  },
  forecastContainer: {
    width: '90%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 15,
  },
  forecastItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  dayText: {
    color: '#fff',
    fontSize: 16,
    width: 50,
    fontWeight: 'bold',
  },
  tempRange: {
    flexDirection: 'row',
    width: 80,
    justifyContent: 'flex-end',
    gap: 10,
  },
  highLow: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  }
});
import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ActivityIndicator, ScrollView,
  TextInput, TouchableOpacity, Keyboard, Alert, Dimensions, StatusBar
} from 'react-native';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function App() {
  const [location, setLocation] = useState(null);
  const [currentWeather, setCurrentWeather] = useState(null);
  const [dailyForecast, setDailyForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [citySearch, setCitySearch] = useState('');
  const [displayedCity, setDisplayedCity] = useState('Locating...');
  const [extraData, setExtraData] = useState({});

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Allow location access to see local weather.');
        setLoading(false);
        return;
      }
      let userLocation = await Location.getCurrentPositionAsync({});
      fetchWeather(userLocation.coords.latitude, userLocation.coords.longitude, 'My Location');
    })();
  }, []);

  const fetchWeather = async (lat, lon, cityName) => {
    setLoading(true);
    setDisplayedCity(cityName || 'Custom Location');
    try {
      // Added 'relative_humidity_2m' and 'apparent_temperature' for more data
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&hourly=relative_humidity_2m,apparent_temperature&timezone=auto`
      );
      const data = await response.json();

      setCurrentWeather(data.current_weather);

      // Extract extra details (Approximation from hourly data for current time)
      const currentHour = new Date().getHours();
      setExtraData({
        humidity: data.hourly.relative_humidity_2m[currentHour],
        feelsLike: data.hourly.apparent_temperature[currentHour],
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
      Alert.alert('Error', 'Could not fetch weather data.');
    } finally {
      setLoading(false);
    }
  };

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
        fetchWeather(latitude, longitude, `${name}, ${country}`);
        setCitySearch('');
      } else {
        Alert.alert('Not Found', 'City not found.');
        setLoading(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not search city.');
      setLoading(false);
    }
  };

  const getIcon = (code) => {
    if (code === 0) return 'weather-sunny';
    if (code >= 1 && code <= 3) return 'weather-partly-cloudy';
    if (code >= 45 && code <= 48) return 'weather-fog';
    if (code >= 51 && code <= 67) return 'weather-rainy';
    if (code >= 71 && code <= 77) return 'weather-snowy';
    if (code >= 95) return 'weather-lightning';
    return 'weather-cloudy';
  };

  const getDayName = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  return (
    <LinearGradient colors={['#4c669f', '#3b5998', '#192f6a']} style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={24} color="rgba(255,255,255,0.7)" />
          <TextInput
            style={styles.input}
            placeholder="Search city..."
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={citySearch}
            onChangeText={setCitySearch}
            onSubmitEditing={searchCity}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Fetching forecast...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Main Weather Display */}
          <View style={styles.mainWeather}>
            <Text style={styles.cityName}>{displayedCity}</Text>
            <Text style={styles.date}>{new Date().toDateString()}</Text>

            <MaterialCommunityIcons
              name={getIcon(currentWeather?.weathercode)}
              size={120}
              color="#fff"
              style={{ marginVertical: 10 }}
            />

            <Text style={styles.temp}>{Math.round(currentWeather?.temperature)}°</Text>
            <Text style={styles.weatherDesc}>
              {currentWeather?.weathercode === 0 ? "Clear Sky" : "Cloudy / Rainy"}
            </Text>
          </View>

          {/* Details Grid (Glassmorphism) */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="weather-windy" size={24} color="#fff" />
              <Text style={styles.detailLabel}>Wind</Text>
              <Text style={styles.detailValue}>{currentWeather?.windspeed} km/h</Text>
            </View>
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="water-percent" size={24} color="#fff" />
              <Text style={styles.detailLabel}>Humidity</Text>
              <Text style={styles.detailValue}>{extraData?.humidity}%</Text>
            </View>
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="thermometer" size={24} color="#fff" />
              <Text style={styles.detailLabel}>Feels Like</Text>
              <Text style={styles.detailValue}>{Math.round(extraData?.feelsLike)}°</Text>
            </View>
          </View>

          {/* 7-Day Forecast List */}
          <View style={styles.forecastContainer}>
            <Text style={styles.forecastTitle}>7-Day Forecast</Text>
            {dailyForecast.map((day) => (
              <View key={day.key} style={styles.forecastRow}>
                <Text style={styles.forecastDay}>{getDayName(day.date)}</Text>
                <View style={styles.forecastIcon}>
                  <MaterialCommunityIcons name={getIcon(day.code)} size={28} color="#fff" />
                </View>
                <Text style={styles.forecastTemp}>
                  {Math.round(day.maxTemp)}°  <Text style={styles.minTemp}>/ {Math.round(day.minTemp)}°</Text>
                </Text>
              </View>
            ))}
          </View>

        </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50, // For status bar
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)', // Glass effect
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 50,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  input: {
    flex: 1,
    marginLeft: 10,
    color: '#fff',
    fontSize: 16,
  },
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  mainWeather: {
    alignItems: 'center',
    marginTop: 20,
  },
  cityName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  date: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  temp: {
    fontSize: 90,
    fontWeight: '200',
    color: '#fff',
  },
  weatherDesc: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'capitalize',
    marginBottom: 20,
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '90%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingVertical: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 5,
  },
  detailValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 5,
  },
  forecastContainer: {
    width: '90%',
    marginTop: 25,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 20,
    padding: 20,
  },
  forecastTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    marginLeft: 5,
  },
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  forecastDay: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    width: 60,
  },
  forecastIcon: {
    flex: 1,
    alignItems: 'center',
  },
  forecastTemp: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    width: 80,
    textAlign: 'right',
  },
  minTemp: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '400',
  }
});
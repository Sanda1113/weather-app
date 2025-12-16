import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ActivityIndicator, ScrollView,
  TextInput, TouchableOpacity, Keyboard, Alert, StatusBar, Platform, TouchableWithoutFeedback
} from 'react-native';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// NOTE: We removed 'expo-blur' to prevent crashes.
// We are using RGBA alpha channels to simulate the glass effect safely.

export default function App() {
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
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&hourly=relative_humidity_2m,apparent_temperature&timezone=auto`
      );
      const data = await response.json();

      setCurrentWeather(data.current_weather);

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

  const getWeatherIconProps = (code) => {
    if (code === 0) return { name: 'weather-sunny', color: '#FFD700' };
    if (code >= 1 && code <= 3) return { name: 'weather-partly-cloudy', color: '#dcdcdc' };
    if (code >= 45 && code <= 48) return { name: 'weather-fog', color: '#B0C4DE' };
    if (code >= 51 && code <= 67) return { name: 'weather-rainy', color: '#00BFFF' };
    if (code >= 71 && code <= 77) return { name: 'weather-snowy', color: '#E0FFFF' };
    if (code >= 95) return { name: 'weather-lightning', color: '#FF8C00' };
    return { name: 'weather-cloudy', color: '#dcdcdc' };
  };

  const getDayName = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getGradientColors = (code) => {
    if ((code >= 51 && code <= 67) || (code >= 95)) return ['#2c3e50', '#4ca1af'];
    if (code === 0) return ['#2980B9', '#6DD5FA'];
    return ['#4c669f', '#3b5998', '#192f6a'];
  };

  const weatherProps = getWeatherIconProps(currentWeather?.weathercode);
  const gradientColors = getGradientColors(currentWeather?.weathercode);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <LinearGradient colors={gradientColors} style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Search Header - Safe Glass Effect */}
        <View style={styles.headerContainer}>
          <View style={styles.searchBarGlass}>
            <TextInput
              style={styles.input}
              placeholder="Search city..."
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={citySearch}
              onChangeText={setCitySearch}
              onSubmitEditing={searchCity}
              returnKeyType="search"
            />
            <TouchableOpacity onPress={searchCity} style={styles.searchBtn}>
              <MaterialCommunityIcons name="magnify" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Fetching Weather...</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

            <View style={styles.heroSection}>
              <Text style={styles.cityName}>{displayedCity}</Text>
              <Text style={styles.date}>{new Date().toDateString()}</Text>

              <View style={styles.heroIconContainer}>
                <MaterialCommunityIcons
                  name={weatherProps.name}
                  size={140}
                  color={weatherProps.color}
                />
              </View>

              <Text style={styles.temp}>{Math.round(currentWeather?.temperature)}°</Text>
              <Text style={styles.condition}>
                {weatherProps.name.replace('weather-', '').replace('-', ' ').toUpperCase()}
              </Text>
            </View>

            {/* Stats Grid - Safe Glass */}
            <View style={styles.statsContainerWrapper}>
              <View style={styles.statsGlass}>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="weather-windy" size={24} color="#A4B0BE" />
                  <Text style={styles.statLabel}>Wind</Text>
                  <Text style={styles.statValue}>{currentWeather?.windspeed} km/h</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="water-percent" size={24} color="#74B9FF" />
                  <Text style={styles.statLabel}>Humidity</Text>
                  <Text style={styles.statValue}>{extraData?.humidity}%</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="thermometer" size={24} color="#FF7675" />
                  <Text style={styles.statLabel}>Feels Like</Text>
                  <Text style={styles.statValue}>{Math.round(extraData?.feelsLike)}°</Text>
                </View>
              </View>
            </View>

            {/* 7-Day Forecast - Safe Glass */}
            <View style={styles.forecastWrapper}>
              <Text style={styles.sectionTitle}>7-Day Forecast</Text>
              <View style={styles.forecastGlass}>
                {dailyForecast.map((day) => {
                  const dayIcon = getWeatherIconProps(day.code);
                  return (
                    <View key={day.key} style={styles.forecastRow}>
                      <Text style={styles.dayName}>{getDayName(day.date)}</Text>
                      <View style={styles.dayIconRow}>
                        <MaterialCommunityIcons name={dayIcon.name} size={24} color={dayIcon.color} />
                      </View>
                      <View style={styles.tempHighLow}>
                        <Text style={styles.maxTemp}>{Math.round(day.maxTemp)}°</Text>
                        <Text style={styles.minTemp}>{Math.round(day.minTemp)}°</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

          </ScrollView>
        )}
      </LinearGradient>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    marginTop: Platform.OS === 'ios' ? 60 : 40,
    marginHorizontal: 20,
    zIndex: 10,
  },
  // "Glass" Effect using simple transparency
  searchBarGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 30,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.15)', // Glass simulation
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    marginLeft: 5,
  },
  searchBtn: {
    padding: 5,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: 15,
    fontSize: 16,
  },
  scrollContent: {
    paddingBottom: 50,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  cityName: {
    fontSize: 34,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowRadius: 10,
  },
  date: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  heroIconContainer: {
    marginVertical: 20,
  },
  temp: {
    fontSize: 90,
    fontWeight: '300',
    color: '#fff',
    includeFontPadding: false,
  },
  condition: {
    fontSize: 24,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1,
  },
  statsContainerWrapper: {
    marginHorizontal: 20,
    marginBottom: 30,
  },
  // "Glass" Effect using simple transparency
  statsGlass: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0,0,0,0.25)', // Darker glass
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    height: '80%',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 5,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  forecastWrapper: {
    marginHorizontal: 20,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    marginLeft: 5,
  },
  // "Glass" Effect using simple transparency
  forecastGlass: {
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.1)', // Light glass
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  dayName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    width: 50,
  },
  dayIconRow: {
    flex: 1,
    alignItems: 'center',
  },
  tempHighLow: {
    flexDirection: 'row',
    width: 80,
    justifyContent: 'flex-end',
  },
  maxTemp: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  minTemp: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    marginLeft: 10,
  }
});
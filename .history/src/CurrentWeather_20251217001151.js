import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { scale, getAqiColor, getTempColor, STATS_COLORS } from './helpers'; // Import STATS_COLORS

const StatItem = ({ icon, label, value, color = '#fff' }) => (
    <View style={styles.statItem}>
        <MaterialCommunityIcons name={icon} size={24} color={color} />
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color: color }]}>{value}</Text>
    </View>
);

const CurrentWeather = memo(({ current, extra, city, weatherProps, time }) => {
    if (!current) return null;
    const tempColor = getTempColor(current.temperature);

    // Calculate Dynamic Colors
    const aqiColor = getAqiColor(extra.aqi);
    const feelsLikeColor = getTempColor(extra.feelsLike);

    return (
        <View style={styles.container}>
            <Text style={styles.city}>{city}</Text>
            <View style={styles.badge}>
                <Text style={styles.time}>{time}</Text>
                <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
            </View>

            <MaterialCommunityIcons name={weatherProps.name} size={scale(110)} color={weatherProps.color} style={styles.icon} />

            <Text style={[styles.temp, { color: tempColor, textShadowColor: tempColor, textShadowRadius: 15 }]}>
                {Math.round(current.temperature)}°
            </Text>
            <Text style={styles.condition}>{weatherProps.label}</Text>

            <View style={styles.glassBox}>
                <View style={styles.row}>
                    {/* STANDARD WIND COLOR */}
                    <StatItem icon="weather-windy" label="Wind" value={`${current.windspeed} km/h`} color={STATS_COLORS.WIND} />
                    <View style={styles.divider} />
                    {/* STANDARD HUMIDITY COLOR */}
                    <StatItem icon="water-percent" label="Humidity" value={`${extra.humidity}%`} color={STATS_COLORS.HUMIDITY} />
                </View>
                <View style={styles.rowLine} />
                <View style={styles.row}>
                    {/* DYNAMIC AQI COLOR */}
                    <StatItem icon="leaf" label="AQI" value={extra.aqi} color={aqiColor} />
                    <View style={styles.divider} />
                    {/* DYNAMIC FEELS LIKE COLOR */}
                    <StatItem icon="thermometer" label="Feels Like" value={`${Math.round(extra.feelsLike)}°`} color={feelsLikeColor} />
                </View>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: { alignItems: 'center', marginVertical: 20 },
    city: { fontSize: scale(28), fontWeight: '700', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 10 },
    badge: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20, marginTop: 10, alignItems: 'center' },
    time: { fontSize: scale(18), color: '#fff', fontWeight: '600' },
    date: { fontSize: scale(12), color: '#ccc' },
    icon: { marginVertical: 10, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 20 },
    temp: { fontSize: scale(90), fontWeight: '300', textShadowRadius: 10 }, // removed fixed color here
    condition: { fontSize: scale(24), fontWeight: '500', color: '#fff', marginBottom: 20 },
    glassBox: { width: '90%', paddingVertical: 20, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    row: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
    rowLine: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 15, width: '80%', alignSelf: 'center' },
    statItem: { alignItems: 'center', width: '40%' },
    statLabel: { color: '#bbb', fontSize: scale(12), marginTop: 5 },
    statValue: { fontSize: scale(16), fontWeight: '700' }, // color is now passed via props
    divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', height: 30 }
});

export default CurrentWeather;
import React, { memo } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { scale, getIconProps } from './helpers';

const HourlyItem = ({ item, minTemp, maxTemp }) => {
    const iconProps = getIconProps(item.code);

    // GRAPH LOGIC
    // We calculate the position (marginTop) based on the temperature
    // Higher Temp = Smaller Top Margin (Moves Up)
    const range = maxTemp - minTemp || 1;
    const heightAvailable = 50; // Maximum wave height
    const relativePos = (maxTemp - item.temp) / range; // 0 (top) to 1 (bottom)
    const topOffset = relativePos * heightAvailable;

    return (
        <View style={styles.itemContainer}>

            {/* 1. THE GRAPH SECTION (Temp + Dot) */}
            <View style={{ height: 80, justifyContent: 'flex-start', paddingTop: topOffset }}>
                <View style={styles.graphPointContainer}>
                    <Text style={styles.tempText}>{Math.round(item.temp)}°</Text>
                    {/* THE GRAPH DOT (Orange/Gold) */}
                    <View style={styles.dot} />
                </View>
            </View>

            {/* 2. Weather Icon */}
            <MaterialCommunityIcons name={iconProps.name} size={28} color={iconProps.color} style={styles.icon} />

            {/* 3. Time */}
            <Text style={styles.timeText}>{item.time}</Text>

            {/* 4. Wind Details */}
            <View style={styles.windContainer}>
                <MaterialCommunityIcons
                    name="arrow-up"
                    size={14}
                    color="#aaa"
                    style={{ transform: [{ rotate: `${item.windDir}deg` }] }}
                />
                <Text style={styles.windText}>{Math.round(item.windSpeed)}</Text>
                <Text style={styles.unitText}>km/h</Text>
            </View>
        </View>
    );
};

const HourlyForecast = memo(({ hourlyData }) => {
    if (!hourlyData || hourlyData.length === 0) return null;

    const temps = hourlyData.map(d => d.temp);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>24-Hour Forecast</Text>
            <View style={styles.glassBox}>
                <FlatList
                    data={hourlyData}
                    keyExtractor={(item) => item.key}
                    renderItem={({ item }) => <HourlyItem item={item} minTemp={minTemp} maxTemp={maxTemp} />}
                    horizontal={true}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                />
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: { marginTop: 20, marginBottom: 10, paddingHorizontal: 20 },
    title: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10, marginLeft: 5 },
    glassBox: {
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        paddingVertical: 20,
    },
    listContent: { paddingHorizontal: 10 },

    itemContainer: {
        alignItems: 'center',
        width: 70,
        justifyContent: 'flex-end',
        gap: 12, // Consistent spacing between elements
    },

    // Graph Styling
    graphPointContainer: { alignItems: 'center', gap: 6 },

    // THE ORANGE DOT (Graph Line Look)
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFD700', // Gold/Orange color matching the reference
        shadowColor: '#FFD700',
        shadowOpacity: 0.8,
        shadowRadius: 5,
        elevation: 5 // Android Glow
    },

    tempText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    // Icon & Time
    icon: { textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 5 },
    timeText: { color: '#ddd', fontSize: 12, marginTop: 5 },

    // Wind
    windContainer: { alignItems: 'center', justifyContent: 'center', gap: 2 },
    windText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    unitText: { color: '#888', fontSize: 10 }
});

export default HourlyForecast;
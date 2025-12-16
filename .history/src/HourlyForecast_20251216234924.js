import React, { memo } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { scale, getIconProps } from './helpers';

const { width } = Dimensions.get('window');

const HourlyItem = ({ item, minTemp, maxTemp }) => {
    const iconProps = getIconProps(item.code);
    const tempColor = getTempColor(item.temp); // Get dynamic color

    // GRAPH LOGIC: Calculate vertical position
    // The hotter the temp, the higher it sits (lower marginTop)
    const range = maxTemp - minTemp || 1; // Avoid division by zero
    const heightAvailable = 60; // The visual height of the "graph" wave
    const relativePos = (maxTemp - item.temp) / range; // 0 (top) to 1 (bottom)
    const topOffset = relativePos * heightAvailable;

    return (
        <View style={styles.itemContainer}>

            {/* 1. Temperature (Acts as the Graph Line) */}
            <View style={{ height: 80, justifyContent: 'flex-start', paddingTop: topOffset }}>
                <View style={styles.graphPointContainer}>
                    <Text style={[styles.tempText, { color: tempColor }]}>{item.temp}°</Text>
                    <View style={[styles.dot, { backgroundColor: tempColor }]} />
                    {/* The yellow line connector could go here if using SVG, 
              but this Dot creates the visual "point" of the graph */}
                </View>
            </View>

            {/* 2. Weather Icon */}
            <MaterialCommunityIcons name={iconProps.name} size={28} color={iconProps.color} style={styles.icon} />

            {/* 3. Time */}
            <Text style={styles.timeText}>{item.time}</Text>

            {/* 4. Wind Speed & Direction */}
            <View style={styles.windContainer}>
                <MaterialCommunityIcons
                    name="arrow-up"
                    size={14}
                    color="#aaa"
                    style={{ transform: [{ rotate: `${item.windDir}deg` }] }} // Rotates arrow to wind direction
                />
                <Text style={styles.windText}>{Math.round(item.windSpeed)}</Text>
                <Text style={styles.unitText}>km/h</Text>
            </View>
        </View>
    );
};

const HourlyForecast = memo(({ hourlyData }) => {
    if (!hourlyData || hourlyData.length === 0) return null;

    // Calculate Range for the Graph scaling
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
        width: 70, // Fixed width for alignment
        justifyContent: 'flex-end',
        gap: 10,
    },

    // Graph Styles
    graphPointContainer: { alignItems: 'center', gap: 5 },
    dot: { width: 6, height: 6, borderRadius: 3 }, // Removed fixed background color
    tempText: { fontSize: scale(16), fontWeight: '700' }, // Removed white color

    // Icon & Time
    icon: { textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 5 },
    timeText: { color: '#ddd', fontSize: scale(12), marginTop: 5 },

    // Wind
    windContainer: { alignItems: 'center', justifyContent: 'center', gap: 2 },
    windText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    unitText: { color: '#888', fontSize: 10 }
});

export default HourlyForecast;
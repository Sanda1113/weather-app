import React, { memo } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { scale, getIconProps } from './helpers';

const HourlyItem = ({ item, minTemp, maxTemp, index }) => {
    const iconProps = getIconProps(item.code);

    // GRAPH LOGIC
    const range = maxTemp - minTemp || 1;
    const heightAvailable = 40;
    const relativePos = (maxTemp - item.temp) / range;
    const topOffset = relativePos * heightAvailable;

    // Visual Tweaks
    const isNow = index === 0;
    const displayTime = isNow ? "Now" : item.time;

    return (
        <View style={styles.itemContainer}>

            {/* 1. TEMPERATURE (Top) */}
            <View style={{ height: 60, justifyContent: 'flex-start', paddingTop: topOffset, alignItems: 'center' }}>
                <Text style={styles.tempText}>{Math.round(item.temp)}°</Text>

                {/* The Graph Dot */}
                <View style={styles.dotContainer}>
                    <View style={[styles.dot, isNow && styles.activeDot]} />
                    {/* Vertical Dashed Line for "Now" */}
                    {isNow && <View style={styles.verticalLine} />}
                </View>
            </View>

            {/* 2. WEATHER ICON */}
            <MaterialCommunityIcons name={iconProps.name} size={28} color={iconProps.color} style={styles.icon} />

            {/* 3. WIND SPEED */}
            <Text style={styles.windText}>{item.windSpeed}km/h</Text>

            {/* 4. TIME (Bottom) */}
            <Text style={[styles.timeText, isNow && styles.activeTimeText]}>{displayTime}</Text>

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
            <Text style={styles.title}>24-hour forecast</Text>
            {/* RESTORED THE BOX STYLE HERE */}
            <View style={styles.glassBox}>
                <FlatList
                    data={hourlyData}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item, index }) => <HourlyItem item={item} minTemp={minTemp} maxTemp={maxTemp} index={index} />}
                    horizontal={true}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                />
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        marginTop: 20,
        marginBottom: 10,
        paddingHorizontal: 20
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        marginLeft: 5
    },
    // THE BOX CONTAINER STYLE (Matches 7-Day Forecast)
    glassBox: {
        backgroundColor: 'rgba(0,0,0,0.4)', // Dark semi-transparent background
        borderRadius: 20,                 // Rounded corners
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)', // Subtle border
        paddingVertical: 20,              // Spacing inside the box
    },
    listContent: {
        paddingHorizontal: 10
    },

    itemContainer: {
        alignItems: 'center',
        width: 70,
        justifyContent: 'flex-start',
        gap: 8,
    },

    // Graph Elements
    dotContainer: { alignItems: 'center', marginTop: 8 },
    dot: {
        width: 6, height: 6, borderRadius: 3,
        backgroundColor: '#FFD700',
    },
    activeDot: {
        backgroundColor: '#fff',
        width: 8, height: 8, borderRadius: 4,
        borderWidth: 2, borderColor: '#FFD700'
    },
    verticalLine: {
        width: 1,
        height: 60,
        backgroundColor: 'rgba(255, 215, 0, 0.5)',
        position: 'absolute',
        top: 6,
    },

    tempText: { color: '#fff', fontSize: 18, fontWeight: '600' },
    icon: { marginVertical: 5 },
    windText: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
    timeText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 4 },
    activeTimeText: { color: '#fff', fontWeight: 'bold' }
});

export default HourlyForecast;
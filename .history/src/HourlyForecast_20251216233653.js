import React, { memo } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { scale, getIconProps } from './helpers';

const { width } = Dimensions.get('window');

const HourlyItem = ({ item }) => {
    const iconProps = getIconProps(item.code);
    return (
        <View style={styles.itemContainer}>
            <Text style={styles.timeText}>{item.time}</Text>
            <MaterialCommunityIcons name={iconProps.name} size={32} color={iconProps.color} style={styles.icon} />
            <Text style={styles.tempText}>{item.temp}°</Text>
        </View>
    );
};

const HourlyForecast = memo(({ hourlyData }) => {
    if (!hourlyData) return null;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>24-Hour Forecast</Text>
            <View style={styles.glassBox}>
                <FlatList
                    data={hourlyData}
                    keyExtractor={(item) => item.key}
                    renderItem={({ item }) => <HourlyItem item={item} />}
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
        paddingHorizontal: 20,
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        marginLeft: 5,
    },
    glassBox: {
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        paddingVertical: 15,
    },
    listContent: {
        paddingHorizontal: 5,
    },
    itemContainer: {
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 10,
        height: 90,
    },
    timeText: {
        color: '#ccc',
        fontSize: scale(12),
    },
    icon: {
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowRadius: 5,
    },
    tempText: {
        color: '#fff',
        fontSize: scale(16),
        fontWeight: '600',
    },
});

export default HourlyForecast;
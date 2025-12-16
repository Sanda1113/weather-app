import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { scale, getIconProps, getTempColor } from './helpers';

const ForecastBox = memo(({ dailyData, onExpand }) => {
    if (!dailyData) return null;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <MaterialCommunityIcons name="calendar-clock" size={20} color="rgba(255,255,255,0.7)" />
                <Text style={styles.title}>7-Day Forecast</Text>
            </View>

            {/* The 3 Preview Items */}
            {dailyData.slice(0, 3).map((item, index) => {
                const iconProps = getIconProps(item.code);
                const tempColor = getTempColor(item.maxTemp);
                let label = new Date(item.date).toLocaleDateString('en-US', { weekday: 'long' });
                if (index === 0) label = 'Today';
                if (index === 1) label = 'Tomorrow';

                return (
                    <View key={item.key} style={styles.row}>
                        <Text style={styles.day}>{label}</Text>
                        <MaterialCommunityIcons name={iconProps.name} size={28} color={iconProps.color} />
                        <View style={styles.temps}>
                            <Text style={[styles.max, { color: tempColor }]}>{Math.round(item.maxTemp)}°</Text>
                            <Text style={styles.min}>{Math.round(item.minTemp)}°</Text>
                        </View>
                    </View>
                );
            })}

            {/* Expansion Button inside the box */}
            <TouchableOpacity style={styles.button} onPress={onExpand}>
                <Text style={styles.btnText}>View Full Forecast</Text>
                <MaterialCommunityIcons name="arrow-right" size={16} color="#fff" />
            </TouchableOpacity>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 20,
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.4)', // The Glass Box Effect
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        marginBottom: 50
    },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 8 },
    title: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '600' },
    row: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)'
    },
    day: { color: '#fff', fontSize: scale(16), width: 100, fontWeight: '500' },
    temps: { flexDirection: 'row', width: 80, justifyContent: 'flex-end', gap: 10 },
    max: { color: '#fff', fontWeight: '700', fontSize: scale(16) },
    min: { color: 'rgba(255,255,255,0.6)', fontSize: scale(16) },
    button: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        marginTop: 15, paddingVertical: 5, gap: 5
    },
    btnText: { color: '#fff', fontSize: 14, fontWeight: '600' }
});

export default ForecastBox;
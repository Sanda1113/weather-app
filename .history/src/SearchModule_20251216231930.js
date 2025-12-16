import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator, Text, StyleSheet, Keyboard } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { scale } from './helpers';

const SearchModule = ({ onCitySelect, onMyLocation, isVisible, setIsVisible }) => {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (query.length === 0) {
            setSuggestions([]);
            setIsVisible(false);
            return;
        }
        setIsSearching(true);
        const timer = setTimeout(async () => {
            if (query.length < 3) { setIsSearching(false); return; }
            try {
                const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=5&language=en&format=json`);
                const data = await response.json();
                if (data.results) { setSuggestions(data.results); setIsVisible(true); }
            } catch (e) { } finally { setIsSearching(false); }
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (item) => {
        Keyboard.dismiss();
        setQuery('');
        setSuggestions([]);
        setIsVisible(false);
        onCitySelect(item);
    };

    return (
        <View style={styles.container}>
            <View style={styles.bar}>
                <TouchableOpacity onPress={onMyLocation} style={styles.gpsBtn}>
                    <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#fff" />
                </TouchableOpacity>
                <TextInput
                    style={styles.input}
                    placeholder="Search city..."
                    placeholderTextColor="rgba(255,255,255,0.7)"
                    value={query}
                    onChangeText={setQuery}
                />
                {isSearching ? <ActivityIndicator size="small" color="#fff" /> :
                    query.length > 0 ? (
                        <TouchableOpacity onPress={() => { setQuery(''); setIsVisible(false); }}>
                            <MaterialCommunityIcons name="close-circle" size={20} color="#fff" />
                        </TouchableOpacity>
                    ) : <MaterialCommunityIcons name="magnify" size={24} color="#fff" />}
            </View>

            {isVisible && suggestions.length > 0 && (
                <View style={styles.dropdown}>
                    {suggestions.map((item, index) => (
                        <TouchableOpacity key={index} style={styles.item} onPress={() => handleSelect(item)}>
                            <Text style={styles.text}>{item.name}, <Text style={styles.sub}>{item.country}</Text></Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { marginHorizontal: 20, marginVertical: 10, zIndex: 100 },
    bar: { flexDirection: 'row', alignItems: 'center', borderRadius: 30, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    gpsBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, marginRight: 10 },
    input: { flex: 1, color: '#fff', fontSize: scale(16) },
    dropdown: { position: 'absolute', top: 60, left: 0, right: 0, backgroundColor: 'rgba(30,30,30,0.9)', borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
    item: { padding: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
    text: { color: '#fff', fontSize: scale(14) },
    sub: { color: '#aaa' }
});

export default SearchModule;
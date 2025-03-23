import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import React, { memo } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const EventAgendaCard = memo(({ item }) => {
    return (
        <TouchableOpacity style={[styles.itemContainer, { borderLeftColor: item.color || '#2196F3' }]}>
            <View style={styles.timeContainer}>
                <MaterialCommunityIcons name="clock-outline" size={16} color="#555" />
                <Text style={styles.timeText}>{item.time}</Text>
            </View>
            <Text style={styles.itemName}>{item.name}</Text>
        </TouchableOpacity>
    );
});

export default EventAgendaCard;

const styles = StyleSheet.create({
    itemContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 15,
        marginVertical: 5,
        marginHorizontal: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
        borderLeftWidth: 4,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    timeText: {
        fontSize: 14,
        color: '#555555',
        marginLeft: 5,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333333',
    },
});
import { View, Text, StyleSheet } from 'react-native'
import React from 'react'
import { MaterialCommunityIcons } from '@expo/vector-icons'

const EmptyListComponent = () => {
    return (
        <View style={styles.emptyState}>
            <MaterialCommunityIcons
                name="package-variant"
                size={60}
                color="#CBD5E0"
            />
            <Text style={styles.emptyStateText}>
                No merchandise items found
            </Text>
        </View>
    )
}

export default EmptyListComponent;

const styles = StyleSheet.create({
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        flex: 1,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 12,
    }
});
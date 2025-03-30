import { View, Text, StyleSheet, Image } from 'react-native'
import React from 'react'
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const DiamondBalance = ({ balance }) => {
    return (
        <View style={styles.balanceContainer}>
            <LinearGradient
                colors={['#6284bf', '#4A6EB5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.balanceGradient}
            >
                <View style={styles.balanceContent}>
                    <Text style={styles.balanceLabel}>Your Balance</Text>
                    <View style={styles.balanceValueContainer}>
                        <Image source={require('../../assets/icons/diamond.png')} style={styles.balanceDiamondIcon} />
                        <Text style={styles.balanceValue}>{balance}</Text>
                        <Text style={styles.balanceDiamondText}>Diamonds</Text>
                    </View>
                </View>
                <View style={styles.balanceDecoration}>
                    <Ionicons name="wallet-outline" size={24} color="rgba(255,255,255,0.7)" />
                </View>
            </LinearGradient>
        </View>
    );
};

export default DiamondBalance;

const styles = StyleSheet.create({
    balanceContainer: {
        marginHorizontal: 18,
        marginVertical: 12,
    },
    balanceGradient: {
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    balanceContent: {
        flex: 1,
    },
    balanceLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.85)',
        marginBottom: 4,
    },
    balanceValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    balanceValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginRight: 4,
    },
    balanceDiamondText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.9)',
    },
    balanceDiamondIcon: {
        height: 20,
        width: 20,
        marginRight: 6,
    },
    balanceDecoration: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
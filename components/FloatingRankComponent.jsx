import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

const FloatingRankComponent = ({ userRank }) => {
    const floatAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(floatAnim, {
                    toValue: 0,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const translateY = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -6],
    });

    // Determine styling based on userRank
    const getBorderColor = () => {
        switch (userRank) {
            case 1:
                return '#FFD700'; // Gold
            case 2:
                return '#C0C0C0'; // Silver
            case 3:
                return '#CD7F32'; // Bronze
            default:
                return '#3498db'; // Default blue
        }
    };

    const getBadgeColor = () => {
        switch (userRank) {
            case 1:
                return '#FFD700'; // Gold
            case 2:
                return '#C0C0C0'; // Silver
            case 3:
                return '#CD7F32'; // Bronze
            default:
                return '#3498db'; // Default blue
        }
    };

    const getTextColor = () => {
        switch (userRank) {
            case 1:
            case 2:
            case 3:
                return '#000'; // Black text for better contrast on gold/silver/bronze
            default:
                return '#fff'; // White text for blue badge
        }
    };

    const borderColor = getBorderColor();
    const badgeColor = getBadgeColor();
    const textColor = getTextColor();

    return (
        <Animated.View
            style={[
                styles.floatingRankContainer,
                { transform: [{ translateY }] }
            ]}
        >
            <View style={[
                styles.floatingRankBox,
                { borderColor: borderColor }
            ]}>
                <Text style={styles.rankLabel}>You ranked:</Text>
                <Text style={[
                    styles.rankNumber,
                    { color: badgeColor }
                ]}>#{userRank}</Text>
            </View>
        </Animated.View>
    );
};

export default FloatingRankComponent;

const styles = StyleSheet.create({
    floatingRankContainer: {
        position: 'absolute',
        bottom: 15,
        right: 24,
        zIndex: 1000,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 10,
        opacity: 0.8,
    },
    floatingRankBox: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 10,
        alignItems: 'center',
        borderWidth: 2,
    },
    rankLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    rankNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 2,
    }
})
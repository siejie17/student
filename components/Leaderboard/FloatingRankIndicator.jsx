import { View, Text, Animated, StyleSheet } from 'react-native'
import { useCallback } from 'react'
import { LinearGradient } from 'expo-linear-gradient';

const FloatingRankIndicator = useCallback(({ currentUserRank }) => {
    if (!currentUserRank) return null;

    return (
        <Animated.View style={styles.floatingRankContainer}>
            <LinearGradient
                colors={['#6284bf', '#4A6EB5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.floatingRankGradient}
            >
                <View style={styles.floatingRankContent}>
                    <Text style={styles.floatingRankText}>Your Rank:</Text>
                    <Text style={styles.floatingRankNumber}>#{currentUserRank}</Text>
                </View>
            </LinearGradient>
        </Animated.View>
    );
}, [currentUserRank]);

export default FloatingRankIndicator;

const styles = StyleSheet.create({
    floatingRankContainer: {
        position: 'absolute',
        bottom: 20,
        alignSelf: 'center',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
        elevation: 6,
    },
    floatingRankGradient: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 20,
    },
    floatingRankContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    floatingRankText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
        marginRight: 8,
    },
    floatingRankNumber: {
        fontSize: 18,
        fontWeight: '700',
        color: 'white',
    },
});
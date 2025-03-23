import React, { useState, useRef } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    Animated,
    StyleSheet,
    Image,
} from 'react-native';
import { getItem } from '../utils/asyncStorage';
import { doc, increment, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebaseConfig';

const FUNNY_MESSAGES = [
    "You're #1! Even your cat is impressed (maybe).",
    "Silver medal! Just like your effort level on Mondays.",
    "Bronze isn't bad! It's the color of chocolate... kinda.",
    "You beat 83% of players! (They're probably still sleeping)",
    "Not bad! Your mom would be proud.",
    "Keep climbing! The view is nice up here.",
    "Top 10? Show off much?",
    "Diamonds are forever, but rankings change monthly!",
    "More diamonds than a rapper's teeth collection!",
    "With great diamonds comes great responsibility... or whatever."
];

const RankingRewardsModal = ({ 
    rewardsModalVisible, 
    setRewardsModalVisible,
    previousMonthRanking, 
    diamondsRewards 
}) => {
    const [animatingDiamonds, setAnimatingDiamonds] = useState(false);
    const [claimed, setClaimed] = useState(false);

    const diamondAnims = useRef([...Array(30)].map(() => ({
        translateX: new Animated.Value(0),
        translateY: new Animated.Value(0),
        scale: new Animated.Value(0.5),
        opacity: new Animated.Value(0),
        rotate: new Animated.Value(0),
    }))).current;

    const getMotivationalMessage = (rank) => {
        if (rank === 1) return FUNNY_MESSAGES[0];
        if (rank === 2) return FUNNY_MESSAGES[1];
        if (rank === 3) return FUNNY_MESSAGES[2];
        if (rank <= 10) return FUNNY_MESSAGES[6];
        if (rank <= 50) return FUNNY_MESSAGES[5];
        if (rank <= 100) return FUNNY_MESSAGES[4];
        return FUNNY_MESSAGES[7];
    };

    const addDiamondsToDatabase = async () => {
        try {
            const studentID = await getItem("studentID");
            if (!studentID) return;

            const currentUserRef = doc(db, "user", studentID);

            await updateDoc(currentUserRef, {
                diamonds: increment(diamondsRewards),
            })
        } catch (error) {
            console.error("Error updating diamonds amount:", error)
        }
    }

    const animateDiamonds = () => {
        setAnimatingDiamonds(true);

        // Reset animations
        diamondAnims.forEach(anim => {
            anim.translateX.setValue(0);
            anim.translateY.setValue(0);
            anim.scale.setValue(0.5);
            anim.opacity.setValue(1);
            anim.rotate.setValue(0);
        });

        // Create animation sequence for diamonds
        diamondAnims.forEach((anim, index) => {
            const randomX = Math.random() * 300 - 100;
            const randomY = Math.random() * -300 - 100;
            const randomRotate = Math.random() * 360;

            Animated.sequence([
                Animated.delay(index * 50),
                Animated.parallel([
                    Animated.timing(anim.translateX, {
                        toValue: randomX,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim.translateY, {
                        toValue: randomY,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim.scale, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim.rotate, {
                        toValue: randomRotate,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.sequence([
                        Animated.delay(600),
                        Animated.timing(anim.opacity, {
                            toValue: 0,
                            duration: 400,
                            useNativeDriver: true,
                        }),
                    ]),
                ]),
            ]).start();
        });

        // Set timeout to finish animation
        setTimeout(() => {
            setAnimatingDiamonds(false);
            setClaimed(true);
            setRewardsModalVisible(false);
            addDiamondsToDatabase();
        }, 1500);
    };

    const getRankingColor = (rank) => {
        if (rank === 1) return '#FFD700'; // Gold
        if (rank === 2) return '#C0C0C0'; // Silver
        if (rank === 3) return '#CD7F32'; // Bronze
        if (rank <= 10) return '#3498db'; // Blue
        if (rank <= 50) return '#2ecc71'; // Green
        return '#9b59b6'; // Purple
    };

    return (
        <Modal
            animationType="fade"
            transparent
            visible={rewardsModalVisible}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Monthly Leaderboard</Text>
                        <View style={styles.titleUnderline} />
                    </View>

                    <View style={styles.rewardSection}>
                        <View style={styles.rankBadge}>
                            <Text style={[styles.rankNumber, {color: getRankingColor(previousMonthRanking)}]}>
                                #{previousMonthRanking}
                            </Text>
                        </View>
                        <Text style={styles.rewardText}>
                            Last Month's Ranking
                        </Text>
                        <Text style={styles.motivationalText}>
                            {getMotivationalMessage(previousMonthRanking)}
                        </Text>

                        <View style={styles.divider} />

                        <View style={styles.diamondsRewardContainer}>
                            <Text style={styles.youEarnedText}>You've earned</Text>
                            <View style={styles.diamondsContainer}>
                                <Image source={require('../assets/icons/diamond.png')} style={styles.diamondImage} />
                                <Text style={styles.diamondValue}>{diamondsRewards}</Text>
                            </View>
                        </View>

                        {/* Animated diamonds */}
                        {diamondAnims.map((anim, index) => (
                            <Animated.View
                                key={`diamond-${index}`}
                                style={[
                                    styles.animatedDiamond,
                                    {
                                        transform: [
                                            { translateX: anim.translateX },
                                            { translateY: anim.translateY },
                                            { scale: anim.scale },
                                            { rotate: anim.rotate.interpolate({
                                                inputRange: [0, 360],
                                                outputRange: ['0deg', '360deg']
                                            }) },
                                        ],
                                        opacity: anim.opacity,
                                    },
                                ]}
                            >
                                <Image source={require('../assets/icons/diamond.png')} style={styles.diamondImage} />
                            </Animated.View>
                        ))}

                        <TouchableOpacity
                            style={[
                                styles.claimButton,
                                animatingDiamonds && styles.claimButtonDisabled
                            ]}
                            onPress={animateDiamonds}
                            disabled={animatingDiamonds}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.claimButtonText}>
                                {animatingDiamonds ? "Making it rain..." : "Claim Rewards"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    )
}

export default RankingRewardsModal;

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '80%',
        maxHeight: '75%',
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
        overflow: 'hidden',
    },
    modalHeader: {
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    titleUnderline: {
        height: 3,
        width: 40,
        backgroundColor: '#3498db',
        marginTop: 8,
        borderRadius: 2,
    },
    diamondImage: {
        height: 30,
        width: 30,
        resizeMode: 'contain',
    },
    rewardSection: {
        width: '100%',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 1,
    },
    rankBadge: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#f5f6fa',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
        borderWidth: 2,
        borderColor: '#eaeaea',
    },
    rankNumber: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    rewardText: {
        fontSize: 16,
        color: '#2c3e50',
        fontWeight: '700',
        marginBottom: 6,
    },
    motivationalText: {
        fontSize: 14,
        color: '#34495e',
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 16,
        paddingHorizontal: 8,
    },
    divider: {
        height: 1,
        width: '80%',
        backgroundColor: '#e0e0e0',
        marginVertical: 16,
    },
    diamondsRewardContainer: {
        alignItems: 'center',
        marginVertical: 12,
    },
    youEarnedText: {
        fontSize: 14,
        color: '#7f8c8d',
        marginBottom: 4,
    },
    diamondsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 12,
    },
    diamondValue: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginLeft: 10,
    },
    animatedDiamond: {
        position: 'absolute',
        bottom: -30,
        zIndex: 10,
    },
    claimButton: {
        width: '85%',
        marginTop: 24,
        backgroundColor: '#3498db',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 30,
        shadowColor: '#3498db',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    claimButtonDisabled: {
        backgroundColor: '#95a5a6',
        shadowOpacity: 0.1,
    },
    claimButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
});
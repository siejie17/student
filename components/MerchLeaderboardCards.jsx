import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { db } from '../utils/firebaseConfig';
import { doc, onSnapshot, query, where, getDocs, collection, orderBy } from "firebase/firestore";
import { getItem } from '../utils/asyncStorage';
import { useNavigation } from '@react-navigation/native';

const MerchLeaderboardCards = ({ setIsLoading, setFirstName, setSpecialNavigation }) => {
    const [diamonds, setDiamonds] = useState(0);
    const [diamondsLoading, setDiamondsLoading] = useState(false);
    const [rank, setRank] = useState(0);
    const [totalUsers, setTotalUsers] = useState(0);
    const [percentile, setPercentile] = useState(0);

    const navigation = useNavigation();

    const formatLeaderboardPlace = (place) => {
        const superscripts = {
            1: "ˢᵗ",
            2: "ⁿᵈ",
            3: "ʳᵈ",
        };

        if (place >= 10 && place <= 19) {
            return `${place}ᵗʰ`;
        }

        const lastDigit = place % 10;
        const secondLastDigit = Math.floor((place % 100) / 10);

        if (secondLastDigit === 1) {
            return `${place}ᵗʰ`; // Covers 11th, 12th, 13th, etc.
        }

        return `${place}${superscripts[lastDigit] || "ᵗʰ"}`;
    };

    useEffect(() => {
        const fetchUserDiamonds = async () => {
            try {
                const studentID = await getItem("studentID");
                if (!studentID) return;

                setIsLoading(true);
                setDiamondsLoading(true);

                const userRef = doc(db, "user", studentID);

                const unsubscribe = onSnapshot(userRef, (userSnap) => {
                    if (userSnap.exists()) {
                        setFirstName(userSnap.data().firstName);
                        setDiamonds(userSnap.data().diamonds);
                    } else {
                        console.log("User does not exist.");
                    }
                    setDiamondsLoading(false);
                    setIsLoading(false);
                });

                return () => unsubscribe(); // Cleanup on unmount
            } catch (error) {
                console.error("Error occurred when fetching user's diamonds", error);
                setDiamondsLoading(false);
                setIsLoading(false);
            }
        }

        fetchUserDiamonds();
    }, []);

    useEffect(() => {
        const fetchUserPlace = async () => {
            try {
                const studentID = await getItem("studentID");
                const facultyID = await getItem("facultyID");

                if (!studentID || !facultyID) return;

                setIsLoading(true);

                const leaderboardRef = collection(db, "leaderboard");
                const leaderboardQuery = query(leaderboardRef, where("facultyID", "==", facultyID));

                // Listen for real-time updates on leaderboard changes
                const unsubscribeLeaderboard = onSnapshot(leaderboardQuery, (leaderboardSnap) => {
                    if (leaderboardSnap.empty) {
                        console.log("No leaderboard found for this faculty.");
                        setRank(null);
                        setTotalUsers(0);
                        setPercentile(0);
                        return;
                    }

                    const leaderboardDoc = leaderboardSnap.docs[0];
                    const leaderboardID = leaderboardDoc.id;

                    // Step 2: Listen for changes in `leaderboardEntries` collection
                    const leaderboardEntriesRef = collection(db, "leaderboard", leaderboardID, "leaderboardEntries");
                    const leaderboardEntriesQuery = query(leaderboardEntriesRef, orderBy("points", "desc"));

                    const unsubscribeEntries = onSnapshot(leaderboardEntriesQuery, (leaderboardEntriesSnapshot) => {
                        const entries = leaderboardEntriesSnapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));

                        const userPlace = entries.findIndex(entry => entry.studentID === studentID) + 1;
                        const totalParticipants = entries.length;

                        // Calculate percentile (top X%)
                        const calculatedPercentile = Math.ceil((userPlace / totalParticipants) * 100);

                        setRank(userPlace);
                        setTotalUsers(totalParticipants);
                        setPercentile(calculatedPercentile);
                        setIsLoading(false);
                    });

                    return () => unsubscribeEntries(); // Cleanup
                });

                return () => unsubscribeLeaderboard(); // Cleanup
            } catch (error) {
                console.error("Error fetching leaderboard entries:", error);
                setIsLoading(false);
            }
        };

        fetchUserPlace();
    }, []);

    const getPlacementColor = () => {
        if (rank === 1) return ['#FFD700', '#FFC107']; // Gold
        if (rank === 2) return ['#C0C0C0', '#A9A9A9']; // Silver
        if (rank === 3) return ['#CD7F32', '#A0522D']; // Bronze
        return ['#E0E0E0', '#BDBDBD']; // Default
    };

    return (
        <View style={styles.container}>
            <Pressable
                style={({ pressed }) => [
                    styles.card,
                    pressed ? styles.cardPressed : styles.cardNormal
                ]}
                onPress={() => navigation.navigate("MerchandiseTopTabs")}
                android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
            >
                <LinearGradient
                    colors={['#F6F8FD', '#EDF0F7']}
                    style={styles.cardGradient}
                >
                    <View style={styles.cardHeader}>
                        <View style={styles.iconContainer}>
                            <Image
                                source={require('../assets/icons/diamond.png')}
                                style={styles.icon}
                            />
                        </View>
                        <Text style={styles.cardTitle}>Shop</Text>
                    </View>
                    
                    <View style={styles.cardBody}>
                        <Text style={styles.diamondAmount}>
                            <Text style={styles.diamondNumber}>{diamondsLoading ? <ActivityIndicator size={24} color="#6c63ff" /> : `${diamonds} Diamonds`}</Text>
                        </Text>
                    </View>

                    <View style={styles.cardFooter}>
                        <Text style={styles.actionText}>Browse Merchandise</Text>
                        <Ionicons name="chevron-forward" size={16} color="#6c63ff" />
                    </View>
                </LinearGradient>
            </Pressable>

            <Pressable
                style={({ pressed }) => [
                    styles.card,
                    pressed ? styles.cardPressed : styles.cardNormal
                ]}
                onPress={() => navigation.jumpTo("Leaderboard")}
                android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
            >
                <LinearGradient
                    colors={['#F6F8FD', '#EDF0F7']}
                    style={styles.cardGradient}
                >
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconContainer, styles.trophyContainer]}>
                            <Image
                                source={require('../assets/icons/trophy.png')}
                                style={styles.icon}
                            />
                        </View>
                        <Text style={styles.cardTitle}>Rank</Text>
                    </View>
                    
                    <View style={styles.cardBody}>
                        {rank === 0 ? (
                            <Text style={styles.rankStart}>Battle On!</Text>
                        ) : (
                            <>
                                <View style={styles.rankBadgeContainer}>
                                    <LinearGradient
                                        colors={getPlacementColor()}
                                        style={styles.rankBadge}
                                    >
                                        <Text style={styles.rankNumber}>{rank}</Text>
                                    </LinearGradient>
                                    <Text style={styles.rankText}>
                                        {formatLeaderboardPlace(rank)}
                                    </Text>
                                </View>
                                <Text style={styles.subtitle}>
                                    Top {percentile}% of {totalUsers} users
                                </Text>
                            </>
                        )}
                    </View>

                    <View style={styles.cardFooter}>
                        <Text style={styles.actionText}>View Leaderboard</Text>
                        <Ionicons name="chevron-forward" size={16} color="#6c63ff" />
                    </View>
                </LinearGradient>
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        width: '100%',
    },
    card: {
        flex: 1,
        borderRadius: 12,
        marginHorizontal: 6,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardGradient: {
        padding: 16,
    },
    cardNormal: {
        backgroundColor: '#FFFFFF',
    },
    cardPressed: {
        transform: [{ scale: 0.98 }],
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginLeft: 8,
    },
    cardBody: {
        marginBottom: 16,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(79, 139, 222, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    trophyContainer: {
        backgroundColor: 'rgba(255, 193, 7, 0.1)',
    },
    icon: {
        height: 16,
        width: 16,
    },
    diamondAmount: {
        fontSize: 18,
        color: '#333',
        marginBottom: 4,
    },
    diamondNumber: {
        fontWeight: '700',
        color: '#638aff',
    },
    subtitle: {
        fontSize: 12,
        color: '#666',
    },
    actionText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#638aff',
    },
    rankBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    rankBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    rankNumber: {
        fontSize: 14,
        fontWeight: '700',
        color: 'white',
    },
    rankText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    rankStart: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFC107',
        marginBottom: 4,
    }
});

export default MerchLeaderboardCards;
import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { db } from '../../utils/firebaseConfig';
import { doc, onSnapshot, query, where, collection, orderBy } from "firebase/firestore";
import { getItem } from '../../utils/asyncStorage';
import { useNavigation } from '@react-navigation/native';

const MerchandiseLeaderboardCards = ({ setIsLoading, setFirstName }) => {
    const [diamonds, setDiamonds] = useState(0);
    const [diamondsLoading, setDiamondsLoading] = useState(false);
    const [rank, setRank] = useState(0);

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
        let userUnsubscribe = null;
        let leaderboardUnsubscribe = null;
        let entriesUnsubscribe = null;
    
        const init = async () => {
            try {
                const [studentID, facultyID] = await Promise.all([
                    getItem("studentID"),
                    getItem("facultyID")
                ]);
    
                if (!studentID) return;
    
                setIsLoading(true);
                setDiamondsLoading(true);
    
                // --- User Diamonds Listener ---
                const userRef = doc(db, "user", studentID);
                userUnsubscribe = onSnapshot(userRef, (userSnap) => {
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        setFirstName(userData.firstName);
                        setDiamonds(userData.diamonds);
                    } else {
                        console.log("User does not exist.");
                    }
                    setDiamondsLoading(false);
                    setIsLoading(false);
                });
    
                // --- Leaderboard Listener ---
                if (!facultyID) return;
    
                const leaderboardRef = collection(db, "leaderboard");
                const leaderboardQuery = query(leaderboardRef, where("facultyID", "==", facultyID));
    
                leaderboardUnsubscribe = onSnapshot(leaderboardQuery, (leaderboardSnap) => {
                    if (leaderboardSnap.empty) {
                        console.log("No leaderboard found for this faculty.");
                        setRank(null);
                        return;
                    }
    
                    const leaderboardID = leaderboardSnap.docs[0].id;
                    const leaderboardEntriesRef = collection(db, "leaderboard", leaderboardID, "leaderboardEntries");
                    const leaderboardEntriesQuery = query(leaderboardEntriesRef, orderBy("points", "desc"));
    
                    if (entriesUnsubscribe) entriesUnsubscribe(); // Unsubscribe old entry listener if exists
    
                    entriesUnsubscribe = onSnapshot(leaderboardEntriesQuery, (entriesSnap) => {
                        const entries = entriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        const userIndex = entries.findIndex(entry => entry.studentID === studentID);
                        
                        const userPlace = userIndex != null && (userIndex + 1);
    
                        setRank(userPlace);
                        setIsLoading(false);
                    });
                });
            } catch (error) {
                console.error("Initialization error:", error);
                setIsLoading(false);
                setDiamondsLoading(false);
            }
        };
    
        init();
    
        return () => {
            if (userUnsubscribe) userUnsubscribe();
            if (leaderboardUnsubscribe) leaderboardUnsubscribe();
            if (entriesUnsubscribe) entriesUnsubscribe();
        };
    }, []);

    return (
        <View style={styles.container}>
            <Pressable
                style={({ pressed }) => [
                    styles.card,
                    pressed && styles.cardPressed
                ]}
                onPress={() => navigation.navigate("MerchandiseTopTabs")}
                android_ripple={{ color: 'rgba(0, 0, 0, 0.05)' }}
            >
                <LinearGradient
                    colors={['#F9FCFF', '#F0F6FF']}
                    style={styles.cardGradient}
                >
                    <View style={styles.cardHeader}>
                        <View style={styles.iconContainer}>
                            <Image
                                source={require('../../assets/icons/diamond.png')}
                                style={styles.icon}
                            />
                        </View>
                        <Text style={styles.diamondAmount}>
                            <Text style={styles.diamondNumber}>{diamondsLoading ? <ActivityIndicator size={24} color="#6c63ff" /> : `${diamonds} Diamonds`}</Text>
                        </Text>
                    </View>

                    <View style={styles.cardFooter}>
                        <Text style={styles.actionText}>Browse Merchandise</Text>
                        <Ionicons name="chevron-forward" size={16} color="#7084cf" />
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
                    colors={['#F6FCFD', '#EDF4F7']}
                    style={styles.cardGradient}
                >
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconContainer, styles.trophyContainer]}>
                            <Image
                                source={require('../../assets/icons/trophy.png')}
                                style={styles.icon}
                            />
                        </View>
                        <View style={styles.cardBody}>
                        {rank === 0 ? (
                            <Text style={styles.rankStart}>Battle On!</Text>
                        ) : (
                            <View style={styles.rankBadgeContainer}>
                                <Text style={styles.rankText}>
                                    {formatLeaderboardPlace(rank)} Place
                                </Text>
                            </View>
                        )}
                        </View>
                    </View>

                    <View style={styles.cardFooter}>
                        <Text style={styles.actionText}>View Leaderboard</Text>
                        <Ionicons name="chevron-forward" size={16} color="#7084cf" />
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
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.01,
        shadowRadius: 2,
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
        marginLeft: 12,
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
        fontSize: 16,
        color: '#333',
        marginLeft: 10,
    },
    diamondNumber: {
        fontWeight: '700',
        color: '#4A6EB5',
    },
    subtitle: {
        fontSize: 12,
        color: '#666',
    },
    actionText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#7084cf',
    },
    rankBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        // marginBottom: 4,
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
        fontSize: 16,
        fontWeight: '600',
        color: '#4A6EB5',
    },
    rankStart: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFC107',
        marginBottom: 4,
    }
});

export default MerchandiseLeaderboardCards;
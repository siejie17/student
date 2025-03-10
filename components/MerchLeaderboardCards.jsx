import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { db } from '../utils/firebaseConfig';
import { doc, getDoc, query, where, getDocs, collection, orderBy } from "firebase/firestore";
import { getItem } from '../utils/asyncStorage';
import { useNavigation } from '@react-navigation/native';

const MOCK_DATA = {
    diamonds: 1250,
    userRank: 4
  };

const MerchLeaderboardCards = ({ setIsLoading, setFirstName, setSpecialNavigation }) => {
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
        const fetchUserDiamonds = async () => {
            try {
                const studentID = await getItem("studentID");
                
                setIsLoading(true);
                setDiamondsLoading(true);
                const userRef = doc(db, "user", studentID);
                const userSnap = await getDoc(userRef);

                if (!userSnap.exists()) {
                    console.log("User does not existed.");
                    return;
                }

                const userFirstName = userSnap.data().firstName;
                const userDiamonds = userSnap.data().diamonds;

                setFirstName(userFirstName);
                setDiamonds(userDiamonds);
            } catch (error) {
                console.error("Error occured when fetching user's diamonds", error);
            } finally {
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

                setIsLoading(true);

                const leaderboardRef = collection(db, "leaderboard");
                const leaderboardQuery = query(leaderboardRef, where("facultyID", "==", facultyID));
                const leaderboardSnap = await getDocs(leaderboardQuery);

                if (leaderboardSnap.empty) {
                    console.log("No leaderboard found for this faculty.");
                    return [];
                }

                const leaderboardDoc = leaderboardSnap.docs[0]; 
                const leaderboardID = leaderboardDoc.id;

                // Step 2: Query the inner collection `leaderboardEntries` within the found leaderboard document
                const leaderboardEntriesRef = collection(db, "leaderboard", leaderboardID, "leaderboardEntries");
                const leaderboardEntriesQuery = query(leaderboardEntriesRef, orderBy("points", "desc"))
                const leaderboardEntriesSnapshot = await getDocs(leaderboardEntriesQuery);

                const entries = leaderboardEntriesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                const userPlace = entries.findIndex(entry => entry.studentID === studentID) + 1;

                setRank(userPlace);
            } catch (error) {
                console.error("Error fetching leaderboard entries:", error);
                return [];
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserPlace();
    }, []);

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
                <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                    <Ionicons name="diamond-outline" size={24} color="#555555" />
                </View>
                <View style={styles.textContainer}>
                    <View style={styles.diamondContainer}>
                    <Text style={styles.diamondText}>{diamonds} Diamonds</Text>
                    </View>
                    <Text style={styles.title}>Browse Merchandise</Text>
                </View>
                <View style={styles.chevronBack}>
                    <Ionicons name="chevron-forward" size={20} color="#555555" />
                </View>
                </View>
            </Pressable>

            <Pressable 
                style={({ pressed }) => [
                    styles.card,
                    pressed ? styles.cardPressed : styles.cardNormal
                ]}
                onPress={() => navigation.jumpTo("Leaderboard")}
                android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
            >
                <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                    <Ionicons name="trophy-outline" size={24} color="#555555" />
                </View>
                <View style={styles.textContainer}>
                    <View style={styles.rankContainer}>
                    <Text style={styles.rankText}>
                        <Text style={styles.rankNumber}>{formatLeaderboardPlace(rank)} Place</Text>
                    </Text>
                    </View>
                    <Text style={styles.title}>View Leaderboard</Text>
                </View>
                <View style={styles.chevronBack}>
                    <Ionicons name="chevron-forward" size={20} color="#555555" />
                </View>
                </View>
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      width: '100%',
    },
    card: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      padding: 12,
      marginHorizontal: 5,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
    },
    cardNormal: {
      backgroundColor: '#FFFFFF',
    },
    cardPressed: {
      backgroundColor: '#F5F5F5',
      transform: [{ scale: 0.98 }],
    },
    cardContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      marginRight: 10,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#F5F7FA',
      justifyContent: 'center',
      alignItems: 'center',
    },
    textContainer: {
      flex: 1,
    },
    title: {
      fontSize: 10,
      color: '#333333',
      marginBottom: 2,
    },
    diamondContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    diamondText: {
      fontWeight: '500',
      fontSize: 14,
      color: '#555555',
    },
    rankContainer: {
      fontWeight: '500',
      flexDirection: 'row',
      alignItems: 'center',
    },
    rankText: {
      fontSize: 14,
      color: '#555555',
    },
    rankNumber: {
      fontWeight: '500',
      color: '#555555',
    },
    chevronBack: {
      marginLeft: 1,
    }
});

export default MerchLeaderboardCards
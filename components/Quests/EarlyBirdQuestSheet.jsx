import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Image } from 'react-native';
import { collection, setDoc, getDocs, increment, limit, onSnapshot, orderBy, query, updateDoc, where, getDoc, doc, serverTimestamp } from 'firebase/firestore';

import { db } from '../../utils/firebaseConfig';
import { getItem } from '../../utils/asyncStorage';

const EarlyBirdQuestSheet = ({ selectedQuest, onCancel, eventID, updateQuestStatus }) => {
    // Placeholder for current attendees
    const [currentEarlyBirdAttendees, setCurrentEarlyBirdAttendees] = useState(0);
    const [animatingDiamonds, setAnimatingDiamonds] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [claimed, setClaimed] = useState(false);

    const diamondAnims = useRef([...Array(30)].map(() => ({
        translateX: new Animated.Value(0),
        translateY: new Animated.Value(0),
        scale: new Animated.Value(0.5),
        opacity: new Animated.Value(0),
        rotate: new Animated.Value(0),
    }))).current;

    const pointAnims = useRef([...Array(30)].map(() => ({
        translateX: new Animated.Value(0),
        translateY: new Animated.Value(0),
        scale: new Animated.Value(0.5),
        opacity: new Animated.Value(0),
        rotate: new Animated.Value(0),
    }))).current;

    if (!selectedQuest) return null;

    useEffect(() => {
        const fetchCurrentEarlyBirdiesNum = async () => {
            try {
                setIsLoading(true);

                const studentID = await getItem("studentID");

                const currentEarlyBirdiesRef = collection(db, "registration");
                const currentEarlyBirdiesQuery = query(currentEarlyBirdiesRef, 
                    where("eventID", "==", eventID), 
                    where("isAttended", "==", true), 
                    orderBy("attendanceScannedTime", "asc"), 
                    limit(selectedQuest.maxEarlyBird)
                );

                const unsubscribeEarlyBirdies = onSnapshot(currentEarlyBirdiesQuery, async (earlyBirdiesSnap) => {
                    setCurrentEarlyBirdAttendees(earlyBirdiesSnap.size);
                    const earlyBirdiesData = earlyBirdiesSnap.docs.map(doc => doc.data());
                    const currentStudentExists = earlyBirdiesData.some(item => item.studentID === studentID);
                    if (currentStudentExists && selectedQuest.progress !== selectedQuest.completionNum) {
                        const studentQuestsRef = collection(db, "questProgress");
                        const studentQuestsQuery = query(studentQuestsRef, where("eventID", "==", eventID), where("studentID", "==", studentID));
                        const studentQuestsSnapshot = await getDocs(studentQuestsQuery);

                        const studentQuestsDocID = studentQuestsSnapshot.docs[0].id;

                        const earlyBirdQuestRef = doc(db, "questProgress", studentQuestsDocID, "questProgressList", selectedQuest.id);
                        const earlyBirdQuestSnap = await getDoc(earlyBirdQuestRef);

                        if (earlyBirdQuestSnap.exists()) {
                            if (!earlyBirdQuestSnap.data().isCompleted) {
                                await updateDoc(earlyBirdQuestRef, {
                                    isCompleted: true,
                                    progress: increment(1),
                                })
                            }
                        }
                    }
                });

                setIsLoading(false);

                return unsubscribeEarlyBirdies;
            } catch (error) {
                console.error("Error when fetching current early birdies number", error)
            }
        };

        fetchCurrentEarlyBirdiesNum();
    }, []);

    // Calculate percentage for visual indicator
    const attendancePercentage = Math.min(
        (currentEarlyBirdAttendees / selectedQuest.maxEarlyBird) * 100,
        100
    );

    const claimRewards = () => {
        setClaimed(true);
        setAnimatingDiamonds(true);

        // Reset animations
        diamondAnims.forEach(anim => {
            anim.translateX.setValue(0);
            anim.translateY.setValue(0);
            anim.scale.setValue(0.5);
            anim.opacity.setValue(1);
            anim.rotate.setValue(0);
        });

        pointAnims.forEach(anim => {
            anim.translateX.setValue(0);
            anim.translateY.setValue(0);
            anim.scale.setValue(0.5);
            anim.opacity.setValue(1);
            anim.rotate.setValue(0);
        });

        // Create animation sequence for diamonds
        diamondAnims.forEach((anim, index) => {
            const randomX = Math.random() * 300 - 10;
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

        pointAnims.forEach((anim, index) => {
            const randomX = Math.random() * 300 - 250;
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

        setTimeout(() => {
            setAnimatingDiamonds(false);
            updateDatabase();
            // addDiamondsToDatabase();
        }, 1500);
    }

    const updateEarlyBirdBadge = async () => {
        try {
            const studentID = await getItem("studentID");
            if (!studentID) return;

            let feedbackBadge;
            let badgeProgressID;

            const feedbackBadgeQuery = query(collection(db, "badge"), where("badgeType", "==", selectedQuest.questType));
            const feedbackBadgeSnap = await getDocs(feedbackBadgeQuery);

            feedbackBadgeSnap.forEach((badge) => {
                feedbackBadge = {
                    id: badge.id,
                    ...badge.data(),
                }
            });

            const badgeProgressQuery = query(
                collection(db, "badgeProgress"),
                where("studentID", "==", studentID)
            );

            const badgeProgressSnap = await getDocs(badgeProgressQuery);

            badgeProgressSnap.forEach(async (badgeProgress) => {
                badgeProgressID = badgeProgress.id;

                const userFeedbackBadgeRef = doc(db, "badgeProgress", badgeProgressID, "userBadgeProgress", feedbackBadge.id);
                const userFeedbackBadgeSnap = await getDoc(userFeedbackBadgeRef);

                if (userFeedbackBadgeSnap.exists()) {
                    let userFeedbackBadgeProgress = userFeedbackBadgeSnap.data();

                    if (!userFeedbackBadgeProgress.isUnlocked) {
                        let userProgress = userFeedbackBadgeProgress.progress;

                        userProgress++;

                        if (userProgress === feedbackBadge.unlockProgress) {
                            await updateDoc(userFeedbackBadgeRef, {
                                isUnlocked: true,
                                progress: increment(1),
                                dateUpdated: serverTimestamp()
                            });
                        } else {
                            await updateDoc(userFeedbackBadgeRef, {
                                progress: increment(1),
                                dateUpdated: serverTimestamp()
                            });
                        }
                    }
                } else {
                    console.error("No user feedback badge progress has been found");
                }
            })
        } catch (error) {
            console.error("Error when updating user's early bird badge progress:", error);
        }
    }

    const updateDatabase = async () => {
        try {
            const studentID = await getItem("studentID");
            const facultyID = await getItem("facultyID");
            if (!studentID && !facultyID) return;

            const studentRef = doc(db, "user", studentID);

            await updateDoc(studentRef, {
                diamonds: increment(selectedQuest.diamondsRewards),
                totalPointsGained: increment(selectedQuest.pointsRewards)
            });

            const leaderboardRef = collection(db, "leaderboard");
            const leaderboardQuery = query(leaderboardRef, where("facultyID", "==", facultyID));
            const leaderboardSnapshot = await getDocs(leaderboardQuery);

            for (const snapDoc of leaderboardSnapshot.docs) {
                const leaderboardID = snapDoc.id;
                const leaderboardEntryRef = collection(db, "leaderboard", leaderboardID, "leaderboardEntries");
                const leaderboardEntryQuery = query(leaderboardEntryRef, where("studentID", "==", studentID));
                const leaderboardEntrySnapshot = await getDocs(leaderboardEntryQuery);

                if (leaderboardEntrySnapshot.empty) {
                    // 🔹 Create a new leaderboard entry
                    const newEntryRef = doc(leaderboardEntryRef); // Auto-generate ID
                    await setDoc(newEntryRef, {
                        studentID: studentID,
                        points: selectedQuest.pointsRewards,
                        lastUpdated: new Date(),
                    });
                    console.log("New leaderboard entry created.");
                } else {
                    // 🔹 Update existing entry
                    const existingEntryDoc = leaderboardEntrySnapshot.docs[0]; // Get first matched entry
                    const existingEntryRef = doc(db, "leaderboard", leaderboardID, "leaderboardEntries", existingEntryDoc.id);

                    await updateDoc(existingEntryRef, {
                        points: increment(selectedQuest.pointsRewards),
                        lastUpdated: new Date(),
                    });
                    console.log("Leaderboard entry updated.");
                }
            }

            updateEarlyBirdBadge();
            updateQuestStatus();
        } catch (error) {
            console.error("Error when adding points and diamonds to Firebase:", error)
        }
    }

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Loading quest...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header with decorative element */}
            <View style={styles.headerDecoration} />

            {/* Quest Title */}
            <Text style={styles.title}>{selectedQuest.questName}</Text>

            {/* Quest Description */}
            <Text style={styles.description}>{selectedQuest.description}</Text>

            {/* Attendance Counter - Centralized */}
            <View style={styles.attendanceContainer}>
                <View style={styles.attendanceCard}>
                    <View style={styles.progressBarContainer}>
                        <View
                            style={[
                                styles.progressBar,
                                { width: `${attendancePercentage}%` }
                            ]}
                        />
                    </View>
                    <Text style={styles.attendanceText}>
                        <Text style={styles.currentNumber}>{currentEarlyBirdAttendees}</Text>
                        <Text style={styles.slashText}> / </Text>
                        <Text style={styles.maxNumber}>{selectedQuest.maxEarlyBird}</Text>
                    </Text>
                    <Text style={styles.attendanceLabel}>Early Birdies Attended</Text>
                </View>
            </View>

            {/* Rewards Section */}
            <View style={styles.rewardsSection}>
                <Text style={styles.rewardsTitle}>Rewards</Text>
                <View style={styles.rewardsContainer}>
                    <View style={styles.rewardItem}>
                        <View style={styles.iconContainer}>
                            <Image source={require("../../assets/icons/diamond.png")} style={styles.iconImage} />
                        </View>
                        <View style={styles.rewardTextContainer}>
                            <Text style={styles.rewardValue}>{selectedQuest.diamondsRewards}</Text>
                            <Text style={styles.rewardType}>diamonds</Text>
                        </View>
                    </View>
                    <View style={styles.separator} />
                    <View style={styles.rewardItem}>
                        <View style={[styles.iconContainer, styles.pointsIconContainer]}>
                            <Image source={require("../../assets/icons/point.png")} style={styles.iconImage} />
                        </View>
                        <View style={styles.rewardTextContainer}>
                            <Text style={styles.rewardValue}>{selectedQuest.pointsRewards}</Text>
                            <Text style={styles.rewardType}>points</Text>
                        </View>
                    </View>
                </View>
            </View>

            {!selectedQuest.rewardsClaimed && selectedQuest.progress === selectedQuest.completionNum && selectedQuest.isCompleted && (
                <TouchableOpacity
                    style={[styles.rewardsButton, { marginBottom: 5 }, claimed && styles.claimedButton]}
                    disabled={claimed}
                    onPress={claimRewards}
                >
                    <Text style={styles.rewardsButtonText}>Claim Rewards</Text>
                </TouchableOpacity>
            )}

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
                                {
                                    rotate: anim.rotate.interpolate({
                                        inputRange: [0, 360],
                                        outputRange: ['0deg', '360deg']
                                    })
                                },
                            ],
                            opacity: anim.opacity,
                        },
                    ]}
                >
                    <Image source={require('../../assets/icons/diamond.png')} style={styles.diamondImage} />
                </Animated.View>
            ))}

            {/* Animated diamonds */}
            {pointAnims.map((anim, index) => (
                <Animated.View
                    key={`diamond-${index}`}
                    style={[
                        styles.animatedPoint,
                        {
                            transform: [
                                { translateX: anim.translateX },
                                { translateY: anim.translateY },
                                { scale: anim.scale },
                                {
                                    rotate: anim.rotate.interpolate({
                                        inputRange: [0, 360],
                                        outputRange: ['0deg', '360deg']
                                    })
                                },
                            ],
                            opacity: anim.opacity,
                        },
                    ]}
                >
                    <Image source={require('../../assets/icons/point.png')} style={styles.pointImage} />
                </Animated.View>
            ))}

            {/* Cancel Button */}
            <TouchableOpacity style={[styles.cancelButton, { marginTop: 5 }]} onPress={onCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#f9fafb',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 32,
        marginHorizontal: 10,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#252A34',
    },
    description: {
        fontSize: 16,
        color: '#555',
        marginBottom: 24,
        lineHeight: 22,
    },
    attendanceContainer: {
        alignItems: 'center',
        marginBottom: 24,
        width: '100%',
    },
    attendanceCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: '#E9ECEF',
        borderRadius: 4,
        marginBottom: 12,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#5E96CE',
        borderRadius: 4,
    },
    attendanceText: {
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 4,
    },
    currentNumber: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#5E96CE',
    },
    slashText: {
        color: '#888',
    },
    maxNumber: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#252A34',
    },
    attendanceLabel: {
        fontSize: 14,
        color: '#777',
        textAlign: 'center',
    },
    rewardsSection: {
        marginBottom: 24,
    },
    rewardsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#252A34',
    },
    rewardsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    rewardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#5E96CE',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    iconImage: {
        width: 22,
        height: 22,
    },
    pointsIconContainer: {
        backgroundColor: '#FCA311',
    },
    rewardTextContainer: {
        flex: 1,
    },
    rewardValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#252A34',
    },
    rewardType: {
        fontSize: 14,
        color: '#777',
    },
    separator: {
        width: 1,
        height: '80%',
        backgroundColor: '#E9ECEF',
        marginHorizontal: 10,
    },
    rewardsButton: {
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#50A653',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
    },
    claimedButton: {
        backgroundColor: "#7e967f",
    },
    rewardsButtonText: {
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
    cancelButton: {
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#F1F3F5',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
    },
    cancelButtonText: {
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
        color: '#555',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        color: "#3b82f6"
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#1e3a8a',
    },
    animatedDiamond: {
        position: 'absolute',
        bottom: -30,
        left: 0,
        zIndex: 10,
    },
    diamondImage: {
        height: 22,
        width: 22,
        resizeMode: 'contain',
    },
    animatedPoint: {
        position: 'absolute',
        bottom: -30,
        right: 0,
        zIndex: 10,
    },
    pointImage: {
        height: 22,
        width: 22,
        resizeMode: 'contain',
    },
});

export default EarlyBirdQuestSheet;
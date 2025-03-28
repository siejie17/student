import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Image, TextInput } from 'react-native';
import { collection, setDoc, getDocs, increment, limit, onSnapshot, orderBy, query, updateDoc, where, getDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../utils/firebaseConfig';
import { getItem } from '../../utils/asyncStorage';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import QuestCompletedModal from '../Modal/QuestCompletedModal';

const QuestionAnswerQuestSheet = ({ selectedQuest, onCancel, eventID, updateQuestStatus, registrationID, navigation }) => {
    const [animatingDiamonds, setAnimatingDiamonds] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [answer, setAnswer] = useState('');
    const [wrongMessage, setWrongMessage] = useState('');
    const [isAllowSubmit, setIsAllowSubmit] = useState(false);
    const [claimed, setClaimed] = useState(false);

    const [completedModalVisible, setCompletedModalVisible] = useState(false);

    useEffect(() => {
        const allowSubmit = answer.trim() !== '';
        setIsAllowSubmit(allowSubmit);
    }, [answer]);

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

    const handleSubmitAnswer = async () => {
        const wrongMessageVariations = [
            "Oops! That answer was about as accurate as a blindfolded archer 🎯",
            "Swing and a miss! That answer couldn't hit the broad side of a barn 🚜",
            "Nice try, but that's further from correct than Earth is from Pluto 🌍🚀",
            "Bzzzzt! Wrong answer. The truth ran away faster than you can say 'Oops!' 🏃‍♂️",
            "Houston, we have a problem... and that problem is your answer 🚀",
            "Well, that was... something. Let's try again, shall we? 🤔",
            "Error 404: Correct Answer Not Found 💻"
        ];

        if (answer.trim().toLowerCase() === (selectedQuest.correctAnswer).toLowerCase()) {
            try {
                const studentID = await getItem("studentID");
                if (!studentID) return;

                let qaBadge;
                let badgeProgressID;

                const questProgressQuery = query(collection(db, "questProgress"), where("eventID", "==", eventID), where("studentID", "==", studentID));
                const questProgressSnap = await getDocs(questProgressQuery);

                questProgressSnap.forEach(async (questProgress) => {
                    const questProgressID = questProgress.id;

                    const userQuestProgressRef = doc(db, "questProgress", questProgressID, "questProgressList", selectedQuest.id);

                    await updateDoc(userQuestProgressRef, {
                        isCompleted: true,
                        progress: increment(1),
                    })

                    setCompletedModalVisible(true);
                })

                const qaBadgeQuery = query(collection(db, "badge"), where("badgeType", "==", selectedQuest.questType));
                const qaBadgeSnap = await getDocs(qaBadgeQuery);

                qaBadgeSnap.forEach((badge) => {
                    qaBadge = {
                        id: badge.id,
                        ...badge.data(),
                    }
                });

                const badgeProgressQuery = query(
                    collection(db, "badgeProgress"),
                    where("studentID", "==", studentID)
                );

                const badgeProgressSnap = await getDocs(badgeProgressQuery);

                for (const badgeProgress of badgeProgressSnap.docs) {
                    const badgeProgressID = badgeProgress.id;
                    const userQABadgeRef = doc(db, "badgeProgress", badgeProgressID, "userBadgeProgress", qaBadge.id);
                    const userQABadgeSnap = await getDoc(userQABadgeRef);
                
                    if (userQABadgeSnap.exists()) {
                        let userQABadgeProgress = userQABadgeSnap.data();
                
                        if (!userQABadgeProgress.isUnlocked) {
                            let userProgress = userQABadgeProgress.progress;
                
                            userProgress++;
                
                            if (userProgress === qaBadge.unlockProgress) {
                                await updateDoc(userQABadgeRef, {
                                    isUnlocked: true,
                                    progress: increment(1),
                                    dateUpdated: serverTimestamp()
                                });
                            } else {
                                await updateDoc(userQABadgeRef, {
                                    progress: increment(1),
                                    dateUpdated: serverTimestamp()
                                });
                            }
                        }
                    } else {
                        console.error("No user Q&A badge progress has been found");
                    }
                }                
                
                setAnswer('');
            } catch (error) {
                console.log("Error when updating user's question and answer quest progress:", error);
            }
        } else {
            const randomFunnyMessage = wrongMessageVariations[
                Math.floor(Math.random() * wrongMessageVariations.length)
            ];
            setWrongMessage(randomFunnyMessage);
        }
    }

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

    const updateDatabase = async () => {
        try {
            const studentID = await getItem("studentID");
            const facultyID = await getItem("facultyID");
            if (!studentID && !facultyID) return;

            const studentRef = doc(db, "user", studentID);

            await updateDoc(studentRef, {
                diamonds: increment(selectedQuest.diamondsRewards)
            });

            const leaderboardRef = collection(db, "leaderboard");
            const leaderboardQuery = query(leaderboardRef, where("facultyID", "==", facultyID));
            const leaderboardSnapshot = await getDocs(leaderboardQuery);

            leaderboardSnapshot.forEach(async (snapDoc) => {
                const leaderboardID = snapDoc.id;

                const leaderboardEntryRef = collection(db, "leaderboard", leaderboardID, "leaderboardEntries");
                const leaderboardEntryQuery = query(leaderboardEntryRef, where("studentID", "==", studentID));
                const leaderboardEntrySnapshot = await getDocs(leaderboardEntryQuery);

                if (leaderboardEntrySnapshot.empty) {
                    // 🔹 No entry exists, create a new one
                    const newEntryRef = doc(leaderboardEntryRef); // Auto-generate ID
                    await setDoc(newEntryRef, {
                        studentID: studentID,
                        points: selectedQuest.pointsRewards, // Initial points for the new student
                        lastUpdated: new Date(),
                    });
                    console.log("New leaderboard entry created.");
                } else {
                    // 🔹 Entry exists, update the points
                    const existingEntryDoc = leaderboardEntrySnapshot.docs[0]; // Get the first match
                    const existingEntryRef = doc(db, "leaderboard", leaderboardID, "leaderboardEntries", existingEntryDoc.id);

                    const existingEntrySnap = await getDoc(existingEntryRef);

                    console.log(existingEntrySnap.data());

                    await updateDoc(existingEntryRef, {
                        points: increment(selectedQuest.pointsRewards), // Increment points
                        lastUpdated: new Date(),
                    });
                    console.log("Leaderboard entry updated.");
                }
            });

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

            <Text style={styles.cardTitle}>Question</Text>
            <View style={styles.questionContainer}>
                <View style={styles.questionCard}>
                    <Text style={styles.questionText}>{selectedQuest.question}</Text>
                </View>
            </View>

            {selectedQuest.progress !== selectedQuest.completionNum && !selectedQuest.isCompleted && (
                <View style={styles.answerContainer}>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={[
                                styles.answerArea,
                                answer && styles.activeInput,
                            ]}
                            placeholder="Enter your answer here..."
                            placeholderTextColor="#A0A0A0"
                            value={answer}
                            onChangeText={setAnswer}
                            textAlignVertical="center"
                        />
                        {answer && (
                            <TouchableOpacity
                                style={styles.clearButton}
                                onPress={() => {
                                    setAnswer('')
                                    setWrongMessage('');
                                }}
                            >
                                <MaterialIcons name='clear' size={20} color="#A0A0A0" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {wrongMessage && (
                        <View style={styles.wrongMessageContainer}>
                            <View style={styles.alertIconContainer}>
                                <MaterialCommunityIcons name='alert' size={15} color="#EF4444" />
                            </View>
                            <Text style={styles.wrongMessageText}>
                                {wrongMessage}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {selectedQuest.progress === selectedQuest.completionNum && selectedQuest.isCompleted && (
                <View style={styles.answerContainer}>
                    <Text style={styles.answerLabel}>Answer:</Text>
                    <Text style={styles.answerText}>
                        {selectedQuest.correctAnswer}
                    </Text>
                </View>
            )}

            {/* Rewards Section */}
            <View style={styles.rewardsSection}>
                <Text style={styles.cardTitle}>Rewards</Text>
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

            {selectedQuest.progress !== selectedQuest.completionNum && !selectedQuest.isCompleted && (
                <TouchableOpacity
                    style={[styles.submitButton, { marginBottom: 5 }, !isAllowSubmit && styles.disabledSubmit]}
                    disabled={!isAllowSubmit}
                    onPress={handleSubmitAnswer}
                >
                    <Text style={styles.submitButtonText}>Submit Answer</Text>
                </TouchableOpacity>
            )}

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

            <QuestCompletedModal
                isVisible={completedModalVisible}
                onClose={() => setCompletedModalVisible(false)}
                questName={selectedQuest.questName}
                autoDismissTime={2000}
            />
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
    answerArea: {
        flex: 1,
        backgroundColor: '#F7F7F7',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#333',
        marginRight: 8,
    },
    questionContainer: {
        alignItems: 'center',
        marginBottom: 18,
        width: '100%',
    },
    questionCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        width: '100%',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 5,
        backgroundColor: '#FFFFFF',
    },
    questionText: {
        fontSize: 15,
        color: '#333333',
        fontWeight: '500',
        lineHeight: 22,
    },
    rewardsSection: {
        marginBottom: 24,
    },
    cardTitle: {
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
    submitButton: {
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#5E96CE',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
    },
    submitButtonText: {
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
    disabledSubmit: {
        backgroundColor: '#B0BEC5',
        opacity: 0.7,
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
    answerContainer: {
        marginBottom: 16,
    },
    answerLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280', // Muted gray for label
        marginBottom: 8,
    },
    answerText: {
        fontSize: 16,
        color: '#374151', // Dark gray for answer text
        lineHeight: 24,
    },
    wrongMessageContainer: {
        backgroundColor: '#FFF1F2', // Ultra-light pastel red
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#EF4444', // Accent red
        marginBottom: 16,

        // Minimal, subtle shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    wrongMessageText: {
        flex: 1,
        fontSize: 14,
        color: '#4A4A4A', // Soft charcoal for better readability
        fontWeight: '500',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
        marginBottom: 12,
    },
    alertIconContainer: {
        backgroundColor: '#FFE4E6',
        borderRadius: 20,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    clearButton: {
        position: 'absolute',
        right: 12,
        padding: 8,
    },
    activeInput: {
        borderColor: '#4A90E2',
        backgroundColor: '#FFFFFF',
        shadowColor: '#4A90E2',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
});

export default QuestionAnswerQuestSheet;
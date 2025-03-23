import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../utils/firebaseConfig';
import { getItem } from '../../utils/asyncStorage';

const EarlyBirdQuestSheet = ({ selectedQuest, onCancel, eventID }) => {
    // Placeholder for current attendees
    const [currentEarlyBirdAttendees, setCurrentEarlyBirdAttendees] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    if (!selectedQuest) return null;

    useEffect(() => {
        const fetchCurrentEarlyBirdiesNum = async () => {
            try {
                setIsLoading(true);

                const studentID = await getItem("studentID");

                const currentEarlyBirdiesRef = collection(db, "registration");
                const currentEarlyBirdiesQuery = query(currentEarlyBirdiesRef, where("eventID", "==", eventID), where("isAttended", "==", true), orderBy("attendanceScannedTime", "asc"), limit(selectedQuest.maxEarlyBird));

                const unsubscribeEarlyBirdies = onSnapshot(currentEarlyBirdiesQuery, (earlyBirdiesSnap) => {
                    setCurrentEarlyBirdAttendees(earlyBirdiesSnap.size);
                    const earlyBirdiesData = earlyBirdiesSnap.docs.map(doc => doc.data());
                    const currentStudentExists = earlyBirdiesData.some(item => item.studentID === studentID);
                    if (currentStudentExists && selectedQuest.progress !== selectedQuest.completionNum) {
                        console.log("Here");
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
                            <Ionicons name="diamond" size={22} color="#FFF" />
                        </View>
                        <View style={styles.rewardTextContainer}>
                            <Text style={styles.rewardValue}>{selectedQuest.diamondsRewards}</Text>
                            <Text style={styles.rewardType}>diamonds</Text>
                        </View>
                    </View>
                    <View style={styles.separator} />
                    <View style={styles.rewardItem}>
                        <View style={[styles.iconContainer, styles.pointsIconContainer]}>
                            <Ionicons name="star" size={22} color="#FFF" />
                        </View>
                        <View style={styles.rewardTextContainer}>
                            <Text style={styles.rewardValue}>{selectedQuest.pointsRewards}</Text>
                            <Text style={styles.rewardType}>points</Text>
                        </View>
                    </View>
                </View>
            </View>

            {!selectedQuest.rewardsClaimed && selectedQuest.progress === selectedQuest.completionNum && (
                <TouchableOpacity style={[styles.rewardsButton, { marginBottom: 5 }]}>
                    <Text style={styles.rewardsButtonText}>Claim Rewards</Text>
                </TouchableOpacity>
            )}

            {/* Cancel Button */}
            <TouchableOpacity style={[styles.cancelButton, { marginTop: 5 }]} onPress={onCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#f9f9fb',
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
        backgroundColor: '#5E60CE',
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
        color: '#5E60CE',
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
        backgroundColor: '#5E60CE',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
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
        backgroundColor: '#97E89A',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
    },
    rewardsButtonText: {
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
        color: '#EEE',
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
});

export default EarlyBirdQuestSheet;
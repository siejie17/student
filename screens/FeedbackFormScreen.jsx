import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Alert
} from 'react-native';
import { getItem } from '../utils/asyncStorage';
import { addDoc, collection, doc, getDoc, getDocs, increment, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../utils/firebaseConfig';

const FeedbackFormScreen = ({ route, navigation }) => {
    const { eventID, questProgressID, registrationID, questName, questType } = route.params;

    const [q1Rating, setQ1Rating] = useState(0);
    const [q2Rating, setQ2Rating] = useState(0);
    const [additionalFeedback, setAdditionalFeedback] = useState('');
    const [isFormValid, setIsFormValid] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const [completedModalVisible, setCompletedModalVisible] = useState(false);

    // Validate form whenever inputs change
    useEffect(() => {
        const isValid = q1Rating > 0 && q2Rating > 0 && additionalFeedback.trim() !== '';
        setIsFormValid(isValid);
    }, [q1Rating, q2Rating, additionalFeedback]);

    const handleSubmit = async () => {
        if (isFormValid) {
            try {
                setSubmitted(true);
                const studentID = await getItem("studentID");
                if (!studentID && !eventID) return;

                let feedbackBadge;
                let badgeProgressID;

                const questProgressListQuery = query(
                    collection(db, "questProgress"),
                    where("studentID", "==", studentID),
                    where("eventID", "==", eventID)
                );

                const questProgressSnapshots = await getDocs(questProgressListQuery);
    
                questProgressSnapshots.forEach(async (questList) => {
                    let questListID = questList.id;
            
                    const questRef = doc(db, "questProgress", questListID, "questProgressList", questProgressID);
            
                    await updateDoc(questRef, {
                        isCompleted: true,
                        progress: increment(1),
                    })

                    setCompletedModalVisible(true);
                })

                const feedbackRef = await addDoc(collection(db, "feedback"), {
                    registrationID: registrationID,
                    eventID: eventID,
                    eventFeedback: q1Rating.toString(),
                    gamificationFeedback: q2Rating.toString(),
                    overallImprovement: additionalFeedback,
                });

                const feedbackBadgeQuery = query(collection(db, "badge"), where("badgeType", "==", questType));
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

                Alert.alert("Success", "Your feedback has been submitted. Thank you!");
                // Reset form after submission
                setQ1Rating(0);
                setQ2Rating(0);
                setAdditionalFeedback('');
                navigation.goBack();
            } catch (error) {
                console.error("Error when uploading feedback form details:", error);
            }
        } else {
            Alert.alert("Error", "Please complete all required fields.");
        }
    };

    const RequiredAsterisk = () => (
        <Text style={styles.requiredAsterisk}>*</Text>
    );

    const LikertScale = ({ value, onChange }) => {
        const options = [1, 2, 3, 4, 5];

        return (
            <View style={styles.likertContainer}>
                {options.map((option) => (
                    <TouchableOpacity
                        key={option}
                        style={[
                            styles.ratingButton,
                            value === option && styles.selectedRating,
                        ]}
                        onPress={() => onChange(option)}
                    >
                        <Text
                            style={[
                                styles.ratingText,
                                value === option && styles.selectedRatingText
                            ]}
                        >
                            {option}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    const LikertLabels = () => (
        <View style={styles.likertLabels}>
            <Text style={styles.likertLabel}>Strongly Disagree</Text>
            <Text style={styles.likertLabel}>Strongly Agree</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            <View style={styles.header}>
                <Text style={styles.title}>Event Feedback</Text>
                <Text style={styles.requiredNote}>Fields marked with <RequiredAsterisk /> are required</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.questionContainer}>
                    <View style={styles.questionRow}>
                        <Text style={styles.questionText}>
                            1. The event provided a positive and enjoyable experience.
                        </Text>
                        <RequiredAsterisk />
                    </View>
                    <LikertScale value={q1Rating} onChange={setQ1Rating} />
                    <LikertLabels />
                </View>

                <View style={styles.questionContainer}>
                    <View style={styles.questionRow}>
                        <Text style={styles.questionText}>
                            2. The quests were engaging and enhanced my overall event experience.
                        </Text>
                        <RequiredAsterisk />
                    </View>
                    <LikertScale value={q2Rating} onChange={setQ2Rating} />
                    <LikertLabels />
                </View>

                <View style={styles.questionContainer}>
                    <View style={styles.questionRow}>
                        <Text style={styles.questionText}>
                            Additional feedback on how we could improve future event:
                        </Text>
                        <RequiredAsterisk />
                    </View>
                    <TextInput
                        style={[
                            styles.textArea,
                        ]}
                        multiline
                        placeholder="Share specific suggestions for the beginning, middle, and end of the event..."
                        placeholderTextColor="#A0A0A0"
                        value={additionalFeedback}
                        onChangeText={setAdditionalFeedback}
                        textAlignVertical="top"
                    />
                </View>
            </ScrollView>

            <View style={styles.buttonRow}>
                <TouchableOpacity
                    style={[styles.submitButton, !isFormValid && styles.disabledButton, submitted && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={!isFormValid && submitted}
                >
                    <Text style={styles.submitButtonText}>Submit</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
            </View>

            {completedModalVisible && (
                <QuestCompletedModal 
                    isVisible={completedModalVisible}
                    onClose={() => setCompletedModalVisible(false)}
                    questName={questName}
                    autoDismissTime={2000} // Optional: custom auto-dismiss time
                />
            )}
        </View>
    );
};

export default FeedbackFormScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingVertical: 10,
    },
    scrollContainer: {
        padding: 24,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 8,
        paddingTop: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#333',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    requiredNote: {
        fontSize: 12,
        color: '#666',
    },
    requiredAsterisk: {
        color: '#FF3B30',
        fontSize: 18,
        marginLeft: 4,
    },
    questionContainer: {
        marginBottom: 32,
    },
    questionRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    questionText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    likertContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    ratingButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8F8F8',
    },
    selectedRating: {
        backgroundColor: '#4A80F0',
        borderColor: '#4A80F0',
    },
    ratingText: {
        fontSize: 16,
        color: '#666',
    },
    selectedRatingText: {
        color: '#fff',
        fontWeight: '600',
    },
    likertLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    likertLabel: {
        fontSize: 12,
        color: '#999',
    },
    textArea: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        padding: 16,
        minHeight: 120,
        fontSize: 16,
        backgroundColor: '#F8F8F8',
    },
    invalidInput: {
        borderColor: '#FFCDD2',
        backgroundColor: '#FFF8F8',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingHorizontal: 24,
        marginBottom: 12,
    },
    submitButton: {
        backgroundColor: '#4A80F0',
        paddingVertical: 16,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    disabledButton: {
        backgroundColor: '#B0BEC5',
        opacity: 0.7,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    backButton: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#F8F8F8',
        paddingVertical: 16,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    backButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
});
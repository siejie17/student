import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Dimensions,
    Image,
    TouchableOpacity
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import * as Notifications from 'expo-notifications';

import {
    doc,
    onSnapshot,
    collection,
    query,
    where,
    deleteDoc,
    Timestamp,
    getDocs,
    writeBatch
} from 'firebase/firestore';
import { db } from '../utils/firebaseConfig';

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getItem } from '../utils/asyncStorage';

import PaymentProofModal from '../components/Modal/PaymentProofModal';
import CancelRegistrationModal from '../components/Modal/CancelRegistrationModal';

const { width } = Dimensions.get('window');

const CATEGORY_MAPPING = {
    1: "Academic",
    2: "Volunteering",
    3: "Entertainment",
    4: "Cultural",
    5: "Sports",
    6: "Health & Wellness",
    7: "Others",
}

const ORGANISER_MAPPING = {
    1: "FACA",
    2: "FBE",
    3: "FCSHD",
    4: "FCSIT",
    5: "FEB",
    6: "FELC",
    7: "FENG",
    8: "FMSH",
    9: "FRST",
    10: "FSSH",
}

const RegisteredEventScreen = ({ route }) => {
    const { eventID, registrationID } = route.params || {};

    const [isLoading, setIsLoading] = useState(true);
    const [eventDetails, setEventDetails] = useState({});
    const [registrationDetails, setRegistrationDetails] = useState({});

    const [paymentProofModalVisible, setPaymentProofModalVisible] = useState(false);
    const [cancelModalVisible, setCancelModalVisible] = useState(false);

    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState(null);

    const scrollViewRef = useRef(null);
    const navigation = useNavigation();

    const formatDateTime = (timestamp) => {
        if (!timestamp || !timestamp.seconds) return "Invalid Date";

        const date = new Date(timestamp.seconds * 1000);

        // Format date
        return date.toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const fetchEventData = useCallback(() => {
        if (!registrationID) return () => { };

        setIsLoading(true);
        setError(null);

        let isActive = true;
        const unsubscribeFunctions = [];

        const registrationRef = doc(db, "registration", registrationID);

        const unsubscribeRegistration = onSnapshot(registrationRef, async (registrationSnap) => {
            if (!isActive) return;

            if (!registrationSnap.exists()) {
                console.log("No such registration!");
                setIsLoading(false);
                return;
            }

            const registrationData = registrationSnap.data();

            if (isActive) {
                setRegistrationDetails(registrationData);
            }

            const eventRef = doc(db, "event", registrationData.eventID);
            const unsubscribeEvent = onSnapshot(eventRef, (eventSnap) => {
                if (!isActive) return;

                if (!eventSnap.exists()) {
                    console.log("No such event!");
                    setIsLoading(false);
                    return;
                }

                const eventData = eventSnap.data();
                const eventImagesRef = collection(db, "eventImages");
                const eventImagesQuery = query(eventImagesRef, where("eventID", "==", registrationData.eventID));

                const unsubscribeImages = onSnapshot(eventImagesQuery, (eventImagesSnap) => {
                    if (!isActive) return;

                    const images = eventImagesSnap.docs.flatMap(doc =>
                        doc.data().images ? doc.data().images : []
                    );

                    if (isActive) {
                        const processedEventDetails = {
                            ...eventData,
                            name: eventData.eventName,
                            description: eventData.eventDescription,
                            startTime: eventData.eventStartDateTime,
                            endTime: eventData.eventEndDateTime,
                            images,
                        };

                        if (processedEventDetails.requiresCapacity) {
                            processedEventDetails.capacity = eventData.capacity;
                        }

                        setRegistrationDetails(registrationData);
                        setEventDetails(processedEventDetails);
                        setIsLoading(false);
                    }
                });

                unsubscribeFunctions.push(unsubscribeImages);
            });

            unsubscribeFunctions.push(unsubscribeEvent);
        });

        return () => {
            isActive = false;
            unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
        };
    }, [registrationID]);

    // Use effect with proper dependencies and cleanup
    useFocusEffect(
        useCallback(() => {
            const unsubscribe = fetchEventData();
            return () => {
                unsubscribe();
                // Reset states when screen loses focus to prevent stale data
                setEventDetails({});
                setRegistrationDetails({});
                setIsLoading(false);
            };
        }, [fetchEventData])
    );

    const handleScroll = (event) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffsetX / width);
    };

    // Memoized cancel registration handler to prevent unnecessary rerenders
    const handleCancelRegistration = useCallback(async () => {
        try {
            setIsDeleting(true);
            const registrationRef = doc(db, "registration", registrationID);
            await deleteDoc(registrationRef);

            await deleteQuestProgress();

            deleteNotifications();

            setCancelModalVisible(false);
            navigation.goBack();
        } catch (error) {
            setError('Failed to delete. Please try again.');
            console.error('Delete error:', error);
        } finally {
            setIsDeleting(false);
        }
    }, [registrationID, navigation]);

    const deleteNotifications = async () => {
        const studentID = await getItem("studentID");
        if (!studentID || !eventID) return;

        const notificationArr = [`${eventID}_${studentID}_1D`, `${eventID}_${studentID}_1H`];

        const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

        notificationArr.forEach(async (notificationID) => {
            const matchedNotification = scheduledNotifications.find(
                notification => notification.content.data?.id === notificationID
            );

            if (matchedNotification) {
                // Cancel the specific notification using its identifier
                await Notifications.cancelScheduledNotificationAsync(matchedNotification.identifier);
                console.log(`Notification with unique ID ${notificationID} has been cancelled`);
            }
        });
    };

    // Optimize quest progress deletion
    const deleteQuestProgress = useCallback(async () => {
        try {
            const studentID = await getItem("studentID");
            if (!studentID) return;

            const questProgressRef = collection(db, "questProgress");
            const questProgressQuery = query(
                questProgressRef,
                where("studentID", "==", studentID),
                where("eventID", "==", eventID)
            );

            const questProgressSnap = await getDocs(questProgressQuery);
            if (questProgressSnap.empty) return;

            const questProgressDoc = questProgressSnap.docs[0];
            const progressListRef = collection(db, "questProgress", questProgressDoc.id, "questProgressList");
            const progressListSnapshots = await getDocs(progressListRef);

            const batch = writeBatch(db);
            progressListSnapshots.forEach((doc) => batch.delete(doc.ref));

            // Commit batch delete and delete main document
            await Promise.all([
                batch.commit(),
                deleteDoc(questProgressDoc.ref)
            ]);
        } catch (error) {
            console.error("Error deleting quest progress list:", error);
        }
    }, [eventID]);

    // Performance optimization for rendering
    const memoizedEventDetails = useMemo(() => ({
        ...eventDetails,
        startTime: eventDetails.startTime,
        endTime: eventDetails.endTime
    }), [eventDetails]);

    if (isLoading) {
        return (
            <View style={styles.background}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#5B8CDD" />
                    <Text style={styles.loadingText}>Loading registered event details...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.background}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.imageContainer}>
                    <ScrollView
                        ref={scrollViewRef}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                    >
                        {eventDetails.images && eventDetails.images.map((image, index) => (
                            <View
                                key={index}
                                style={styles.imageWrapper}
                                accessibilityLabel={`Event Image ${index + 1}`}
                            >
                                <Image
                                    source={{ uri: `data:image/png;base64,${image}` }}
                                    style={styles.image}
                                    defaultSource={require('../assets/images/image-not-found.png')}
                                    onError={(e) => console.log(`Image ${index} load error`, e.nativeEvent.error)}
                                />
                                <View style={styles.indicator}>
                                    <Text style={styles.indicatorText}>
                                        {index + 1} / {eventDetails.images.length}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.detailsContainer}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>{eventDetails.name}</Text>
                        <View style={styles.tagsContainer}>
                            <View style={styles.tagPill}>
                                <View style={styles.tagIconContainer}>
                                    <MaterialIcons name="category" size={16} color="black" />
                                </View>
                                <Text style={styles.tagText}>{CATEGORY_MAPPING[eventDetails.category]}</Text>
                            </View>
                            <View style={styles.tagPill}>
                                <View style={styles.tagIconContainer}>
                                    <MaterialIcons name="emoji-people" size={16} color="black" />
                                </View>
                                <Text style={styles.tagText}>{ORGANISER_MAPPING[eventDetails.organiserID]}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <MaterialIcons name="access-time" size={20} color="#666" marginRight="10" />
                    <Text style={styles.infoText}>{formatDateTime(eventDetails.startTime)} - {formatDateTime(eventDetails.endTime)}</Text>
                </View>

                <View style={styles.infoCard}>
                    <View style={styles.infoHeader}>
                        <MaterialIcons name="person" size={22} color="#A9A9A9" />
                        <Text style={styles.infoHeaderText}>Registration Status</Text>
                    </View>

                    <View style={styles.infoContent}>
                        {/* Verification Status Section */}
                        <View style={styles.statusSection}>
                            <View style={styles.statusRow}>
                                <MaterialIcons
                                    name={registrationDetails.isVerified ? "verified-user" : "pending"}
                                    size={20}
                                    color={registrationDetails.isVerified ? "#4CAF50" : "#FFA000"}
                                />
                                <Text style={styles.statusLabel}>Verification Status:</Text>
                                <View style={[
                                    styles.statusBadge,
                                    { backgroundColor: registrationDetails.isVerified ? "#E8F5E9" : "#FFF3E0" }
                                ]}>
                                    <Text style={[
                                        styles.statusText,
                                        { color: registrationDetails.isVerified ? "#2E7D32" : "#E65100" }
                                    ]}>
                                        {registrationDetails.isVerified ? "Verified" : "Pending Verification"}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.statusMessage}>
                                {registrationDetails.isVerified
                                    ? "Your registration has been verified. You're all set for the event!"
                                    : "Your registration is being reviewed."}
                            </Text>
                        </View>

                        <View style={styles.statusSection}>
                            <View style={styles.statusRow}>
                                <MaterialIcons
                                    name={registrationDetails.isAttended ? "event-available" : "event"}
                                    size={20}
                                    color={registrationDetails.isAttended ? "#4CAF50" : "#757575"}
                                />
                                <Text style={styles.statusLabel}>Attendance:</Text>
                                <View style={[
                                    styles.statusBadge,
                                    { backgroundColor: registrationDetails.isAttended ? "#E8F5E9" : "#F5F5F5" }
                                ]}>
                                    <Text style={[
                                        styles.statusText,
                                        { color: registrationDetails.isAttended ? "#2E7D32" : "#616161" }
                                    ]}>
                                        {registrationDetails.isAttended ? "Attended" : "Not Yet Attended"}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.statusMessage}>
                                {registrationDetails.isAttended
                                    ? "Thank you for attending the event! Have a great day!"
                                    : "Let's navigate to Quest tab to mark your attendance."}
                            </Text>
                        </View>

                        {/* Payment Proof Section - Only shows if payment proof is required for selected event */}
                        {eventDetails.requiresPaymentProof && (
                            <View style={styles.statusSection}>
                                <View style={styles.statusRow}>
                                    <MaterialIcons name="receipt" size={20} color="#4789d6" />
                                    <Text style={styles.statusLabel}>Payment Proof:</Text>
                                    <View style={[
                                        styles.statusBadge,
                                        { backgroundColor: registrationDetails.paymentProofBase64 ? "#E1F5FE" : "#FFEBEE" }
                                    ]}>
                                        <Text style={[
                                            styles.statusText,
                                            { color: registrationDetails.paymentProofBase64 ? "#0277BD" : "#C62828" }
                                        ]}>
                                            {registrationDetails.paymentProofBase64 ? "Submitted" : "Required"}
                                        </Text>
                                    </View>
                                </View>

                                {registrationDetails.paymentProofBase64 ? (
                                    <TouchableOpacity
                                        style={styles.viewProofButton}
                                        onPress={() => setPaymentProofModalVisible(true)}
                                    >
                                        <MaterialIcons name="visibility" size={16} color="#FFFFFF" />
                                        <Text style={styles.viewProofButtonText}>View Payment Proof</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <Text style={styles.statusMessage}>
                                        Please upload your payment proof to complete your registration.
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.infoCard}>
                    <View style={styles.infoHeader}>
                        <MaterialIcons name="description" size={22} color="#A9A9A9" />
                        <Text style={styles.infoHeaderText}>Description</Text>
                    </View>
                    <View style={styles.infoContent}>
                        <Text style={styles.descriptionText}>{eventDetails.description}</Text>
                    </View>
                </View>

                <View style={styles.infoCard}>
                    <View style={styles.infoHeader}>
                        <Ionicons name="location" size={22} color="#A9A9A9" />
                        <Text style={styles.infoHeaderText}>Location</Text>
                    </View>
                    <View style={styles.infoContent}>
                        <Text style={[styles.infoText, { marginBottom: "16" }]}>{eventDetails.locationName}</Text>

                        <View style={styles.mapContainer}>
                            {eventDetails.locationLatitude != null && eventDetails.locationLongitude != null && (
                                <MapView
                                    style={styles.map}
                                    region={{
                                        latitude: eventDetails.locationLatitude,
                                        longitude: eventDetails.locationLongitude,
                                        latitudeDelta: 0.005,
                                        longitudeDelta: 0.005,
                                    }}
                                >
                                    <Marker
                                        coordinate={{
                                            latitude: eventDetails.locationLatitude,
                                            longitude: eventDetails.locationLongitude,
                                        }}
                                        title={eventDetails.locationName}
                                    />
                                </MapView>
                            )}
                        </View>
                    </View>
                </View>

                <PaymentProofModal
                    visible={paymentProofModalVisible}
                    paymentProofBase64={registrationDetails.paymentProofBase64}
                    onClose={() => setPaymentProofModalVisible(false)}
                />

                <CancelRegistrationModal
                    visible={cancelModalVisible}
                    onCancel={() => setCancelModalVisible(false)}
                    onConfirm={handleCancelRegistration}
                    isDeleting={isDeleting}
                    error={error}
                />
            </ScrollView>

            {/* Footer for Cancel Registration */}
            {(eventDetails?.startTime &&
                eventDetails.startTime.seconds - Timestamp.now().seconds > 3600) && (
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.cancelRegistrationButton}
                            onPress={() => setCancelModalVisible(true)}
                            accessibilityLabel="Cancel Event Registration"
                        >
                            <Text style={styles.cancelRegistrationText}>
                                Cancel Registration
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
        </View>
    )
}

export default RegisteredEventScreen;

const styles = StyleSheet.create({
    background: {
        flex: 1,
        width: '100%',
        backgroundColor: 'white',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#5B8CDD',
        fontWeight: '500',
    },
    imageContainer: {
        height: 280,
        position: 'relative',
        marginTop: 15,
    },
    scrollView: {
        flex: 1,

    },
    scrollContent: {
        paddingBottom: 16,
    },
    imageWrapper: {
        width,
        height: 250,
        paddingHorizontal: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 5, // for Android
    },
    image: {
        width: width - 20, // Account for horizontal padding
        height: 250,
        resizeMode: 'contain',
        backgroundColor: "#fafafa",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    indicator: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        marginRight: 20,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 15,
    },
    indicatorText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    detailsContainer: {
        marginHorizontal: 7,
    },
    titleContainer: {
        paddingHorizontal: 10,
    },
    title: {
        fontWeight: "bold",
        fontSize: 22,
        color: '#333',
        marginBottom: 8,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 7,
    },
    tagIconContainer: {
        marginRight: 10,
    },
    tagPill: {
        flexDirection: "row",
        backgroundColor: '#E0E7FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
        marginBottom: 8,
    },
    tagText: {
        color: '#1E61A4',
        fontSize: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        marginHorizontal: 7,
        paddingHorizontal: 10,
    },
    infoText: {
        fontSize: 16,
        color: '#444',
    },
    infoCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        marginTop: 8,
        marginBottom: 8,
        marginHorizontal: 17,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3.84,
        elevation: 3,
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F5',
    },
    infoHeaderText: {
        fontSize: 16,
        color: '#333',
        marginLeft: 8,
    },
    infoContent: {
        padding: 16,
    },
    descriptionText: {
        fontSize: 15,
        color: '#444',
        lineHeight: 22,
    },
    statusSection: {
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F5',
    },
    statusSection: {
        marginBottom: 16,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    statusLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: '#333',
        marginLeft: 8,
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 13,
        fontWeight: '600',
    },
    statusMessage: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
        marginLeft: 28,
        lineHeight: 20,
    },
    viewProofButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4789d6',
        padding: 10,
        borderRadius: 8,
        marginTop: 8,
        marginLeft: 28,
        alignSelf: 'flex-start',
    },
    viewProofButtonText: {
        color: '#FFFFFF',
        fontWeight: '500',
        marginLeft: 6,
    },
    mapContainer: {
        height: 150,
        borderRadius: 8,
        overflow: 'hidden',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    footer: {
        borderTopLeftRadius: 8,
        borderTopRightRadius: 10,
        backgroundColor: '#fff',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    cancelRegistrationButton: {
        backgroundColor: '#ff4d4f',
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelRegistrationText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});
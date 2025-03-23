import { View, Text, StyleSheet, ImageBackground, ScrollView, ActivityIndicator, Dimensions, Image, TouchableOpacity, Modal } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';

import { doc, getDoc, collection, query, where, getDocs, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../utils/firebaseConfig';
import { useNavigation } from '@react-navigation/native';

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
    const { registrationID } = route.params || {};

    const [isLoading, setIsLoading] = useState(false);
    const [eventDetails, setEventDetails] = useState({});
    const [registrationDetails, setRegistrationDetails] = useState({});
    const [paymentProofModalVisible, setPaymentProofModalVisible] = useState(false);
    const [cancelModalVisible, setCancelModalVisible] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState(null);

    const scrollViewRef = useRef(null);

    const navigation = useNavigation();

    useEffect(() => {
        const fetchEventDetails = async () => {
            try {
                setIsLoading(true);

                if (!registrationID) return;

                const registrationRef = doc(db, "registration", registrationID);
                const registrationSnap = await getDoc(registrationRef);

                if (!registrationSnap.exists()) {
                    console.log("No such registration!");
                    setIsLoading(false);
                    return;
                }

                const registrationData = registrationSnap.data();

                // Query event collection by document ID
                const eventRef = doc(db, "event", registrationData.eventID);
                const eventSnap = await getDoc(eventRef);

                if (!eventSnap.exists()) {
                    console.log("No such event!");
                    setIsLoading(false);
                    return;
                }

                const eventData = eventSnap.data();

                const eventImagesRef = collection(db, "eventImages");
                const eventImagesQuery = query(eventImagesRef, where("eventID", "==", registrationData.eventID));
                const eventImagesSnap = await getDocs(eventImagesQuery);

                let images = [];
                eventImagesSnap.forEach((doc) => {
                    if (doc.data().images) {
                        images = [...images, ...doc.data().images];
                    }
                });

                // Set the state with the event data
                const eventDetails = {
                    name: eventData.eventName,
                    description: eventData.eventDescription,
                    startTime: eventData.eventStartDateTime,
                    endTime: eventData.eventEndDateTime,
                    registrationClosingDate: eventData.registrationClosingDate,
                    locationName: eventData.locationName,
                    locationLongitude: eventData.locationLongitude,
                    locationLatitude: eventData.locationLatitude,
                    requiresPaymentProof: eventData.paymentProofRequired,
                    requiresCapacity: eventData.requiresCapacity,
                    organiserID: eventData.organiserID,
                    category: eventData.category,
                    images
                };

                if (eventDetails.requiresCapacity) {
                    eventDetails.capacity = eventData.capacity;
                }

                setRegistrationDetails(registrationData);
                setEventDetails(eventDetails);
                setIsLoading(false);
            } catch (error) {
                console.error("Error fetching registration and/or event data:", error);
                setEventDetails({});
                setIsLoading(false);
            }
        };

        fetchEventDetails();
    }, []);

    const handleScroll = (event) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffsetX / width);
    };

    const formatDateTime = (timestamp) => {
        if (!timestamp || !timestamp.seconds) return "Invalid Date";

        const date = new Date(timestamp.seconds * 1000);

        // Format date (adjust format as needed)
        return date.toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const handleCancelRegistration = async () => {
        try {
            const registrationRef = doc(db, "registration", registrationID);

            await deleteDoc(registrationRef);

            setCancelModalVisible(false);
            setIsDeleting(false);
            navigation.goBack();
        } catch (error) {
            setError('Failed to delete. Please try again.');
            setIsDeleting(false);
            console.error('Delete error:', err);
        }
    };

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
                            <View key={index} style={styles.imageWrapper}>
                                <Image
                                    source={{ uri: `data:image/png;base64,${image}` }}
                                    style={styles.image}
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
                        <MaterialIcons name="person" size={22} color="black" />
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
                        <MaterialIcons name="description" size={22} color="#4789d6" />
                        <Text style={styles.infoHeaderText}>Description</Text>
                    </View>
                    <View style={styles.infoContent}>
                        <Text style={styles.descriptionText}>{eventDetails.description}</Text>
                    </View>
                </View>

                <View style={styles.infoCard}>
                    <View style={styles.infoHeader}>
                        <Ionicons name="location" size={22} color="#4789d6" />
                        <Text style={styles.infoHeaderText}>Location</Text>
                    </View>
                    <View style={styles.infoContent}>
                        <Text style={[styles.infoText, { marginBottom: "16" }]}>{eventDetails.locationName}</Text>

                        <View style={styles.mapContainer}>
                            <MapView
                                style={styles.map}
                                initialRegion={{
                                    latitude: eventDetails.locationLatitude,
                                    longitude: eventDetails.locationLongitude,
                                    latitudeDelta: 0.01,
                                    longitudeDelta: 0.01,
                                }}
                                scrollEnabled={false}
                                pitchEnabled={false}
                            >
                                <Marker
                                    coordinate={{
                                        latitude: eventDetails.locationLatitude,
                                        longitude: eventDetails.locationLongitude,
                                    }}
                                    title={eventDetails.locationName}
                                />
                            </MapView>
                        </View>
                    </View>
                </View>

                {eventDetails.requiresPaymentProof && registrationDetails.paymentProofBase64 && (
                    <Modal
                        visible={paymentProofModalVisible}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => setPaymentProofModalVisible(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Payment Proof</Text>
                                    <TouchableOpacity
                                        onPress={() => setPaymentProofModalVisible(false)}
                                        style={styles.closeButton}
                                    >
                                        <MaterialIcons name="close" size={24} color="#333" />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.modalBody}>
                                    <Image
                                        source={{ uri: `data:image/jpeg;base64,${registrationDetails.paymentProofBase64}` }}
                                        style={styles.paymentProofImage}
                                        resizeMode="contain"
                                    />
                                </View>
                            </View>
                        </View>
                    </Modal>
                )}
            </ScrollView>

            {(eventDetails?.startTime && eventDetails.startTime.seconds - Timestamp.now().seconds > 3600) &&
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.cancelRegistrationButton} onPress={() => setCancelModalVisible(true)}>
                        <Text style={styles.cancelRegistrationText}>Cancel Registration</Text>
                    </TouchableOpacity>
                </View>
            }

            <Modal
                animationType="fade"
                transparent={true}
                visible={cancelModalVisible}
                onRequestClose={() => setCancelModalVisible(false)}
            >
                <View style={styles.cancelCenteredView}>
                    <View style={styles.cancelModalView}>
                        <Text style={styles.cancelModalTitle}>Confirm Registration Cancellation?</Text>

                        <Text style={styles.cancelModalText}>
                            Are you sure you want to cancel this event registration? This action cannot be undone.
                        </Text>

                        {error && <Text style={styles.errorText}>{error}</Text>}

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={() => setModalVisible(false)}
                                disabled={isDeleting}
                            >
                                <Text style={styles.buttonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, styles.confirmButton]}
                                onPress={handleCancelRegistration}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                ) : (
                                    <Text style={styles.buttonText}>Confirm</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    )
}

export default RegisteredEventScreen;

const styles = StyleSheet.create({
    backgroundImage: {
        resizeMode: 'repeat',
        opacity: 0.15
    },
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
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalContent: {
        width: '85%',
        backgroundColor: 'white',
        borderRadius: 16,
        overflow: 'hidden',
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F5',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    closeButton: {
        padding: 4,
    },
    modalBody: {
        padding: 16,
        alignItems: 'center',
    },
    paymentProofImage: {
        width: '100%',
        height: 400,
        borderRadius: 8,
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
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelRegistrationText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    cancelCenteredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    cancelModalView: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        width: '80%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    cancelModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    cancelModalText: {
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 5,
        marginHorizontal: 5,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#C0C0C0',
    },
    confirmButton: {
        backgroundColor: '#ff4d4f',
    },
    buttonText: {
        fontWeight: 'bold',
        color: 'white',
    },
    errorText: {
        color: '#ff4d4f',
        marginBottom: 10,
        textAlign: 'center',
    },
});
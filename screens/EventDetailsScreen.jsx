import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Image, Dimensions, Platform, Alert, Animated } from 'react-native';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { GestureHandlerRootView, TextInput } from 'react-native-gesture-handler';
import { doc, getDoc, collection, query, where, getDocs, addDoc, onSnapshot, writeBatch, Timestamp } from "firebase/firestore";
import { Entypo, MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Notifications from 'expo-notifications';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';

import { db } from '../utils/firebaseConfig';
import { getItem } from '../utils/asyncStorage';

import ClashScheduleModal from '../components/Modal/ClashScheduleModal';
import RegistrationModal from '../components/Modal/RegistrationModal';

const { height, width } = Dimensions.get('window');

// Configure notifications
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

const EventDetailsScreen = ({ navigation, route }) => {
    const { eventID } = route.params;

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

    const [receiptImage, setReceiptImage] = useState("");
    const [imageError, setImageError] = useState("");
    const [eventDetails, setEventDetails] = useState({});
    const [currentParticipantNum, setCurrentParticipantNum] = useState(0);
    const [hasClash, setHasClash] = useState(false);
    const [userRegistrationInfo, setUserRegistrationInfo] = useState({});

    const [isLoading, setIsLoading] = useState(true);

    const [contentHeight, setContentHeight] = useState(0);
    const [isRegistrationFormVisible, setIsRegistrationFormVisible] = useState(false);
    const [clashModalVisible, setClashModalVisible] = useState(false);
    const [registeredModalVisible, setRegisteredModalVisible] = useState(false);

    const scrollViewRef = useRef(null);
    const registrationFormRef = useRef(null);
    const abortControllerRef = useRef(new AbortController());

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.98)).current;

    const snapPoints = useMemo(() => {
        const minHeight = Math.min(contentHeight + 40, height * 0.9); // limit to 90% of screen height
        return [minHeight];
    }, [contentHeight]);

    const renderBackdrop = useCallback(
        props => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.7}
            />
        ),
        []
    );

    useEffect(() => {
        const unsubscribe = navigation.addListener('blur', () => {
            // Clean up when screen loses focus
            registrationFormRef.current?.close();
        });

        return unsubscribe;
    }, [navigation]);

    useEffect(() => {
        const fadeAnim = new Animated.Value(0);
        const scaleAnim = new Animated.Value(0.98);

        return () => {
            // Clean up animations
            fadeAnim.removeAllListeners();
            scaleAnim.removeAllListeners();
            abortControllerRef.current.abort();
        };
    }, []);

    useEffect(() => {
        let unsubscribeEvent = null;
        let unsubscribeRegistration = null;
        let isMounted = true;

        const fetchData = async () => {
            try {
                if (!isMounted) return;
                setIsLoading(true);

                if (!eventID) return;

                const eventRef = doc(db, "event", eventID);

                unsubscribeEvent = onSnapshot(eventRef, async (eventSnap) => {
                    if (!eventSnap.exists()) {
                        console.log("No such event!");
                        setIsLoading(false);
                        return;
                    }

                    const eventData = eventSnap.data();

                    const eventImagesRef = collection(db, "eventImages");
                    const eventImagesQuery = query(eventImagesRef, where("eventID", "==", eventID));
                    const eventImagesSnap = await getDocs(eventImagesQuery);

                    let images = [];
                    eventImagesSnap.forEach((doc) => {
                        if (doc.data().images) {
                            images = [...images, ...doc.data().images];
                        }
                    });

                    const currentEventDetails = {
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
                        isYearRestrict: eventData.isYearRestrict,
                        isFacultyRestrict: eventData.isFacultyRestrict,
                        organiserID: eventData.organiserID,
                        category: eventData.category,
                        images
                    };

                    if (currentEventDetails.requiresCapacity) {
                        currentEventDetails.capacity = eventData.capacity;
                    }

                    if (currentEventDetails.isYearRestrict) {
                        currentEventDetails.yearsRestricted = eventData.yearsRestricted;
                    }

                    setEventDetails(currentEventDetails);

                    const studentID = await getItem('studentID');

                    const userRef = doc(db, "user", studentID);
                    const userSnap = await getDoc(userRef);

                    if (!userSnap.exists()) {
                        console.log("User does not exist.");
                        return;
                    }

                    const userData = userSnap.data();

                    const userDetails = {
                        fullname: userData.firstName + " " + userData.lastName,
                        email: userData.email,
                        yearOfStudy: userData.yearOfStudy,
                        facultyID: userData.facultyID,
                    };

                    setUserRegistrationInfo(userDetails);

                    const registrationRef = collection(db, "registration");
                    const registrationQuery = query(registrationRef, where("studentID", "==", studentID));
                    const registrationSnap = await getDocs(registrationQuery);

                    if (!registrationSnap.empty) {
                        const registeredEventsID = registrationSnap.docs.map(doc => doc.data().eventID);

                        const eventPromises = registeredEventsID.map(id => getDoc(doc(db, "event", id)));
                        const eventDocs = await Promise.all(eventPromises);
                        const eventsDetails = eventDocs.map(docSnap =>
                            docSnap.exists() ? {
                                eventID: docSnap.id,
                                startTime: docSnap.data().eventStartDateTime,
                                endTime: docSnap.data().eventEndDateTime
                            } : null
                        );
                        const clashCheck = checkForEventClash(currentEventDetails, eventsDetails);

                        setHasClash(clashCheck.hasClash);
                    }

                    const registrationListRef = collection(db, "registration");
                    const registrationListQuery = query(registrationListRef, where("eventID", "==", eventID));

                    unsubscribeRegistration = onSnapshot(registrationListQuery, (snapshot) => {
                        setCurrentParticipantNum(snapshot.size);
                    });

                    setIsLoading(false);
                });
            } catch (error) {
                if (isMounted) {
                    console.error("Error when fetching data,", error.message);
                }
            }
        };

        fetchData();

        return () => {
            isMounted = false;
            if (unsubscribeEvent) unsubscribeEvent();
            if (unsubscribeRegistration) unsubscribeRegistration();
        };
    }, [eventID]);

    const checkForEventClash = (currentEventDetails, registeredEventList) => {
        if (!currentEventDetails || registeredEventList.length === 0) {
            return { hasClash: false };
        }

        const eventStartDateTime = new Date(currentEventDetails.startTime.seconds * 1000);
        const eventEndDateTime = new Date(currentEventDetails.endTime.seconds * 1000);

        const startOfMonth = new Date(eventStartDateTime.getFullYear(), eventStartDateTime.getMonth(), 1, 0, 0, 0, 0);
        const endOfMonth = new Date(eventEndDateTime.getFullYear(), eventEndDateTime.getMonth() + 1, 0, 23, 59, 59);

        const eventsInRange = registeredEventList.filter(event => {
            return (
                new Date(event.startTime.seconds * 1000) <= endOfMonth &&
                new Date(event.endTime.seconds * 1000) >= startOfMonth
            );
        });

        const hasClash = eventsInRange.some(registeredEvent => {
            return (
                (eventStartDateTime >= new Date(registeredEvent.startTime.seconds * 1000) && eventStartDateTime < new Date(registeredEvent.endTime.seconds * 1000)) ||
                (eventEndDateTime > new Date(registeredEvent.startTime.seconds * 1000) && eventEndDateTime <= new Date(registeredEvent.endTime.seconds * 1000)) ||
                (eventStartDateTime <= new Date(registeredEvent.startTime.seconds * 1000) && eventEndDateTime >= new Date(registeredEvent.endTime.seconds * 1000)) ||
                (eventStartDateTime >= new Date(registeredEvent.startTime.seconds * 1000) && eventEndDateTime <= new Date(registeredEvent.endTime.seconds * 1000))
            )
        })

        return { hasClash }
    }

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

    const handleScroll = (event) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffsetX / width);
    };

    const openRegistrationForm = () => {
        setIsRegistrationFormVisible(true);
        registrationFormRef.current?.expand();
    }

    const handleSheetClose = useCallback((index) => {
        if (index === -1) {
            setIsRegistrationFormVisible(index > 0);
            setReceiptImage('');
            setImageError('');
        }
    }, [setIsRegistrationFormVisible, setReceiptImage, setImageError]);

    const handleClosePress = useCallback(() => {
        // Run closing animations
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true
            }),
            Animated.timing(scaleAnim, {
                toValue: 0.98,
                duration: 200,
                useNativeDriver: true
            })
        ]).start(() => {
            registrationFormRef.current?.close();
            setIsRegistrationFormVisible(false);
            setReceiptImage('');
            setImageError('');
        });
    }, [setIsRegistrationFormVisible, setReceiptImage, setImageError]);

    const pickImage = async () => {
        setImageError('');

        if (Platform.OS !== 'web') {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to upload images!');
                return;
            }
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const pickedImage = result.assets[0];

            try {
                const manipulatedImage = await ImageManipulator.manipulateAsync(
                    pickedImage.uri,
                    [{ resize: { width: 800 } }], // Resize width, maintain aspect ratio
                    {
                        compress: 0.3, // Compress quality
                        format: ImageManipulator.SaveFormat.JPEG,
                        base64: true,
                    }
                );

                const base64Length = manipulatedImage.base64.length * (3 / 4); // Approx file size in bytes
                const fileSizeKB = base64Length / 1024;

                if (fileSizeKB > 100) {
                    setImageError('Image size exceeds 100KB limit. Please choose a smaller image.');
                    return;
                }

                setReceiptImage(manipulatedImage.base64);
            } catch (error) {
                console.error('Image manipulation error:', error);
                setImageError('Failed to process image.');
            }
        }
    };

    const handleRegistration = () => {
        if (hasClash) {
            setClashModalVisible(true);
        } else {
            submitRegistration();
        }
    }

    const handleClashRegistration = () => {
        setHasClash(false);
        submitRegistration();
    }

    const measureContentHeight = useCallback((event) => {
        const { height } = event.nativeEvent.layout;
        setContentHeight(height);
    }, []);

    const submitRegistration = async () => {
        try {
            const signal = abortControllerRef.current.signal;
            if (!eventID || !eventDetails) {
                throw new Error("Missing event details");
            }

            const studentID = await getItem("studentID");
            if (!studentID) {
                throw new Error("studentID does not exist.");
            }

            if (abortControllerRef.current.signal.aborted) {
                return;
            }

            // Early validation to avoid wasteful operations
            if (eventDetails.requiresPaymentProof && !receiptImage) {
                throw new Error("Payment proof is required");
            }

            // Prepare registration data
            const registrationData = {
                studentID,
                eventID,
                isVerified: !eventDetails.requiresPaymentProof,
                isAttended: false,
            };

            if (eventDetails.requiresPaymentProof) {
                registrationData.paymentProofBase64 = receiptImage;
            }

            // Add registration first
            const registrationDocRef = await addDoc(collection(db, "registration"), registrationData);

            // Run quest creation and notifications in parallel
            await Promise.all([
                addQuest(studentID),
                schedulePushNotification(studentID)
            ]);

            setRegisteredModalVisible(true);
            return registrationDocRef.id;

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log("Event Registration Error:", error);
                Alert.alert(
                    "Registration Failed",
                    error.message || "Unable to complete event registration. Please try again."
                );
            }
            throw error;
        }
    };

    const addQuest = async (studentID) => {
        if (!studentID || !eventID) {
            throw new Error("Missing student or event ID");
        }

        const batch = writeBatch(db);

        try {
            // Get the quest document for this event
            const eventQuestQuery = query(
                collection(db, "quest"),
                where("eventID", "==", eventID)
            );
            const eventQuestSnap = await getDocs(eventQuestQuery);

            if (eventQuestSnap.empty) {
                console.warn("No quests found for this event");
                return;
            }

            const eventQuestDoc = eventQuestSnap.docs[0];
            const eventQuestID = eventQuestDoc.id;

            // Get the list of quest items under the quest document
            const questListSnap = await getDocs(collection(db, "quest", eventQuestID, "questList"));
            if (questListSnap.empty) {
                console.warn("No quest items found");
                return;
            }

            // Create quest progress doc
            const questProgressRef = doc(collection(db, "questProgress"));
            batch.set(questProgressRef, {
                studentID,
                eventID,
            });

            // Create quest progress list docs in batch
            const questProgressListRef = collection(questProgressRef, "questProgressList");
            questListSnap.docs.forEach(questDoc => {
                const questProgressListDocRef = doc(questProgressListRef);
                batch.set(questProgressListDocRef, {
                    questID: questDoc.id,
                    isCompleted: false,
                    progress: 0,
                    rewardsClaimed: false,
                });
            });

            await batch.commit();
            console.log("Quest progress successfully created");
            return questProgressRef.id;

        } catch (error) {
            console.error("Quest Progress Creation Error:", error);
            throw error;
        }
    };

    const schedulePushNotification = async (studentID) => {
        try {
            if (!studentID || !eventDetails?.name || !eventDetails?.startTime) {
                throw new Error('Insufficient data for notification scheduling');
            }

            // 1. Get user token from Firestore
            const userDocRef = doc(db, 'user', studentID);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                throw new Error('User not found');
            }

            const expoPushToken = userDocSnap.data().expoPushToken;
            if (!expoPushToken) {
                throw new Error('Expo push token is missing for this user');
            }

            const eventStartTime = eventDetails.startTime.toDate();

            const notificationScenarios = [
                {
                    title: "Event Countdown Begins! 🚀",
                    body: `Only 24 hours left until ${eventDetails.name}! Are you ready for an amazing experience?`,
                    trigger: new Date(eventStartTime.getTime() - 24 * 60 * 60 * 1000),
                    id: `${eventID}_${studentID}_1D`
                },
                {
                    title: "Almost Time! ⏰",
                    body: `${eventDetails.name} starts in just 1 hour! Get your gear ready and let's make memories!`,
                    trigger: new Date(eventStartTime.getTime() - 60 * 60 * 1000),
                    id: `${eventID}_${studentID}_1H`
                },
            ];

            const batch = notificationScenarios.map(notification =>
                addDoc(collection(db, 'scheduled_notifications'), {
                    to: expoPushToken,
                    studentID,
                    eventID,
                    isSent: false,
                    isRead: false,
                    title: notification.title,
                    body: notification.body,
                    sendAt: Timestamp.fromDate(notification.trigger),
                    notificationID: notification.id
                })
            );

            await Promise.all(batch);

            console.log("Scheduled notification requests stored in Firestore");
        } catch (error) {
            console.error("Notification Scheduling Error:", error);
            Alert.alert(
                "Notification Setup Failed",
                "Unable to set up event reminders. You might miss event updates."
            );
        }
    };

    const handleRegistrationModalClose = () => {
        setRegisteredModalVisible(false);
        navigation.goBack();
    }

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4A6FA5" />
                <Text style={styles.loadingText}>Loading the event details...</Text>
            </View>
        )
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={styles.eventDetailsContainer}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Entypo name="chevron-left" size={24} color="#000" />
                    </TouchableOpacity>

                    <View style={styles.eventBriefDetailsContainer}>
                        <Text style={styles.eventNameHeader} numberOfLines={1} ellipsizeMode="tail">
                            {eventDetails.name}
                        </Text>
                        <Text style={styles.eventTimeHeader} numberOfLines={1} ellipsizeMode="tail">
                            {formatDateTime(eventDetails.startTime)} - {formatDateTime(eventDetails.endTime)}
                        </Text>
                    </View>
                </View>

                <ScrollView
                    scrollEnabled={!isRegistrationFormVisible}
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
                            {eventDetails.images.map((image, index) => (
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
                                        <MaterialIcons name="emoji-people" size={18} color="black" />
                                    </View>
                                    <Text style={styles.tagText}>{ORGANISER_MAPPING[eventDetails.organiserID]}</Text>
                                </View>
                                {eventDetails.requiresCapacity && (
                                    <View style={styles.tagPill}>
                                        <View style={styles.tagIconContainer}>
                                            <MaterialIcons name="event-seat" size={18} color="black" />
                                        </View>
                                        <Text style={styles.tagText}>{eventDetails.capacity - currentParticipantNum} Seat(s) Left</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View>
                            <View style={styles.infoRow}>
                                <MaterialIcons name="access-time" size={20} color="#666" marginRight="10" />
                                <Text style={styles.infoText}>{formatDateTime(eventDetails.startTime)} - {formatDateTime(eventDetails.endTime)}</Text>
                            </View>

                            <View style={styles.infoRow}>
                                <Ionicons name="calendar-outline" size={20} color="#666" marginRight="10" />
                                <Text style={styles.infoText}>Register before {formatDateTime(eventDetails.registrationClosingDate)}</Text>
                            </View>

                            {eventDetails.requiresCapacity && (
                                <View style={styles.infoRow}>
                                    <MaterialIcons name="people-alt" size={20} color="#666" marginRight="10" />
                                    <Text style={styles.infoText}>Limited to {eventDetails.capacity} people ONLY!</Text>
                                </View>
                            )}

                            {(eventDetails.isFacultyRestrict || eventDetails.isYearRestrict) && (
                                <View style={styles.infoRow}>
                                    <MaterialCommunityIcons name="pin" size={20} color="#666" marginRight="10" />
                                    <Text style={styles.infoText}>
                                        {(() => {
                                            const facultyName =
                                                ORGANISER_MAPPING[eventDetails.organiserID] || 'faculty';

                                            let message = eventDetails.isFacultyRestrict ? `Only allowed to ${facultyName}'s` : 'Only allowed to';

                                            if (
                                                eventDetails.isYearRestrict &&
                                                Array.isArray(eventDetails.yearsRestricted)
                                            ) {
                                                const years = eventDetails.yearsRestricted
                                                    .map((year) => `${year}`)
                                                    .join(', ');
                                                message += ` Year ${years} students`;
                                            } else {
                                                message += ` students`;
                                            }

                                            return message;
                                        })()}
                                    </Text>
                                </View>
                            )}
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
                                    {eventDetails.locationLatitude != null && eventDetails.locationLongitude != null && (
                                        <MapView
                                            provider={PROVIDER_GOOGLE}
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
                    </View>

                    {clashModalVisible && (
                        <ClashScheduleModal
                            isVisible={clashModalVisible}
                            onConfirm={handleClashRegistration}
                            onCancel={() => setClashModalVisible(false)}
                        />
                    )}

                    {registeredModalVisible && (
                        <RegistrationModal
                            eventName={eventDetails.name}
                            isVisible={registeredModalVisible}
                            onClose={handleRegistrationModalClose}
                        />
                    )}
                </ScrollView>

                <View style={styles.footer}>
                    {
                        eventDetails.capacity === currentParticipantNum ? (
                            <View style={styles.maxCapacityContainer}>
                                <Entypo name="circle-with-cross" size={24} color="#FF002F" />
                                <Text style={styles.maxCapacityText}>Maximum Capacity</Text>
                            </View>
                        ) : eventDetails.isFacultyRestrict && userRegistrationInfo.facultyID.toString() !== eventDetails.organiserID ? (
                            <View style={styles.maxCapacityContainer}>
                                <Entypo name="circle-with-cross" size={24} color="#FF002F" />
                                <Text style={styles.maxCapacityText}>
                                    {`This event is only eligible for ${ORGANISER_MAPPING[eventDetails.organiserID]} student`}
                                </Text>
                            </View>
                        ) : eventDetails.isYearRestrict && !eventDetails.yearsRestricted?.includes(userRegistrationInfo.yearOfStudy) ? (
                            <View style={styles.maxCapacityContainer}>
                                <Entypo name="circle-with-cross" size={24} color="#FF002F" />
                                <Text style={styles.maxCapacityText}>
                                    This event is only eligible for Year {eventDetails.yearsRestricted?.join(", ")} student
                                </Text>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.registerButton} onPress={openRegistrationForm}>
                                <Text style={styles.registerButtonText}>Register Now</Text>
                            </TouchableOpacity>
                        )
                    }
                </View>

                <BottomSheet
                    ref={registrationFormRef}
                    index={isRegistrationFormVisible ? 0 : -1}
                    snapPoints={snapPoints}
                    onChange={handleSheetClose}
                    enablePanDownToClose
                    enableContentPanningGesture
                    backdropComponent={renderBackdrop}
                    handleIndicatorStyle={styles.handleIndicator}
                    backgroundStyle={styles.registrationFormBackground}
                    handleStyle={styles.handle}
                >
                    <BottomSheetView onLayout={measureContentHeight} style={{ padding: 20 }}>
                        <View style={styles.bsHeader}>
                            <Text style={styles.bsHeaderTitle}>Registration Form</Text>
                        </View>

                        <View style={styles.formContainer}>
                            <View style={styles.fieldContainer}>
                                <Text style={styles.label}>Full Name</Text>
                                <TextInput
                                    style={[styles.input, styles.disabledInput]}
                                    value={userRegistrationInfo.fullname}
                                    editable={false}
                                />
                            </View>

                            <View style={styles.fieldContainer}>
                                <Text style={styles.label}>Email</Text>
                                <TextInput
                                    style={[styles.input, styles.disabledInput]}
                                    value={userRegistrationInfo.email}
                                    editable={false}
                                />
                            </View>

                            {eventDetails.requiresPaymentProof && (
                                <View style={styles.fieldContainer}>
                                    <Text style={styles.label}>Receipt Proof <Text style={{ color: "red" }}>*</Text></Text>
                                    <Text style={styles.helperText}>
                                        Please upload a receipt image. Advisable file size - within 3MB.
                                    </Text>

                                    {receiptImage ? (
                                        <View style={styles.imagePreviewContainer}>
                                            <Image
                                                source={{ uri: `data:image/png;base64,${receiptImage}` }}
                                                style={styles.imagePreview}
                                            />
                                            <TouchableOpacity
                                                style={styles.changeImageButton}
                                                onPress={pickImage}
                                            >
                                                <Text style={styles.changeImageText}>Change Image</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            style={styles.uploadButton}
                                            onPress={pickImage}
                                        >
                                            <MaterialIcons name="cloud-upload" size={24} color="#FFF" />
                                            <Text style={styles.uploadButtonText}>Upload Receipt</Text>
                                        </TouchableOpacity>
                                    )}

                                    {imageError ? (
                                        <Text style={styles.errorText}>{imageError}</Text>
                                    ) : null}
                                </View>
                            )}
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                (eventDetails.requiresPaymentProof && !receiptImage) ? styles.disabledButton : {}
                            ]}
                            disabled={eventDetails.requiresPaymentProof && !receiptImage}
                            onPress={() => {
                                if (!hasClash) {
                                    handleRegistration();
                                    handleClosePress();
                                } else {
                                    // If there's a clash, just trigger the registration logic
                                    // which will show the clash modal
                                    handleRegistration();
                                }
                            }}
                        >
                            <Text style={styles.submitButtonText}>Submit</Text>
                        </TouchableOpacity>
                    </BottomSheetView>
                </BottomSheet>
            </View>
        </GestureHandlerRootView>
    )
}

export default EventDetailsScreen;

const styles = StyleSheet.create({
    background: {
        flex: 1,
        width: '100%',
        backgroundColor: 'transparent',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: "white",
    },
    loadingText: {
        marginTop: 14,
        fontSize: 16,
        color: '#36454F',
        fontWeight: '500',
    },
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    eventBriefDetailsContainer: {
        flex: 1,
        marginLeft: 20,
        justifyContent: 'center',
    },
    eventNameHeader: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    eventTimeHeader: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    eventDetailsContainer: {
        flex: 1,
        backgroundColor: '#f9f9f9',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(165, 165, 165, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
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
    imageContainer: {
        height: 280,
        position: 'relative',
        marginTop: 15,
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
        fontSize: 14,
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
        marginHorizontal: 8,
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
        backgroundColor: '#fafbfc',
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
        textAlign: "justify"
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
    clashedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF3E0',
        borderRadius: 8,
        paddingVertical: 12,
    },
    clashedText: {
        color: '#FF9800',
        marginLeft: 10,
        fontSize: 16,
        fontWeight: '500',
    },
    maxCapacityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFE0E0',
        borderRadius: 8,
        paddingVertical: 12,
    },
    maxCapacityText: {
        color: '#FF002F',
        marginLeft: 10,
        fontSize: 16,
        fontWeight: '500',
    },
    registerButton: {
        backgroundColor: '#3498db',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    registerButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 16, // Add some padding at the bottom so content doesn't get hidden behind the footer
    },
    bsHeader: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    bsHeaderTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    input: {
        backgroundColor: '#FFF',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#DDD',
        fontSize: 16,
    },
    disabledInput: {
        backgroundColor: '#F0F0F0',
        color: '#666',
    },
    registrationFormBackground: {
        backgroundColor: '#F5F5F5',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderWidth: 0.4,
    },
    formContainer: {
        marginTop: 20,
    },
    fieldContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 8,
        color: '#333',
    },
    helperText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    uploadButton: {
        backgroundColor: '#4285F4',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 8,
    },
    imagePreviewContainer: {
        alignItems: 'center',
    },
    imagePreview: {
        width: '100%',
        height: 150,
        borderRadius: 8,
        marginBottom: 8,
        resizeMode: 'contain',
    },
    changeImageButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#E0E0E0',
    },
    changeImageText: {
        color: '#333',
        fontSize: 14,
        fontWeight: '500',
    },
    errorText: {
        color: '#D32F2F',
        fontSize: 14,
        marginTop: 8,
    },
    submitButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    disabledButton: {
        backgroundColor: '#A5D6A7',
        opacity: 0.7,
    },
    submitButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
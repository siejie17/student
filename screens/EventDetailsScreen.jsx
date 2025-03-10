import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Image, Dimensions, Platform, Alert } from 'react-native'
import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Entypo, MaterialIcons, Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import { GestureHandlerRootView, TextInput } from 'react-native-gesture-handler';
import { AlertTriangle, CircleX } from 'lucide-react-native';

import { db } from '../utils/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { getItem } from '../utils/asyncStorage';

const { width } = Dimensions.get('window');

const categoryMapping = {
  1: "Academic",
  2: "Volunteering",
  3: "Entertainment",
  4: "Cultural",
  5: "Sports",
  6: "Health & Wellness",
  7: "Others",
}

const organiserMapping = {
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

const EventDetailsScreen = ({ route, navigation }) => {
  const eventID = route?.params?.eventID || "3c0boMLvyRyrnklW58LR";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [receiptImage, setReceiptImage] = useState("");
  const [imageError, setImageError] = useState("");
  const [event, setEvent] = useState(null);
  const [currentRegistration, setCurrentRegistration] = useState(0);
  const [registeredEventIDs, setRegisteredEventIDs] = useState([]);
  const [registeredEventTimeSlot, setRegisteredEventTimeSlot] = useState([]);
  const [hasClash, setHasClash] = useState(null);
  const [clashingEvents, setClashingEvents] = useState([]);
  const [user, setUser] = useState(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [registeredLoading, setRegisteredLoading] = useState(true);

  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);

  const scrollViewRef = useRef(null);
  const registrationFormRef = useRef(null);

  const snapPoints = ["50%", "70%"];

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

  const handleScroll = (event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    setCurrentIndex(index);
  };

  const openRegistrationForm = () => {
    setIsBottomSheetVisible(true);
    registrationFormRef.current?.expand();
  }

  // Handle closing the bottom sheet
  const handleSheetClose = (index) => {
    setIsBottomSheetVisible(index > 0);
  };

  const handleClosePress = useCallback(() => {
    registrationFormRef.current?.close();
  }, []);

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
      quality: 0.3, // Lower quality to help keep size down
      base64: true
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      if (result.assets[0].fileSize > 50 * 1024) {
        setImageError('Image size exceeds 50KB limit. Please choose a smaller image.');
        return;
      }

      setReceiptImage(result.assets[0].base64);
    }
  };

  const submitRegistration = async () => {
    try {
      const studentID = await getItem("studentID");

      const registrationData = {
        studentID: studentID,
        eventID: eventID,
        isVerified: event.requiresPaymentProof ? false : true,
        isAttended: false,
      }

      if (event.requiresPaymentProof) {
        registrationData.paymentProofBase64 = receiptImage;
      }

      await addDoc(collection(db, "registration"), registrationData);

      console.log("Registration successful!");
    } catch (error) {
      console.error("Error registering for event:", error);
    }
  };

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        setEventLoading(true);

        if (!eventID) return;

        // Query event collection by document ID
        const eventRef = doc(db, "event", eventID);
        const eventSnap = await getDoc(eventRef);

        if (!eventSnap.exists()) {
          console.log("No such event!");
          setEventLoading(false);
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
          capacity: eventData.requiresCapacity ? eventData.capacity : null,
          organiserID: eventData.organiserID,
          category: eventData.category,
          images
        };

        setEvent(eventDetails);

      } catch (error) {
        console.error("Error fetching event data:", error);
      } finally {
        setEventLoading(false);
      }
    };

    fetchEventDetails();
  }, []);

  useEffect(() => {
    const fetchUserDetails = async () => {
      const studentID = await getItem('studentID');

      const userRef = doc(db, "user", studentID);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        console.log("User does not existed.");
        return;
      }

      const userData = userSnap.data();

      const userDetails = {
        fullname: userData.firstName + " " + userData.lastName,
        email: userData.email,
        matricNum: userData.matricNumber,
      };

      setUser(userDetails);
    }

    fetchUserDetails();
  }, []);

  useEffect(() => {
    const fetchRegisteredEvents = async () => {
      try {
        setRegisteredLoading(true);

        if (!eventID) return;

        const studentID = await getItem('studentID');

        const registrationRef = collection(db, "registration");
        const registrationQuery = query(registrationRef, where("studentID", "==", studentID));
        const registrationSnap = await getDocs(registrationQuery);

        let registeredEvents = [];
        registrationSnap.forEach((doc) => {
          if (doc.data().eventID) {
            registeredEvents.push(doc.data().eventID);
          }
        });

        setRegisteredEventIDs(registeredEvents);
      } catch (error) {
        console.error(error);
      }
    }

    fetchRegisteredEvents();
  }, [eventID]);

  useEffect(() => {
    const currentRegisteredNumber = async () => {
      try {
        if (event == null) return;

        const registrationListRef = collection(db, "registration");
        const registrationListQuery = query(registrationListRef, where("eventID", "==", eventID));
        const registrationListSnap = await getDocs(registrationListQuery);

        setCurrentRegistration(registrationListSnap.size);
      } catch (error) {
        console.error(error);
      }
    };

    currentRegisteredNumber();
  }, [event]);

  useEffect(() => {
    const fetchRegisteredEventDetails = async () => {
      if (registeredEventIDs.length === 0) return;

      try {
        const eventPromises = registeredEventIDs.map(id => getDoc(doc(db, "event", id)));
        const eventDocs = await Promise.all(eventPromises);
        const eventsDetails = eventDocs.map(docSnap =>
          docSnap.exists() ? { eventID: docSnap.id, startTime: docSnap.data().eventStartDateTime, endTime: docSnap.data().eventEndDateTime } : null
        );

        setRegisteredEventTimeSlot(eventsDetails);
      } catch (error) {
        console.error("Error fetching registered event details:", error);
      } finally {
        setRegisteredLoading(false);
      }
    };

    fetchRegisteredEventDetails();
  }, [registeredEventIDs]); // Runs when registeredEventIDs updates


  useEffect(() => {
    const checkClash = () => {
      if (!eventLoading && !registeredLoading) {
        const clashCheck = checkForEventClash();
        setHasClash(clashCheck.hasClash);
        setClashingEvents(clashCheck.clashingEvents);
      }
    };

    if (!eventLoading && !registeredLoading && event && registeredEventTimeSlot.length > 0) {
      setTimeout(() => checkClash(), 500); // Delay execution
    }
  }, [eventLoading, registeredLoading, event, registeredEventTimeSlot]);
  // won't result the result at the first time

  const checkForEventClash = () => {
    if (!event || registeredEventTimeSlot.length === 0) {
      return { hasClash: false, clashingEvents: [] };
    }

    const eventStartDateTime = new Date(event.startTime.seconds * 1000);
    const eventEndDateTime = new Date(event.endTime.seconds * 1000);

    const startOfMonth = new Date(eventStartDateTime.getFullYear(), eventStartDateTime.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(eventEndDateTime.getFullYear(), eventEndDateTime.getMonth() + 1, 0, 23, 59, 59);

    const eventsInRange = registeredEventTimeSlot.filter(event => {
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

    return {
      hasClash,
      clashingEvents: eventsInRange.filter(regevent => {
        return (
          (eventStartDateTime >= new Date(regevent.startTime.seconds * 1000) && eventStartDateTime < new Date(regevent.endTime.seconds * 1000)) ||
          (eventEndDateTime > new Date(regevent.startTime.seconds * 1000) && eventEndDateTime <= new Date(regevent.endTime.seconds * 1000)) ||
          (eventStartDateTime <= new Date(regevent.startTime.seconds * 1000) && eventEndDateTime >= new Date(regevent.endTime.seconds * 1000)) ||
          (eventStartDateTime >= new Date(regevent.startTime.seconds * 1000) && eventEndDateTime <= new Date(regevent.endTime.seconds * 1000))
        )
      })
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      {(eventLoading && registeredLoading) ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (hasClash !== null && user && event && registeredEventTimeSlot.length > 0) ? (
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
                  {event.name}
                </Text>
                <Text style={styles.eventTimeHeader} numberOfLines={1} ellipsizeMode="tail">
                  {formatDateTime(event.startTime)} - {formatDateTime(event.endTime)}
                </Text>
              </View>
            </View>

            <ScrollView scrollEnabled={!isBottomSheetVisible} showsVerticalScrollIndicator={false} style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
              <View style={styles.imageContainer}>
                <ScrollView
                  ref={scrollViewRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                >
                  {event.images.map((image, index) => (
                    <View key={index} style={styles.imageWrapper}>
                      <Image
                        source={{ uri: `data:image/png;base64,${image}` }}
                        style={styles.image}
                      />
                      <View style={styles.indicator}>
                        <Text style={styles.indicatorText}>
                          {index + 1} / {event.images.length}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.detailsContainer}>
                <View style={styles.titleContainer}>
                  <Text style={styles.title}>{event.name}</Text>
                  <View style={styles.tagsContainer}>
                    <View style={styles.tagPill}>
                      <View style={styles.tagIconContainer}>
                        <MaterialIcons name="category" size={16} color="black" />
                      </View>
                      <Text style={styles.tagText}>{categoryMapping[event.category]}</Text>
                    </View>
                    <View style={styles.tagPill}>
                      <View style={styles.tagIconContainer}>
                        <MaterialIcons name="emoji-people" size={18} color="black" />
                      </View>
                      <Text style={styles.tagText}>{organiserMapping[event.organiserID]}</Text>
                    </View>
                    {event.requiresCapacity ? (
                      <View style={styles.tagPill}>
                        <View style={styles.tagIconContainer}>
                          <MaterialIcons name="event-seat" size={18} color="black" />
                        </View>
                        <Text style={styles.tagText}>{event.capacity - currentRegistration} Seat(s) Left</Text>
                      </View>
                    ) : null
                    }
                  </View>
                </View>

                <View>
                  <View style={styles.infoRow}>
                    <MaterialIcons name="access-time" size={20} color="#666" marginRight="10" />
                    <Text style={styles.infoText}>{formatDateTime(event.startTime)} - {formatDateTime(event.endTime)}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={20} color="#666" marginRight="10" />
                    <Text style={styles.infoText}>Register before {formatDateTime(event.registrationClosingDate)}</Text>
                  </View>

                  {event.requiresCapacity && (
                    <View style={styles.infoRow}>
                      <MaterialIcons name="people-alt" size={20} color="#666" marginRight="10" />
                      <Text style={styles.infoText}>Limited to {event.capacity} people ONLY!</Text>
                    </View>
                  )}
                </View>

                <View style={styles.infoCard}>
                  <View style={styles.infoHeader}>
                    <MaterialIcons name="description" size={22} color="#4789d6" />
                    <Text style={styles.infoHeaderText}>Description</Text>
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.descriptionText}>{event.description}</Text>
                  </View>
                </View>

                <View style={styles.infoCard}>
                  <View style={styles.infoHeader}>
                    <Ionicons name="location" size={22} color="#4789d6" />
                    <Text style={styles.infoHeaderText}>Location</Text>
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoText, { marginBottom: "16" }]}>{event.locationName}</Text>

                    <View style={styles.mapContainer}>
                      <MapView
                        style={styles.map}
                        initialRegion={{
                          latitude: event.locationLatitude,
                          longitude: event.locationLongitude,
                          latitudeDelta: 0.01,
                          longitudeDelta: 0.01,
                        }}
                        scrollEnabled={false}
                        pitchEnabled={false}
                      >
                        <Marker
                          coordinate={{
                            latitude: event.locationLatitude,
                            longitude: event.locationLongitude,
                          }}
                          title={event.locationName}
                        />
                      </MapView>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.footer}>
              {event.capacity == currentRegistration ?
                <View style={styles.maxCapacityContainer}>
                  <CircleX color="#FF002F" size={24} />
                  <Text style={styles.maxCapacityText}>Maximum Capacity</Text>
                </View> :
                hasClash ?
                  <View style={styles.clashedContainer}>
                    <AlertTriangle color="#FF9800" size={24} />
                    <Text style={styles.clashedText}>Schedule Conflict</Text>
                  </View> :
                  <TouchableOpacity style={styles.registerButton} onPress={openRegistrationForm}>
                    <Text style={styles.registerButtonText}>Register Now</Text>
                  </TouchableOpacity>
              }
            </View>

            <BottomSheet
              ref={registrationFormRef}
              index={isBottomSheetVisible ? 1 : -1}
              snapPoints={snapPoints}
              onChange={handleSheetClose}
              enablePanDownToClose
              backgroundStyle={styles.registrationFormBackground}
            >
              <BottomSheetView style={{ padding: 20 }}>
                <View style={styles.bsHeader}>
                  <Text style={styles.bsHeaderTitle}>Registration Form</Text>
                </View>

                <View style={styles.formContainer}>
                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput
                      style={[styles.input, styles.disabledInput]}
                      value={user.fullname}
                      editable={false}
                    />
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      style={[styles.input, styles.disabledInput]}
                      value={user.email}
                      editable={false}
                    />
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Matric Number</Text>
                    <TextInput
                      style={[styles.input, styles.disabledInput]}
                      value={user.matricNum}
                      editable={false}
                    />
                  </View>

                  {event.requiresPaymentProof && (
                    <View style={styles.fieldContainer}>
                      <Text style={styles.label}>Receipt Proof <Text style={{ color: "red" }}>*</Text></Text>
                      <Text style={styles.helperText}>
                        Please upload a receipt image (maximum 50KB)
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
                    (event.requiresPaymentProof && !receiptImage) ? styles.disabledButton : {}
                  ]}
                  disabled={event.requiresPaymentProof && !receiptImage}
                  onPress={() => {
                    submitRegistration();
                    Alert.alert('Success', 'Form submitted successfully!');
                    handleClosePress();
                  }}
                >
                  <Text style={styles.submitButtonText}>Submit</Text>
                </TouchableOpacity>
              </BottomSheetView>
            </BottomSheet>
          </View>
        </GestureHandlerRootView>) : (
        <>
          <ActivityIndicator size="large" color="#0000ff" />
        </>
      )
      }
    </View>
  )
}

export default EventDetailsScreen;

const styles = StyleSheet.create({
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    zIndex: 10,
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
    fontSize: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginLeft: 10,
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
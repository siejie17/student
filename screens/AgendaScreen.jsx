import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Agenda } from 'react-native-calendars';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { getItem } from '../utils/asyncStorage.js';
import { collection, doc, getDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebaseConfig';
import { useNavigation } from '@react-navigation/native';

const AgendaScreen = () => {
  const [registeredEvents, setRegisteredEvents] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const navigation = useNavigation();

  const unsubscribeRef = useRef(null);
  const isMountedRef = useRef(true);

  const fetchRegisteredEventsRealtime = useCallback(async () => {
    setIsLoading(true);

    const studentID = await getItem("studentID");
    if (!studentID) {
      console.error("No student ID found.");
      setIsLoading(false);
      return;
    }

    const registrationRef = collection(db, "registration");
    const registrationQuery = query(registrationRef, where("studentID", "==", studentID));

    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(registrationQuery, async (registrationSnapshot) => {
      if (!isMountedRef.current) return; // Ensure component is mounted

      if (registrationSnapshot.empty) {
        console.warn("No registrations found for student ID:", studentID);
        setRegisteredEvents({});  // Clear the state when no events found
        setIsLoading(false);
        setRefreshing(false);
        return;
      }

      let eventRegistrations = registrationSnapshot.docs.map(doc => ({
        id: doc.id,
        eventID: doc.data().eventID,
        isAttended: doc.data().isAttended,
        isVerified: doc.data().isVerified,
      }));

      let eventDataMap = new Map();

      for (const reg of eventRegistrations) {
        const eventRef = doc(db, "event", reg.eventID);
        const eventSnap = await getDoc(eventRef);

        if (eventSnap.exists()) {
          const eventInfo = eventSnap.data();
          const startDateTime = new Date(eventInfo.eventStartDateTime.seconds * 1000);
          const endDateTime = new Date(eventInfo.eventEndDateTime.seconds * 1000);
          const startDateStr = startDateTime.toISOString().split('T')[0];
          const endDateStr = endDateTime.toISOString().split('T')[0];

          const event = {
            id: reg.id,
            category: eventInfo.category,
            eventStatus: eventInfo.status,
            eventID: reg.eventID,
            eventName: eventInfo.eventName,
            eventLocation: eventInfo.locationName || "No location specified",
            latitude: eventInfo.locationLatitude,
            longitude: eventInfo.locationLongitude,
            eventDate: startDateTime.toDateString(),
            eventEndDate: endDateTime.toDateString(),
            eventStart: eventInfo.eventStartDateTime,
            startTime: startDateTime.toLocaleString(undefined, {
              day: "2-digit",
              month: "2-digit",
              hour: "numeric",
              minute: "2-digit",
              hour12: false,
            }),
            endTime: startDateStr === endDateStr
              ? endDateTime.toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
                hour12: false,
              })
              : endDateTime.toLocaleString(undefined, {
                day: "2-digit",
                month: "2-digit",
                hour: "numeric",
                minute: "2-digit",
                hour12: false,
              }),
            isVerified: reg.isVerified,
            isAttended: reg.isAttended,
          };

          // Ensure unique by eventID
          eventDataMap.set(reg.eventID, event);
        }
      }

      // Convert map to array
      const eventData = Array.from(eventDataMap.values());

      // Categorize events by date
      let categorizedEvents = {};
      eventData.forEach(event => {
        const startDate = new Date(event.eventDate);

        let currentDate = new Date(startDate);
        // while (currentDate <= endDate) {
          const eventDateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

          if (!categorizedEvents[eventDateKey]) {
            categorizedEvents[eventDateKey] = [];
          }

          categorizedEvents[eventDateKey].push(event);

          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1);
        // }
      });

      if (!isMountedRef.current) return; // Ensure component is mounted before updating state
      if (JSON.stringify(registeredEvents) !== JSON.stringify(categorizedEvents)) {
        setRegisteredEvents(categorizedEvents);
      }
      setIsLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    // Unsubscribe from previous listener if needed
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    unsubscribeRef.current = await fetchRegisteredEventsRealtime();
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    const fetchData = async () => {
      unsubscribeRef.current = await fetchRegisteredEventsRealtime();
    };

    fetchData();

    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current(); // Cleanup listener on unmount
      }
    };
  }, [fetchRegisteredEventsRealtime]);

  const getCategoryColor = (categoryId) => {
    const colors = {
      1: 'rgba(170, 74, 68, 0.2)', // Burgundy
      2: 'rgba(255, 127, 80, 0.2)', // Coral
      3: 'rgba(232, 196, 5, 0.2)', // Gold
      4: 'rgba(95, 133, 117, 0.2)', // Sage Green
      5: 'rgba(137, 207, 240, 0.2)', // Baby Blue
      6: 'rgba(127, 0, 255, 0.2)', // Violet
      7: 'rgba(128, 0, 128, 0.2)', // Purple
    };
    return colors[categoryId] || '#5B7FFF'; // Default to primary blue if category not found
  };

  const getStatusAttributes = (status) => {
    const statusConfig = {
      scheduled: { icon: 'check-circle', color: '#4CAF50' },
      postponed: { icon: 'clock-outline', color: '#FF9800' },
      ongoing: { icon: 'progress-clock', color: '#2196F3' },
      cancelled: { icon: 'close-circle', color: '#F44336' },
      default: { icon: 'information-outline', color: '#757575' }
    };

    return statusConfig[status.toLowerCase()] || statusConfig.default;
  };

  const handleCardPress = useCallback((item) => {
    navigation.navigate("RegisteredEventsTopTabs", {
      registrationID: item.id,
      eventID: item.eventID,
      eventName: item.eventName,
      categoryID: item.category,
      eventStart: item.eventStart,
      latitude: item.latitude,
      longitude: item.longitude,
      status: item.eventStatus
    })
  }, [navigation]);

  const renderItem = (item) => {
    const categoryColor = getCategoryColor(item.category);
    const statusInfo = getStatusAttributes(item.eventStatus);

    return (
      <TouchableOpacity
        style={styles.eventCard}
        activeOpacity={0.7}
        onPress={() => handleCardPress(item)}
      >
        <View style={[styles.categoryIndicator, { backgroundColor: categoryColor }]} />
        <View style={styles.eventContent}>
          <View style={styles.eventHeader}>
            <Text style={styles.eventTitle} numberOfLines={1}>{item.eventName}</Text>
            <View style={styles.statusContainer}>
              <MaterialCommunityIcons name={statusInfo.icon} size={14} color={statusInfo.color} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {item.eventStatus}
              </Text>
            </View>
          </View>

          <View style={styles.eventDetails}>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#757575" />
              <Text style={styles.detailText}>
                {item.startTime} - {item.endTime}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={16} color="#757575" />
              <Text style={styles.detailText}>{item.eventLocation}</Text>
            </View>
          </View>

          <View style={styles.eventFooter}>
            <View style={styles.badgeContainer}>
              {item.isVerified && (
                <View style={[styles.badge, { backgroundColor: '#E8F5E9' }]}>
                  <Text style={[styles.badgeText, { color: '#4CAF50' }]}>Verified</Text>
                </View>
              )}
              {item.isAttended && (
                <View style={[styles.badge, { backgroundColor: '#E3F2FD' }]}>
                  <Text style={[styles.badgeText, { color: '#2196F3' }]}>Attended</Text>
                </View>
              )}
            </View>

            <MaterialCommunityIcons name="chevron-right" size={22} color="#BBBBBB" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyData = () => {
    return (
      <ScrollView
        contentContainerStyle={styles.emptyContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#5B7FFF']}
            tintColor={'#5B7FFF'}
          />
        }
      >
        <View style={styles.emptyIconContainer}>
          <View style={styles.emptyCircle} />
          <MaterialCommunityIcons name="calendar-blank" size={72} color='#3f6bc4' />
        </View>
        <Text style={styles.emptyTitle}>No Events Scheduled</Text>
        <Text style={styles.emptyDescription}>
          Your schedule is clear for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate("Events")}
        >
          <Text style={styles.browseButtonText}>Browse Available Events</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6284bf" />
        <Text style={styles.loadingText}>Loading your event calendar...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>My Calendar</Text>
          </View>
        </View>

        {/* Calendar Agenda */}
        <View style={styles.calendarContainer}>
          <Agenda
            items={registeredEvents}
            renderItem={renderItem}
            renderEmptyData={renderEmptyData}
            selected={selectedDate}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            theme={{
              agendaDayTextColor: '#333333',
              agendaDayNumColor: '#333333',
              agendaTodayColor: '#3f6bc4',
              agendaKnobColor: '#3f6bc4',
              selectedDayBackgroundColor: '#3f6bc4',
              dotColor: '#3f6bc4',
              todayTextColor: '#3f6bc4',
              reservationsBackgroundColor: 'rgba(98, 132, 191, 0.02)',
              calendarBackground: '#FFFFFF',
              textSectionTitleColor: '#333333',
              dayTextColor: '#333333',
              monthTextColor: '#333333',
            }}
            pastScrollRange={3}
            futureScrollRange={6}
            showClosingKnob={true}
            refreshing={refreshing}
            onRefresh={onRefresh}
            hideExtraDays={true}
            showOnlySelectedDayItems
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  backgroundPattern: {
    resizeMode: 'repeat',
    opacity: 0.1,
  },
  loadingBackground: {
    flex: 1,
    width: '100%',
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "white"
  },
  loadingText: {
    marginTop: 14,
    fontSize: 16,
    color: '#36454F',
    fontWeight: '500',
  },
  header: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    elevation: 2,
  },
  headerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#757575',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: '#F5F5F5',
  },
  calendarContainer: {
    flex: 1,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginVertical: 6,
    marginHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  categoryIndicator: {
    width: 6,
    height: '100%',
  },
  eventContent: {
    flex: 1,
    padding: 14,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  eventDetails: {
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#555555',
    marginLeft: 8,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIconContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(29, 78, 216, 0.06)',
    zIndex: -1,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 12,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: '90%',
    lineHeight: 22,
  },
  browseButton: {
    backgroundColor: '#3f6bc4',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 2,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AgendaScreen;
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, getDocs, limit, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';

import { db } from '../../utils/firebaseConfig';
import { getItem } from '../../utils/asyncStorage';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.875;
const CARD_HEIGHT = 220;

// Organizer mapping defined outside component
const ORGANISER_MAPPING = {
  1: "Faculty of Applied & Creative Arts",
  2: "Faculty of Built Environment",
  3: "Faculty of Cognitive Sciences & Human Development",
  4: "Faculty of Computer Science & Information Technology",
  5: "Faculty of Economics & Business",
  6: "Faculty of Education, Language & Communication",
  7: "Faculty of Engineering",
  8: "Faculty of Medicine & Health Sciences",
  9: "Faculty of Resource Science & Technology",
  10: "Faculty of Social Sciences & Humanities",
};

const LatestAddedEvents = ({ setIsLoading }) => {
  const [latestEvents, setLatestEvents] = useState([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigation = useNavigation();

  useEffect(() => {
    const fetchLatestEvents = async () => {
      try {
        setIsLoading(true);
        setLocalLoading(true);
        setError(null);

        // Query latest events
        const latestEventsQuery = query(
          collection(db, "event"),
          where("registrationClosingDate", ">", Timestamp.now()),
          where("status", "not-in", ["Completed", "Cancelled"]), 
          orderBy("lastAdded", "desc"), 
          limit(5)
        );
        const latestEventsSnap = await getDocs(latestEventsQuery);

        if (latestEventsSnap.empty) {
          setLatestEvents([]);
          return;
        }

        const studentID = await getItem('studentID');

        const registrationRef = collection(db, "registration");
        const registrationQuery = query(registrationRef, where("studentID", "==", studentID));
        const registrationSnapshots = await getDocs(registrationQuery);

        const registeredEventIDs = registrationSnapshots.docs.map(doc => doc.data().eventID);

        const latestEventsData = latestEventsSnap.docs.filter(doc => !registeredEventIDs.includes(doc.id)).map((doc) => ({
          id: doc.id,
          name: doc.data().eventName,
          organiserID: doc.data().organiserID,
        }));

        // Get images in parallel
        const eventsWithImages = await Promise.all(
          latestEventsData.map(async event => {
            try {
              const eventImagesRef = collection(db, "eventImages");
              const eventImagesQuery = query(eventImagesRef, where("eventID", "==", event.id));
              const eventImagesSnap = await getDocs(eventImagesQuery);
      
              let thumbnail = null;
              if (!eventImagesSnap.empty) {
                const imageDoc = eventImagesSnap.docs[0];
                const imageData = imageDoc.data();
                if (imageData.images && imageData.images.length > 0) {
                  thumbnail = imageData.images[0];
                }
              }
      
              return { 
                ...event, 
                thumbnail,
                organiser: ORGANISER_MAPPING[event.organiserID] || "Unknown Organizer"
              };
            } catch (err) {
              console.error(`Error fetching images for event ${event.id}:`, err);
              return { 
                ...event, 
                thumbnail: null,
                organiser: ORGANISER_MAPPING[event.organiserID] || "Unknown Organizer"
              };
            }
          })
        );

        setLatestEvents(eventsWithImages);
      } catch (err) {
        console.error("Error fetching latest events:", err);
        setError("Failed to load latest events");
        setLatestEvents([]);
      } finally {
        setIsLoading(false);
        setLocalLoading(false);
      }
    };

    fetchLatestEvents();
  }, [setIsLoading]);

  const renderEventCard = useCallback(({ item }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => navigation.navigate('EventDetails', { eventID: item.id })}
      style={styles.cardContainer}
    >
      <View style={styles.card}>
        <View style={styles.imageContainer}>
          {item.thumbnail ? (
            <Image
              source={{ uri: `data:image/png;base64,${item.thumbnail}` }}
              style={styles.image}
              resizeMode="cover"
              defaultSource={require('../../assets/home/placeholder.png')}
            />
          ) : (
            <View style={styles.noImageContainer}>
              <MaterialIcons name="image" size={32} color="#e0e0e0" />
            </View>
          )}
        </View>
        
        <View style={styles.detailsContainer}>
          <Text numberOfLines={2} style={styles.title}>
            {item.name}
          </Text>
          
          <View style={styles.organiserContainer}>
            <MaterialIcons name="school" size={16} color="#888" />
            <Text numberOfLines={1} style={styles.organiserName}>
              {item.organiser}
            </Text>
          </View>
        </View>
        
        <View style={styles.viewDetailsContainer}>
          <Text style={styles.viewDetailsText}>View Details</Text>
          <MaterialIcons name="arrow-forward" size={16} color="#007AFF" />
        </View>
      </View>
    </TouchableOpacity>
  ), [navigation]);

  const EmptyComponent = useMemo(() => (
    <View style={styles.emptyStateContainer}>
      {localLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.emptyStateText}>Loading events...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={44} color="#ff5252" />
          <Text style={styles.emptyStateTitle}>Unable to load events</Text>
          <Text style={styles.emptyStateText}>{error}</Text>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              setLocalLoading(true);
              setIsLoading(true);
            }}
          >
            <Text style={styles.actionButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.noEventsContainer}>
          <MaterialIcons name="event-busy" size={44} color="#bdbdbd" />
          <Text style={styles.emptyStateTitle}>No Recent Events</Text>
          <Text style={styles.emptyStateText}>
            Check back soon for new events
          </Text>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate("Events")}
          >
            <Text style={styles.actionButtonText}>Browse All Events</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  ), [localLoading, error, navigation, setIsLoading]);

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerTitleContainer}>
          <MaterialIcons name="event" size={20} color="#A9A9A9" />
          <Text style={styles.sectionTitle}>Latest Events</Text>
        </View>
        <TouchableOpacity 
          style={styles.viewAllButton} 
          onPress={() => navigation.navigate("Events")}
        >
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={latestEvents}
        renderItem={renderEventCard}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 16}
        decelerationRate="fast"
        contentContainerStyle={[
          styles.listContent,
          latestEvents.length === 0 && styles.emptyListContent
        ]}
        ListEmptyComponent={EmptyComponent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: CARD_HEIGHT + 60,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  viewAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  viewAllText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 12,
  },
  emptyListContent: {
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginHorizontal: 8,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  imageContainer: {
    height: CARD_HEIGHT * 0.6,
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f6f6f6',
  },
  detailsContainer: {
    padding: 16,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  organiserContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  organiserName: {
    marginLeft: 6,
    fontSize: 13,
    color: '#888',
    flex: 1,
  },
  viewDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  viewDetailsText: {
    fontSize: 13,
    color: '#007AFF',
    marginRight: 4,
  },
  // Empty state styles
  emptyStateContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    padding: 20,
    marginHorizontal: 8,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 16,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 20,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  // Loading state
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Error and No Events states reuse the emptyStateContainer styles
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  noEventsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LatestAddedEvents;
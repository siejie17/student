import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Keyboard,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';

import { getItem } from '../utils/asyncStorage';

import { collection, getDocs, onSnapshot, orderBy, query, Timestamp, where } from "firebase/firestore";
import { db } from '../utils/firebaseConfig';

import EventCard from '../components/EventListing/EventCard';
import SearchBar from '../components/EventListing/SearchBar';

const CATEGORIES = [
  "All",
  "Academic",
  "Volunteering",
  "Entertainment",
  "Cultural",
  "Sports",
  "Health & Wellness",
  "Others"
];

const CATEGORIES_MAPPING = {
  "Academic": 1,
  "Volunteering": 2,
  "Entertainment": 3,
  "Cultural": 4,
  "Sports": 5,
  "Health & Wellness": 6,
  "Others": 7,
};

const CATEGORY_COLORS = {
  "All": ['#6C63FF', '#4A45B2'],
  "Academic": ['#4ECDC4', '#1A9988'],
  "Volunteering": ['#FF6B6B', '#C82C2C'],
  "Entertainment": ['#FFD166', '#DBA628'],
  "Cultural": ['#9649CB', '#6C33A0'],
  "Sports": ['#06D6A0', '#05A47A'],
  "Health & Wellness": ['#118AB2', '#0B5D77'],
  "Others": ['#073B4C', '#052A37'],
};

const EventListingScreen = ({ navigation }) => {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [registeredEventIDs, setRegisteredEventIDs] = useState([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const unsubscribeRegistrationRef = useRef(null);
  const unsubscribeEventRef = useRef(null);
  const unsubscribeTotalParticipantsRef = useRef(null);

  const fetchEventCatalogue = useCallback(async () => {
    try {
      setIsLoading(true);
  
      const studentID = await getItem("studentID");
      if (!studentID) {
        setIsLoading(false);
        return;
      }
  
      // Clear previous subscriptions
      if (unsubscribeRegistrationRef.current) {
        unsubscribeRegistrationRef.current();
      }
      if (unsubscribeEventRef.current) {
        unsubscribeEventRef.current();
      }
      if (unsubscribeTotalParticipantsRef.current) {
        unsubscribeTotalParticipantsRef.current();
      }
  
      const registrationRef = collection(db, "registration");
      const registrationQuery = query(registrationRef, where("studentID", "==", studentID));
  
      const unsubscribeRegistration = onSnapshot(registrationQuery, async (registrationSnap) => {
        // Extract registered event IDs
        const registeredEventIDs = registrationSnap.docs.map(doc => doc.data().eventID);
        
        // Get events where registration is still open
        const eventsRef = collection(db, "event");
        const eventsQuery = query(
          eventsRef,
          where("registrationClosingDate", ">", Timestamp.now()),
          where("status", "not-in", ["Completed", "Cancelled"]),
          orderBy("lastAdded", "desc")
        );
  
        const unsubscribeEvent = onSnapshot(eventsQuery, async (eventSnap) => {
          // Filter out events the student has already registered for
          const filteredEvents = await Promise.all(
            eventSnap.docs
              .filter(doc => !registeredEventIDs.includes(doc.id))
              .map(async (doc) => {
                const event = { id: doc.id, ...doc.data() };
                
                // Fetch event images
                const eventImagesRef = collection(db, "eventImages");
                const eventImagesQuery = query(eventImagesRef, where("eventID", "==", event.id));
                const eventImagesDoc = await getDocs(eventImagesQuery);
  
                let thumbnail = null;
                eventImagesDoc.forEach((doc) => {
                  const imageData = doc.data();
                  if (imageData.images && imageData.images.length > 0) {
                    thumbnail = imageData.images[0];
                  }
                });
  
                return { ...event, thumbnail };
              })
          );
  
          setEvents(filteredEvents);
          setRegisteredEventIDs(registeredEventIDs);
          
          // Store unsubscribe functions
          unsubscribeRegistrationRef.current = unsubscribeRegistration;
          unsubscribeEventRef.current = unsubscribeEvent;
          
          setIsLoading(false);
          setRefreshing(false);
        });
      });
  
    } catch (error) {
      console.error("Error fetching events:", error);
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEventCatalogue();

    return () => {
      if (unsubscribeRegistrationRef.current && unsubscribeEventRef.current && unsubscribeTotalParticipantsRef.current) {
        unsubscribeRegistrationRef.current(); // Cleanup on unmount
        unsubscribeEventRef.current();
        unsubscribeTotalParticipantsRef.current();
      }
    };
  }, [fetchEventCatalogue]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEventCatalogue();
  }, [fetchEventCatalogue]);

  useFocusEffect(
    useCallback(() => {
      fetchEventCatalogue();
    }, [])
  );

  const filteredEvents = useMemo(() => {
    let filtered = events;

    if (selectedCategory !== 'All') {
      const categoryID = CATEGORIES_MAPPING[selectedCategory];
      filtered = filtered.filter(event => event.category === categoryID);
    }

    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(event =>
        event.eventName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [events, selectedCategory, searchQuery]);

  const handleCategoryPress = useCallback((category) => {
    setSelectedCategory(category);
    // Refresh animations when category changes
    fadeAnim.setValue(0);
    slideAnim.setValue(50);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();
  }, [fadeAnim, slideAnim]);

  const renderCategoryItem = useCallback(({ item }) => {
    const isSelected = selectedCategory === item;
    const colors = CATEGORY_COLORS[item] || ['#6C63FF', '#4A45B2'];

    return (
      <TouchableOpacity
        onPress={() => handleCategoryPress(item)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={isSelected ? colors : ['#FFFFFF', '#F8F8F8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.categoryItem,
            isSelected && styles.categoryItemSelected
          ]}
        >
          <Text
            style={[
              styles.categoryText,
              isSelected && styles.categoryTextSelected
            ]}
          >
            {item}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }, [selectedCategory, handleCategoryPress]);

  const renderCard = useCallback(({ item }) => (
    <EventCard event={item} onPress={() => navigation.navigate('EventDetails', { eventID: item.id })} />
  ), [navigation]);

  const ListEmptyComponent = useMemo(() => (
    <Animated.View
      style={[
        styles.emptyContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <Ionicons name="calendar-outline" size={50} color="#CCCCCC" />
      <Text style={styles.emptyText}>No events found</Text>
      <Text style={styles.emptySubText}>
        Try selecting a different category or search term
      </Text>
    </Animated.View>
  ), [fadeAnim, slideAnim]);

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Event Listing</Text>
          </View>

          <SearchBar
            onSearch={setSearchQuery}
            placeholder="Search events by name..."
            style={styles.searchBar}
          />

          <View style={styles.categoriesContainer}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={CATEGORIES}
              renderItem={renderCategoryItem}
              keyExtractor={item => item}
              contentContainerStyle={styles.categoriesList}
            />
          </View>
        </View>
      </TouchableWithoutFeedback>

      <View style={styles.listView}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6284bf" />
            <Text style={styles.loadingText}>Loading available events...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredEvents}
            renderItem={renderCard}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#0066cc']}
              />
            }
            ListEmptyComponent={ListEmptyComponent}
          />
        )}
      </View>
    </View>
  );
};

export default React.memo(EventListingScreen);

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    backgroundColor: "white"
  },
  header: {
    padding: 15,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  searchBar: {
    marginHorizontal: 10,
    marginBottom: 5,
  },
  categoriesContainer: {
    // borderBottomWidth: 1,
    // borderBottomColor: '#eee',
  },
  categoriesList: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  categoryItem: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 12,
    borderRadius: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  categoryItemSelected: {
    elevation: 4,
    shadowOpacity: 0.2,
  },
  categoryText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#fff',
  },
  listView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#364c87',
    fontWeight: '500',
  },
  listContainer: {
    paddingBottom: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
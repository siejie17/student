import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute } from '@react-navigation/native';
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

const EventListingScreen = ({ route, navigation }) => {
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

  const autoFocusSearch = route.params?.autoFocusSearch ?? false;

  const fetchEventCatalogue = useCallback(async () => {
    try {
      setIsLoading(true);
  
      const studentID = await getItem("studentID");
      if (!studentID) return setIsLoading(false);
  
      // Unsubscribe previous listeners
      unsubscribeRegistrationRef.current?.();
      unsubscribeEventRef.current?.();
  
      // Listen to student registrations
      const registrationQuery = query(
        collection(db, "registration"),
        where("studentID", "==", studentID)
      );
  
      unsubscribeRegistrationRef.current = onSnapshot(registrationQuery, async (registrationSnap) => {
        const registeredEventIDs = registrationSnap.docs.map(doc => doc.data().eventID);
  
        // Listen to current events (not completed or cancelled)
        const eventsQuery = query(
          collection(db, "event"),
          where("registrationClosingDate", ">", Timestamp.now()),
          where("status", "not-in", ["Completed", "Cancelled"]),
          orderBy("lastAdded", "desc")
        );
  
        unsubscribeEventRef.current = onSnapshot(eventsQuery, async (eventSnap) => {
          const allEvents = eventSnap.docs
            .filter(doc => !registeredEventIDs.includes(doc.id))
            .map(doc => ({ id: doc.id, ...doc.data() }));
  
          // Fetch all event thumbnails in one go
          const eventIDs = allEvents.map(e => e.id);
          const imagesQuery = query(
            collection(db, "eventImages"),
            where("eventID", "in", eventIDs.slice(0, 10)) // Firestore 'in' max 10 items
          );
          const imageDocs = await getDocs(imagesQuery);
  
          const imageMap = new Map();
          imageDocs.forEach(doc => {
            const { eventID, images } = doc.data();
            if (images && images.length > 0) imageMap.set(eventID, images[0]);
          });
  
          const enrichedEvents = allEvents.map(event => ({
            ...event,
            thumbnail: imageMap.get(event.id) || null
          }));
  
          setEvents(enrichedEvents);
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

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEventCatalogue();
  }, [fetchEventCatalogue]);

  useFocusEffect(
    useCallback(() => {
      fetchEventCatalogue();
      return () => {
        unsubscribeRegistrationRef.current?.();
        unsubscribeEventRef.current?.();
        unsubscribeTotalParticipantsRef.current?.();
      };
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

    return (
      <TouchableOpacity
        onPress={() => handleCategoryPress(item)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={isSelected ? ['#6284bf', '#4A6EB5'] : ['#FFFFFF', '#F8F8F8']}
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
            shouldFocus={autoFocusSearch}
          />

          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={CATEGORIES}
            renderItem={renderCategoryItem}
            keyExtractor={item => item}
            contentContainerStyle={styles.categoriesList}
          />
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
    marginHorizontal: 5,
    marginBottom: 5,
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
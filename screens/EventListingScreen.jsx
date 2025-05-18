import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, {
  useCallback,
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

import { collection, getDocs, orderBy, query, Timestamp, where, limit, getDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from '../utils/firebaseConfig';

import EventCard from '../components/EventListing/EventCard';
import SearchBar from '../components/EventListing/SearchBar';

const ITEMS_PER_PAGE = 5;

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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const flatListRef = useRef(null);

  const unsubscribeRegistrationRef = useRef(null);
  const unsubscribeEventRef = useRef(null);

  const autoFocusSearch = route.params?.autoFocusSearch ?? false;

  const getUserProfile = async (studentID) => {
    const userQuery = doc(db, "user", studentID);
    const userSnap = await getDoc(userQuery);
    return userSnap.data(); // assuming studentID is unique
  };

  const getTotalItems = async () => {
    try {
      const studentID = await getItem("studentID");
      if (!studentID) return;

      const user = await getUserProfile(studentID);
      if (!user) return;

      const { yearOfStudy, facultyID } = user;

      let baseQuery = query(
        collection(db, "event"),
        where("registrationClosingDate", ">", Timestamp.now()),
        where("status", "not-in", ["Completed", "Cancelled"])
      );

      if (selectedCategory !== 'All') {
        const categoryID = CATEGORIES_MAPPING[selectedCategory];
        baseQuery = query(
          collection(db, "event"),
          where("registrationClosingDate", ">", Timestamp.now()),
          where("status", "not-in", ["Completed", "Cancelled"]),
          where("category", "==", categoryID)
        );
      }

      const registrationQuery = query(
        collection(db, "registration"),
        where("studentID", "==", studentID)
      );
      // Set up real-time listener for registrations
      unsubscribeRegistrationRef.current = onSnapshot(registrationQuery, (registrationSnap) => {
        const registeredEventIDs = registrationSnap.docs.map(doc => doc.data().eventID);

        // Set up real-time listener for events
        unsubscribeEventRef.current = onSnapshot(baseQuery, (eventSnap) => {
          const filtered = eventSnap.docs.filter(doc => {
            const event = doc.data();
            const alreadyRegistered = registeredEventIDs.includes(doc.id);
            if (alreadyRegistered) return false;

            // Year restriction
            if (event.isYearRestrict && Array.isArray(event.yearsRestricted)) {
              if (!event.yearsRestricted.includes(yearOfStudy)) return false;
            }

            // Faculty restriction
            if (event.isFacultyRestrict && event.organiserID !== Number(facultyID)) {
              return false;
            }

            return true;
          });

          setTotalItems(filtered.length);
          setTotalPages(Math.ceil(filtered.length / ITEMS_PER_PAGE));
        });
      });
    } catch (error) {
      console.error("Error getting total events:", error);
    }
  };

  const fetchPage = async (pageNumber) => {
    try {
      setIsLoading(true);
      const studentID = await getItem("studentID");
      if (!studentID) {
        setIsLoading(false);
        return;
      }

      const user = await getUserProfile(studentID);
      if (!user) {
        setIsLoading(false);
        return;
      }
      const { yearOfStudy, facultyID } = user;

      // Get registered events
      const registrationQuery = query(
        collection(db, "registration"),
        where("studentID", "==", studentID)
      );
      const registrationSnap = await getDocs(registrationQuery);
      const registeredEventIDs = registrationSnap.docs.map(doc => doc.data().eventID);

      // Query events
      let eventsQuery = query(
        collection(db, "event"),
        where("registrationClosingDate", ">", Timestamp.now()),
        where("status", "not-in", ["Completed", "Cancelled"]),
        orderBy("registrationClosingDate", "asc"),
        limit(pageNumber * ITEMS_PER_PAGE)
      );

      if (selectedCategory !== 'All') {
        const categoryID = CATEGORIES_MAPPING[selectedCategory];
        eventsQuery = query(
          collection(db, "event"),
          where("registrationClosingDate", ">", Timestamp.now()),
          where("status", "not-in", ["Completed", "Cancelled"]),
          where("category", "==", categoryID),
          orderBy("registrationClosingDate", "asc"),
          limit(pageNumber * ITEMS_PER_PAGE)
        );
      }

      unsubscribeEventRef.current = onSnapshot(eventsQuery, async (eventSnap) => {
        let allEvents = eventSnap.docs
          .filter(doc => {
            const event = doc.data();

            // Skip if already registered
            if (registeredEventIDs.includes(doc.id)) return false;

            // Year restriction
            if (event.isYearRestrict && Array.isArray(event.yearsRestricted)) {
              if (!event.yearsRestricted.includes(yearOfStudy)) return false;
            }

            // Faculty restriction
            if (event.isFacultyRestrict && event.organiserID !== Number(facultyID)) {
              return false;
            }

            return true;
          })
          .map(doc => ({ id: doc.id, ...doc.data() }));

        // Get only the current page's events
        const startIndex = (pageNumber - 1) * ITEMS_PER_PAGE;
        let paginatedEvents = allEvents.slice(startIndex, startIndex + ITEMS_PER_PAGE);

        // Fetch thumbnails for the current page
        if (paginatedEvents.length > 0) {
          const eventIDs = paginatedEvents.map(e => e.id);
          const imagesQuery = query(
            collection(db, "eventImages"),
            where("eventID", "in", eventIDs)
          );
          const imageDocs = await getDocs(imagesQuery);

          const imageMap = new Map();
          imageDocs.forEach(doc => {
            const { eventID, images } = doc.data();
            if (images && images.length > 0) imageMap.set(eventID, images[0]);
          });

          paginatedEvents = paginatedEvents.map(event => ({
            ...event,
            thumbnail: imageMap.get(event.id) || null
          }));
        }

        // Update state
        setEvents(paginatedEvents);
        setTotalItems(allEvents.length);
        setTotalPages(Math.ceil(allEvents.length / ITEMS_PER_PAGE));
        setCurrentPage(pageNumber);
      });
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    fetchPage(pageNumber);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const PageSelector = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
          onPress={() => handlePageChange(1)}
          disabled={currentPage === 1}
        >
          <Text style={styles.pageButtonText}>{"<<"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
          onPress={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <Text style={styles.pageButtonText}>{"<"}</Text>
        </TouchableOpacity>

        {startPage > 1 && (
          <Text style={styles.pageEllipsis}>...</Text>
        )}

        {pageNumbers.map(number => (
          <TouchableOpacity
            key={number}
            style={[
              styles.pageButton,
              currentPage === number && styles.pageButtonActive
            ]}
            onPress={() => handlePageChange(number)}
          >
            <Text style={[
              styles.pageButtonText,
              currentPage === number && styles.pageButtonTextActive
            ]}>
              {number}
            </Text>
          </TouchableOpacity>
        ))}

        {endPage < totalPages && (
          <Text style={styles.pageEllipsis}>...</Text>
        )}

        <TouchableOpacity
          style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
          onPress={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <Text style={styles.pageButtonText}>{">"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
          onPress={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
        >
          <Text style={styles.pageButtonText}>{">>"}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        await getTotalItems();
        await fetchPage(1);
      };
      loadData();
      return () => {
        unsubscribeRegistrationRef.current?.();
        unsubscribeEventRef.current?.();
      };
    }, [selectedCategory])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      getTotalItems(),
      fetchPage(1)
    ]).finally(() => setRefreshing(false));
  }, [selectedCategory]);

  const filteredEvents = useMemo(() => {
    let filtered = events;

    if (filtered.length > 0) {

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
    } else {
      return []
    }
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
          colors={isSelected ? ['#3f6bc4', '#6d93e3'] : ['#FFFFFF', '#F8F8F8']}
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
        ) : events.length === 0 && selectedCategory === "All" ? (
          <View style={[styles.emptyContainer, { flexGrow: 1 }]}>
            <Ionicons name="calendar-outline" size={50} color="#CCCCCC" />
            <Text style={styles.emptyText}>No events have been posted yet</Text>
            <Text style={styles.emptySubText}>
              Please check back soon for new event postings!
            </Text>
          </View>
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={filteredEvents}
              renderItem={renderCard}
              keyExtractor={item => item.id}
              contentContainerStyle={[
                styles.listContainer,
                filteredEvents.length === 0 && styles.emptyListContainer
              ]}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={['#0066cc']}
                />
              }
              ListEmptyComponent={
                selectedCategory !== 'All' || searchQuery.trim() !== '' ? (
                  ListEmptyComponent
                ) : null
              }
            />
          </>
        )}
        {events.length > 0 && totalPages > 1 && !searchQuery && <PageSelector />}
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
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 16,
  },
  emptyContainer: {
    display: 'flex',
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
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  pageButton: {
    minWidth: 35,
    height: 35,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: '#f5f5f5',
  },
  pageButtonActive: {
    backgroundColor: '#3f6bc4',
  },
  pageButtonDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.5,
  },
  pageButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  pageButtonTextActive: {
    color: 'white',
  },
  pageEllipsis: {
    marginHorizontal: 8,
    color: '#666',
  },
  emptyListContainer: {
    justifyContent: 'center',
  },
});
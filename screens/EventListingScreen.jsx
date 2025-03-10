import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  ImageBackground,
  Text,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback, 
  Keyboard,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import SearchBar from '../components/SearchBar';

import { db } from '../utils/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, addDoc, orderBy, Timestamp } from "firebase/firestore";
import EventCard from '../components/EventCard';

const EventListingScreen = ({ navigation }) => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [eventLoading, setEventLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(false);

  const categoriesMapping = {
    "Academic": 1, 
    "Volunteering": 2, 
    "Entertainment": 3, 
    "Cultural": 4, 
    "Sports": 5, 
    "Health & Wellness": 6, 
    "Others": 7,
  };

  const categories = ["All", "Academic", 
    "Volunteering", 
    "Entertainment", 
    "Cultural", 
    "Sports", 
    "Health & Wellness", 
    "Others",
  ];

  useEffect(() => {
    fetchEventCatalogue();
  }, []);

  const fetchEventCatalogue = async() => {
    try {
      setEventLoading(true);

      const eventsSnap = await getDocs(query(collection(db, "event"), where("registrationClosingDate", ">", Timestamp.now()), orderBy("lastAdded", "desc")));
      let events = eventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const eventsWithImages = await Promise.all(
        events.map(async event => {
          const eventImagesRef = collection(db, "eventImages");
          const eventImagesQuery = query(eventImagesRef, where("eventID", "==", event.id));
          const eventImagesDoc = await getDocs(eventImagesQuery);

          let thumbnail = null;
          eventImagesDoc.forEach((eventImages) => {
            if (eventImages.data().images) {
              const imageData = eventImages.data();
              thumbnail = imageData.images.length > 0 ? imageData.images[0] : null;
            }
          });

          return { ...event, thumbnail };
        })
      );

      setEvents(eventsWithImages);
      setFilteredEvents(eventsWithImages);
    } catch (error) {
      console.error("Error fetching event list with image:", error);
    } finally {
      setEventLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let filtered = events;
  
    if (selectedCategory !== 'All') {
      const categoryID = categoriesMapping[selectedCategory];
      filtered = filtered.filter(event => event.category === categoryID);
    }
  
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(event => 
        event.eventName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  
    setFilteredEvents(filtered);
  }, [selectedCategory, searchQuery, events]);

  const handleSearch = () => {
    console.log("Search");
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategory === item && styles.categoryItemSelected
      ]}
      onPress={() => handleCategoryPress(item)}
    >
      <Text style={[
        styles.categoryText,
        selectedCategory === item && styles.categoryTextSelected
      ]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  const handleCategoryPress = (category) => {
    setSelectedCategory(category);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEventCatalogue();
    // Add filtering
  }

  const renderCard = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('EventDetails', { eventID: item.id })}>
      <EventCard event={item} />
    </TouchableOpacity>
  );

  return (
    <ImageBackground
      source={require('../assets/background_dot.png')}
      imageStyle={{ resizeMode: 'repeat' }}
      style={styles.background}
    >
      <View style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
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
                data={categories}
                renderItem={renderCategoryItem}
                keyExtractor={item => item}
                contentContainerStyle={styles.categoriesList}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
    
        <View style={{ flex: 1 }}>
          {eventLoading ? (
            <View style={{ justifyContent: "center", alignItems: "center", flex: 1 }}>
              <ActivityIndicator size="large" color="#0000ff" />
            </View>
          ) : (
            <FlatList
              data={filteredEvents}
              scrollEnabled={true}
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
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Owh no! No events found.</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </ImageBackground>
  );
}

export default EventListingScreen;

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
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
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoriesList: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  categoryItem: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  categoryItemSelected: {
    backgroundColor: '#007AFF',
  },
  categoryText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#fff',
  },
  listContainer: {
    paddingBottom: 16,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 600,
    color: '#666666',
  },
});
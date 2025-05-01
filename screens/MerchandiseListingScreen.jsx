import { View, Text, StyleSheet, FlatList, Animated, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native'
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { LinearGradient } from 'expo-linear-gradient';
import DiamondBalance from '../components/Merchandise/DiamondBalance';
import MerchandiseCard from '../components/Merchandise/MerchandiseCard';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../utils/firebaseConfig';
import { getItem } from '../utils/asyncStorage';

const MerchandiseListingScreen = ({ navigation }) => {
  const [currentDiamonds, setCurrentDiamonds] = useState(0);
  const [merchandises, setMerchandises] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState('All');

  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const CATEGORIES = ["All", "Clothing", "Non-Clothing"];

  useEffect(() => {
    let unsubscribeMerch = null;

    const loadData = async () => {
      setIsLoading(true);
      try {
        await fetchUserDiamonds();
        unsubscribeMerch = await fetchMerchandises();
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Cleanup function to unsubscribe from listeners when component unmounts
    return () => {
      if (unsubscribeMerch) {
        unsubscribeMerch();
      }
    };
  }, []);

  const fetchUserDiamonds = async () => {
    try {
      const studentID = await getItem("studentID");
      if (!studentID) return;

      const studentRef = doc(db, "user", studentID);

      // Set up real-time listener for user diamonds
      const unsubscribeUser = onSnapshot(studentRef, (docSnap) => {
        if (docSnap.exists()) {
          setCurrentDiamonds(docSnap.data().diamonds);
        } else {
          console.error("No such user exists.");
        }
      }, (error) => {
        console.error("Error getting user data:", error);
      });

      return unsubscribeUser;
    } catch (error) {
      console.error("Something went wrong when fetching user diamonds balance.", error);
      throw error;
    }
  }

  const fetchMerchandises = async () => {
    setIsLoading(true);
    try {
      const merchRef = query(collection(db, "merchandise"), where("available", "==", true));

      // Set up real-time listener for merchandise collection
      const unsubscribeMerch = onSnapshot(merchRef, (querySnapshot) => {
        const merchandiseList = [];
        querySnapshot.forEach((doc) => {
          merchandiseList.push({
            id: doc.id,
            ...doc.data()
          });
        });

        const merchandiseIds = merchandiseList.map(item => item.id);

        setMerchandises(merchandiseList);
        filteredMerchandise;
        setIsLoading(false); // Set loading to false once data is received
      }, (error) => {
        console.error("Error getting merchandise data:", error);
        setIsLoading(false); // Also set loading to false on error
      });

      return unsubscribeMerch;
    } catch (error) {
      console.error("Something went wrong when fetching merchandises list.", error);
      setIsLoading(false); // Set loading to false on outer error
      throw error;
    } finally {

    }
  }

  const renderCategoryItem = useCallback(({ item }) => {
    const isSelected = selectedCategory === item;

    return (
      <TouchableOpacity onPress={() => handleCategoryPress(item)} activeOpacity={0.7}>
        <LinearGradient
          colors={isSelected ? ['#6284bf', '#4A6EB5'] : ['#FFFFFF', '#F8F8F8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.categoryItem, isSelected && styles.categoryItemSelected]}
        >
          <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
            {item}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }, [selectedCategory, handleCategoryPress]);

  const handleCategoryPress = useCallback((category) => {
    setSelectedCategory(category);
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

  const filteredMerchandise = useMemo(() => {
    if (selectedCategory === 'All') return merchandises;
    return merchandises.filter(item => item.category === selectedCategory);
  }, [selectedCategory, merchandises]);

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
      <Ionicons name="cart-outline" size={50} color="#CCCCCC" />
      <Text style={styles.emptyText}>No merchandise found</Text>
      <Text style={styles.emptySubText}>
        Try selecting a different category
      </Text>
    </Animated.View>
  ), [fadeAnim, slideAnim]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMerchandises();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, [fetchMerchandises]);

  return (
    <View style={styles.mainContainer}>
      <LinearGradient
        colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
        style={styles.container}
      >
        <DiamondBalance balance={currentDiamonds} />

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

        <View style={styles.listView}>
          <Animated.View style={styles.listContainer}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6284bf" />
                <Text style={styles.loadingText}>Loading merchandises list...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredMerchandise}
                renderItem={({ item }) => 
                  <MerchandiseCard 
                    item={item} 
                    navigation={navigation} 
                    balanceDiamonds={currentDiamonds} 
                  />
                }
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={['#6C63FF']}
                    tintColor="#6C63FF"
                  />
                }
                ListEmptyComponent={ListEmptyComponent}
                numColumns={1}
              />
            )}
          </Animated.View>
        </View>
      </LinearGradient>
    </View>
  )
}

export default MerchandiseListingScreen;

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  background: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
    paddingTop: 10,
  },
  categoriesContainer: {
    marginTop: 6,
    marginBottom: 10,
  },
  categoriesList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  categoryTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  listView: {
    flex: 1,
    paddingHorizontal: 10,
  },
  listContainer: {
    flex: 1,
    paddingTop: 8,
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
  list: {
    paddingBottom: 20,
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
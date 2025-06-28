import { View, Text, StyleSheet, FlatList, Animated, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, onSnapshot, query, where, limit, orderBy, getDocs } from 'firebase/firestore';

import { db } from '../utils/firebaseConfig';
import { getItem } from '../utils/asyncStorage';

import DiamondBalance from '../components/Merchandise/DiamondBalance';
import MerchandiseCard from '../components/Merchandise/MerchandiseCard';
import SearchBar from '../components/EventListing/SearchBar';

const ITEMS_PER_PAGE = 5; // Number of items to load per page

const MerchandiseListingScreen = ({ navigation }) => {
  const [currentDiamonds, setCurrentDiamonds] = useState(0);
  const [allMerchandises, setAllMerchandises] = useState([]); // Store all merchandise
  const [merchandises, setMerchandises] = useState([]); // Current page merchandise
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  const CATEGORIES = ["All", "Clothing", "Non-Clothing"];

  useEffect(() => {
    let unsubscribeUser = null;
    let unsubscribeMerchandise = null;

    const loadData = async () => {
      setIsLoading(true);
      try {
        unsubscribeUser = await fetchUserDiamonds();
        unsubscribeMerchandise = await getTotalItems();
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    return () => {
      if (unsubscribeUser) {
        unsubscribeUser();
      }
      if (unsubscribeMerchandise) {
        unsubscribeMerchandise();
      }
    };
  }, [selectedCategory, searchQuery]); // Reload when category or search changes

  // Effect to fetch first page when allMerchandises changes
  useEffect(() => {
    if (allMerchandises.length > 0) {
      fetchPage(1);
    }
  }, [allMerchandises]);

  const fetchUserDiamonds = async () => {
    try {
      const studentID = await getItem("studentID");
      if (!studentID) return;

      const studentRef = doc(db, "user", studentID);
      const unsubscribeUser = onSnapshot(studentRef, (docSnap) => {
        if (docSnap.exists()) {
          setCurrentDiamonds(docSnap.data().diamonds);
        }
      });

      return unsubscribeUser;
    } catch (error) {
      console.error("Error fetching user diamonds:", error);
    }
  };

  const getTotalItems = async () => {
    try {
      let baseQuery = query(
        collection(db, "merchandise"),
        where("available", "==", true),
        orderBy("createdAt", "desc")
      );

      if (selectedCategory !== 'All') {
        baseQuery = query(
          collection(db, "merchandise"),
          where("available", "==", true),
          where("category", "==", selectedCategory),
          orderBy("createdAt", "desc")
        );
      }

      // Set up real-time listener for all merchandise
      const unsubscribe = onSnapshot(baseQuery, (snapshot) => {
        let allMerchandiseList = [];
        
        snapshot.forEach((doc) => {
          allMerchandiseList.push({
            id: doc.id,
            ...doc.data()
          });
        });

        // Apply search filter if there's a search query
        if (searchQuery.trim()) {
          allMerchandiseList = allMerchandiseList.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }

        setAllMerchandises(allMerchandiseList);
        setTotalItems(allMerchandiseList.length);
        setTotalPages(Math.ceil(allMerchandiseList.length / ITEMS_PER_PAGE));
      }, (error) => {
        console.error("Error in merchandise listener:", error);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error getting total items:", error);
    }
  };

  const createMerchandiseQuery = (pageNumber = 1) => {
    let baseQuery = query(
      collection(db, "merchandise"),
      where("available", "==", true),
      orderBy("createdAt", "desc"),
      limit(ITEMS_PER_PAGE)
    );

    if (selectedCategory !== 'All') {
      baseQuery = query(
        collection(db, "merchandise"),
        where("available", "==", true),
        where("category", "==", selectedCategory),
        orderBy("createdAt", "desc"),
        limit(ITEMS_PER_PAGE)
      );
    }

    return baseQuery;
  };

  const fetchPage = async (pageNumber) => {
    try {
      setIsLoading(true);
      
      // Get only the current page's merchandise from allMerchandises
      const startIndex = (pageNumber - 1) * ITEMS_PER_PAGE;
      const paginatedMerchandise = allMerchandises.slice(startIndex, startIndex + ITEMS_PER_PAGE);

      // Update state
      setMerchandises(paginatedMerchandise);
      setCurrentPage(pageNumber);
    } catch (error) {
      console.error("Error fetching page:", error);
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

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    getTotalItems().finally(() => setRefreshing(false));
  }, [selectedCategory, searchQuery]);

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
    // When searching, show all filtered merchandise
    if (searchQuery.trim() !== '') {
      return allMerchandises;
    }
    // When not searching, show current page merchandise
    return merchandises;
  }, [allMerchandises, merchandises, searchQuery]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    setCurrentPage(1);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

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
      <Text style={styles.emptyText}>
        {searchQuery.trim() 
          ? "No merchandise found matching your search"
          : "No merchandise found"}
      </Text>
      <Text style={styles.emptySubText}>
        {searchQuery.trim()
          ? "Try a different search term or category"
          : "Try selecting a different category"}
      </Text>
    </Animated.View>
  ), [fadeAnim, slideAnim, searchQuery]);

  const CategoryEmptyComponent = useMemo(() => (
    <View style={[styles.emptyContainer, { flexGrow: 1 }]}>
      <Ionicons name="cart-outline" size={50} color="#CCCCCC" />
      <Text style={styles.emptyText}>
        {selectedCategory === "All" 
          ? "No merchandise available" 
          : `No ${selectedCategory} merchandise found`
        }
      </Text>
      <Text style={styles.emptySubText}>
        {selectedCategory === "All" 
          ? "Please check back soon for new merchandise!"
          : "Try selecting a different category or check back later."
        }
      </Text>
    </View>
  ), [selectedCategory]);

  return (
    <View style={styles.mainContainer}>
      <LinearGradient
        colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
        style={styles.container}
      >
        <DiamondBalance balance={currentDiamonds} />

        <SearchBar
          onSearch={handleSearch}
          placeholder="Search merchandise..."
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

        <View style={styles.listView}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6284bf" />
              <Text style={styles.loadingText}>Loading merchandises list...</Text>
            </View>
          ) : allMerchandises.length === 0 ? (
            <View style={[styles.emptyContainer, { flexGrow: 1 }]}>
              <Ionicons name="cart-outline" size={50} color="#CCCCCC" />
              <Text style={styles.emptyText}>
                {selectedCategory === "All" 
                  ? "No merchandise available" 
                  : `No ${selectedCategory} merchandise found`
                }
              </Text>
              <Text style={styles.emptySubText}>
                {selectedCategory === "All" 
                  ? "Please check back soon for new merchandise!"
                  : "Try selecting a different category or check back later."
                }
              </Text>
            </View>
          ) : (
            <>
              <FlatList
                ref={flatListRef}
                data={filteredMerchandise}
                renderItem={({ item }) => 
                  <MerchandiseCard 
                    item={item} 
                    navigation={navigation} 
                    balanceDiamonds={currentDiamonds} 
                  />
                }
                keyExtractor={item => item.id}
                contentContainerStyle={[
                  styles.list,
                  filteredMerchandise.length === 0 && styles.emptyList
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={['#6C63FF']}
                    tintColor="#6C63FF"
                  />
                }
                ListEmptyComponent={
                  (searchQuery.trim() !== '' && allMerchandises.length === 0) || 
                  (selectedCategory !== 'All' && merchandises.length === 0) ? (
                    selectedCategory !== 'All' ? CategoryEmptyComponent : ListEmptyComponent
                  ) : null
                }
                numColumns={1}
              />
            </>
          )}
        </View>
        {allMerchandises.length > 0 && totalPages > 1 && !searchQuery && (
          <View style={styles.floatingPaginationContainer}>
            <PageSelector />
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

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
  searchBar: {
    marginBottom: 5,
  },
  categoriesContainer: {
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
  emptyList: {
    paddingBottom: 40,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'white',
    borderRadius: 25,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pageButton: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    backgroundColor: '#f5f5f5',
  },
  pageButtonActive: {
    backgroundColor: '#6284bf',
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
  floatingPaginationContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 1000,
  },
});
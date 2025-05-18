import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, Animated } from 'react-native';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { collection, onSnapshot, query, where, doc, getDoc, orderBy, limit, getDocs } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';

import { db } from '../utils/firebaseConfig';
import { getItem } from '../utils/asyncStorage';

import RedemptionCard from '../components/Merchandise/RedemptionCard';
import EmptyListComponent from '../components/Merchandise/EmptyListComponent';
import SearchBar from '../components/EventListing/SearchBar';

const ITEMS_PER_PAGE = 5;

const TABS = [
  { id: 'uncollected', label: 'Uncollected' },
  { id: 'collected', label: 'Collected' }
];

const RedemptionListingScreen = () => {
  const [redemptions, setRedemptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('uncollected');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  const filteredRedemptions = useMemo(() => {
    if (!searchQuery.trim()) {
      return redemptions;
    }

    return redemptions.filter(redemption => 
      redemption.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [redemptions, searchQuery]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when searching
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const getTotalItems = async (studentID, isCollected) => {
    try {
      const redemptionRef = collection(db, "redemption");
      const redemptionQuery = query(
        redemptionRef,
        where("studentID", "==", studentID),
        where("collected", "==", isCollected)
      );

      const snapshot = await getDocs(redemptionQuery);
      let total = snapshot.size;

      if (searchQuery.trim()) {
        // If there's a search query, we need to filter the results
        const allDocs = snapshot.docs;
        const merchandiseIDs = [...new Set(allDocs.map(doc => doc.data().merchandiseID))];
        const merchandiseData = {};

        // Fetch merchandise details
        await Promise.all(merchandiseIDs.map(async (id) => {
          const merchandiseDocRef = doc(db, "merchandise", id);
          const merchandiseDoc = await getDoc(merchandiseDocRef);
          if (merchandiseDoc.exists()) {
            merchandiseData[id] = merchandiseDoc.data().name;
          }
        }));

        // Filter based on search query
        total = allDocs.filter(doc => {
          const merchandiseName = merchandiseData[doc.data().merchandiseID] || '';
          return merchandiseName.toLowerCase().includes(searchQuery.toLowerCase());
        }).length;
      }
      
      setTotalItems(total);
      setTotalPages(Math.ceil(total / ITEMS_PER_PAGE));
    } catch (error) {
      console.error("Error getting total items:", error);
      setTotalItems(0);
      setTotalPages(1);
    }
  };

  const fetchPage = async (pageNumber, tab) => {
    let unsubscribe;
    setIsLoading(true);

    try {
      const studentID = await getItem("studentID");
      if (!studentID) {
        setIsLoading(false);
        return;
      }

      const isCollected = tab === 'collected';
      await getTotalItems(studentID, isCollected);

      const redemptionRef = collection(db, "redemption");
      const redemptionQuery = query(
        redemptionRef,
        where("studentID", "==", studentID),
        where("collected", "==", isCollected),
        orderBy("redeemedTime", "desc"),
        limit(pageNumber * ITEMS_PER_PAGE)
      );

      unsubscribe = onSnapshot(redemptionQuery, async (snapshot) => {
        let redemptionData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Get only the current page's items
        const startIndex = (pageNumber - 1) * ITEMS_PER_PAGE;
        redemptionData = redemptionData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

        // Extract unique merchandiseIDs
        const merchandiseIDs = [...new Set(redemptionData.map(item => item.merchandiseID))];

        // Fetch merchandise details
        const merchandiseData = {};
        await Promise.all(merchandiseIDs.map(async (id) => {
          const merchandiseDocRef = doc(db, "merchandise", id);
          const merchandiseDoc = await getDoc(merchandiseDocRef);
          if (merchandiseDoc.exists()) {
            merchandiseData[id] = {
              name: merchandiseDoc.data().name,
              collectionLocationName: merchandiseDoc.data().collectionLocationName,
              category: merchandiseDoc.data().category,
            };
          }
        }));

        // Merge merchandise details into redemption data
        const mergedData = redemptionData.map(item => ({
          ...item,
          name: merchandiseData[item.merchandiseID]?.name || "Unknown",
          collectionLocationName: merchandiseData[item.merchandiseID]?.collectionLocationName || "Unknown",
          category: merchandiseData[item.merchandiseID]?.category || "Unknown",
        }));

        setRedemptions(mergedData);
        setCurrentPage(pageNumber);
        setIsLoading(false);
      });

    } catch (error) {
      console.error("Error fetching data:", error);
      setRedemptions([]);
      setIsLoading(false);
    }

    return unsubscribe;
  };

  const handlePageChange = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    fetchPage(pageNumber, activeTab);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
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
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPage(1, activeTab).finally(() => setRefreshing(false));
  }, [activeTab]);

  useEffect(() => {
    let unsubscribe;

    const loadData = async () => {
      unsubscribe = await fetchPage(1, activeTab);
    };

    loadData();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeTab]);

  const renderTabItem = useCallback(({ item }) => {
    const isSelected = activeTab === item.id;

    return (
      <TouchableOpacity
        onPress={() => handleTabChange(item.id)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={isSelected ? ['#3f6bc4', '#6d93e3'] : ['#FFFFFF', '#F8F8F8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.tabItem,
            isSelected && styles.tabItemSelected
          ]}
        >
          <Text
            style={[
              styles.tabText,
              isSelected && styles.tabTextSelected
            ]}
          >
            {item.label}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }, [activeTab]);

  const PageSelector = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage - 1; i++) {
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

  return (
    <View style={styles.background}>
      <SearchBar
        onSearch={handleSearch}
        placeholder="Search redemptions..."
        style={styles.searchBar}
      />

      <View style={{ marginBottom: 6 }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={TABS}
          renderItem={renderTabItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.tabsList}
        />
      </View>

      <View style={[styles.listContainer]}>
        {isLoading ? (
          <View style={styles.background}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A6FA5" />
              <Text style={styles.loadingText}>Loading redemptions...</Text>
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={filteredRedemptions}
            renderItem={({ item }) => <RedemptionCard item={item} />}
            keyExtractor={item => item.id}
            contentContainerStyle={[
              styles.listContent,
              filteredRedemptions.length === 0 && styles.emptyListContent
            ]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery.trim() 
                    ? "No redemptions found matching your search"
                    : "No redemptions found"}
                </Text>
                <Text style={styles.emptySubText}>
                  {searchQuery.trim()
                    ? "Try a different search term"
                    : "Check back later for new redemptions"}
                </Text>
              </View>
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        )}
        {filteredRedemptions.length > 0 && totalPages > 1 && <PageSelector />}
      </View>
    </View>
  );
};

export default RedemptionListingScreen;

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    backgroundColor: 'white',
  },
  searchBar: {
    marginBottom: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 16,
    color: '#36454F',
    fontWeight: '500',
  },
  tabsList: {
    display: 'flex',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  tabItem: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginRight: 12,
    borderRadius: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabItemSelected: {
    elevation: 4,
    shadowOpacity: 0.2,
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  tabTextSelected: {
    color: '#fff',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    flexGrow: 1,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  separator: {
    height: 16,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
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
});
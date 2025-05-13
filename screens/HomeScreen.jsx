import { View, Text, StyleSheet, TouchableOpacity, Animated, SafeAreaView, Image } from 'react-native';
import { useState, useCallback, useMemo, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';

// Components
import HeroBanner from '../components/Home/HeroBanner';
import OngoingUpcomingEventCarousel from '../components/Home/OngoingUpcomingEventCarousel';
import LatestAddedEvents from '../components/Home/LatestAddedEvents';
import MerchandiseLeaderboardCards from '../components/Home/MerchandiseLeaderboardCards';
import SearchBar from '../components/EventListing/SearchBar';
import MemoizedFlatList from '../components/Home/MemoizedFlatList';

import { getItem } from '../utils/asyncStorage';

const HomeScreen = () => {
  // State management
  const [firstName, setFirstName] = useState("")
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [scrollY] = useState(new Animated.Value(0))

  // Refs
  const flatListRef = useRef(null)

  // Navigation
  const navigation = useNavigation();

  // useEffect(() => {
  //   let isMounted = true;

  //   const checkLeaderboardRefresh = async () => {
  //     if (!isMounted) return;

  //     const studentID = await getItem("studentID");
  //     const facultyID = await getItem("facultyID");
  //     if (!studentID || !facultyID) return;

  //     try {
  //       const leaderboardQuery = query(collection(db, "leaderboard"), where("facultyID", "==", facultyID));
  //       const leaderboardSnap = await getDocs(leaderboardQuery);

  //       if (!leaderboardSnap.empty) {
  //         const leaderboardDoc = leaderboardSnap.docs[0];
  //         const leaderboardDocRef = leaderboardDoc.ref;
  //         const { refreshDateTime } = leaderboardDoc.data();
  //         const currentTime = Timestamp.now(); // Use actual timestamp

  //         if (!refreshDateTime || !refreshDateTime.toMillis) {
  //           console.log("refreshDateTime is missing or invalid.");
  //           return;
  //         }

  //         if (refreshDateTime.toMillis() <= currentTime.toMillis()) {
  //           const leaderboardEntriesRef = collection(leaderboardDocRef, "leaderboardEntries");
  //           const leaderboardEntriesQuery = query(leaderboardEntriesRef, orderBy("points", "desc"));
  //           const leaderboardEntriesSnapshot = await getDocs(leaderboardEntriesQuery);

  //           // Prepare rankings
  //           const rankings = leaderboardEntriesSnapshot.docs.map((doc, index) => {
  //             const data = doc.data();
  //             const rank = index + 1;

  //             let diamonds = 1;
  //             if (rank === 1) diamonds = 1000;
  //             else if (rank === 2) diamonds = 750;
  //             else if (rank === 3) diamonds = 500;
  //             else if (rank === 4) diamonds = 400;
  //             else if (rank === 5) diamonds = 350;
  //             else if (rank === 6) diamonds = 300;
  //             else if (rank === 7) diamonds = 250;
  //             else if (rank === 8) diamonds = 200;
  //             else if (rank === 9) diamonds = 150;
  //             else if (rank === 10) diamonds = 100;
  //             else if (rank <= 20) diamonds = 50;
  //             else if (rank <= 30) diamonds = 25;
  //             else if (rank <= 40) diamonds = 10;
  //             else if (rank <= 50) diamonds = 5;

  //             return {
  //               rank,
  //               studentID: data.studentID,
  //               points: data.points,
  //               claimed: false,
  //               diamonds,
  //             };
  //           });

  //           const leaderboardLastMonthRef = collection(leaderboardDocRef, "lastMonth");

  //           // Clear previous lastMonth entries
  //           const lastMonthSnapshot = await getDocs(leaderboardLastMonthRef);
  //           if (!lastMonthSnapshot.empty) {
  //             const deleteBatch = writeBatch(db);
  //             lastMonthSnapshot.docs.forEach((doc) => deleteBatch.delete(doc.ref));
  //             await deleteBatch.commit();
  //           }

  //           // Insert new rankings into lastMonth
  //           const insertBatch = writeBatch(db);
  //           rankings.forEach((entry) => {
  //             const newDocRef = doc(leaderboardLastMonthRef);
  //             insertBatch.set(newDocRef, entry);
  //           });
  //           await insertBatch.commit();

  //           // Delete old leaderboard entries
  //           const deleteLeaderboardBatch = writeBatch(db);
  //           leaderboardEntriesSnapshot.docs.forEach((doc) => deleteLeaderboardBatch.delete(doc.ref));
  //           await deleteLeaderboardBatch.commit();

  //           // Update next refresh timestamp
  //           const nextDate = refreshDateTime.toDate();
  //           nextDate.setMonth(nextDate.getMonth() + 1);
  //           const newRefreshDateTime = Timestamp.fromDate(nextDate);
  //           await updateDoc(leaderboardDocRef, { refreshDateTime: newRefreshDateTime });
  //         }
  //       }
  //     } catch (error) {
  //       console.error("Error checking leaderboard refresh:", error);
  //     }
  //   };

  //   checkLeaderboardRefresh();

  //   return () => {
  //     isMounted = false;
  //   };
  // }, []);

  // Fetch user data on screen focus
  useFocusEffect(
    useCallback(() => {
      const fetchUserData = async () => {
        try {
          setIsLoading(true)
          const userData = await getItem('userData')
          if (userData) {
            const parsedData = JSON.parse(userData)
            setFirstName(parsedData.firstName || '')
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
        } finally {
          setIsLoading(false)
        }
      }

      fetchUserData()
    }, [])
  )

  // Define sections with more metadata
  const sections = useMemo(() => [
    {
      type: 'banner',
      id: 'banner-section'
    },
    {
      type: 'ml-cards',
      id: 'merch-leaderboard-cards-section',
      title: 'Leaderboards & Merchandise',
      subtitle: 'Check out top performers and latest gear'
    },
    {
      type: 'ou-events',
      id: 'upcoming-ongoing-events-section',
      title: 'Ongoing & Upcoming Events',
      subtitle: 'Don\'t miss these exciting opportunities'
    },
    {
      type: 'la-events',
      id: 'latest-added-events-section',
      title: 'Latest Added Events',
      subtitle: 'Fresh new events just for you'
    },
  ], [])

  // Header opacity animation based on scroll
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp'
  })

  // Memoize the render function with section headers
  const renderContent = useCallback(({ item }) => {
    const renderSection = () => {
      switch (item.type) {
        case 'banner':
          return <HeroBanner />
        case 'ml-cards':
          return <MerchandiseLeaderboardCards setIsLoading={setIsLoading} setFirstName={setFirstName} />
        case 'ou-events':
          return <OngoingUpcomingEventCarousel setIsLoading={setIsLoading} />
        case 'la-events':
          return <LatestAddedEvents setIsLoading={setIsLoading} />
        default:
          return null
      }
    }

    // Skip header for banner section
    if (item.type === 'banner') {
      return renderSection()
    }

    return (
      <View style={styles.sectionContainer}>
        {renderSection()}
      </View>
    )
  }, [navigation, setIsLoading, setFirstName])

  // Handle refresh action
  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    setSearchQuery('')

    // Simulate refresh with actual data fetch in real app
    setTimeout(() => {
      setRefreshing(false)
    }, 1500)
  }, [])

  // Scroll to top handler
  const scrollToTop = useCallback(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ animated: true, offset: 0 })
    }
  }, [])

  // Handle scroll events for header animation
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  )

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Animated Header Background */}
      <Animated.View
        style={[
          styles.headerBackground,
          { opacity: headerOpacity }
        ]}
      />

      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.leftHeaderContent}>
          <Text style={styles.welcomeText}>Welcome back</Text>
          <Text style={styles.greeting}>
            {firstName ? `${firstName}!` : 'Explorer!'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.logoContainer}
          onPress={scrollToTop}
        >
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
            // Fallback for the demo - in reality this would be your actual logo image
            defaultSource={require('../assets/logo.png')}
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar with enhanced styling */}
      <View style={styles.searchBarContainer}>
        <SearchBar
          onSearch={setSearchQuery}
          placeholder="Search events..."
          style={styles.searchBar}
          onPress={() => navigation.navigate("Events", { autoFocusSearch: true })}
          icon="search"
        />
      </View>

      {/* Main Content */}
      <MemoizedFlatList
        ref={flatListRef}
        data={sections}
        renderItem={renderContent}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        refreshing={refreshing}
        onRefresh={handleRefresh}
        initialNumToRender={2}
        windowSize={3}
        removeClippedSubviews={false}
        maxToRenderPerBatch={2}
        updateCellsBatchingPeriod={50}
        contentContainerStyle={styles.contentContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    // paddingBottom: 80,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    backgroundColor: '#f8f9fa',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 20,
    marginBottom: 5,
    zIndex: 6,
  },
  searchBarContainer: {
    zIndex: 6,
  },
  welcomeText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  greeting: {
    fontWeight: 'bold',
    fontSize: 24,
    color: '#222',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginRight: 8,
  },
  logoContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  logo: {
    width: 50,
    height: 50,
  },
  searchBar: {
    marginHorizontal: 5,
    marginBottom: 8,
    zIndex: 1,
  },
  sectionContainer: {
    marginBottom: 6,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

export default HomeScreen;
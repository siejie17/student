import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Animated,
  SafeAreaView,
  Image
} from 'react-native'
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { useNavigation } from '@react-navigation/native'

// Components
import HeroBanner from '../components/HeroBanner'
import EventStatusCarousel from '../components/EventStatusCarousel'
import LatestEvents from '../components/LatestEvents'
import MerchLeaderboardCards from '../components/MerchLeaderboardCards'
import SearchBar from '../components/SearchBar'
import MemoizedFlatList from '../components/MemoizedFlatList'
import { getItem, setItem } from '../utils/asyncStorage'
import { collection, deleteDoc, getDocs, orderBy, query, Timestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../utils/firebaseConfig'

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

  useEffect(() => {
    const checkLeaderboardRefresh = async () => {
      const studentID = await getItem("studentID");
      const facultyID = await getItem("facultyID");
      if (!studentID || !facultyID) return; // Fixed condition
  
      try {
        const leaderboardRef = collection(db, "leaderboard");
        const leaderboardQuery = query(leaderboardRef, where("facultyID", "==", facultyID));
        const leaderboardSnap = await getDocs(leaderboardQuery);
  
        if (!leaderboardSnap.empty) {
          const leaderboardDoc = leaderboardSnap.docs[0];
          const leaderboardDocRef = leaderboardDoc.ref;
          const { refreshDateTime } = leaderboardDoc.data();
          const currentTime = Timestamp.now(); // Use actual timestamp
  
          if (refreshDateTime && refreshDateTime.toMillis() <= currentTime.toMillis()) {
            const leaderboardEntriesRef = collection(leaderboardDocRef, "leaderboardEntries");
            const leaderboardEntriesQuery = query(leaderboardEntriesRef, orderBy("points", "desc"));
  
            const leaderboardEntriesSnapshot = await getDocs(leaderboardEntriesQuery);
            let rankings = leaderboardEntriesSnapshot.docs.map((doc, index) => ({
              studentID: doc.data().studentID,
              rank: index + 1,
            }));
  
            // Assign rewards based on ranking
            for (const stud of rankings) {
              let diamonds = 0;
  
              if (stud.rank === 1) diamonds = 1000;
              else if (stud.rank === 2) diamonds = 750;
              else if (stud.rank === 3) diamonds = 500;
              else if (stud.rank === 4) diamonds = 400;
              else if (stud.rank === 5) diamonds = 350;
              else if (stud.rank === 6) diamonds = 300;
              else if (stud.rank === 7) diamonds = 250;
              else if (stud.rank === 8) diamonds = 200;
              else if (stud.rank === 9) diamonds = 150;
              else if (stud.rank === 10) diamonds = 100;
              else if (stud.rank >= 11 && stud.rank <= 20) diamonds = 50;
              else if (stud.rank >= 21 && stud.rank <= 30) diamonds = 25;
              else if (stud.rank >= 31 && stud.rank <= 40) diamonds = 10;
              else if (stud.rank >= 41 && stud.rank <= 50) diamonds = 5;
              else diamonds = 1;
  
              await setItem(`showLeaderboardModal_${stud.studentID}`, true);
              await setItem(`previousRanking_${stud.studentID}`, String(stud.rank));
              await setItem(`diamonds_${stud.studentID}`, diamonds);
            }
  
            // Delete old leaderboard entries
            const deletePromises = leaderboardEntriesSnapshot.docs.map(entryDoc => deleteDoc(entryDoc.ref));
            await Promise.all(deletePromises);
  
            // Set new refresh date
            let currentRefreshDateTime = refreshDateTime.toDate();
            currentRefreshDateTime.setMonth(currentRefreshDateTime.getMonth() + 1);
            let newRefreshDateTime = Timestamp.fromDate(currentRefreshDateTime);
  
            await updateDoc(leaderboardDocRef, { refreshDateTime: newRefreshDateTime }); // Fixed incorrect query reference
          }
        }
      } catch (error) {
        console.error("Error checking leaderboard refresh:", error);
      }
    };
  
    checkLeaderboardRefresh();
  }, []);  

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
          return <MerchLeaderboardCards setIsLoading={setIsLoading} setFirstName={setFirstName} />
        case 'ou-events':
          return <EventStatusCarousel setIsLoading={setIsLoading} />
        case 'la-events':
          return <LatestEvents setIsLoading={setIsLoading} />
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
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

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
      <SearchBar
        onSearch={setSearchQuery}
        placeholder="Search events..."
        style={styles.searchBar}
        onFocus={() => navigation.navigate("Events")}
        icon="search"
      />

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
    height: 100,
    backgroundColor: '#f8f9fa',
    zIndex: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 20,
    marginBottom: 10,
    zIndex: 1,
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
    marginHorizontal: 16,
    marginBottom: 8,
    zIndex: 1,
  },
  sectionContainer: {
    marginBottom: 8,
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
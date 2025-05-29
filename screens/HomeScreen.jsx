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
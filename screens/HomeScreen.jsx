import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, ImageBackground } from 'react-native'
import React, { useState } from 'react'
import HeroBanner from '../components/HeroBanner';
import EventStatusCarousel from '../components/EventStatusCarousel';
import LatestEvents from '../components/LatestEvents';
import MerchLeaderboardCards from '../components/MerchLeaderboardCards';
import SearchBar from '../components/SearchBar';
import { useNavigation } from '@react-navigation/native';

const HomeScreen = () => {
  const [firstName, setFirstName] = useState("");
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigation = useNavigation();

  const sections = [
    { type: 'banner', id: 'banner-section' },
    { type: 'ml-cards', id: 'merch-leaderboard-cards-section' },
    { type: 'ou-events', id: 'upcoming-ongoing-events-section', title: 'Ongoing or Upcoming Events' },
    { type: 'la-events', id: 'lastest-added-events-section', title: 'Latest Added Events' },
  ];

  const renderContent = ({ item }) => {
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
        return null;
    };
  };

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={require('../assets/background_dot.png')}
        imageStyle={{ resizeMode: 'repeat' }}
        style={styles.background}
      >
      {isLoading && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="blue" />
        </View>
      )}
      <View style={{ marginVertical: 10, marginHorizontal: 20 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 24 }}>Hello {firstName}!</Text>
      </View>
      <SearchBar 
        onSearch={setSearchQuery}
        placeholder="Search events by name..."
        style={styles.searchBar}
        onFocus={() => navigation.navigate("Events")}
      />
      <FlatList
        data={sections}
        renderItem={renderContent}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
      />
      </ImageBackground>
    </View>
  )
}

const styles = StyleSheet.create({
  searchBar: {
    marginHorizontal: 10,
    marginBottom: 5,
  },
  background: {
    flex: 1,
    width: '100%',
  },
});

export default HomeScreen;
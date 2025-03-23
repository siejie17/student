import { View, Text, Image, Dimensions, Animated, StyleSheet } from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CONTAINER_PADDING = 20;
const SLIDE_WIDTH = width - (CONTAINER_PADDING * 2);

const HeroBanner = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const isAnimating = useRef(false);

  const emojis = ['💫', '✨', '🔍', '🏅'];

  const loadingMessages = [
    "Loading experience...",
    "Updating events...",
    "Calculating points...",
    "Refreshing achievements..."
  ];

  const bannerData = [
    {
      id: '1',
      title: 'Hello, UniEXP',
      subtitle: 'Discover events, earn rewards & build your network',
      image: require('../assets/logo.png'),
      color: ['#6495ED', '#ADD8E6'],
    },
    {
      id: '2',
      title: 'Level Up Campus Life',
      subtitle: 'Complete quests, unlock rewards & explore',
      image: require('../assets/banner2.png'),
      color: ['#6495ED', '#ADD8E6'],
    },
    {
      id: '3',
      title: 'Join. Play. Win.',
      subtitle: 'Climb leaderboards & earn recognition',
      image: require('../assets/banner3.png'),
      color: ['#6495ED', '#ADD8E6'],
    },
    {
      id: '4',
      title: 'Your Achievements',
      subtitle: 'Track progress and collect badges as you go',
      image: require('../assets/banner4.png'),
      color: ['#6495ED', '#ADD8E6'],
    },
  ];

  const changeSlide = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    // Fade out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      // Update index while opacity is 0
      setCurrentIndex((prevIndex) =>
        prevIndex < bannerData.length - 1 ? prevIndex + 1 : 0
      );

      // Fade in after index update
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        isAnimating.current = false;
      });
    });
  };

  useEffect(() => {
    const autoChange = setInterval(() => {
      if (!isAnimating.current) {
        changeSlide();
      }
    }, 4000);
    return () => clearInterval(autoChange);
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={bannerData[currentIndex].color}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View style={[styles.slide, { opacity: fadeAnim }]}>
          <View style={styles.textContainer}>
            <View style={styles.titleContainer}>
              <Text style={styles.emoji}>{emojis[currentIndex]}</Text>
              <Text style={styles.title}>{bannerData[currentIndex].title}</Text>
            </View>
            <Text style={styles.subtitle}>{bannerData[currentIndex].subtitle}</Text>
            <Text style={styles.loadingText}>{loadingMessages[currentIndex]}</Text>
          </View>
          <View style={styles.imageContainer}>
            <Image
              source={bannerData[currentIndex].image}
              style={styles.image}
              resizeMode="contain"
            />
          </View>
        </Animated.View>
      </LinearGradient>

      <View style={styles.dotContainer}>
        {bannerData.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              currentIndex === index && styles.activeDot,
            ]}
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    height: 200,
    position: 'relative',
    marginTop: 12,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 30,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  gradient: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: CONTAINER_PADDING,
  },
  slide: {
    width: SLIDE_WIDTH,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  textContainer: {
    flex: 0.5,
    // paddingRight: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 24,
    marginRight: 8,
  },
  imageContainer: {
    flex: 0.5,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  image: {
    width: 160,
    height: 160,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 12,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  loadingText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
  },
  dotContainer: {
    flexDirection: 'row',
    top: 40,
    alignSelf: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#fff',
    width: 12,
  },
});

export default HeroBanner;
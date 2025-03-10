import { View, Text, Image, Dimensions, Animated, StyleSheet } from 'react-native';
import React, { useEffect, useRef, useState } from 'react';

const { width } = Dimensions.get('window');
const CONTAINER_PADDING = 20;
const SLIDE_WIDTH = width - (CONTAINER_PADDING * 2);

const HeroBanner = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const isAnimating = useRef(false);

    const bannerData = [
        {
            id: '1',
            title: 'Introducing: UniEXP',
            subtitle: 'The Revolutionary Way to Discover UNIMAS Events, Earns Rewards, and Build Your Campus Network!',
            image: require('../assets/logo.png'),
        },
        {
            id: '2',
            title: 'Level Up Your Campus Experience',
            subtitle: 'Earn points, complete event quests, and unlock exclusive rewards—make every event an adventure!',
            image: require('../assets/banner2.png'),
        },
        {
            id: '3',
            title: 'Join. Play. Win.',
            subtitle: 'Attend events, climb the leaderboard, and score exciting prizes while making the most of your university journey!',
            image: require('../assets/banner3.png'),
        },
        {
            id: '4',
            title: 'Your Events, Your Achievements',
            subtitle: 'Stay engaged, earn badges, and be recognized for your participation in university events like never before!',
            image: require('../assets/banner4.png'),
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
        <Animated.View style={[styles.slide, { opacity: fadeAnim }]}>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{bannerData[currentIndex].title}</Text>
            <Text style={styles.subtitle}>{bannerData[currentIndex].subtitle}</Text>
          </View>
          <View style={styles.imageContainer}>
            <Image
              source={bannerData[currentIndex].image}
              style={styles.image}
              resizeMode="contain"
            />
          </View>
        </Animated.View>
        
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
      paddingHorizontal: CONTAINER_PADDING,
      marginTop: 12,
      backgroundColor: '#f7f7f7',
      borderRadius: 8,
      marginHorizontal: 20,
      marginBottom: 30,
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
      flex: 0.45,
    },
    imageContainer: {
      flex: 0.55,
      justifyContent: 'center',
      alignItems: 'center',
    },
    image: {
      width: '100%',
      height: 160,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 8,
      color: '#333',
    },
    subtitle: {
      fontSize: 14,
      color: '#666',
    },
    dotContainer: {
      flexDirection: 'row',
      // position: 'absolute',
      top: 10,
      alignSelf: 'center',
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#ddd',
      marginHorizontal: 4,
    },
    activeDot: {
      backgroundColor: '#555',
      width: 12,
    },
});

export default HeroBanner;
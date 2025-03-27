import React from 'react'
import { Text, StyleSheet, ActivityIndicator, Animated } from 'react-native'
import { useState, useEffect } from 'react'

const LoadingIndicator = () => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true
    }).start();

    // Animated dots effect
    const dotInterval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4);
    }, 500);

    return () => clearInterval(dotInterval);
  }, []);

  // Generate dots for loading effect
  const renderDots = () => {
    return Array.from({ length: dotCount }, (_, index) => (
      <Text key={index} style={styles.dot}>.</Text>
    ));
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ActivityIndicator size="large" color="#6284bf" />
      <Text style={styles.loadingText}>
        Hang tight! Your UniEXP adventure is just starting{renderDots()}
      </Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 20,
    textAlign: 'center',
    color: '#2c3e50',
    fontSize: 16,
    fontWeight: '600',
  },
  dot: {
    color: '#3498db',
    fontSize: 20,
  }
})

export default LoadingIndicator;
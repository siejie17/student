import { Text, StyleSheet, ActivityIndicator, Animated, Image, View } from 'react-native';
import { useState, useEffect, useRef } from 'react';

const LoadingIndicator = () => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const breathingAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true
    }).start();

    // Breathing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathingAnim, {
          toValue: 0.8,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(breathingAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [{ scale: breathingAnim }],
            opacity: breathingAnim
          }
        ]}
      >
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
      <Text style={styles.loadingText}>
        Hang tight! Your UniEXP adventure is just starting
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
  logoContainer: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  loadingText: {
    marginTop: 20,
    textAlign: 'center',
    color: '#2c3e50',
    fontSize: 16,
    fontWeight: '600',
  }
})

export default LoadingIndicator;
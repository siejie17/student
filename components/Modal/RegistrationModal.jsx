import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  StyleSheet, 
  Dimensions,
  Animated,
  Easing,
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const RegistrationModal = ({ 
  eventName, 
  isVisible, 
  onClose,
  displayDuration = 2000 // Longer duration for better feedback
}) => {
  // Animation references
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const checkmarkOpacity = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
  if (isVisible) {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: displayDuration,
      useNativeDriver: false
    }).start();
  }
}, [isVisible, displayDuration]);

  useEffect(() => {
    let timer;
    
    if (isVisible) {
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      checkmarkScale.setValue(0);
      checkmarkOpacity.setValue(0);
      
      // Trigger haptic feedback for success
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Animate modal appearance
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5))
        })
      ]).start();
      
      // Animate checkmark with slight delay
      setTimeout(() => {
        Animated.sequence([
          Animated.parallel([
            Animated.timing(checkmarkOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true
            }),
            Animated.timing(checkmarkScale, {
              toValue: 1.2,
              duration: 300,
              useNativeDriver: true,
              easing: Easing.out(Easing.back(2))
            })
          ]),
          Animated.timing(checkmarkScale, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease)
          })
        ]).start();
      }, 150);
      
      // Close automatically after displayDuration
      timer = setTimeout(() => {
        closeWithAnimation();
      }, displayDuration);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isVisible, onClose, displayDuration]);

  // Function to close with animation
  const closeWithAnimation = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic)
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 250,
        useNativeDriver: true
      })
    ]).start(() => {
      onClose();
    });
  };

  return (
    <Modal
      animationType="none" // We'll handle animations ourselves
      transparent={true}
      visible={isVisible}
      onRequestClose={closeWithAnimation}
      statusBarTranslucent
    >
      <Animated.View 
        style={[
          styles.centeredView, 
          { opacity: fadeAnim }
        ]}
        accessible={true}
        accessibilityLabel="Registration successful modal"
        accessibilityRole="alert"
      >
        <Animated.View 
          style={[
            styles.modalView, 
            { 
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim 
            }
          ]}
        >
          <Animated.View style={{
            transform: [{ scale: checkmarkScale }],
            opacity: checkmarkOpacity
          }}>
            <View style={styles.iconBackground}>
              <MaterialCommunityIcons
                name="check-circle"
                color="#4CAF50" 
                size={80} 
                style={styles.icon}
                accessibilityLabel="Check mark icon"
              />
            </View>
          </Animated.View>
          
          <Text style={styles.titleText}>Registration Successful!</Text>
          
          <Text style={styles.eventNameText}>
            You're registered for{'\n'}
            <Text style={styles.eventNameBold}>{eventName}</Text>
          </Text>
          
          <View style={styles.animatedBar}>
            <Animated.View 
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  })
                }
              ]} 
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20
  },
  modalView: {
    width: width > 500 ? 400 : width * 0.85,
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10
  },
  iconBackground: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  icon: {
    shadowColor: 'rgba(76, 175, 80, 0.5)',
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: 0.5,
    shadowRadius: 8
  },
  titleText: {
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    letterSpacing: 0.5
  },
  eventNameText: {
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 24,
    color: '#333',
    marginBottom: 24
  },
  eventNameBold: {
    fontWeight: '600'
  },
  animatedBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50'
  }
});

export default RegistrationModal;
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const ClashScheduleModal = ({
  isVisible,
  onConfirm,
  onCancel,
}) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const warningBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      // Reset animations
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      scaleAnim.setValue(0.9);
      warningBounce.setValue(0);

      // Start animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
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

      // Animate warning icon with bounce effect
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(warningBounce, {
            toValue: 1.2,
            duration: 200,
            useNativeDriver: true,
            easing: Easing.out(Easing.quad)
          }),
          Animated.timing(warningBounce, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.quad)
          })
        ]).start();
      }, 150);
    }
  }, [isVisible]);

  // Function to close with animation
  const handleClose = (callback) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 250,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 20,
        duration: 250,
        useNativeDriver: true
      })
    ]).start(() => {
      if (callback) callback();
    });
  };

  const handleConfirm = () => {
    handleClose(onConfirm);
  };

  const handleCancel = () => {
    handleClose(onCancel);
  };

  return (
    <Modal
      animationType="none" // We'll handle animations ourselves
      transparent={true}
      visible={isVisible}
      onRequestClose={handleCancel}
      statusBarTranslucent={true}
      accessibilityViewIsModal={true}
      accessibilityLabel="Schedule Conflict Alert"
    >
      <Animated.View
        style={[
          styles.modalOverlay,
          { opacity: fadeAnim }
        ]}
      >
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ]
            }
          ]}
        >
          <Animated.View style={[
            styles.warningIconContainer,
            {
              transform: [{ scale: warningBounce }]
            }
          ]}>
            <Ionicons
              name="alert-circle"
              size={80}
              color="#f39c12"
              style={styles.warningIcon}
            />
          </Animated.View>

          <Text style={styles.modalTitle}>Schedule Conflict</Text>

          <Text style={styles.modalMessage}>
            You have events that conflict with this time slot.
          </Text>

          <Text style={styles.questionText}>
            Would you still like to register for this event?
          </Text>

          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={handleConfirm}
              activeOpacity={0.8}
              accessibilityLabel="Register anyway"
              accessibilityRole="button"
            >
              <Text style={styles.confirmButtonText}>Register Anyway</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={handleCancel}
              activeOpacity={0.8}
              accessibilityLabel="Cancel registration"
              accessibilityRole="button"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20
  },
  modalContainer: {
    width: width > 500 ? 400 : '90%',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  warningIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  warningIcon: {
    shadowColor: 'rgba(243, 156, 18, 0.3)',
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: 0.4,
    shadowRadius: 6
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
    textAlign: 'center'
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    color: '#555',
    lineHeight: 22
  },
  clashingEventsContainer: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16
  },
  clashingEventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4
  },
  clashingEventText: {
    marginLeft: 8,
    color: '#444',
    fontSize: 14
  },
  questionText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333'
  },
  modalButtonContainer: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  modalButton: {
    paddingVertical: 14,
    borderRadius: 10,
    marginVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    backgroundColor: '#28a745',
  },
  cancelButton: {
    backgroundColor: '#f1f1f1',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16
  },
  cancelButtonText: {
    color: '#444',
    fontWeight: '600',
    fontSize: 16
  }
});

export default ClashScheduleModal;
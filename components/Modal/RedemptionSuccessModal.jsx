import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  Animated, 
  Dimensions, 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const RedemptionSuccessModal = ({ 
  visible, 
  onClose, 
  merchandise, 
  quantity, 
  selectedSize, 
  totalDiamonds 
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const navigation = useNavigation();

  useEffect(() => {
    if (visible) {
      // Run animations when modal becomes visible
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      // Reset animations when modal is hidden
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible, fadeAnim, scaleAnim]);

  if (!visible || !merchandise) return null;

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          {/* Success icon */}
          <View style={styles.successIconContainer}>
            <View style={styles.successIconInner}>
              <MaterialIcons name="check" size={36} color="#fff" />
            </View>
          </View>

          {/* Success message */}
          <Text style={styles.successTitle}>Redemption Successful!</Text>
          <Text style={styles.successMessage}>
            You have successfully redeemed {merchandise.name}
          </Text>

          {/* Merchandise details card */}
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <MaterialIcons name="diamond" size={22} color="#5B7FFF" />
              </View>
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Diamonds Used</Text>
                <Text style={styles.detailValue}>{totalDiamonds}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <MaterialIcons name="format-list-numbered" size={22} color="#5B7FFF" />
              </View>
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Quantity</Text>
                <Text style={styles.detailValue}>{quantity}</Text>
              </View>
            </View>

            {merchandise.category === "Clothing" && selectedSize && (
              <View style={styles.detailRow}>
                <View style={styles.detailIconContainer}>
                  <MaterialIcons name="straighten" size={22} color="#5B7FFF" />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Size</Text>
                  <Text style={styles.detailValue}>{selectedSize}</Text>
                </View>
              </View>
            )}

            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <MaterialIcons name="location-pin" size={22} color="#5B7FFF" />
              </View>
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Collection Point</Text>
                <Text style={styles.detailValue}>{merchandise.collectionLocationName}</Text>
              </View>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={() => {
                onClose();
                navigation.goBack();
              }}
            >
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: width * 0.9,
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 30,
    paddingHorizontal: 24,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(91, 127, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIconInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#5B7FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 15,
    color: '#777',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  detailsCard: {
    width: '100%',
    backgroundColor: '#f8f9ff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(91, 127, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: '#777',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 10,
  },
  viewOrderButton: {
    backgroundColor: '#5B7FFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#5B7FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  viewOrderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#f5f5f7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default RedemptionSuccessModal;
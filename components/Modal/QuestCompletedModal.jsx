import { useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  Dimensions 
} from 'react-native';

import { Trophy } from 'lucide-react-native';

const QuestCompletedModal = ({ 
  isVisible, 
  onClose, 
  questName, 
  autoDismissTime = 2000 
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, autoDismissTime);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose, autoDismissTime]);

  if (!isVisible) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Trophy 
            color="#FFD700" 
            size={64} 
            style={styles.trophyIcon} 
          />
          
          <Text style={styles.titleText}>
            Quest Completed
          </Text>
          
          <Text style={styles.questNameText}>
            {questName}
          </Text>
          
          <Text style={styles.subtitleText}>
            Faster to claim the rewards, you definitely earned it
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContainer: {
    width: Dimensions.get('window').width * 0.85,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  trophyIcon: {
    marginBottom: 15
  },
  titleText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center'
  },
  questNameText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 15,
    textAlign: 'center'
  },
  subtitleText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24
  }
});

export default QuestCompletedModal;
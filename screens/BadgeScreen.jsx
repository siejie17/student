import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet,
  Dimensions, 
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Badge image mapping
const BADGE_MAPPING = {
  academic: require("../assets/badges/academic.png"),
  attendance: require("../assets/badges/attendance.png"),
  entertainment: require("../assets/badges/entertainment.png"),
  feedback: require("../assets/badges/feedback.png"),
  health_wellness: require("../assets/badges/health_wellness.png"),
  networking: require("../assets/badges/networking.png"),
  quiz: require("../assets/badges/quiz.png"),
  sports: require("../assets/badges/sports.png"),
  volunteering: require("../assets/badges/volunteering.png"),
}

const BadgeScreen = ({ route }) => {
  // Extract badge data from route params
  const { badge } = route.params;
  const navigation = useNavigation();

  const handleClose = () => {
    navigation.goBack();
  };
  
  // Calculate progress percentage for the progress bar
  const progressPercentage = Math.min(
    (badge.progress / badge.unlockProgress) * 100, 
    100
  );

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Badge Image */}
        <View style={styles.badgeImageContainer}>
          <Image 
            source={BADGE_MAPPING[badge.badgeType]} 
            style={[
              styles.badgeImage,
              !badge.isUnlocked && styles.lockedBadgeImage,
            ]}
            resizeMode="contain"
          />
        </View>
        
        {/* Badge Status Pill */}
        <View style={[
          styles.statusPill,
          badge.isUnlocked ? styles.unlockedPill : styles.lockedPill
        ]}>
          <Text style={[
            styles.statusText,
            badge.isUnlocked ? styles.unlockedText : styles.lockedText
          ]}>
            {badge.isUnlocked ? 'Unlocked' : 'Locked'}
          </Text>
        </View>
        
        {/* Badge Name */}
        <Text style={styles.badgeName}>{badge.badgeName}</Text>
        
        {/* Badge Description */}
        <Text style={styles.description}>{badge.description}</Text>
        
        {/* Progress Section */}
        <View style={styles.progressSection}>
          <View style={styles.progressTextContainer}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressText}>
              {badge.progress} / {badge.unlockProgress}
            </Text>
          </View>
          
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar, 
                { width: `${progressPercentage}%` }
              ]} 
            />
          </View>
        </View>
      </View>

      <View style={styles.closeButtonContainer}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={handleClose}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={18} color="black" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: "center"
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: "center"
  },
  badgeImageContainer: {
    width: width * 0.5,
    height: width * 0.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  badgeImage: {
    width: '100%',
    height: '100%',
  },
  lockedBadgeImage: {
    opacity: 0.5,
    tintColor: '#888',
  },
  statusPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  unlockedPill: {
    backgroundColor: 'rgba(76, 217, 100, 0.15)',
    borderWidth: 1,
    borderColor: '#4CD964',
  },
  lockedPill: {
    backgroundColor: 'rgba(142, 142, 147, 0.15)',
    borderWidth: 1,
    borderColor: '#8E8E93',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  unlockedText: {
    color: '#2E7D32',
  },
  lockedText: {
    color: '#616161',
  },
  badgeName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    color: '#212121',
  },
  description: {
    fontSize: 16,
    color: '#616161',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  progressSection: {
    width: '100%',
    marginTop: 8,
  },
  progressTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  progressText: {
    fontSize: 16,
    color: '#616161',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CD964',
    borderRadius: 6,
  },
  closeButtonContainer: {
    alignItems: 'center',
    paddingBottom: 32,
    position: "absolute",
    top: "88%",
    left: "43%"
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#616161',
  }
});

export default BadgeScreen;
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../utils/firebaseConfig';
import { getItem } from '../../utils/asyncStorage';

const EventQuestCard = ({
  questNumber,
  title,
  isCompleted,
  rewardsClaimed,
  diamondsRewards,
  questType,
  maxEarlyBird,
  eventID,
  pointsRewards,
  onPress
}) => {
  const [isFailed, setIsFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchEarlyBirdStatus = async () => {
      try {
        setIsLoading(true);
        const studentID = await getItem("studentID");

        const currentEarlyBirdiesRef = collection(db, "registration");
        const currentEarlyBirdiesQuery = query(currentEarlyBirdiesRef, where("eventID", "==", eventID), where("isAttended", "==", true), orderBy("attendanceScannedTime", "asc"), limit(maxEarlyBird));

        const unsubscribeEarlyBirdies = onSnapshot(currentEarlyBirdiesQuery, (earlyBirdiesSnap) => {
          setIsLoading(true);
          setIsFailed(false);
          const earlyBirdiesData = earlyBirdiesSnap.docs.map(doc => doc.data());
          const currentStudentExists = earlyBirdiesData.some(item => item.studentID === studentID);
          if (!currentStudentExists && earlyBirdiesSnap.size >= maxEarlyBird) {
            setIsFailed(true);
          }
          setIsLoading(false);
        });

        setIsLoading(false);

        return unsubscribeEarlyBirdies;
      } catch (error) {
        console.error("Error when updating failed status", error)
      }
    }

    if (questType === "earlyBird") {
      fetchEarlyBirdStatus();
    }
  }, []);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Status Indicator */}
      <View
        style={[
          styles.statusIndicator,
          { backgroundColor: isCompleted ? '#E8F5E9' : '#FFF8F8' }
        ]}
      >
        <View
          style={[
            styles.statusDot,
            { backgroundColor: !isLoading && (questType === "earlyBird" ? (isFailed ? '#FF6B6B' : (isCompleted ? '#4CAF50' : '#5E96CE')) : (isCompleted ? '#4CAF50' : '#5E96CE')) }
          ]}
        />
        {/* {console.log(isFailed, ";")} */}
      </View>

      {/* Content Area */}
      <View style={styles.contentArea}>
        {/* Header with Quest Number and Title */}
        <View style={styles.header}>
          <Text style={styles.questNumber}>
            {questNumber}
          </Text>
          <Text
            style={styles.title}
            numberOfLines={2}
          >
            {title}
          </Text>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: isCompleted ? '100%' : '0%' },
                  { backgroundColor: isCompleted ? '#4CAF50' : '#5B7FDE' }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {!isLoading && (questType === "earlyBird" ? (isFailed ? 'Failed' : (isCompleted ? (isCompleted && rewardsClaimed) ? 'Rewards Claimed' : 'Completed, Come to Claim Your Rewards' : 'In progress')) : (isCompleted ? (isCompleted && rewardsClaimed) ? 'Rewards Claimed' : 'Completed, Come to Claim Your Rewards' : 'In progress'))}
            </Text>
          </View>

          {/* Rewards */}
          <View style={styles.rewards}>
            <View style={styles.rewardItem}>
              <Image source={require("../../assets/icons/diamond.png")} style={styles.iconImage} />
              <Text style={styles.rewardValue}>{diamondsRewards}</Text>
            </View>
            <View style={styles.rewardItem}>
              <Image source={require("../../assets/icons/point.png")} style={styles.iconImage} />
              <Text style={styles.rewardValue}>{pointsRewards}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Area */}
      <View style={styles.actionArea}>
        <View
          style={[
            styles.actionButton,
            { backgroundColor: (questType === "earlyBird" ? (isFailed ? '#FF6B6B' : (isCompleted ? '#4CAF50' : '#5E96CE')) : (isCompleted ? '#4CAF50' : '#5E96CE')) }
          ]}
        >
          <MaterialCommunityIcons
            name={isCompleted ? "check" : "chevron-right"}
            size={20}
            color="#FFFFFF"
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    overflow: 'hidden',
  },

  // Status indicator on the left
  statusIndicator: {
    width: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  statusDot: {
    width: 4,
    height: 24,
    borderRadius: 2,
  },

  // Content area
  contentArea: {
    flex: 1,
    padding: 16,
  },

  // Header section
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  questNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9E9E9E',
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    letterSpacing: 0.2,
    lineHeight: 22,
  },

  // Main content with progress and rewards
  mainContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Progress section
  progressContainer: {
    flex: 1,
    marginRight: 16,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#F0F0F0',
    borderRadius: 2,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '500',
  },

  // Rewards section
  rewards: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconImage: {
    height: 16,
    width: 16,
  },
  rewardValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
  },

  // Action area on the right
  actionArea: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default EventQuestCard;
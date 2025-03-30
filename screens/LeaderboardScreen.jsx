import { View, Text, StyleSheet, ScrollView, Image, Dimensions, ActivityIndicator, FlatList, RefreshControl, Animated, Modal, Pressable, StatusBar, TouchableOpacity } from 'react-native'
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { MaterialIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getItem, removeItem } from '../utils/asyncStorage';
import { collection, doc, getDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebaseConfig';
import RankingRewardsModal from '../components/Leaderboard/RankingRewardsModal';

const { width } = Dimensions.get('window');

const FACULTY_MAPPING = {
  1: "Faculty of Applied & Creative Arts",
  2: "Faculty of Built Environment",
  3: "Faculty of Cognitive Sciences & Human Development",
  4: "Faculty of Computer Science & Information Technology",
  5: "Faculty of Economics & Business",
  6: "Faculty of Education, Language & Communication",
  7: "Faculty of Engineering",
  8: "Faculty of Medicine & Health Sciences",
  9: "Faculty of Resource Science & Technology",
  10: "Faculty of Social Sciences & Humanities",
};

const LeaderboardScreen = () => {
  const [leaderboardData, setLeaderboardData] = useState({
    top3: [],
    remainingUsers: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserRank, setCurrentUserRank] = useState(null);
  const [refreshDate, setRefreshDate] = useState(new Date());
  const [facultyName, setFacultyName] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  // const [rewardsModalVisible, setRewardsModalVisible] = useState(true);
  const [rewardsModalVisible, setRewardsModalVisible] = useState(false);
  // const [previousMonthRanking, setPreviousMonthRanking] = useState(2);
  const [previousMonthRanking, setPreviousMonthRanking] = useState(null);
  // const [diamondsRewards, setDiamondsRewards] = useState(750);
  const [diamondsRewards, setDiamondsRewards] = useState(0);

  // Used to store unsubscribe functions
  const unsubscribeRef = useRef({
    main: null,
    entries: null
  });

  // Create animation values
  const modalAnimation = useMemo(() => new Animated.Value(0), []);
  const headerScaleAnim = useMemo(() => new Animated.Value(1), []);

  // Animation references
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const fetchRankings = useCallback(async () => {
    try {
      // Clean up any existing subscriptions first
      if (unsubscribeRef.current.main) {
        unsubscribeRef.current.main();
      }
      if (unsubscribeRef.current.entries) {
        unsubscribeRef.current.entries();
      }

      const facultyID = await getItem("facultyID");
      const currentStudentID = await getItem("studentID");
      setFacultyName(FACULTY_MAPPING[facultyID] || "");

      const leaderboardRef = collection(db, "leaderboard");
      const leaderboardQuery = query(leaderboardRef, where("facultyID", "==", facultyID));

      // Subscribe to leaderboard updates
      unsubscribeRef.current.main = onSnapshot(leaderboardQuery, async (leaderboardSnap) => {
        if (leaderboardSnap.empty) {
          setLeaderboardData({ top3: [], remainingUsers: [] });
          setIsLoading(false);
          return;
        }

        const leaderboardDoc = leaderboardSnap.docs[0]; // Assuming one doc per faculty
        const leaderboardId = leaderboardDoc.id;

        setRefreshDate(leaderboardDoc.data().refreshDateTime);

        const leaderboardEntriesRef = collection(db, "leaderboard", leaderboardId, "leaderboardEntries");

        // Subscribe to leaderboard entries
        unsubscribeRef.current.entries = onSnapshot(leaderboardEntriesRef, async (leaderboardEntriesSnap) => {
          const entries = leaderboardEntriesSnap.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            // Sort by points (desc) then by lastUpdated (asc)
            .sort((a, b) => {
              if (b.points !== a.points) return b.points - a.points;
              return a.lastUpdated - b.lastUpdated;
            });

          // Fetch user details in parallel
          const entriesWithUserInfo = await Promise.all(
            entries.map(async (entry, index) => {
              const userRef = doc(db, "user", entry.studentID);
              const userSnap = await getDoc(userRef);

              const userData = userSnap.exists()
                ? userSnap.data()
                : { firstName: "Unknown", profilePicture: "" };

              const rankData = {
                ...entry,
                firstName: userData.firstName,
                profilePic: userData.profilePicture,
                rank: index + 1
              };

              if (rankData.studentID === currentStudentID) {
                setCurrentUserRank(index + 1);
              }

              return rankData;
            })
          );

          // Split into top 3 and remaining users
          setLeaderboardData({
            top3: entriesWithUserInfo.slice(0, 3),
            remainingUsers: entriesWithUserInfo.slice(3)
          });

          const showRewardsModalKey = `showLeaderboardModal_${currentStudentID}`;
          const rewardsModalShown = await getItem(showRewardsModalKey);

          try {
            if (rewardsModalShown) {
              const [previousRank, diamondsRewards] = await Promise.all([
                getItem(`previousRanking_${currentStudentID}`),
                getItem(`diamonds_${currentStudentID}`)
              ]);

              setPreviousMonthRanking(previousRank || "N/A");
              setDiamondsRewards(diamondsRewards);

              await removeItem(showRewardsModalKey);
              setRewardsModalVisible(true);
            }
          } catch (error) {
            console.error("Error retrieving rewards modal data:", error);
          }

          setIsLoading(false);
        });
      });
    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial data fetch
    fetchRankings();

    // Cleanup function for unmounting
    return () => {
      if (unsubscribeRef.current.main) {
        unsubscribeRef.current.main();
      }
      if (unsubscribeRef.current.entries) {
        unsubscribeRef.current.entries();
      }
    };
  }, [fetchRankings]);

  // Animate on mount
  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, []);

  // Handle ranking changes
  useEffect(() => {
    // Pulse animation when rank changes
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.2,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  }, [currentUserRank]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Animated.sequence([
      Animated.timing(headerScaleAnim, {
        toValue: 0.97,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(headerScaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();

    await fetchRankings();
    setRefreshing(false);
  }, [fetchRankings, headerScaleAnim]);

  const handleOpenModal = useCallback(() => {
    setModalVisible(true);
    Animated.timing(modalAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [modalAnimation]);

  const handleCloseModal = useCallback(() => {
    Animated.timing(modalAnimation, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setModalVisible(false));
  }, [modalAnimation]);

  const renderRemainingRankings = useCallback(({ item, index }) => {
    const userRank = index + 4;
    const isCurrentUser = userRank === currentUserRank;

    return (
      <Animated.View
        style={[
          styles.card,
          isCurrentUser && styles.highlightedCard
        ]}
      >
        <View style={styles.rankContainer}>
          <Text style={[styles.rankText, isCurrentUser && styles.highlightedRankText]}>#{userRank}</Text>
        </View>

        <Image
          source={item.profilePic
            ? { uri: `data:image/png;base64,${item.profilePic}` }
            : require('../assets/leaderboard/unknown-profile.png')}
          style={[styles.listAvatar, isCurrentUser && styles.highlightedAvatar]}
        />

        <View style={styles.listUserInfo}>
          <Text style={[styles.listUserName, isCurrentUser && styles.highlightedText]}>{item.firstName}</Text>
        </View>

        <View style={styles.listPointsContainer}>
          <Text style={[styles.listPointsText, isCurrentUser && styles.highlightedPoints]}>
            {item.points}
            <Text style={styles.listPointsLabel}> pts</Text>
          </Text>
        </View>
      </Animated.View>
    );
  }, [currentUserRank]);

  // Memoize podium component
  const PodiumComponent = useMemo(() => {
    const { top3 } = leaderboardData;
    const firstPlace = top3[0] || null;
    const secondPlace = top3[1] || null;
    const thirdPlace = top3[2] || null;

    return (
      <Animated.View
        style={[
          styles.podiumSection,
          { transform: [{ scale: headerScaleAnim }] }
        ]}
      >
        <View style={styles.infoIconContainer}>
          <Pressable
            onPress={handleOpenModal}
            style={({ pressed }) => [
              styles.infoButton,
              { opacity: pressed ? 0.7 : 1 }
            ]}
          >
            <MaterialIcons name="info-outline" size={24} color="#46699e" />
          </Pressable>
        </View>

        <View style={styles.podiumContainer}>
          {/* Second Place */}
          <View style={[styles.podiumPosition, styles.secondPosition]}>
            <View style={styles.avatarContainer}>
              <Image
                source={secondPlace?.profilePic
                  ? { uri: `data:image/png;base64,${secondPlace.profilePic}` }
                  : require('../assets/leaderboard/unknown-profile.png')}
                style={[styles.podiumAvatar, styles.secondAvatar]}
              />
              <View style={styles.medalContainer}>
                <Image
                  source={require('../assets/leaderboard/second-place.png')}
                  style={styles.image}
                />
              </View>
            </View>
            <Text style={styles.podiumName} numberOfLines={1}>{secondPlace?.firstName || "—"}</Text>
            <Text style={[styles.podiumPoints, styles.secondPoints]}>
              {secondPlace?.points ? `${secondPlace.points} pts` : "—"}
            </Text>
          </View>

          {/* First Place */}
          <View style={[styles.podiumPosition, styles.firstPosition]}>
            <View style={styles.crownContainer}>
              <FontAwesome5 name="crown" size={20} color="#FFD700" />
            </View>
            <View style={styles.avatarContainer}>
              <Image
                source={firstPlace?.profilePic
                  ? { uri: `data:image/png;base64,${firstPlace.profilePic}` }
                  : require('../assets/leaderboard/unknown-profile.png')}
                style={[styles.podiumAvatar, styles.firstAvatar]}
              />
              <View style={[styles.medalContainer, styles.goldMedal]}>
                <Image
                  source={require('../assets/leaderboard/first-place.png')}
                  style={styles.image}
                />
              </View>
            </View>
            <Text style={[styles.podiumName, styles.firstName]} numberOfLines={1}>
              {firstPlace?.firstName || "—"}
            </Text>
            <Text style={[styles.podiumPoints, styles.firstPoints]}>
              {firstPlace?.points ? `${firstPlace.points} pts` : "—"}
            </Text>
          </View>

          {/* Third Place */}
          <View style={[styles.podiumPosition, styles.thirdPosition]}>
            <View style={styles.avatarContainer}>
              <Image
                source={thirdPlace?.profilePic
                  ? { uri: `data:image/png;base64,${thirdPlace.profilePic}` }
                  : require('../assets/leaderboard/unknown-profile.png')}
                style={[styles.podiumAvatar, styles.thirdAvatar]}
              />
              <View style={[styles.medalContainer, styles.bronzeMedal]}>
                <Image
                  source={require('../assets/leaderboard/third-place.png')}
                  style={styles.image}
                />
              </View>
            </View>
            <Text style={styles.podiumName} numberOfLines={1}>{thirdPlace?.firstName || "—"}</Text>
            <Text style={[styles.podiumPoints, styles.thirdPoints]}>
              {thirdPlace?.points ? `${thirdPlace.points} pts` : "—"}
            </Text>
          </View>
        </View>

        <View style={styles.podiumPlatform}>
          <View style={styles.podiumColumn}>
            <LinearGradient
              colors={['#C0C0C0', '#E8E8E8']}
              style={[styles.platform, styles.secondPlatform]}
            />
          </View>
          <View style={styles.podiumColumn}>
            <LinearGradient
              colors={['#FFD700', '#FFF7DE']}
              style={[styles.platform, styles.firstPlatform]}
            />
          </View>
          <View style={styles.podiumColumn}>
            <LinearGradient
              colors={['#CD7F32', '#E8C9B9']}
              style={[styles.platform, styles.thirdPlatform]}
            />
          </View>
        </View>
      </Animated.View>
    );
  }, [leaderboardData.top3, handleOpenModal, headerScaleAnim]);

  // Extract modal component
  const InfoModal = useMemo(() => (
    <Modal
      transparent={true}
      visible={modalVisible}
      onRequestClose={handleCloseModal}
      animationType="none"
    >
      <Animated.View
        style={[
          styles.modalOverlay,
          {
            opacity: modalAnimation,
          }
        ]}
      >
        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [
                {
                  translateY: modalAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0],
                  })
                }
              ]
            }
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Leaderboard Info</Text>
            <Pressable
              onPress={handleCloseModal}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <MaterialIcons name="close" size={24} color="#333" />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Monthly Refresh Banner */}
            <View style={styles.refreshBanner}>
              <MaterialIcons name="refresh" size={20} color="#fff" />
              <Text style={styles.refreshText}>Leaderboard refreshes monthly</Text>
              <FontAwesome5 name="trophy" size={24} color="#FFD700" />
            </View>
            <Text style={styles.motivationText}>Go, go, go! Grab points to climb to the top spots!</Text>

            {/* Points Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <MaterialIcons name="stars" size={20} color="#3b82f6" />
                <Text style={styles.sectionTitle}>How to Earn Points!</Text>
              </View>

              <View style={styles.pointsList}>
                {[
                  { icon: "event-available", label: "Attendance-based", desc: "Check in to events on time" },
                  { icon: "alarm-on", label: "Early bird", desc: "Be among the earliest attendees" },
                  { icon: "people", label: "Networking", desc: "Connect with other attendees" },
                  { icon: "question-answer", label: "Q&A based", desc: "Answer the questions correctly" },
                  { icon: "rate-review", label: "Feedback driven", desc: "Complete event surveys" },
                ].map((item, index) => (
                  <View key={index} style={styles.pointItem}>
                    <MaterialIcons name={item.icon} size={20} color="#3b82f6" />
                    <Text style={styles.pointText}>
                      <Text style={styles.boldText}>{item.label}:</Text> {item.desc}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Rewards Table */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <MaterialIcons name="diamond" size={20} color="#3b82f6" />
                <Text style={styles.sectionTitle}>Diamond Rewards</Text>
              </View>

              {/* Top 3 Rewards */}
              {/* Podium Display */}
              <View style={styles.podiumContainer}>
                <View style={styles.podiumItem}>
                  <View style={[styles.podiumPillar, styles.secondPlace]}>
                    <View style={styles.trophyContainer}>
                      <FontAwesome5 name="trophy" size={20} color="#C0C0C0" />
                    </View>
                    <Text style={styles.podiumRank}>2</Text>
                    <Text style={styles.podiumReward}>750 💎</Text>
                  </View>
                </View>

                <View style={styles.podiumItem}>
                  <View style={[styles.podiumPillar, styles.firstPlace]}>
                    <View style={styles.trophyContainer}>
                      <FontAwesome5 name="trophy" size={24} color="#FFD700" />
                    </View>
                    <Text style={styles.podiumRank}>1</Text>
                    <Text style={styles.podiumReward}>1000 💎</Text>
                  </View>
                </View>

                <View style={styles.podiumItem}>
                  <View style={[styles.podiumPillar, styles.thirdPlace]}>
                    <View style={styles.trophyContainer}>
                      <FontAwesome5 name="trophy" size={18} color="#CD7F32" />
                    </View>
                    <Text style={styles.podiumRank}>3</Text>
                    <Text style={styles.podiumReward}>500 💎</Text>
                  </View>
                </View>
              </View>

              {/* Other Rewards */}
              <View style={styles.ranksContainer}>
                {[
                  ["4th", "400 💎"], ["5th", "350 💎"],
                  ["6th", "300 💎"], ["7th", "250 💎"],
                  ["8th", "200 💎"], ["9th", "150 💎"],
                  ["10th", "100 💎"], ["11th-20th", "50 💎"],
                  ["21st-30th", "25 💎"], ["31st-40th", "10 💎"],
                  ["41st-50th", "5 💎"], ["51st+", "1 💎"]
                ].map((reward, index) => (
                  <View key={index} style={styles.rankRow}>
                    <Text style={styles.rankText}>{reward[0]}</Text>
                    <Text style={styles.rewardText}>{reward[1]}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  ), [modalVisible, handleCloseModal, modalAnimation]);

  const FloatingRankIndicator = useCallback(() => {
    if (!currentUserRank) return null;

    // Determine badge color based on rank
    let badgeText = "Ranked";
    let badgeColors = ['#6284bf', '#4A6EB5'];

    if (currentUserRank <= 3) {
      badgeText = "Top 3";
      badgeColors = ['#FFD700', '#FFA500']; // Gold gradient
    } else if (currentUserRank <= 10) {
      badgeText = "Top 10";
      badgeColors = ['#C0C0C0', '#A9A9A9']; // Silver gradient
    } else if (currentUserRank <= 20) {
      badgeText = "Top 20";
      badgeColors = ['#CD7F32', '#8B4513']; // Bronze gradient
    }

    return (
      <Animated.View
        style={[
          styles.floatingRankContainer,
          {
            transform: [
              { translateY: slideAnim },
              { scale: pulseAnim }
            ],
            opacity: opacityAnim
          }
        ]}
      >
        <LinearGradient
          colors={badgeColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.floatingRankGradient}
        >
          <View style={styles.floatingRankContent}>
            <MaterialIcons name="leaderboard" size={20} color="white" style={styles.icon} />
            <Text style={styles.floatingRankText}>Your Rank</Text>
            <View style={styles.rankNumberContainer}>
              <Text style={styles.floatingRankNumber}>#{currentUserRank}</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  }, [currentUserRank]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1d4ed8" />
        <Text style={styles.loadingText}>Loading leaderboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={styles.cardContainer}>
          <LinearGradient
            colors={['#6284bf', '#3a5ca8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cardGradient}
          >
            <View style={styles.headerSection}>
              <Text style={styles.facultyName}>{facultyName}</Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.infoSection}>
              <Feather name="refresh-cw" size={14} color="#ffffff" style={styles.icon} />
              <Text style={styles.resetText}>Next Reset: {refreshDate.toDate().toLocaleDateString()}</Text>
            </View>
          </LinearGradient>
        </View>
      </View>

      {/* Podium section */}
      {PodiumComponent}

      {/* FlatList with pull-to-refresh */}
      <View style={styles.listWrapper}>
        <LinearGradient
          colors={['rgba(98, 132, 191, 0.08)', 'rgba(255, 255, 255, 0)']}
          style={styles.listGradient}
        >
          <FlatList
            data={leaderboardData.remainingUsers}
            renderItem={renderRemainingRankings}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#3b82f6"
                colors={["#3b82f6"]}
              />
            }
            ListHeaderComponent={() => (
              <View style={styles.listHeader}>
                <Text style={styles.listHeaderTitle}>Rankings</Text>
                <Text style={styles.listHeaderSubtitle}>
                  Swipe down to refresh
                </Text>
              </View>
            )}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="leaderboard" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No other participants yet</Text>
              </View>
            )}
          />
        </LinearGradient>
      </View>

      <FloatingRankIndicator />
      {InfoModal}

      <RankingRewardsModal
        rewardsModalVisible={rewardsModalVisible}
        setRewardsModalVisible={setRewardsModalVisible}
        previousMonthRanking={previousMonthRanking}
        diamondsRewards={diamondsRewards}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingTop: 10,
    paddingBottom: 15,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C3E50',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  cardContainer: {
    width: '90%',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    marginVertical: 8,
  },
  cardGradient: {
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  headerSection: {
    // marginBottom: 8,
  },
  facultyName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginVertical: 8,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  podiumSection: {
    paddingTop: 20,
    paddingBottom: 10,
  },
  infoIconContainer: {
    position: 'absolute',
    top: 10,
    right: 20,
    zIndex: 10,
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(101, 153, 230, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
  },
  podiumPosition: {
    alignItems: 'center',
    width: width * 0.25,
  },
  firstPosition: {
    zIndex: 3,
  },
  secondPosition: {
    marginRight: 10,
    zIndex: 2,
  },
  thirdPosition: {
    marginLeft: 10,
    zIndex: 1,
  },
  crownContainer: {
    position: 'absolute',
    top: -18,
    zIndex: 10,
  },
  avatarContainer: {
    position: 'relative',
  },
  medalContainer: {
    position: 'absolute',
    bottom: 0,
    right: -5,
    backgroundColor: '#C0C0C0',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  goldMedal: {
    backgroundColor: '#FFD700',
  },
  bronzeMedal: {
    backgroundColor: '#CD7F32',
  },
  image: {
    width: width * 0.035,
    height: width * 0.035,
    borderRadius: width * 0.06,
  },
  podiumAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#fff',
  },
  firstAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderColor: '#FFD700',
    borderWidth: 4,
  },
  secondAvatar: {
    width: 65,
    height: 65,
    borderRadius: 35,
    borderColor: '#C0C0C0',
  },
  thirdAvatar: {
    borderColor: '#CD7F32',
  },
  podiumName: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#404040',
    maxWidth: width * 0.25,
    textAlign: 'center',
  },
  firstName: {
    fontSize: 16,
    fontWeight: '700',
  },
  podiumPoints: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginTop: 2,
  },
  firstPoints: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
  },
  secondPoints: {
    fontWeight: '600',
    color: '#666',
  },
  thirdPoints: {
    fontWeight: '500',
    color: '#CD7F32',
  },
  podiumPlatform: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginTop: 16,
    paddingBottom: 10,
  },
  podiumColumn: {
    alignItems: 'center',
  },
  platform: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  firstPlatform: {
    height: 35,
    width: width * 0.3,
    zIndex: 3,
  },
  secondPlatform: {
    height: 28,
    width: width * 0.25,
    marginRight: -5,
    zIndex: 2,
  },
  thirdPlatform: {
    height: 22,
    width: width * 0.25,
    marginLeft: -5,
    zIndex: 1,
  },
  listWrapper: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    marginTop: 10,
  },
  listGradient: {
    flex: 1,
    paddingTop: 5,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 70, // Space for floating rank indicator
  },
  listHeader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  listHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e3a8a',
    marginBottom: 4,
  },
  listHeaderSubtitle: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  highlightedCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  rankContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 18,
    marginRight: 8,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  highlightedRankText: {
    color: '#3b82f6',
  },
  listAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  highlightedAvatar: {
    borderColor: '#3b82f6',
  },
  listUserInfo: {
    flex: 1,
  },
  listUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  highlightedText: {
    color: '#1e3a8a',
  },
  listPointsContainer: {
    paddingLeft: 8,
  },
  listPointsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
  highlightedPoints: {
    color: '#3b82f6',
  },
  listPointsLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: '#64748b',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  floatingRankContainer: {
    position: 'absolute',
    bottom: 15,
    alignSelf: 'center',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 5,
  },
  floatingRankGradient: {
    borderRadius: 24,
  },
  floatingRankContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  icon: {
    marginRight: 6,
  },
  floatingRankText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginRight: 8,
  },
  rankNumberContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  floatingRankNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: 'white',
  },
  tooltipContainer: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  tooltipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxHeight: '70%',
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  modalBody: {
    padding: 16,
    marginBottom: 10,
  },
  refreshBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  refreshText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginHorizontal: 8,
  },
  motivationText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
    color: '#3b82f6',
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e3a8a',
    marginLeft: 8,
  },
  pointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pointText: {
    fontSize: 14,
    color: '#1e3a8a',
    marginLeft: 10,
    flex: 1,
  },
  boldText: {
    fontWeight: '700',
  },
  podiumItem: {
    alignItems: 'center',
    width: '30%',
  },
  podiumPillar: {
    alignItems: 'center',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingTop: 5,
    position: 'relative',
    width: '90%',
  },
  firstPlace: {
    backgroundColor: '#FFD700',
    height: 120,
  },
  secondPlace: {
    backgroundColor: '#C0C0C0',
    height: 100,
  },
  thirdPlace: {
    backgroundColor: '#CD7F32',
    height: 80,
  },
  trophyContainer: {
    position: 'absolute',
    top: -15,
    alignSelf: 'center',
    backgroundColor: 'white',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  podiumRank: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 18,
  },
  podiumReward: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 8,
  },
  ranksContainer: {
    marginTop: 8,
  },
  rankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#415881',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    color: "#3b82f6",
    backgroundColor: "white"
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#364c87',
    fontWeight: '500',
  },
});

export default LeaderboardScreen;
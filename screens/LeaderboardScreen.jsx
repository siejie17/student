import { View, Text, StyleSheet, ScrollView, ImageBackground, Image, Dimensions, ActivityIndicator, FlatList, RefreshControl, Animated, Modal, Pressable } from 'react-native'
import React, { useEffect, useState, useCallback } from 'react';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import LinearGradient from 'react-native-linear-gradient';

import { getItem } from '../utils/asyncStorage';
import { collection, doc, getDoc, getDocs, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { db } from '../utils/firebaseConfig';
import FloatingRankComponent from '../components/FloatingRankComponent';

const { width } = Dimensions.get('window');

const facultyMapping = {
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
  const [leaderboardTop3, setLeaderboardTop3] = useState([]);
  const [leaderboardRemainingUsers, setLeaderboardRemainingUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserRank, setCurrentUserRank] = useState(null);
  const [facultyName, setFacultyName] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const slideAnimation = new Animated.Value(-200);

  const fetchRankings = async () => {
    const facultyID = await getItem("facultyID");
    const currentStudentID = await getItem("studentID");

    try {
      setFacultyName(facultyMapping[facultyID] || "");

      const leaderboardRef = collection(db, "leaderboard");
      const leaderboardQuery = query(leaderboardRef, where("facultyID", "==", facultyID))
      const leaderboardSnap = await getDocs(leaderboardQuery);

      if (!leaderboardSnap.empty) {
        const leaderboardDoc = leaderboardSnap.docs[0];
        const leaderboardId = leaderboardDoc.id;

        const leaderboardEntriesRef = collection(db, "leaderboard", leaderboardId, "leaderboardEntries");
        const leaderboardEntriesQuery = query(leaderboardEntriesRef, orderBy("points", "desc"), orderBy("lastUpdated", "asc"));
        const leaderboardEntriesSnap = await getDocs(leaderboardEntriesQuery);

        const leaderboardEntries = leaderboardEntriesSnap.docs.map((leaderboardEntry) => ({
          id: leaderboardEntry.id,
          studentID: leaderboardEntry.data().studentID,
          lastUpdated: leaderboardEntry.data().lastUpdated,
          points: leaderboardEntry.data().points,
        }));

        const leaderboardEntriesWithInfo = await Promise.all(
          leaderboardEntries.map(async (entry, index) => {
            const userRef = doc(db, "user", entry.studentID);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
              const userData = userSnap.data();
              const rankData = {
                id: entry.id,
                studentID: entry.studentID,
                lastUpdated: entry.lastUpdated,
                points: entry.points,
                firstName: userData.firstName,
                profilePic: userData.profilePicture,
                rank: index + 1
              }

              if (rankData.studentID == currentStudentID) {
                setCurrentUserRank(index + 1);
              }

              return rankData;
            } else {
              console.warn(`User not found: ${entry.studentID}`);
              return { ...entry, firstName: "Unknown", lastName: "", profilePicture: "" };
            }
          })
        );

        setLeaderboardTop3(leaderboardEntriesWithInfo.slice(0, 3));
        setLeaderboardRemainingUsers(leaderboardEntriesWithInfo.slice(3));
      } else {
        console.log("No leaderboard data.");
      }
    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchRankings();
      setIsLoading(false);
    };

    loadData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRankings();
    setRefreshing(false);
  }, []);

  const renderRemainingRankings = ({ item, index }) => {
    const userRank = index + 4;

    return (
      <View style={styles.card}>
        <View style={styles.rankContainer}>
          <Text style={styles.rankText}>#{userRank}</Text>
        </View>

        <Image
          source={{ uri: `data:image/png;base64,${item.profilePic}` }}
          style={styles.listAvatar}
        />

        <View style={styles.listUserInfo}>
          <Text style={styles.listUserName}>{item.firstName}</Text>
        </View>

        <View style={styles.listPointsContainer}>
          <Text style={styles.listPointsText}>{item.points}</Text>
          <Text style={styles.listPointsLabel}>pts</Text>
        </View>
      </View>
    )
  };

  const ListHeaderComponent = () => (
    <View style={styles.listHeaderContainer}>
      <View style={styles.refreshPromptContainer}>
        <MaterialIcons name="arrow-downward" size={16} color="#7f8c8d" />
        <Text style={styles.refreshPromptText}>Swipe down here to get the latest rankings</Text>
      </View>
    </View>
  );

  const animateModal = (visible) => {
    Animated.spring(slideAnimation, {
      toValue: visible ? 0 : -150,
      useNativeDriver: true,
    }).start();
  };

  return (
    <ImageBackground
      source={require('../assets/background_dot.png')}
      imageStyle={{ resizeMode: 'repeat' }}
      style={styles.background}
    >
      {isLoading ? (
        <ActivityIndicator size="large" />
      ) : (
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.headerTitleSection}>
              <Text style={styles.headerTitle}>Leaderboard</Text>
            </View>
            <View style={styles.facultySection}>
              <Text style={styles.facultyText}>{facultyName}</Text>
            </View>
          </View>

          {/* Podium section - outside of the FlatList */}
          <View style={styles.podiumSection}>
            <View style={styles.infoIconContainer}>
              <Pressable
                onPress={() => {
                  setModalVisible(true);
                  animateModal(true);
                }}
                style={({ pressed }) => [
                  styles.infoButton,
                  { opacity: pressed ? 0.7 : 1 }
                ]}
              >
                <MaterialIcons name="info-outline" size={24} color="#415881" />
              </Pressable>
            </View>

            <View style={styles.podiumContainer}>
              <View style={[styles.podiumPosition, styles.secondPosition]}>
                <Image source={leaderboardTop3[1] ? { uri: `data:image/png;base64,${leaderboardTop3[1].profilePic}` } : require('../assets/unknown-profile.png')} style={[styles.podiumAvatar, styles.secondAvatar]} />
                <Text style={styles.podiumName} numberOfLines={1}>{leaderboardTop3[1]?.firstName || "No entry yet"}</Text>
                <Text style={[styles.podiumPoints, styles.secondPoints]}>{leaderboardTop3[1]?.points || "-"}</Text>
              </View>

              <View style={[styles.podiumPosition, styles.firstPosition]}>
                <Image source={leaderboardTop3[0] ? { uri: `data:image/png;base64,${leaderboardTop3[0].profilePic}` } : require('../assets/unknown-profile.png')} style={[styles.podiumAvatar, styles.firstAvatar]} />
                <Text style={[styles.podiumName, styles.firstName]} numberOfLines={1}>{leaderboardTop3[0]?.firstName || "No entry yet"}</Text>
                <Text style={[styles.podiumPoints, styles.firstPoints]}>{leaderboardTop3[0]?.points || "-"}</Text>
              </View>

              <View style={[styles.podiumPosition, styles.thirdPosition]}>
                <Image source={leaderboardTop3[2] ? { uri: `data:image/png;base64,${leaderboardTop3[2].profilePic}` } : require('../assets/unknown-profile.png')} style={[styles.podiumAvatar, styles.thirdAvatar]} />
                <Text style={styles.podiumName} numberOfLines={1}>{leaderboardTop3[2]?.firstName || "No entry yet"}</Text>
                <Text style={[styles.podiumPoints, styles.thirdPoints]}>{leaderboardTop3[2]?.points || "-"}</Text>
              </View>

              <Modal
                transparent={true}
                visible={modalVisible}
                onShow={() => animateModal(true)}
                onRequestClose={() => {
                  animateModal(false);
                  setTimeout(() => setModalVisible(false), 300);
                }}
              >
                <View style={styles.modalOverlay}>
                  <Animated.View
                    style={[
                      styles.modalContent,
                      { transform: [{ translateY: slideAnimation }] }
                    ]}
                  >
                    <View
                      style={styles.modalHeader}
                    >
                      <Text style={styles.modalTitle}>Leaderboard Guidelines</Text>
                      <Pressable
                        onPress={() => {
                          animateModal(false);
                          setTimeout(() => setModalVisible(false), 300);
                        }}
                        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                      >
                        <MaterialIcons name="close" size={24} color="#000" />
                      </Pressable>
                    </View>

                    <ScrollView style={styles.modalBody}>
                      {/* Monthly Refresh Banner */}
                      <View style={styles.refreshBanner}>
                        <MaterialIcons name="refresh" size={24} color="#fff" />
                        <Text style={styles.refreshText}>Leaderboard refreshes monthly</Text>
                        <FontAwesome5 name="trophy" size={24} color="#FFD700" />
                      </View>
                      <Text style={styles.motivationText}>Go, go, go! Grab points to climb to the top spots!</Text>

                      {/* How to Earn Points */}
                      <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                          <MaterialIcons name="stars" size={22} color="#415881" />
                          <Text style={styles.sectionTitle}>How to Earn Points</Text>
                        </View>
                        
                        <View style={styles.pointItem}>
                          <MaterialIcons name="event-available" size={20} color="#415881" />
                          <Text style={styles.pointText}>
                            <Text style={styles.boldText}>Attendance-based:</Text> Check in to events on time
                          </Text>
                        </View>
                        
                        <View style={styles.pointItem}>
                          <MaterialIcons name="alarm-on" size={20} color="#415881" />
                          <Text style={styles.pointText}>
                            <Text style={styles.boldText}>Early bird:</Text> Be among the first 10 attendees
                          </Text>
                        </View>
                        
                        <View style={styles.pointItem}>
                          <MaterialIcons name="people" size={20} color="#415881" />
                          <Text style={styles.pointText}>
                            <Text style={styles.boldText}>Networking:</Text> Connect with other attendees
                          </Text>
                        </View>
                        
                        <View style={styles.pointItem}>
                          <MaterialIcons name="question-answer" size={20} color="#415881" />
                          <Text style={styles.pointText}>
                            <Text style={styles.boldText}>Q&A based:</Text> Ask or answer questions during sessions
                          </Text>
                        </View>
                        
                        <View style={styles.pointItem}>
                          <MaterialIcons name="rate-review" size={20} color="#415881" />
                          <Text style={styles.pointText}>
                            <Text style={styles.boldText}>Feedback driven:</Text> Complete event surveys
                          </Text>
                        </View>
                      </View>

                      {/* Rewards Section */}
                      <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                          <MaterialIcons name="diamond" size={22} color="#415881" />
                          <Text style={styles.sectionTitle}>Diamond Rewards</Text>
                        </View>
                        
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

                        {/* Other Ranks */}
                        <View style={styles.ranksContainer}>
                          <View style={styles.rankRow}>
                            <Text style={styles.rankText}>Rank 4:</Text>
                            <Text style={styles.rewardText}>400 💎</Text>
                          </View>
                          <View style={styles.rankRow}>
                            <Text style={styles.rankText}>Rank 5:</Text>
                            <Text style={styles.rewardText}>350 💎</Text>
                          </View>
                          <View style={styles.rankRow}>
                            <Text style={styles.rankText}>Rank 6:</Text>
                            <Text style={styles.rewardText}>300 💎</Text>
                          </View>
                          <View style={styles.rankRow}>
                            <Text style={styles.rankText}>Rank 7:</Text>
                            <Text style={styles.rewardText}>250 💎</Text>
                          </View>
                          <View style={styles.rankRow}>
                            <Text style={styles.rankText}>Rank 8:</Text>
                            <Text style={styles.rewardText}>200 💎</Text>
                          </View>
                          <View style={styles.rankRow}>
                            <Text style={styles.rankText}>Rank 9:</Text>
                            <Text style={styles.rewardText}>150 💎</Text>
                          </View>
                          <View style={styles.rankRow}>
                            <Text style={styles.rankText}>Rank 10:</Text>
                            <Text style={styles.rewardText}>100 💎</Text>
                          </View>
                          <View style={styles.rankRow}>
                            <Text style={styles.rankText}>Rank 11-20:</Text>
                            <Text style={styles.rewardText}>50 💎</Text>
                          </View>
                          <View style={styles.rankRow}>
                            <Text style={styles.rankText}>Rank 21-30:</Text>
                            <Text style={styles.rewardText}>25 💎</Text>
                          </View>
                          <View style={styles.rankRow}>
                            <Text style={styles.rankText}>Rank 31-40:</Text>
                            <Text style={styles.rewardText}>10 💎</Text>
                          </View>
                          <View style={styles.rankRow}>
                            <Text style={styles.rankText}>Rank 41-50:</Text>
                            <Text style={styles.rewardText}>5 💎</Text>
                          </View>
                          <View style={styles.rankRow}>
                            <Text style={styles.rankText}>Rank 51 onwards:</Text>
                            <Text style={styles.rewardText}>1 💎</Text>
                          </View>
                        </View>
                      </View>
                    </ScrollView>
                  </Animated.View>
                </View>
              </Modal>
            </View>

            <View style={styles.podiumPlatform}>
              <View style={styles.podiumColumn}>
                <View style={[styles.platform, styles.secondPlatform]}>
                  <Image source={require('../assets/second-place.png')} style={[styles.image, styles.secondTrophy]} />
                </View>
              </View>
              <View style={styles.podiumColumn}>
                <View style={[styles.platform, styles.firstPlatform]}>
                  <Image source={require('../assets/first-place.png')} style={[styles.image, styles.firstTrophy]} />
                </View>
              </View>
              <View style={styles.podiumColumn}>
                <View style={[styles.platform, styles.thirdPlatform]}>
                  <Image source={require('../assets/third-place.png')} style={[styles.image, styles.thirdTrophy]} />
                </View>
              </View>
            </View>
          </View>

          {/* FlatList with pull-to-refresh */}
          <FlatList
            data={leaderboardRemainingUsers}
            renderItem={renderRemainingRankings}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#415881"
                colors={["#415881"]}
              />
            }
            ListHeaderComponent={ListHeaderComponent}
          />

          {currentUserRank && (
            <FloatingRankComponent
              userRank={currentUserRank}
            />
          )}
        </View>
      )}
    </ImageBackground>
  )
}

export default LeaderboardScreen;

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
  },
  headerContainer: {
    width: '100%',
  },
  headerTitleSection: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333333',
    letterSpacing: 0.5,
  },
  facultySection: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(65, 88, 129, 0.4)',
  },
  facultyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  podiumSection: {
    paddingTop: 24,
    paddingBottom: 18,
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
  podiumAvatar: {
    width: 60,
    height: 60,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  firstAvatar: {
    width: 75,
    height: 75,
    borderRadius: 35,
    borderColor: '#FFD700',
    borderWidth: 3,
  },
  secondAvatar: {
    width: 65,
    height: 65,
    borderRadius: 35,
    borderColor: '#C0C0C0',
    borderWidth: 3,
  },
  thirdAvatar: {
    borderRadius: 35,
    borderColor: '#CD7F32',
    borderWidth: 3,
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
  },
  podiumPoints: {
    fontSize: 12,
    color: '#808080',
    marginTop: 2,
  },
  firstPoints: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CFAE00',
  },
  secondPoints: {
    fontSize: 14,
    fontWeight: '550',
    color: '#ACACAC',
  },
  thirdPoints: {
    fontWeight: '500',
    color: '#CD7F32',
  },
  podiumPlatform: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginVertical: 16,
    paddingBottom: 10,
  },
  platform: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    alignItems: 'center', // Center image horizontally
    justifyContent: 'flex-end', // Push image upwards
  },
  firstPlatform: {
    height: 35,
    width: width * 0.3,
    backgroundColor: '#F7D002',
    zIndex: 3,
  },
  secondPlatform: {
    height: 30,
    width: width * 0.25,
    backgroundColor: '#C0C0C0',
    marginRight: -5,
    zIndex: 2,
  },
  thirdPlatform: {
    height: 25,
    width: width * 0.25,
    backgroundColor: '#CD7F32',
    marginLeft: -5,
    zIndex: 1,
  },
  image: {
    position: 'absolute',
    width: width * 0.05,
    height: width * 0.05,
    borderRadius: width * 0.06, // Circular image
  },
  firstTrophy: {
    left: "42%",
    top: "20%",
  },
  secondTrophy: {
    left: "37%",
    top: "15%",
  },
  thirdTrophy: {
    right: "37%",
    top: "10%",
  },
  podiumLastUpdatedSection: {
    marginTop: 5,
  },
  podiumLastUpdated: {
    fontSize: 10,
    color: '#AAAAAA',
    textAlign: "center",
    marginTop: 2,
  },
  lastUpdated: {
    fontSize: 10,
    color: '#bdc3c7',
    textAlign: "center",
    marginTop: 2,
  },
  listContainer: {
    paddingBottom: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: "#FAFAFA"
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  rankContainer: {
    width: 30,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  listAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  listUserInfo: {
    flex: 1,
  },
  listUserName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
  },
  listPointsContainer: {
    alignItems: 'flex-end',
  },
  listPointsText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgb(65, 88, 129)',
  },
  listPointsLabel: {
    fontSize: 12,
    color: '#95a5a6',
  },
  lastUpdatedLabel: {
    fontSize: 10,
    color: '#bdc3c7',
    marginTop: 4,
  },
  listHeaderContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  refreshPromptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
  },
  refreshPromptText: {
    fontSize: 10,
    color: '#7f8c8d',
    marginLeft: 8,
    fontWeight: '500',
  },
  infoIconContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  infoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
    color: '#000',
  },
  modalBody: {
    padding: 16,
    marginBottom: 10,
  },
  refreshBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#415881',
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
    color: '#415881',
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
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
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#415881',
    marginLeft: 8,
  },
  pointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pointText: {
    fontSize: 14,
    color: '#34495e',
    marginLeft: 10,
    flex: 1,
  },
  boldText: {
    fontWeight: '700',
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginVertical: 16,
    height: 140,
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
    color: '#fff',
    marginTop: 18,
  },
  podiumReward: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
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
  rankText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#415881',
  },
  footer: {
    marginTop: 16,
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f0f4f8',
    borderRadius: 8,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#415881',
    fontStyle: 'italic',
  }
});
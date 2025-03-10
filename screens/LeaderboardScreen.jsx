import { View, Text, StyleSheet, ImageBackground, Image, Dimensions, ActivityIndicator } from 'react-native'
import React, { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';

import { getItem } from '../utils/asyncStorage';
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '../utils/firebaseConfig';

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

  useEffect(() => {
    const fetchFacultyUserRankings = async () => {
      const facultyID = await getItem("facultyID");

      try {
        setIsLoading(true);
        const leaderboardRef = collection(db, "leaderboard");
        const leaderboardQuery = query(leaderboardRef, where("facultyID", "==", facultyID))
        const leaderboardSnap = await getDocs(leaderboardQuery);

        if (!leaderboardSnap.empty) {
          const leaderboardDoc = leaderboardSnap.docs[0];
          const leaderboardId = leaderboardDoc.id;

          const leaderboardEntriesRef = collection(db, "leaderboard", leaderboardId, "leaderboardEntries");
          const leaderboardEntriesQuery = query(leaderboardEntriesRef, orderBy("points", "desc"));
          const leaderboardEntriesSnap = await getDocs(leaderboardEntriesQuery);

          const leaderboardEntries = leaderboardEntriesSnap.docs.map((leaderboardEntry) => ({
            id: leaderboardEntry.id,
            studentID: leaderboardEntry.data().studentID,
            lastUpdated: leaderboardEntry.data().lastUpdated,
            points: leaderboardEntry.data().points,
          }));

          const leaderboardEntriesWithInfo = await Promise.all(
            leaderboardEntries.map(async (entry) => {
              const userRef = doc(db, "user", entry.studentID);
              const userSnap = await getDoc(userRef);

              if (userSnap.exists()) {
                const userData = userSnap.data();
                return {
                  id: entry.id,
                  lastUpdated: entry.lastUpdated,
                  points: entry.points,
                  firstName: userData.firstName,
                  profilePic: userData.profilePicture,
                }
              } else {
                console.warn(`User not found: ${entry.userID}`);
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
      } finally {
        setIsLoading(false);
      }
    }

    fetchFacultyUserRankings();
  }, []);

  const fetchFacultyName = async () => {
    const facultyID = await getItem("facultyID");

    return facultyMapping[facultyID];
  }

  const renderMedal = (place) => {
    if (place === 1) return <MaterialIcons name="emoji-events" size={22} color="#FFD700" />;
    if (place === 2) return <MaterialIcons name="emoji-events" size={20} color="#C0C0C0" />;
    if (place === 3) return <MaterialIcons name="emoji-events" size={18} color="#CD7F32" />;
    return null;
  };

  return (
    <ImageBackground
      source={require('../assets/background_dot.png')}
      imageStyle={{ resizeMode: 'repeat' }}
      style={styles.background}
    >
      { isLoading ? (
        <ActivityIndicator size="large" />
      ) : (
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.headerTitleSection}>
              <Text style={styles.headerTitle}>Leaderboard</Text>
            </View>
            <View style={styles.facultySection}>
              <Text style={styles.facultyText}>{fetchFacultyName()}</Text>
            </View>
          </View>
      
          <View style={styles.podiumSection}>
            <View style={styles.podiumContainer}>
              <View style={[styles.podiumPosition, styles.secondPosition]}>
                <Image source={leaderboardTop3[1] ? { uri: `data:image/png;base64,${leaderboardTop3[1].profilePic}` } : require('../assets/unknown-profile.png')} style={[styles.podiumAvatar, styles.secondAvatar]} />
                <Text style={styles.podiumName} numberOfLines={1}>{leaderboardTop3[1].firstName}</Text>
                <Text style={[styles.podiumPoints, styles.secondPoints]}>{leaderboardTop3[1].points}</Text>
              </View>

              <View style={[styles.podiumPosition, styles.firstPosition]}>
                <Image source={leaderboardTop3[0] ? { uri: `data:image/png;base64,${leaderboardTop3[0].profilePic}` } : require('../assets/unknown-profile.png')} style={[styles.podiumAvatar, styles.firstAvatar]} />
                <Text style={[styles.podiumName, styles.firstName]} numberOfLines={1}>{leaderboardTop3[0].firstName}</Text>
                <Text style={[styles.podiumPoints, styles.firstPoints]}>{leaderboardTop3[0].points}</Text>
              </View>

              <View style={[styles.podiumPosition, styles.thirdPosition]}>
                <Image source={leaderboardTop3[2] ? { uri: `data:image/png;base64,${leaderboardTop3[2].profilePic}` } : require('../assets/unknown-profile.png')} style={[styles.podiumAvatar, styles.thirdAvatar]} />
                <Text style={styles.podiumName} numberOfLines={1}>{leaderboardTop3[2] ? leaderboardTop3[2].firstName : `No entry yet`}</Text>
                <Text style={[styles.podiumPoints, styles.thirdPoints]}>{leaderboardTop3[2] ? leaderboardTop3[2].points : `-`}</Text>
              </View>
            </View>

            <View style={styles.podiumPlatform}>
              <View style={[styles.platform, styles.secondPlatform]}>
                <Image source={require('../assets/second-place.png')} style={[styles.image, styles.secondTrophy]} />
              </View>
              <View style={[styles.platform, styles.firstPlatform]}>
                <Image source={require('../assets/first-place.png')} style={[styles.image, styles.firstTrophy]} />
              </View>
              <View style={[styles.platform, styles.thirdPlatform]}>
                <Image source={require('../assets/third-place.png')} style={[styles.image, styles.thirdTrophy]} />
              </View>
            </View>
          </View>  
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
    paddingBottom: 36,
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
    marginTop: 16,
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
  }
});
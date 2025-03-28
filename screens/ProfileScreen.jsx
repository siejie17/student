import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { getItem, removeItem } from '../utils/asyncStorage';
import { collection, doc, getDoc, getDocs, query, where, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../utils/firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { signOut } from 'firebase/auth';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as ImagePicker from 'expo-image-picker';

const FACULTY_MAPPING = {
  1: "FACA",
  2: "FBE",
  3: "FCSHD",
  4: "FCSIT",
  5: "FEB",
  6: "FELC",
  7: "FENG",
  8: "FMSH",
  9: "FRST",
  10: "FSSH",
}

const BADGE_MAPPING = {
  "academic": require("../assets/badges/academic.png"),
  "earlyBird": require("../assets/badges/earlyBird.png"),
  "entertainment": require("../assets/badges/entertainment.png"),
  "feedback": require("../assets/badges/feedback.png"),
  "health_wellness": require("../assets/badges/health_wellness.png"),
  "networking": require("../assets/badges/networking.png"),
  "q&a": require("../assets/badges/quiz.png"),
  "sports": require("../assets/badges/sports.png"),
  "volunteering": require("../assets/badges/volunteering.png"),
}

const DEFAULT_PROFILE_IMAGE = require('../assets/auth/defaultProfilePic.png'); // Make sure this asset exists

const ProfileScreen = () => {
  const [userData, setUserData] = useState(null);
  const [badgeProgressList, setBadgeProgressList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isProfilePicSheetVisible, setIsProfilePicSheetVisible] = useState(false);
  const snapPoints = useMemo(() => ['10%'], []);
  const bottomSheetRef = useRef(null);

  const navigation = useNavigation();

  useEffect(() => {
    let unsubscribe = () => {};

    const fetchUserInfo = async () => {
      try {
        setIsLoading(true);
        const studentID = await getItem("studentID");

        if (!studentID) {
          console.warn("No student ID found.");
          setIsLoading(false);
          return;
        }

        const userRef = doc(db, "user", studentID);

        // Firestore real-time listener
        unsubscribe = onSnapshot(userRef, async (userSnap) => {
          if (userSnap.exists()) {
            setUserData(userSnap.data());

            try {
              const badgeProgress = await fetchUserBadgeProgress();
              setBadgeProgressList(badgeProgress);
            } catch (error) {
              console.error("Error fetching badge progress:", error);
              setBadgeProgressList([]);
            }
          } else {
            console.warn("User not found.");
            setUserData(null);
            setBadgeProgressList([]);
          }
          setIsLoading(false);
        }, (error) => {
          console.error("Error listening to user data:", error);
          setIsLoading(false);
        });

        return unsubscribe; // Cleanup function
      } catch (error) {
        console.error("Error fetching user information:", error);
        setIsLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  // Then fetch badge progress info
  const fetchUserBadgeProgress = async () => {
    try {
      const studentID = await getItem("studentID");

      const badgeProgressQuery = query(
        collection(db, "badgeProgress"),
        where("studentID", "==", studentID)
      );

      const badgeProgressSnapshot = await getDocs(badgeProgressQuery);

      if (badgeProgressSnapshot.empty) {
        console.log("No badge progress found for this student.");
        return [];
      }

      const badgeProgressDoc = badgeProgressSnapshot.docs[0];
      const userBadgeProgressRef = collection(badgeProgressDoc.ref, "userBadgeProgress");

      const userBadgeProgressSnapshot = await getDocs(userBadgeProgressRef);
      if (userBadgeProgressSnapshot.empty) {
        console.log("No badge progress records found.");
        return [];
      }

      const badgeDocs = userBadgeProgressSnapshot.docs.map((doc) => ({
        badgeDocID: doc.id,
        ...doc.data(),
      }));

      const badgeDetailPromises = badgeDocs.map(async (badge) => {
        const badgeRef = doc(db, "badge", badge.badgeDocID);
        const badgeSnapshot = await getDoc(badgeRef);

        return badgeSnapshot.exists()
          ? {
            id: badge.badgeDocID,
            progress: badge.progress,
            isUnlocked: badge.isUnlocked,
            dateUpdated: badge.dateUpdated,
            ...badgeSnapshot.data(),
          }
          : null;
      });

      return (await Promise.all(badgeDetailPromises)).filter(Boolean);
    } catch (error) {
      console.error("Error fetching badge progress:", error);
      throw error;
    }
  };

  const handleSheetClose = (index) => {
    setIsProfilePicSheetVisible(index > 0);
  };

  const handleClosePress = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to upload images!');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.3, // Lower quality to help keep size down
      base64: true
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      if (result.assets[0].fileSize > 50 * 1024) {
        Alert.alert('Image size exceeds 50KB limit. Please choose a smaller image.');
        return;
      }

      const studentID = await getItem("studentID");
      if (!studentID) {
        console.warn("No student ID found.");
        return;
      }

      const studentRef = doc(db, "user", studentID);
      const studentSnap = await getDoc(studentRef);

      if (studentSnap.exists()) {
        await updateDoc(studentRef, {
          profilePicture: result.assets[0].base64,
        })
      }
    }

    handleClosePress();
  };

  const renderBadge = (badge) => {
    return (
      <TouchableOpacity
        key={badge.id}
        style={styles.badgeContainer}
        onPress={() => navigation.navigate('BadgeDetails', { badge: badge })}
      >
        <View style={[styles.badge, !badge.isUnlocked && styles.lockedBadge]}>
          <Image
            source={BADGE_MAPPING[badge.badgeType]}
            style={[
              styles.badgeImage,
              !badge.isUnlocked && styles.lockedBadgeImage,
            ]}
          />
        </View>
        <Text
          style={[
            styles.badgeName,
            !badge.isUnlocked && styles.lockedBadgeName
          ]}
          numberOfLines={2}
        >
          {badge.badgeName}
        </Text>
      </TouchableOpacity>
    )
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth); // Sign out user
      removeItem("studentID");
      removeItem("facultyID");
      Alert.alert("Success", "You have been logged out!");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const handleEditProfilePicture = () => {
    setIsProfilePicSheetVisible(true);
    bottomSheetRef.current?.expand();
  };

  if (isLoading) {
    return (
      <View style={styles.background}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A6FA5" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.background}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load profile data</Text>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={() => navigation.replace("Login")}
          >
            <Text style={styles.signOutText}>Return to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={styles.profileContainer}>
          <View style={styles.profileImageContainer}>
            <Image
              alt="Profile Picture"
              source={
                userData.profilePicture
                  ? { uri: `data:image/png;base64,${userData.profilePicture}` }
                  : DEFAULT_PROFILE_IMAGE
              }
              style={styles.profileImage}
            />
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={handleEditProfilePicture}
            >
              <Feather name="edit-2" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.userDetailsContainer}>
            <Text style={styles.profileName}>{`${userData.firstName || ''} ${userData.lastName || ''}`}</Text>
            <Text style={styles.profileHandle}>
              {userData.email || 'No email provided'}
            </Text>
            <View style={styles.academicInfo}>
              {userData.yearOfStudy && (
                <View style={styles.infoItem}>
                  <Ionicons name="book-outline" size={18} color="#121212" />
                  <Text style={styles.infoText}>Year {userData.yearOfStudy}</Text>
                </View>
              )}
              {userData.facultyID && FACULTY_MAPPING[userData.facultyID] && (
                <View style={styles.infoItem}>
                  <Ionicons name="school-outline" size={18} color="#121212" />
                  <Text style={styles.infoText}>{FACULTY_MAPPING[userData.facultyID]}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Feather name="award" size={18} color="#A9A9A9" />
            <Text style={styles.sectionTitle}>Your Badges</Text>
          </View>

          <View style={styles.achievementsFrame}>
            {badgeProgressList.length > 0 ? (
              <View style={styles.achievementsContainer}>
                {badgeProgressList.map(badge => renderBadge(badge))}
              </View>
            ) : (
              <Text style={styles.noBadgesText}>No badges earned yet</Text>
            )}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Feather name="list" size={18} color="#A9A9A9" />
            <Text style={styles.sectionTitle}>Others</Text>
          </View>

          <View style={styles.networkCardContainer}>
            <TouchableOpacity
              style={styles.networkCard}
              onPress={() => navigation.navigate("NetworkList")}
            >
              <View style={styles.networkIconContainer}>
                <Ionicons name="people-outline" size={24} color="#121212" />
              </View>

              <View style={styles.networkContentContainer}>
                <Text style={styles.networkTitle}>Networks</Text>
                <Text style={styles.networkSubtitle}>Review scanned networks throughout events</Text>
              </View>

              <View style={styles.chevronContainer}>
                <Feather name="chevron-right" size={20} color="#8DABC9" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSignOut}>
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomSheet
        ref={bottomSheetRef}
        index={isProfilePicSheetVisible ? 1 : -1}
        enablePanDownToClose
        snapPoints={snapPoints}
        onChange={handleSheetClose}
        handleIndicatorStyle={styles.handleIndicatorStyle}
        handleStyle={styles.handleStyle}
        style={styles.bottomSheetStyles}
        backgroundStyle={{ backgroundColor: '#F5F5F5', borderTopLeftRadius: 34, borderTopRightRadius: 34, borderWidth: 0.4 }}
        enableHandlePanningGesture
        enableOverDrag={false}
      >
        <BottomSheetView>
          <TouchableOpacity style={[styles.button, { marginHorizontal: 24 }]} onPress={pickImage}>
            <Text style={styles.buttonText}>Change Profile Picture</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>
    </GestureHandlerRootView>
  )
}

export default ProfileScreen;

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: "white"
  },
  header: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 14,
    height: 60,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  profileContainer: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(169, 169, 169, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 18,
    shadowColor: '#BFCFE7',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 75,
    height: 75,
    borderRadius: 9999,
    marginRight: 6,
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },
  editProfileButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6284bf',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userDetailsContainer: {
    flex: 1,
    marginLeft: 20,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  profileHandle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '400',
    color: '#7F8C9A',
  },
  academicInfo: {
    flexDirection: 'row',
    marginTop: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#36454f',
    marginLeft: 5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginLeft: 8,
  },
  achievementsFrame: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    shadowColor: '#BFCFE7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(169, 169, 169, 0.2)',
  },
  achievementsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  badgeContainer: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#EDF2F7',
    elevation: 2,
    shadowColor: '#BFCFE7',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  lockedBadge: {
    backgroundColor: '#F0F0F0',
  },
  lockedBadgeImage: {
    opacity: 0.5,
    tintColor: '#A9A9A9',
  },
  badgeImage: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  badgeTitle: {
    fontSize: 12,
    color: '#121212',
    textAlign: 'center',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EEF7',
  },
  optionText: {
    fontSize: 16,
    color: '#2C3E50',
    flex: 1,
  },
  networkCardContainer: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(169, 169, 169, 0.2)',
    overflow: 'hidden',
    shadowColor: '#BFCFE7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  networkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  networkIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  networkContentContainer: {
    flex: 1,
    marginLeft: 16,
  },
  networkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  networkSubtitle: {
    fontSize: 13,
    color: '#7F8C9A',
    marginTop: 4,
  },
  chevronContainer: {
    padding: 4,
  },
  button: {
    marginBottom: 24,
    backgroundColor: '#6284bf',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#BFCFE7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 16,
    color: '#36454F',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#C2432F',
    marginBottom: 20,
    textAlign: 'center',
  },
  noBadgesText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#8DABC9',
    padding: 20,
    paddingBottom: 24,
  },
  badgeName: {
    fontSize: 12,
    color: '#2C3E50',
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 80,
  },
  lockedBadgeName: {
    color: '#899499',
  },
  bottomSheetStyles: {
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    // backgroundColor: "rgba(74, 111, 165, 0.2)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicatorStyle: {
    width: 40,
    height: 4,
    backgroundColor: 'black',
    borderRadius: 2,
  },
  handleStyle: {
    paddingTop: 12,
    paddingBottom: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    // backgroundColor: "transparent"
  },
  backgroundStyle: {
    // backgroundColor: 'transparent',
  },
});
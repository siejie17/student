import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
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
  Modal
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { getItem, removeItem } from '../utils/asyncStorage';
import { collection, doc, getDoc, getDocs, query, where, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../utils/firebaseConfig';
import { theme } from '../core/theme';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
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
  const [attendedEventsLength, setAttendedEventsLength] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [isProfilePicSheetVisible, setIsProfilePicSheetVisible] = useState(false);
  const snapPoints = useMemo(() => ['10%'], []);
  const bottomSheetRef = useRef(null);

  const [isSignOutModalVisible, setIsSignOutModalVisible] = useState(false);

  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      // Screen is focused, do nothing
      return () => {
        // Screen is unfocused, close the bottom sheet
        bottomSheetRef.current?.close();
      };
    }, [])
  );

  useEffect(() => {
    let userUnsub = null;
    let registrationUnsub = null;
    let badgeUnsub = null;

    (async () => {
      try {
        setIsLoading(true);
        const studentID = await getItem("studentID");

        if (!studentID) {
          console.warn("No student ID found.");
          setIsLoading(false);
          return;
        }

        const userRef = doc(db, "user", studentID);

        userUnsub = onSnapshot(userRef, async (userSnap) => {
          if (userSnap.exists()) {
            setUserData(userSnap.data());

            try {
              if (badgeUnsub) badgeUnsub(); // clean previous listener
              badgeUnsub = await fetchUserBadgeProgress(studentID, setBadgeProgressList);
            } catch (error) {
              console.error("Error setting up badge progress listener:", error);
              setBadgeProgressList([]);
            }

            try {
              if (registrationUnsub) registrationUnsub();
              registrationUnsub = await fetchNumOfAttendedEvents(studentID);
            } catch (error) {
              console.error("Error fetching attended events:", error);
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

      } catch (error) {
        console.error("Error fetching user information:", error);
        setIsLoading(false);
      }
    })();

    return () => {
      if (userUnsub) userUnsub();
      if (registrationUnsub) registrationUnsub();
      if (badgeUnsub) badgeUnsub();
    };
  }, []);

  const fetchUserBadgeProgress = async (studentID, setBadgeProgressList) => {
    try {
      const badgeProgressQuery = query(
        collection(db, "badgeProgress"),
        where("studentID", "==", studentID)
      );

      const badgeProgressSnapshot = await getDocs(badgeProgressQuery);
      if (badgeProgressSnapshot.empty) {
        setBadgeProgressList([]);
        return () => { }; // return dummy unsubscribe
      }

      const badgeProgressDoc = badgeProgressSnapshot.docs[0];
      const userBadgeProgressRef = collection(badgeProgressDoc.ref, "userBadgeProgress");

      const unsubscribe = onSnapshot(userBadgeProgressRef, async (userBadgeProgressSnapshot) => {
        if (userBadgeProgressSnapshot.empty) {
          setBadgeProgressList([]);
          return;
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

        const badgeDetails = await Promise.all(badgeDetailPromises);
        setBadgeProgressList(badgeDetails.filter(Boolean));
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error fetching badge progress:", error);
      setBadgeProgressList([]);
      return () => { }; // return dummy unsubscribe on error
    }
  };

  const fetchNumOfAttendedEvents = async (studentID) => {
    try {
      const registrationQuery = query(
        collection(db, "registration"),
        where("studentID", "==", studentID),
        where("isAttended", "==", true),
        where("attendanceScannedTime", "!=", null)
      );

      const unsubscribe = onSnapshot(registrationQuery, (registrationSnapshots) => {
        if (!registrationSnapshots.empty) {
          setAttendedEventsLength(registrationSnapshots.docs.length);
        } else {
          setAttendedEventsLength(0);
        }
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error fetching number of attended events:", error);
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
      if (result.assets[0].fileSize > 100 * 1024) {
        Alert.alert('Image size exceeds 100KB limit. Please choose a smaller image.');
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

  const renderBadge = (badge, index) => {
    return (
      <TouchableOpacity
        key={badge.id}
        style={[styles.badgeContainer]}
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
          {badge.isUnlocked && (
            <View style={styles.badgeUnlockedIndicator} />
          )}
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
          <ActivityIndicator size="large" color="#4A80F0" />
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
            onPress={handleSignOut}
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
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 22 }}
      >
        <View style={styles.profileContainer}>
          <View style={styles.profileTopSection}>
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
                <Feather name="camera" size={16} color="#FFFFFF" />
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

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
          </View>

          {/* Points and Events Section */}
          <View style={styles.statsSection}>
            {/* Points Side */}
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="star" size={20} color='#3f6bc4' />
              </View>
              <View>
                <Text style={styles.statValue}>{userData.totalPointsGained || 0}</Text>
                <Text style={styles.statLabel}>Total Points Gained</Text>
              </View>
            </View>

            {/* Vertical Divider */}
            <View style={styles.verticalDivider} />

            {/* Events Side */}
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="calendar" size={20} color='#3f6bc4' />
              </View>
              <View>
                <Text style={styles.statValue}>{attendedEventsLength || 0}</Text>
                <Text style={styles.statLabel}>Events Attended</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Feather name="award" size={20} color="#A9A9A9" />
            <Text style={styles.sectionTitle}>Your Achievement Badges</Text>
          </View>

          <View style={styles.achievementsFrame}>
            <View style={styles.achievementsContainer}>
              {badgeProgressList.map(badge => renderBadge(badge))}
            </View>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Feather name="list" size={20} color="#A9A9A9" />
            <Text style={styles.sectionTitle}>Others</Text>
          </View>

          <View style={styles.networkCardContainer}>
            <TouchableOpacity
              style={styles.networkCard}
              onPress={() => navigation.navigate("NetworkList")}
            >
              <View style={styles.networkIconContainer}>
                <Ionicons name="people-outline" size={24} color="#7f9bc9" />
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

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={() => setIsSignOutModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>

        <Modal
          visible={isSignOutModalVisible}
          transparent
          animationType="slide"
        >
          <View style={styles.modalBackground}>
            <View style={styles.signOutModal}>
              <Image
                source={require('../assets/icons/signout-warning.png')} // use your icon or placeholder
                style={styles.signOutImage}
              />

              <Text style={styles.signOutTitle}>Ready to Sign Out?</Text>
              <Text style={styles.signOutText}>
                You're about to leave your quest. Are you sure you want to sign out?
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleSignOut}
                >
                  <Text style={styles.confirmButtonText}>Sign Out</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setIsSignOutModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
        backgroundStyle={styles.sheetBackgroundStyle}
        enableHandlePanningGesture
        enableOverDrag={false}
      >
        <BottomSheetView style={styles.contentContainer}>
          <Text style={styles.headerText}>Profile Picture</Text>

          <View style={styles.imageContainer}>
            <Image
              source={userData.profilePicture
                ? { uri: `data:image/png;base64,${userData.profilePicture}` }
                : DEFAULT_PROFILE_IMAGE}
              style={styles.editProfileImage}
            />
          </View>

          <TouchableOpacity style={styles.editButton} onPress={pickImage}>
            <Text style={styles.editButtonText}>Choose New Photo</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>
    </GestureHandlerRootView>
  )
}

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  headerWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 65,
    marginVertical: 12,
    paddingHorizontal: 18
  },
  titleContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
    marginTop: 4,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 8,
  },
  profileContainer: {
    padding: 16,
    margin: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignItems: 'flex-start',
    shadowColor: '#3f6bc4',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  profileTopSection: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    borderWidth: 1.5,
    borderColor: 'rgba(63, 107, 196, 0.7)',
  },
  editProfileButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3f6bc4',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  userDetailsContainer: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    letterSpacing: 0.3,
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
  sectionContainer: {
    paddingHorizontal: 5,
    paddingVertical: 10,
    marginTop: 10,
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
    marginLeft: 12,
  },
  achievementsFrame: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#3f6bc4',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  achievementsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  badgeContainer: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 20,
  },
  badge: {
    width: 60,
    height: 60,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#F0F5FF',
    shadowColor: '#A0C4FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
    position: 'relative',
  },
  badgeUnlockedIndicator: {
    position: 'absolute',
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    bottom: 0,
    right: 0,
  },
  lockedBadge: {
    backgroundColor: '#F0F0F0',
  },
  badgeImage: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  lockedBadgeImage: {
    opacity: 0.4,
    tintColor: '#A9A9A9',
  },
  badgeName: {
    fontSize: 10,
    color: '#2C3E50',
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 90,
  },
  lockedBadgeName: {
    color: '#929EA9',
  },
  noBadgesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  noBadgesText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    color: '#7F8C9A',
    marginTop: 12,
  },
  noBadgesSubtext: {
    textAlign: 'center',
    fontSize: 14,
    color: '#A9B9C5',
    marginTop: 6,
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
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#3f6bc4',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  networkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  networkIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F5FF',
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
  signOutButton: {
    marginVertical: 24,
    backgroundColor: '#E53935',  // Material Design red
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#C62828',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  signOutButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  background: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  sheetBackgroundStyle: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 0,
  },
  handleIndicatorStyle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D1D6',
    borderRadius: 2,
  },
  handleStyle: {
    paddingTop: 12,
    paddingBottom: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 24,
    marginTop: 8,
    textAlign: 'center',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  editProfileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F2F2F7',
  },
  editButton: {
    width: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  editButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dividerContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 14,
  },
  divider: {
    width: '96%',
    height: 1,
    backgroundColor: 'rgba(169, 169, 169, 0.2)',
  },
  statsSection: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  statLabel: {
    fontSize: 13,
    color: '#7F8C9A',
    fontWeight: '500',
  },
  rankText: {
    fontSize: 13,
    color: '#6284bf',
    fontWeight: '600',
    marginTop: 2,
  },
  verticalDivider: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(169, 169, 169, 0.2)',
    marginHorizontal: 6,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  signOutModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 340,
    alignItems: 'center',
  },
  signOutImage: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  signOutTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  signOutText: {
    fontSize: 16,
    color: theme.colors.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  buttonRow: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  modalButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  confirmButton: {
    backgroundColor: '#EF4444',
  },
  cancelButtonText: {
    color: theme.colors.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
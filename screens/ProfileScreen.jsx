import React, { useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ProfileScreen = () => {
  const [userData, setUserData] = useState({
    firstName: 'Ling',
    lastName: 'Sie Jie',
    email: '79893@siswa.unimas.my',
    yearOfStudy: 4,
    faculty: 'FCSIT',
    profilePicture: 'https://picsum.photos/200?random=1',
    badges: [],
  });

  const handleLogout = async () => {
    try {
      await signOut(auth); // Sign out user
      Alert.alert("Success", "You have been logged out!");
      navigation.replace("Login"); // Redirect to Login screen
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.profile}>
        <Image
          alt="Profile Picture"
          source={{
            uri: userData.profilePicture,
          }}
          style={styles.profileAvatar} />
        <View>
          <Text style={styles.profileName}>{`${userData.firstName} ${userData.lastName}`}</Text>
          <Text style={styles.profileHandle}>
            {userData.email}
          </Text>
          <View style={styles.academicInfo}>
            <View style={styles.infoItem}>
              <Ionicons name="school-outline" size={18} color="#555" />
              <Text style={styles.infoText}>Year {userData.yearOfStudy}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="business-outline" size={18} color="#555" />
              <Text style={styles.infoText}>{userData.faculty}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  profile: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 9999,
    marginRight: 12,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#292929',
  },
  profileHandle: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '400',
    color: '#858585',
  },
  academicInfo: {
    flexDirection: 'row',
    marginTop: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 5,
  },
});
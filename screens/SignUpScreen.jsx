import { View, Text, TouchableWithoutFeedback, KeyboardAvoidingView, StyleSheet, Modal, Image, TouchableOpacity, Keyboard } from 'react-native';
import { useState, memo } from 'react';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { TextInput as PaperTextInput } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { getExpoPushTokenAsync } from 'expo-notifications';

import BackButton from '../components/Authentication/BackButton';
import Header from '../components/Authentication/Header';
import TextInput from '../components/Authentication/TextInput';
import DropdownList from '../components/Authentication/DropdownList';
import Button from '../components/Authentication/Button';

import { auth, db } from '../utils/firebaseConfig';
import { theme } from '../core/theme';
import { addDoc, collection, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';

const SignUpScreen = () => {
  const [firstName, setFirstName] = useState({ value: '', error: '' });
  const [lastName, setLastName] = useState({ value: '', error: '' });
  const [email, setEmail] = useState({ value: '', error: '' });
  const [password, setPassword] = useState({ value: '', error: '' });
  const [faculty, setFaculty] = useState("");
  const [year, setYear] = useState(null);
  const [facultyError, setFacultyError] = useState('');
  const [yearError, setYearError] = useState('');
  const [isEmailSentModalVisible, setIsEmailSentModalVisible] = useState(false);
  const [isUserExistsModalVisible, setIsUserExistsModalVisible] = useState(false);
  const [isNetworkErrorModalVisible, setIsNetworkErrorModalVisible] = useState(false);
  const [isRateLimitModalVisible, setIsRateLimitModalVisible] = useState(false);
  const [isGenericErrorModalVisible, setIsGenericErrorModalVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const navigation = useNavigation();

  const validateEmail = (email) => {
    const emailRegex = /^[1-9]\d*@siswa\.unimas\.my$/;
    return emailRegex.test(email);
  };

  const handleFacultyChange = (item) => {
    setFaculty(item.value);
    setYear(null); // Reset year when faculty changes
    setFacultyError('');
  };

  const handleYearChange = (item) => {
    setYear(item.value);
    setYearError('');
  };

  const faculties = [
    { label: 'FACA - Faculty of Applied and Creative Arts', value: '1' },
    { label: 'FBE - Faculty of Built Environment', value: '2' },
    { label: 'FCSHD - Faculty of Cognitive Science and Human Development', value: '3' },
    { label: 'FCSIT - Faculty of Computer Science and Information Technology', value: '4' },
    { label: 'FEB - Faculty of Economics and Business', value: '5' },
    { label: 'FELC - Faculty of Education, Language and Communication', value: '6' },
    { label: 'FENG - Faculty of Engineering', value: '7' },
    { label: 'FMHS - Faculty of Medicine and Health Sciences', value: '8' },
    { label: 'FRST - Faculty of Resource Sciences and Technology', value: '9' },
    { label: 'FSSH - Faculty of Social Sciences and Humanities', value: '10' },
  ];

  const getYears = () => {
    const baseYears = [
      { label: '1', value: 1 },
      { label: '2', value: 2 },
      { label: '3', value: 3 },
      { label: '4', value: 4 },
    ];

    // Add 5th year option for FMHS
    if (faculty?.value === 8) {
      return [...baseYears, { label: '5', value: 5 }];
    }
    return baseYears;
  };

  const validateForm = () => {
    let newError = 0;

    if (!firstName.value.trim()) {
      setFirstName({ ...firstName, error: 'First name is required' });
      newError++;
    }

    if (!lastName.value.trim()) {
      setLastName({ ...lastName, error: 'Last name is required' });
      newError++;
    }

    if (!email.value.trim()) {
      setEmail({ ...email, error: 'Email address is required' });
      newError++;
    } else if (!validateEmail(email.value)) {
      setEmail({ ...email, error: 'Email must be in format: {matric_number}@siswa.unimas.my' });
      newError++;
    }

    if (!password.value) {
      setPassword({ ...password, error: 'Password is required' });
      newError++;
    } else if (password.value.length < 6) {
      setPassword({ ...password, error: 'Password must be at least 6 characters' });
      newError++;
    }

    if (faculty === "") {
      setFacultyError('Faculty selection is required');
      newError++;
    }

    if (year === null) {
      setYearError('Year of study is required');
      newError++;
    }

    return newError === 0;
  }

  const _onSignUpPressed = async () => {
    setLoading(true);

    // Clear all previous errors
    setFirstName({ ...firstName, error: '' });
    setLastName({ ...lastName, error: '' });
    setEmail({ ...email, error: '' });
    setPassword({ ...password, error: '' });
    setFacultyError('');
    setYearError('');

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.value, password.value);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: `${firstName.value} ${lastName.value}`
      });

      let expoPushToken = null;
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        const finalStatus = existingStatus === 'granted'
          ? existingStatus
          : (await Notifications.requestPermissionsAsync()).status;

        if (finalStatus === 'granted') {
          expoPushToken = (await getExpoPushTokenAsync({
            projectId: "ddfc0801-bc5c-4c5a-81ae-29f43c63ed75",
          })).data;
        } else {
          console.warn('Push notification permission not granted');
          setLoading(false);
          return;
        }
      }

      const userDocRef = doc(db, "user", user.uid);

      const profilePicQuery = query(collection(db, "config"), where("name", "==", "defaultProfilePic"));
      const profilePicSnapshot = await getDocs(profilePicQuery);

      const ProfilePicBase64 = profilePicSnapshot.docs[0].data().base64;

      await setDoc(userDocRef, {
        firstName: firstName.value,
        lastName: lastName.value,
        email: email.value,
        yearOfStudy: year,
        facultyID: String(faculty),
        diamonds: 0,
        totalPointsGained: 0,
        profilePicture: ProfilePicBase64,
        expoPushToken: expoPushToken || null,
      })

      const badgeProgressDocRef = await addDoc(collection(db, "badgeProgress"), { studentID: user.uid });

      const badgeSnapshot = await getDocs(collection(db, "badge"));

      const batchPromises = badgeSnapshot.docs.map(async (badgeDoc) => {
        const badgeID = badgeDoc.id;
        const badgeProgressSubDocRef = doc(db, "badgeProgress", badgeProgressDocRef.id, "userBadgeProgress", badgeID);

        await setDoc(badgeProgressSubDocRef, {
          dateUpdated: serverTimestamp(),
          isUnlocked: false,
          progress: 0,
        });
      });

      await Promise.all(batchPromises);

      await sendEmailVerification(user);
      setIsEmailSentModalVisible(true);
    } catch (error) {
      setLoading(false);
      
      // Handle specific Firebase auth errors
      switch (error.code) {
        case 'auth/email-already-in-use':
          setIsUserExistsModalVisible(true);
          break;
        case 'auth/operation-not-allowed':
          setIsGenericErrorModalVisible(true);
          break;
        case 'auth/network-request-failed':
          setIsNetworkErrorModalVisible(true);
          break;
        case 'auth/too-many-requests':
          setIsRateLimitModalVisible(true);
          break;
        case 'auth/user-disabled':
          setIsGenericErrorModalVisible(true);
          break;
        default:
          setIsGenericErrorModalVisible(true);
          break;
      }
    }
  }

  const closeEmailSentModal = () => {
    setIsEmailSentModalVisible(false);
    navigation.navigate("SignIn");
  }

  const closeUserExistsModal = () => {
    setIsUserExistsModalVisible(false);
    navigation.navigate("SignIn");
  }

  const closeNetworkErrorModal = () => {
    setIsNetworkErrorModalVisible(false);
  }

  const closeRateLimitModal = () => {
    setIsRateLimitModalVisible(false);
  }

  const closeGenericErrorModal = () => {
    setIsGenericErrorModalVisible(false);
  }

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={styles.background}>
        <BackButton goBack={() => navigation.navigate("SignIn")} />
        <KeyboardAvoidingView style={styles.container} behavior='padding'>
          <Header>Let's Sign Up</Header>

          <TextInput
            label="First Name"
            returnKeyType="next"
            value={firstName.value}
            onChangeText={text => setFirstName({ value: text, error: '' })}
            error={!!firstName.error}
            errorText={firstName.error}
            required
          />

          <TextInput
            label="Last Name"
            returnKeyType="next"
            value={lastName.value}
            onChangeText={text => setLastName({ value: text, error: '' })}
            error={!!lastName.error}
            errorText={lastName.error}
            required
          />

          <TextInput
            label="Email Address"
            returnKeyType="next"
            value={email.value}
            onChangeText={text => {
              setEmail({
                value: text,
                error: validateEmail(text) ? '' : 'Please enter a valid student email'
              })
            }}
            errorText={email.error}
            autoCapitalize="none"
            autoCompleteType="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            disabled={loading}
            description="Format: {matric_number}@siswa.unimas.my"
            required
          />

          <TextInput
            label="Password"
            returnKeyType="done"
            value={password.value}
            onChangeText={text => setPassword({ value: text, error: '' })}
            errorText={password.error}
            secureTextEntry={!showPassword}
            right={
              <PaperTextInput.Icon
                icon={showPassword ? "eye-off" : "eye"}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            disabled={loading}
            description="Password must be at least 6 characters"
            required
          />

          <DropdownList
            data={faculties}
            value={faculty}
            onChange={handleFacultyChange}
            placeholder="Select Faculty"
            errorText={facultyError}
            required
          />

          <DropdownList
            data={getYears()}
            value={year}
            onChange={handleYearChange}
            placeholder="Select Year of Study"
            disabled={!faculty}
            errorText={yearError}
            required
          />

          <Button
            mode="contained"
            onPress={_onSignUpPressed}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            Sign Up
          </Button>

          <Modal
            visible={isEmailSentModalVisible}
            transparent
            animationType='slide'
          >
            <View style={styles.modalBackground}>
              <View style={styles.emailSentModal}>
                <Image
                  source={require('../assets/auth/email_sent.png')}
                  style={styles.emailSentImage}
                />

                <Text style={styles.emailSentTitle}>Verification Email Sent!</Text>
                <Text style={styles.emailSentText}>
                  We've just sent a verification link to your inbox!
                  Check your email, click that sparkly link, and unlock the full
                  adventure waiting for you! ✨
                </Text>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={closeEmailSentModal}
                >
                  <Text style={styles.closeButtonText}>I'm on it!</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal
            visible={isUserExistsModalVisible}
            transparent
            animationType='slide'
          >
            <View style={styles.modalBackground}>
              <View style={styles.emailSentModal}>
                <Image
                  source={require('../assets/auth/access_denied.png')}
                  style={styles.emailSentImage}
                />

                <Text style={styles.emailSentTitle}>Account Already Exists!</Text>
                <Text style={styles.emailSentText}>
                  It looks like an account with this email address already exists.
                  Please try signing in instead, or use a different email address.
                </Text>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={closeUserExistsModal}
                >
                  <Text style={styles.closeButtonText}>Go to Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal
            visible={isNetworkErrorModalVisible}
            transparent
            animationType='slide'
          >
            <View style={styles.modalBackground}>
              <View style={styles.emailSentModal}>
                <Image
                  source={require('../assets/icons/exclamation_mark.png')}
                  style={styles.emailSentImage}
                />

                <Text style={styles.emailSentTitle}>Network Error</Text>
                <Text style={styles.emailSentText}>
                  It looks like there's a network connection issue.
                  Please check your internet connection and try again.
                </Text>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={closeNetworkErrorModal}
                >
                  <Text style={styles.closeButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal
            visible={isRateLimitModalVisible}
            transparent
            animationType='slide'
          >
            <View style={styles.modalBackground}>
              <View style={styles.emailSentModal}>
                <Image
                  source={require('../assets/icons/lock.png')}
                  style={styles.emailSentImage}
                />

                <Text style={styles.emailSentTitle}>Too Many Attempts</Text>
                <Text style={styles.emailSentText}>
                  You've made too many registration attempts.
                  Please wait a few minutes before trying again.
                </Text>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={closeRateLimitModal}
                >
                  <Text style={styles.closeButtonText}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal
            visible={isGenericErrorModalVisible}
            transparent
            animationType='slide'
          >
            <View style={styles.modalBackground}>
              <View style={styles.emailSentModal}>
                <Image
                  source={require('../assets/icons/exclamation_mark.png')}
                  style={styles.emailSentImage}
                />

                <Text style={styles.emailSentTitle}>Registration Error</Text>
                <Text style={styles.emailSentText}>
                  Something went wrong during registration.
                  Please try again or contact support if the problem persists.
                </Text>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={closeGenericErrorModal}
                >
                  <Text style={styles.closeButtonText}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  )
}

export default memo(SignUpScreen);

const styles = StyleSheet.create({
  forgotPassword: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    marginTop: 4,
  },
  label: {
    color: theme.colors.secondary,
  },
  link: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  image: {
    width: 192,
    height: 192,
    marginBottom: 12,
  },
  backgroundImage: {
    resizeMode: 'repeat',
    opacity: 0.15,
  },
  background: {
    flex: 1,
    width: '100%',
    backgroundColor: 'white'
  },
  container: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emailSentModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 340,
    alignItems: 'center',
  },
  emailSentImage: {
    width: 150,
    height: 150,
    marginBottom: 16,
  },
  emailSentTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  emailSentText: {
    fontSize: 16,
    color: theme.colors.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  closeButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
  },
  closeButtonText: {
    color: theme.colors.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    marginTop: 24,
  },
});
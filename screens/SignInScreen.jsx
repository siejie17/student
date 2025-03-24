import { View, Text, StyleSheet, Image, KeyboardAvoidingView, TouchableOpacity, TouchableWithoutFeedback, Keyboard, Modal } from 'react-native'
import React, { useState, memo } from 'react';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Authentication/Header';
import Button from '../components/Authentication/Button';
import TextInput from '../components/Authentication/TextInput';
import { theme } from '../core/theme';
import { auth, db } from '../utils/firebaseConfig';

import { signInWithEmailAndPassword } from 'firebase/auth';
import Background from '../components/Background';
import { addDoc, collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { getItem, removeItem, setItem } from '../utils/asyncStorage';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

const SignInScreen = () => {
  const [email, setEmail] = useState({ value: '', error: '' });
  const [password, setPassword] = useState({ value: '', error: '' });
  const [loading, setLoading] = useState(false);
  const [isVerificationModalVisible, setIsVerificationModalVisible] = useState(false);

  const navigation = useNavigation();

  const _onLoginPressed = async () => {
    // Reset errors
    const emailError = email.value ? '' : 'Email cannot be empty';
    const passwordError = password.value ? '' : 'Password cannot be empty';

    if (emailError || passwordError) {
      setEmail({ ...email, error: emailError });
      setPassword({ ...password, error: passwordError });
      return;
    }

    setLoading(true);

    try {
      // Attempt to sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email.value, password.value);
      const user = userCredential.user;

      if (!user.emailVerified) {
        // Email not verified - show verification modal
        setLoading(false);
        setIsVerificationModalVisible(true);

        // Sign out unverified user
        await auth.signOut();
      }

      const userDocRef = doc(db, "user", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        const userSignedUpDataJSON = await getItem('@userSignedUpData');
        if (userSignedUpDataJSON) {
          const userSignedUpData = JSON.parse(userSignedUpDataJSON);
          const imageAsset = Asset.fromModule(require('../assets/defaultProfilePic.png'));
          await imageAsset.downloadAsync();

          const ProfilePicBase64 = await FileSystem.readAsStringAsync(imageAsset.localUri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          await setDoc(userDocRef, {
            firstName: userSignedUpData.firstName,
            lastName: userSignedUpData.lastName,
            email: userSignedUpData.email,
            yearOfStudy: userSignedUpData.yearOfStudy.value,
            facultyID: userSignedUpData.facultyID.value,
            diamonds: 0,
            totalPointsGained: 0,
            profilePicture: ProfilePicBase64
          });

          console.log("Here 1");

          const badgeProgressCollectionRef = collection(db, "badgeProgress");
          const badgeProgressDocRef = await addDoc(badgeProgressCollectionRef, {
            studentID: user.uid
          });

          const badgeCollectionRef = collection(db, "badge");
          const badgeSnapshot = await getDocs(badgeCollectionRef);

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

          await setItem('studentID', user.uid);
          await setItem('facultyID', userSignedUpData.facultyID.value);
          await removeItem('@userSignedUpData');
        }
      } else {
        console.log(user.uid, userDocSnap.data().facultyID);
        await setItem('studentID', user.uid);
        await setItem('facultyID', userDocSnap.data().facultyID);
      }
    } catch (error) {
      setLoading(false);

      // Handle different Firebase auth errors
      switch (error.code) {
        case 'auth/user-not-found':
          setEmail({ ...email, error: 'No account found with this email. Please sign up first!' });
          break;
        case 'auth/wrong-password':
          setPassword({ ...password, error: 'Incorrect password. Please try again.' });
          break;
        case 'auth/invalid-email':
          setEmail({ ...email, error: 'Invalid email format.' });
          break;
        case 'auth/too-many-requests':
          setPassword({ ...password, error: 'Too many failed attempts. Please try again later.' });
          break;
        default:
          setPassword({ ...password, error: `Sign in failed: ${error.message}` });
      }
    }
  };

  const closeVerificationModal = () => {
    setIsVerificationModalVisible(false);
  };

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <Background>
        <KeyboardAvoidingView style={styles.container} behavior='padding'>
          <Image source={require('../assets/logo.png')} style={styles.image} />
          <Header>Welcome Back, Champion!</Header>
          <TextInput
            label="Email"
            returnKeyType="next"
            value={email.value}
            onChangeText={text => setEmail({ value: text, error: '' })}
            errorText={email.error}
            autoCapitalize="none"
            autoCompleteType="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            disabled={loading}
          />
          <TextInput
            label="Password"
            returnKeyType="done"
            value={password.value}
            onChangeText={text => setPassword({ value: text, error: '' })}
            errorText={password.error}
            secureTextEntry
            disabled={loading}
          />
          <View style={styles.forgotPassword}>
            <TouchableOpacity
              onPress={() => navigation.navigate('PasswordReset')}
            >
              <Text style={styles.label}>Forgot your password?</Text>
            </TouchableOpacity>
          </View>
          <Button
            mode="contained"
            onPress={_onLoginPressed}
            loading={loading}
            disabled={loading}
          >
            LOGIN
          </Button>
          <View style={styles.row}>
            <Text style={styles.label}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.link}>Sign up</Text>
            </TouchableOpacity>
          </View>

          {/* Verification Modal */}
          <Modal
            visible={isVerificationModalVisible}
            transparent
            animationType="slide"
          >
            <View style={styles.modalBackground}>
              <View style={styles.verificationModal}>
                <Image
                  source={require('../assets/email-send.png')}
                  style={styles.verificationImage}
                />

                <Text style={styles.verificationTitle}>Whoa there, Champion!</Text>
                <Text style={styles.verificationText}>
                  Looks like you haven't verified your email yet! Check your inbox for the verification link.
                  Your quest awaits after verification! 🏆✨
                </Text>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={closeVerificationModal}
                >
                  <Text style={styles.closeButtonText}>GOT IT!</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </Background>
    </TouchableWithoutFeedback>
  )
}

export default memo(SignInScreen);

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
  },
  container: {
    flex: 1,
    padding: 10,
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
  verificationModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 340,
    alignItems: 'center',
  },
  verificationImage: {
    width: 150,
    height: 150,
    marginBottom: 16,
  },
  verificationTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  verificationText: {
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
});
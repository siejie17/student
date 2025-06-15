import { View, Text, StyleSheet, Image, KeyboardAvoidingView, TouchableOpacity, TouchableWithoutFeedback, Keyboard, Modal } from 'react-native';
import { useRef, useState, memo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { TextInput as PaperTextInput } from 'react-native-paper';

import Header from '../components/Authentication/Header';
import Button from '../components/Authentication/Button';
import TextInput from '../components/Authentication/TextInput';

import { theme } from '../core/theme';
import { auth, db } from '../utils/firebaseConfig';
import { setItem } from '../utils/asyncStorage';

const SignInScreen = () => {
  const [email, setEmail] = useState({ value: '', error: '' });
  const [password, setPassword] = useState({ value: '', error: '' });
  const [loading, setLoading] = useState(false);
  const [isVerificationModalVisible, setIsVerificationModalVisible] = useState(false);
  const [isAdminModalVisible, setIsAdminModalVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Refs for the input fields
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);

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

      if (!user.uid) {
        setLoading(false);
        await auth.signOut();
        setPassword({ ...password, error: 'User not found. Please sign up first!' });
        return;
      }

      const isAdminRef = query(collection(db, "admin"), where("adminID", "==", user.uid));
      const isAdminSnapshot = await getDocs(isAdminRef);

      if (!isAdminSnapshot.empty) {
        setIsAdminModalVisible(true);
        await auth.signOut();
        setLoading(false);
        return;
      }

      if (!user.emailVerified) {
        setLoading(false);
        setIsVerificationModalVisible(true);
        await auth.signOut();
        return; // Exit the function here
      }

      const userDocRef = doc(db, "user", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      await setItem('studentID', user.uid);
      await setItem('facultyID', userDocSnap.data().facultyID);
      await auth.signOut();
      await signInWithEmailAndPassword(auth, email.value, password.value);
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

  const dismissEverything = () => {
    // Blur both input fields if they're focused
    if (emailInputRef.current) {
      emailInputRef.current.blur();
    }
    if (passwordInputRef.current) {
      passwordInputRef.current.blur();
    }
    // Dismiss the keyboard
    Keyboard.dismiss();
  };

  return (
    <TouchableWithoutFeedback onPress={dismissEverything}>
      <View style={styles.background}>
        <KeyboardAvoidingView style={styles.container} behavior='padding'>
          <Image source={require('../assets/logo.png')} style={styles.image} />
          <Header>Welcome Back, Warrior!</Header>
          <TextInput
            label="Email Address"
            returnKeyType="next"
            value={email.value}
            onChangeText={text => setEmail({ value: text, error: '' })}
            errorText={email.error}
            autoCapitalize="none"
            autoCompleteType="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            disabled={loading}
            onRef={(ref) => (emailInputRef.current = ref)}
            required={true}
          />
          <TextInput
            label="Password"
            returnKeyType="done"
            value={password.value}
            onChangeText={text => setPassword({ value: text, error: '' })}
            errorText={password.error}
            secureTextEntry={!showPassword}
            disabled={loading}
            onRef={(ref) => (passwordInputRef.current = ref)}
            right={
              <PaperTextInput.Icon
                icon={showPassword ? "eye-off" : "eye"}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            required={true}
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
            Login
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
                  source={require('../assets/auth/email_send.png')}
                  style={styles.verificationImage}
                />

                <Text style={styles.verificationTitle}>Whoa there, Warrior!</Text>
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

          <Modal
            visible={isAdminModalVisible}
            transparent
            animationType="slide"
          >
            <View style={styles.modalBackground}>
              <View style={styles.verificationModal}>
                <Image
                  source={require('../assets/auth/access_denied.png')}
                  style={styles.verificationImage}
                />

                <Text style={styles.verificationTitle}>Whoa there, Admin!</Text>
                <Text style={styles.verificationText}>
                  ⚠️ Access Denied: This level is for students only.
                  Admins must return to their designated portal!
                </Text>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => {
                    setIsAdminModalVisible(false);
                    setLoading(false);
                  }}
                >
                  <Text style={styles.closeButtonText}>Oops, My Bad!</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </View>
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
    backgroundColor: 'white'
  },
  container: {
    flex: 1,
    padding: 15,
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
  eyeIcon: {
    padding: 8,
    marginRight: 4,
  },
});
import { View, Text, StyleSheet, TouchableOpacity, Modal, Image } from 'react-native';
import { useState, memo } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';

import { theme } from '../core/theme';
import { auth } from '../utils/firebaseConfig';

import BackButton from '../components/Authentication/BackButton';
import Header from '../components/Authentication/Header';
import Logo from '../components/Authentication/Logo';
import TextInput from '../components/Authentication/TextInput';
import Button from '../components/Authentication/Button';

const PasswordResetScreen = () => {
  const [email, setEmail] = useState({ value: '', error: '' });
  const [isPasswordResetModalVisible, setIsPasswordResetModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigation = useNavigation();

  const _onSendPressed = async () => {
    setIsLoading(true);
    setEmail({ ...email, error: '' });

    if (!email.value) {
      setEmail({ ...email, error: 'Email cannot be empty' });
      setIsLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email.value);
      setIsPasswordResetModalVisible(true);
    } catch (error) {
      let errorMessage = 'Something went wrong. Please try again.';

      if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email.';
      }

      setEmail({ ...email, error: errorMessage });
      setIsPasswordResetModalVisible(false);
    }
  }

  const handleNavigateBack = () => {
    setIsPasswordResetModalVisible(false);
    navigation.navigate('SignIn');
  }

  return (
    <View style={styles.background}>
      <BackButton goBack={() => navigation.navigate("SignIn")} />
      <View style={styles.content}>
        <Logo />
        <Header>Password Reset</Header>
        <TextInput
          label="Email address"
          returnKeyType="done"
          value={email.value}
          onChangeText={text => setEmail({ value: text, error: '' })}
          error={!!email.error}
          errorText={email.error}
          autoCapitalize="none"
          autoCompleteType="email"
          textContentType="emailAddress"
          keyboardType="email-address"
        />
        <Button 
          mode="contained" 
          onPress={_onSendPressed} 
          style={styles.button}
          loading={isLoading}
          disabled={isLoading}
        >
          Send Reset Instructions Email
        </Button>
      </View>

      <Modal
        visible={isPasswordResetModalVisible}
        transparent
        animationType="slide"
      >
        <View style={styles.modalBackground}>
          <View style={styles.passwordResetModal}>
            <Image
              source={require('../assets/auth/password_reset.png')}
              style={styles.passwordResetImage}
            />

            <Text style={styles.passwordResetTitle}>Houston, We Have A Password!</Text>
            <Text style={styles.passwordResetText}>
              Your password reset instructions are floating through the digital universe
              toward your inbox right now! Check your email now! 📧✨
            </Text>

            <TouchableOpacity
              style={styles.signInButton}
              onPress={handleNavigateBack}
            >
              <Text style={styles.signInButtonText}>BACK TO SIGN IN</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    backgroundColor: 'white',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    display: 'flex',
    width: '100%',
    padding: 50,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    marginTop: 24,
  },
  label: {
    color: theme.colors.secondary,
    width: '100%',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  passwordResetModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 340,
    alignItems: 'center',
  },
  passwordResetImage: {
    width: 150,
    height: 150,
    marginBottom: 16,
  },
  passwordResetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  passwordResetText: {
    fontSize: 16,
    color: theme.colors.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  signInButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default memo(PasswordResetScreen);
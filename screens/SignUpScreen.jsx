import { View, Text, TouchableWithoutFeedback, KeyboardAvoidingView, StyleSheet, Modal, Image, TouchableOpacity } from 'react-native';
import { useState, memo } from 'react';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';

import BackButton from '../components/Authentication/BackButton';
import Header from '../components/Authentication/Header';
import TextInput from '../components/Authentication/TextInput';
import DropdownList from '../components/Authentication/DropdownList';
import Button from '../components/Authentication/Button';

import { auth } from '../utils/firebaseConfig';
import { setItem } from '../utils/asyncStorage';
import { theme } from '../core/theme';

const SignUpScreen = () => {
  const [firstName, setFirstName] = useState({ value: '', error: '' });
  const [lastName, setLastName] = useState({ value: '', error: '' });
  const [email, setEmail] = useState({ value: '', error: '' });
  const [password, setPassword] = useState({ value: '', error: '' });
  const [faculty, setFaculty] = useState(null);
  const [year, setYear] = useState(null);
  const [facultyError, setFacultyError] = useState('');
  const [yearError, setYearError] = useState('');
  const [isEmailSentModalVisible, setIsEmailSentModalVisible] = useState(false);

  const [loading, setLoading] = useState(false);

  const navigation = useNavigation();

  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._-]+@siswa\.unimas\.my$/;
    return emailRegex.test(email);
  };

  const handleFacultyChange = (item) => {
    setFaculty(item);
    setYear(null); // Reset year when faculty changes
    setFacultyError('');
  };

  const handleYearChange = (item) => {
    setYear(item);
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
      firstName.error = 'First name is required';
      newError++;
    }

    if (!lastName.value.trim()) {
      lastName.error = 'Last name is required';
      newError++;
    }

    if (!email.value.trim()) {
      email.error = 'Email is required';
      newError++;
    } 
    else if (!validateEmail(email.value)) {
      email.error = 'Email must be in format: {matric_number}@siswa.unimas.my';
      newError++;
    }

    if (!password.value) {
      password.error = 'Password is required';
      newError++;
    } else if (password.value.length < 6) {
      password.error = 'Password must be at least 6 characters';
      newError++;
    }

    if (faculty === null) {
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
    if (!validateForm()) return;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.value, password.value);
      const user = userCredential.user;

      await setItem('@userSignedUpData', JSON.stringify({
        firstName: firstName.value,
        lastName: lastName.value,
        email: email.value,
        yearOfStudy: year,
        facultyID: faculty,
      }));

      await sendEmailVerification(user);

      setIsEmailSentModalVisible(true);
    } catch (error) {
      console.error('Error', error.message);
    }
  }

  const closeEmailSentModal = () => {
    setIsEmailSentModalVisible(false);
    navigation.navigate("SignIn");
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
            />

            <TextInput
              label="Last Name"
              returnKeyType="next"
              value={lastName.value}
              onChangeText={text => setLastName({ value: text, error: '' })}
              error={!!lastName.error}
              errorText={lastName.error}
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
              description="Only accept student emails (XXXXXX@siswa.unimas.my)"
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

            <DropdownList
              data={faculties}
              value={faculty}
              onChange={handleFacultyChange}
              placeholder="Select Faculty"
              errorText={facultyError}
            />

            <DropdownList
              data={getYears()}
              value={year}
              onChange={handleYearChange}
              placeholder="Select Year of Study"
              disabled={!faculty}
              errorText={yearError}
            />

            <Button mode="contained" onPress={_onSignUpPressed} style={styles.button}>
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
                    source={require('../assets/auth/email-sent.png')}
                    style={styles.emailSentImage}
                  />

                  <Text style={styles.emailSentTitle}>Verification Email Sent!</Text>
                  <Text style={styles.emailSentText}>
                    We've just launched a magical verification link to your inbox! 
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
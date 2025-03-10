import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBGl0o9TF3EZEQsxjKeNWsaHKc5GC1b_G8",
  authDomain: "uniexp-bfc54.firebaseapp.com",
  databaseURL: "https://uniexp-bfc54-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "uniexp-bfc54",
  storageBucket: "uniexp-bfc54.firebasestorage.app",
  messagingSenderId: "376632403855",
  appId: "1:376632403855:web:56e01d139eb2a3ffae8dfa"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
const db = getFirestore(app);

export { auth, db };
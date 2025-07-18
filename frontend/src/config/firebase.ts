import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDJWjw2e8FayU3CvIWyGXXFAqDCTFN5CJs",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "rag-prompt-library.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "rag-prompt-library",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "rag-prompt-library.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "743998930129",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:743998930129:web:69dd61394ed81598cd99f0",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-CEDFF0WMPW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Initialize Analytics (only in browser environment and when measurementId is available)
export const analytics = typeof window !== 'undefined' && firebaseConfig.measurementId
  ? getAnalytics(app)
  : null;

// Connect to Firebase Emulators in development
if (import.meta.env.DEV && typeof window !== 'undefined') {
  const isEmulatorConnected = sessionStorage.getItem('firebase-emulator-connected');

  if (!isEmulatorConnected) {
    try {
      // Connect to Auth Emulator
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });

      // Connect to Firestore Emulator
      connectFirestoreEmulator(db, 'localhost', 8080);

      // Connect to Functions Emulator
      connectFunctionsEmulator(functions, 'localhost', 5001);

      // Connect to Storage Emulator
      connectStorageEmulator(storage, 'localhost', 9199);

      // Mark emulators as connected to avoid reconnection attempts
      sessionStorage.setItem('firebase-emulator-connected', 'true');

      console.log('🔧 Connected to Firebase Emulators');
    } catch (error) {
      console.log('📡 Using production Firebase services');
    }
  }
}

export default app;

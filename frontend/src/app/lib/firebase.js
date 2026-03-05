// src/firebase.js
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";

// Your Firebase config (from Firebase console)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.storageBucket &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId
);

const isBrowser = typeof window !== "undefined";
const shouldInitializeFirebase = isBrowser && isFirebaseConfigured;

if (shouldInitializeFirebase && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const hasInitializedApp = shouldInitializeFirebase && firebase.apps.length > 0;

// Export commonly used Firebase services
export const auth = hasInitializedApp ? firebase.auth() : null;
export const db = hasInitializedApp ? firebase.firestore() : null;
export const storage = hasInitializedApp ? firebase.storage() : null;
export { isFirebaseConfigured };

export default firebase;

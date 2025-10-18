// src/firebase.js
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";

// Your Firebase config (from Firebase console)
const firebaseConfig = {
  apiKey: "AIzaSyAEqgcG_B6L8FEMw2z4lhfFp5As5GH9VXc",
  authDomain: "hacktx25-6176d.firebaseapp.com",
  projectId: "hacktx25-6176d",
  storageBucket: "hacktx25-6176d.firebasestorage.app",
  messagingSenderId: "525828775817",
  appId: "1:525828775817:web:5c0624a9ee97b20f4dcb58",
  measurementId: "G-92ZX5KECR5"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export commonly used Firebase services
export const auth = firebase.auth();
export const db = firebase.firestore();
export const storage = firebase.storage();

export default firebase;

// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";  // ⬅️ Add this

const firebaseConfig = {
  apiKey: "AIzaSyB2TjzD6AhDVI_SOQ53UrfGMzf5HlrS81w",
  authDomain: "billgen-6c276.firebaseapp.com",
  projectId: "billgen-6c276",
  storageBucket: "billgen-6c276.appspot.com",
  messagingSenderId: "645566852136",
  appId: "1:645566852136:web:7c229792f32de7c934d91d",
  measurementId: "G-548F17Z6NV"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const auth = getAuth(app);
// Set persistence to localStorage for better compatibility
setPersistence(auth, browserLocalPersistence).catch((err) => {
  // Handle browsers/environments where storage is inaccessible
  console.warn('Auth persistence could not be set:', err);
});

const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const storage = getStorage(app);  // ⬅️ Export storage

export { auth, provider, signInWithPopup, db, analytics, storage };

// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent } from "firebase/analytics";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB2TjzD6AhDVI_SOQ53UrfGMzf5HlrS81w",
  authDomain: "billgen-6c276.firebaseapp.com",
  projectId: "billgen-6c276",
  storageBucket: "billgen-6c276.appspot.com",
  messagingSenderId: "645566852136",
  appId: "1:645566852136:web:7c229792f32de7c934d91d",
  measurementId: "G-548F17Z6NV",
};

const app = initializeApp(firebaseConfig);

// Analytics can fail in unsupported environments (SSR, blocked cookies) — never crash the app for it.
let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (err) {
  console.warn("Analytics disabled:", err?.message);
}

/** Safe wrapper around logEvent — no-ops when analytics is unavailable. */
export function track(eventName, params = {}) {
  if (!analytics) return;
  try {
    logEvent(analytics, eventName, params);
  } catch {
    /* ignore */
  }
}

const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("Auth persistence could not be set:", err);
});

const provider = new GoogleAuthProvider();
const db = getFirestore(app);

export { app, auth, provider, signInWithPopup, db, analytics };

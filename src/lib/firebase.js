import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCSsUwI-53Q5D2FBtE02Y11lKKJZXqCxb8",
  authDomain: "simidog-6bf6a.firebaseapp.com",
  projectId: "simidog-6bf6a",
  storageBucket: "simidog-6bf6a.firebasestorage.app",
  messagingSenderId: "678609415955",
  appId: "1:678609415955:web:113161befae8e42accf4e6",
  measurementId: "G-6EGCJ52Y9V"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;

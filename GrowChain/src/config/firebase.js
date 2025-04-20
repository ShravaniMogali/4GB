import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyA_6e_rbRuBKC7_7iXxXwLJZP0jIjFTRb0",
  authDomain: "agriledger-d0e31.firebaseapp.com",
  databaseURL: "https://agriledger-d0e31-default-rtdb.firebaseio.com",
  projectId: "agriledger-d0e31",
  storageBucket: "agriledger-d0e31.firebasestorage.app",
  messagingSenderId: "674724674704",
  appId: "1:674724674704:web:0440c9bfead5aedfb56c15",
  measurementId: "G-8NDN2LHGJ8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app; 
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCnEPQ2bmG3a0shwDorWLjUisg7Rps514w',
  authDomain: 'knitting-shop-7526c.firebaseapp.com',
  projectId: 'knitting-shop-7526c',
  storageBucket: 'knitting-shop-7526c.firebasestorage.app',
  messagingSenderId: '662937937541',
  appId: '1:662937937541:web:9ce242512a2fbb066e2bec',
  measurementId: 'G-G5QSS2TZDF',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export {
  auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  firebaseSignOut as signOut,
  db,
  storage,
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
};

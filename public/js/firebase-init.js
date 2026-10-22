// Firebase Initialization and Emulator Configuration for Cinerolls
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, connectAuthEmulator } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { firebaseConfig } from './firebase-config.js';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Connect to local Firebase Emulators when running on localhost / 127.0.0.1
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    console.log('[Cinerolls] Connected to Firebase Emulators (Auth: 9099, Firestore: 8080)');
  } catch (err) {
    // Emulator connection errors happen if connected multiple times; ignore
    console.warn('[Cinerolls] Emulator initialization notice:', err.message);
  }
}

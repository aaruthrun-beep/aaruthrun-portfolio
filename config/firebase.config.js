/**
 * AARUTHRUN — FIREBASE WEB CONFIG
 *
 * These are public browser identifiers, not secrets. Publishing is protected by
 * Firebase Authentication plus the Firestore rules in firebase/firestore.rules.
 *
 * Production identifiers for the Aaruthrun portfolio Firebase project.
 * Publishing is limited to the Email/Password editor account that has a
 * matching document in the `admins` collection.
 */
window.FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBd3hks8FnFoX__w8HfVDuPhfzI6-c62ek',
  authDomain: 'project-portfolio-f25f7.firebaseapp.com',
  projectId: 'project-portfolio-f25f7',
  storageBucket: 'project-portfolio-f25f7.firebasestorage.app',
  messagingSenderId: '387326605123',
  appId: '1:387326605123:web:6732655275fdfd3f9021f6',
  useEmulator: false
};

/**
 * Used only by `?emulator=1` for local verification with the Firebase Emulator
 * Suite. It is never used by a normal page load.
 */
window.FIREBASE_EMULATOR_CONFIG = {
  apiKey: 'demo-key',
  authDomain: 'localhost',
  projectId: 'demo-aaruthrun',
  storageBucket: 'demo-aaruthrun.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:demo',
  useEmulator: true
};

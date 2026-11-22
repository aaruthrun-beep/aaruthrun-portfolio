/**
 * AARUTHRUN — FIREBASE WEB CONFIG
 *
 * These are public browser identifiers, not secrets: the Firebase Web SDK
 * config is served to every visitor, so nothing here can be hidden. Access is
 * controlled by Firebase Authentication and the Firestore security rules.
 *
 * The apiKey must stay restricted in Google Cloud (APIs & Services >
 * Credentials): limit its API access to Identity Toolkit and Cloud Firestore,
 * and limit its HTTP referrers to this site's Pages URL and localhost. An
 * unrestricted key would let anyone bill this project's quota on other Google
 * APIs. See .github/secret_scanning.yml for why secret scanning ignores this
 * file.
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

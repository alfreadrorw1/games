// ============================================
// FIREBASE CONFIGURATION
// ============================================

// Replace with your own Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCTbLlKjUKI9SMVgnNgaqj9ivScgxoxynI",
    authDomain: "games-592c5.firebaseapp.com",
    databaseURL: "https://games-592c5-default-rtdb.firebaseio.com",
    projectId: "games-592c5",
    storageBucket: "games-592c5.firebasestorage.app",
    messagingSenderId: "103017684838",
    appId: "1:103017684838:web:86d5651cd44d715bc132a7",
    measurementId: "G-LQE1MMV6TY"
};

// Initialize Firebase
try {
    // Check if Firebase is already initialized
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    console.log("🔥 Firebase app initialized");
} catch (error) {
    console.error("❌ Firebase initialization error:", error);
}

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Enable Firestore offline persistence
db.enablePersistence()
  .catch((err) => {
      console.log("Firestore persistence failed: ", err.code);
  });

// Configure Firestore settings
const firestoreSettings = {
    ignoreUndefinedProperties: true
};
db.settings(firestoreSettings);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { firebaseConfig, auth, db };
}
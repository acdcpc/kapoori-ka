// app.config.js
const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  expo: {
    name: process.env.APP_NAME || "कपूरी क (Kapoori Ka)",
    slug: "kapoori-ka",
    version: process.env.APP_VERSION || "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",

    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#E6F4FE"
    },

    ios: {
      supportsTablet: true
    },

    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundColor: "#E6F4FE",
        //backgroundImage: "./assets/android-icon-background.png"
      },
      package: "com.kapoorika.app"
    },

    web: {
      favicon: "./assets/favicon.png"
    },

    plugins: [
      "expo-font",
      "expo-splash-screen",
      "expo-sharing"
    ],

    extra: {
      eas: {
        projectId: "01d906cd-047c-4e63-b718-19b4658cb8de"   // ← This was wrong before
      },
      firebaseApiKey: process.env.VITE_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.VITE_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.VITE_FIREBASE_APP_ID,
      firebaseMeasurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
    }
  }
};
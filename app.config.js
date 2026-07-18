import 'dotenv/config';

export default {
  expo: {
    name: process.env.APP_NAME || "कपूरी क (Kapoori Ka)",
    slug: "kapoori-ka",
    scheme: "com.kapoori.ka",
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
      supportsTablet: true,
      bundleIdentifier: "com.kapoori.ka"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundColor: "#E6F4FE"
      },
      package: "com.kapoori.ka",
      permissions: [
        "android.permission.INTERNET",
        "android.permission.CAMERA"
      ],
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "*.firebaseapp.com",
              pathPrefix: "/__/auth/handler"
            },
            {
              scheme: "com.kapoori.ka"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-font",
      "expo-splash-screen",
      "expo-sharing",
      [
        "react-native-vision-camera",
        {
          "cameraPermissionText": "Kapoori Ka needs camera access to measure your child's height.",
          "enableMicrophonePermission": false,
          "enableCodeScanner": false
        }
      ],
      "expo-web-browser",
      "expo-notifications"
    ],
    extra: {
      eas: {
        projectId: "01d906cd-047c-4e63-b718-19b4658cb8de"
      },
      firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      firebaseMeasurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
      googleAndroidClientId: process.env.EXPO_PUBLIC_FIREBASE_ANDROID_CLIENT_ID,
      googleIosClientId: process.env.EXPO_PUBLIC_FIREBASE_IOS_CLIENT_ID,
      googleWebClientId: process.env.EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID,
    }
  }
};

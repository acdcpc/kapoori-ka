// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for Firebase JS SDK v10/v11 + Expo Go/Metro incompatibility.
config.resolver.unstable_enablePackageExports = false;

// Allow Metro to bundle .tflite model files as assets
config.resolver.assetExts.push('tflite');

module.exports = config;

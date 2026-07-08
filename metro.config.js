// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for Firebase JS SDK v10/v11 + Expo Go/Metro incompatibility.
// Without this, Metro resolves Firebase's package.json "exports" field
// to the browser build instead of the React Native build, causing
// "TypeError: undefined is not a function" at runtime.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
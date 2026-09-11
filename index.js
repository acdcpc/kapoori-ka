// Kapoori Ka entry point — the supported Expo bootstrap.
// (Replaces the deprecated `main: node_modules/expo/AppEntry.js` pattern, which
// breaks under package managers/hoisting layouts that don't expose expo there.)
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);

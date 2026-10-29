/**
 * Web implementation for Alert.alert.
 *
 * react-native-web ships Alert as nothing more than:
 *
 *     class Alert { static alert() {} }
 *
 * (verified in node_modules/react-native-web/dist/exports/Alert/index.js)
 *
 * So every Alert.alert() call in this app did nothing at all in the web build —
 * confirmations, validation errors, sign-out prompts and destructive-action
 * warnings were all silently swallowed, while the Android app showed them. That
 * is why buttons on the PWA appeared to "do nothing".
 *
 * Rather than rewrite 87 call sites, patch the method once at startup on web so
 * the existing native code paths keep working unchanged. Native never reaches
 * this code.
 */
import { Alert, Platform } from 'react-native';

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

function webAlert(title?: string, message?: string, buttons?: AlertButton[]): void {
  if (typeof window === 'undefined') return;

  const text = [title, message].filter(Boolean).join('\n\n');

  if (!buttons || buttons.length === 0) {
    window.alert(text);
    return;
  }

  if (buttons.length === 1) {
    window.alert(text);
    buttons[0]?.onPress?.();
    return;
  }

  // A browser confirm() has exactly two outcomes. Map the common
  // cancel + confirm pair onto it; any additional buttons collapse into the
  // confirm branch, which is the one that carries the intended action.
  const cancelButton = buttons.find((b) => b.style === 'cancel');
  const actionButton = buttons.find((b) => b.style !== 'cancel');

  if (window.confirm(text)) actionButton?.onPress?.();
  else cancelButton?.onPress?.();
}

let installed = false;

export function installWebAlertShim(): void {
  if (Platform.OS !== 'web' || installed) return;
  installed = true;
  try {
    (Alert as unknown as { alert: typeof webAlert }).alert = webAlert;
  } catch {
    // If the class is frozen the app still runs; alerts just stay inert.
  }
}

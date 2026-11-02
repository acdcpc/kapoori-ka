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
 *
 * Two rules this follows, both learned the hard way:
 *
 * 1. Render a real dialog, do not wrap window.confirm(). Browser dialogs are
 *    suppressed in some standalone-PWA contexts, and a suppressed confirm()
 *    silently returns false — which looks exactly like "the button does
 *    nothing" again.
 * 2. Render every button with its own handler. An earlier version collapsed the
 *    array into "cancel + action" by picking the first button whose style was
 *    not 'cancel', but many call sites write Cancel without a style, so the
 *    cancel button was treated as the action and the tap went to a no-op.
 *    Rendering them all removes that class of bug entirely, and three-button
 *    prompts finally work on web too.
 */
import { Alert, Platform } from 'react-native';

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

const OVERLAY_ID = 'kk-web-alert';

function apply(element: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
  Object.assign(element.style, styles);
}

function prefersDark(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

function webAlert(title?: string, message?: string, buttons?: AlertButton[]): void {
  if (typeof document === 'undefined' || !document.body) return;

  // Never stack dialogs: a second alert replaces the first.
  document.getElementById(OVERLAY_ID)?.remove();

  const dark = prefersDark();
  const list: AlertButton[] = buttons && buttons.length ? buttons : [{ text: 'OK' }];

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  if (title) overlay.setAttribute('aria-label', title);
  apply(overlay, {
    position: 'fixed',
    top: '0',
    right: '0',
    bottom: '0',
    left: '0',
    background: 'rgba(26, 21, 18, 0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    zIndex: '2147483000',
    boxSizing: 'border-box',
  });

  const card = document.createElement('div');
  apply(card, {
    width: '100%',
    maxWidth: '360px',
    background: dark ? '#241E1A' : '#FFFDF9',
    color: dark ? '#F5EDE4' : '#1A1512',
    borderRadius: '16px',
    padding: '22px 20px 16px',
    boxShadow: '0 18px 48px rgba(0,0,0,0.28)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  });

  if (title) {
    const heading = document.createElement('div');
    heading.textContent = title;
    apply(heading, {
      fontSize: '17px',
      fontWeight: '700',
      lineHeight: '1.3',
      marginBottom: message ? '8px' : '16px',
    });
    card.appendChild(heading);
  }

  if (message) {
    const body = document.createElement('div');
    body.textContent = message;
    apply(body, {
      fontSize: '14px',
      lineHeight: '1.55',
      color: dark ? '#C8B9AB' : '#5B4B3F',
      whiteSpace: 'pre-wrap',
    });
    card.appendChild(body);
  }

  const row = document.createElement('div');
  apply(row, {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '20px',
  });

  const teardown = (): void => {
    overlay.remove();
    document.removeEventListener('keydown', onKeyDown);
  };

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    const cancel = list.find((b) => b.style === 'cancel');
    teardown();
    cancel?.onPress?.();
  }

  list.forEach((button, index) => {
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = button.text || 'OK';

    // Visual hierarchy only — every button keeps its own handler either way.
    // React Native call sites list the dismiss option first and the action
    // last, and usually omit style on the dismiss option, so the last button is
    // the primary one and everything before it is secondary.
    const destructive = button.style === 'destructive';
    const cancel = button.style === 'cancel';
    const primary = !destructive && !cancel && index === list.length - 1;

    apply(element, {
      appearance: 'none',
      border: 'none',
      borderRadius: '10px',
      padding: '11px 18px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      background: destructive ? '#C2410C' : primary ? '#E8602C' : 'transparent',
      color: destructive || primary ? '#FFFFFF' : dark ? '#C8B9AB' : '#7A6656',
      minWidth: '72px',
    });

    element.addEventListener('click', () => {
      teardown();
      try {
        button.onPress?.();
      } catch (error) {
        console.error('[web-alert] button handler failed:', error);
      }
    });
    row.appendChild(element);
  });

  card.appendChild(row);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  document.addEventListener('keydown', onKeyDown);
  (row.firstElementChild as HTMLElement | null)?.focus?.();
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

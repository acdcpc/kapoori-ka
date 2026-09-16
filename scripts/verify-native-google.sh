#!/usr/bin/env bash
# Verifies native Google Sign-In on a connected Android device.
#
# Usage: scripts/verify-native-google.sh [app.apk] [timeout-seconds]
#
# Without an APK argument it only launches the installed build. The script clears
# logcat, starts the app, then waits for the log lines AuthContext emits, so the
# verdict does not depend on reading the screen from a screenshot.
set -uo pipefail

APK="${1:-}"
TIMEOUT="${2:-90}"
PKG="com.kapoori.ka"

say() { printf '\n== %s\n' "$*"; }

command -v adb >/dev/null 2>&1 || { echo "adb not found in PATH"; exit 2; }
DEV="$(adb devices | awk 'NR>1 && $2=="device" {print $1; exit}')"
[ -n "$DEV" ] || { echo "No authorized device. Plug in the phone and accept the USB-debugging prompt."; exit 2; }
say "device: $DEV ($(adb -s "$DEV" shell getprop ro.product.model | tr -d '\r'))"

if [ -n "$APK" ]; then
  [ -f "$APK" ] || { echo "APK not found: $APK"; exit 2; }
  say "installing $APK"
  adb -s "$DEV" install -r "$APK" || exit 1
fi

# Google Sign-In failures surface as a Play Services status code in logcat.
say "clearing logcat and starting the app"
adb -s "$DEV" logcat -c 2>/dev/null
adb -s "$DEV" shell am force-stop "$PKG"
adb -s "$DEV" shell am start -n "$PKG/.MainActivity" >/dev/null

say "On the phone: sign out if needed, then tap 'Continue with Google'."
echo "   Waiting up to ${TIMEOUT}s for the AuthContext verdict..."

VERDICT=""
deadline=$(( $(date +%s) + TIMEOUT ))
while [ "$(date +%s)" -lt "$deadline" ]; do
  OUT="$(adb -s "$DEV" logcat -d -v brief 2>/dev/null | grep -aE '\[AuthContext\]|\[LOGIN\]')"
  case "$OUT" in
    *"Signed in via native Google Sign-In"*)     VERDICT=native;   break ;;
    *"Native Google Sign-In cancelled by user"*) VERDICT=cancelled; break ;;
    *"Native Google Sign-In unavailable"*)       VERDICT=fallback; break ;;
  esac
  sleep 3
done

say "evidence"
printf '%s\n' "${OUT:-<no AuthContext lines captured>}"

say "verdict"
case "$VERDICT" in
  native)
    echo "PASS - native Google picker + Supabase ID-token exchange worked." ;;
  cancelled)
    echo "PASS (UX) - the user closed the picker and no browser was opened." ;;
  fallback)
    echo "NOT NATIVE - the app fell back to the browser flow. Read the reason above:"
    echo "  'Cannot request idToken with an Android client ID' / status code 10 (DEVELOPER_ERROR)"
    echo "      -> the registered package name or SHA-1 does not match this build's signing key."
    echo "  'Unacceptable audience in id_token' / audience error from Supabase"
    echo "      -> add the Web client ID to Supabase > Authentication > Providers > Google > Client IDs."
    echo "  'webClientId is empty' or no idToken"
    echo "      -> EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID was missing at build time (check eas.json env)." ;;
  *)
    echo "INCONCLUSIVE - nothing matched within ${TIMEOUT}s. Was 'Continue with Google' tapped?" ;;
esac

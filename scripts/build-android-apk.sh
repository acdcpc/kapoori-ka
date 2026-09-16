#!/usr/bin/env bash
# Builds the Kapoori Ka preview APK, downloads it, installs it on the connected
# device and verifies native Google Sign-In.
#
# Usage: scripts/build-android-apk.sh [output-dir]
#
# Authentication (one of):
#   npx eas login                     # interactive, stores a session locally
#   export EXPO_TOKEN=<robot token>   # https://expo.dev/settings/access-tokens
set -euo pipefail

PROFILE="${PROFILE:-preview}"
OUT_DIR="${1:-.openclaw/tmp}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
mkdir -p "$OUT_DIR"

say() { printf '\n== %s\n' "$*"; }

if ! npx eas whoami >/dev/null 2>&1; then
  echo "FAIL: EAS is not authenticated."
  echo "  Fix: npx eas login            (or export EXPO_TOKEN=<token> and re-run)"
  exit 3
fi
say "EAS account: $(npx eas whoami 2>/dev/null | tail -1)"

say "Building profile '$PROFILE' (this queues on EAS and can take 10-25 minutes)"
BUILD_JSON="$OUT_DIR/eas-build.json"
npx eas build --profile "$PROFILE" --platform android --non-interactive --wait --json > "$BUILD_JSON"

read -r BUILD_ID ARTIFACT_URL <<<"$(python3 - "$BUILD_JSON" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
b = data[0] if isinstance(data, list) else data
print(b.get("id", "unknown"), b.get("artifacts", {}).get("applicationArchiveUrl") or b.get("artifactUrl") or "")
PY
)"

if [ -z "${ARTIFACT_URL:-}" ] || [ "$ARTIFACT_URL" = "None" ]; then
  echo "FAIL: the build finished without an APK URL. Inspect $BUILD_JSON"
  exit 1
fi
say "Build $BUILD_ID finished"

APK="$OUT_DIR/kapoori-ka-$PROFILE.apk"
say "Downloading APK -> $APK"
curl -L --fail -o "$APK" "$ARTIFACT_URL"

# Confirm the signing certificate matches the fingerprint registered for the
# Android OAuth client, otherwise Google rejects native sign-in (DEVELOPER_ERROR).
if [ -x "$HOME/Library/Android/sdk/build-tools/36.0.0/apksigner" ]; then
  say "Signing certificate"
  JAVA_HOME="${JAVA_HOME:-/Applications/Android Studio.app/Contents/jbr/Contents/Home}" \
    "$HOME/Library/Android/sdk/build-tools/36.0.0/apksigner" verify --print-certs "$APK" \
    | grep -iE "SHA-1|SHA-256" || true
  echo "   Expected SHA-1 (registered on the Android OAuth client):"
  echo "   F9:70:A8:53:C2:DC:F6:DC:9C:1A:DF:5F:1C:37:DE:4F:E8:19:B1:6A"
fi

if adb devices 2>/dev/null | awk 'NR>1 && $2=="device"' | grep -q .; then
  say "Device detected - installing and verifying"
  exec "$REPO_ROOT/scripts/verify-native-google.sh" "$APK"
else
  say "No device attached."
  echo "APK ready: $APK"
  echo "Plug in the phone (or enable wireless debugging), then run:"
  echo "  scripts/verify-native-google.sh $APK"
fi

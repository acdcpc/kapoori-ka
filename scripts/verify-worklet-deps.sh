#!/usr/bin/env bash
set -euo pipefail
# verify-worklet-deps.sh — Check that all Babel plugins required by
# react-native-worklets-core (for VisionCamera frame processor worklets)
# are resolvable. Phantom dependencies in pnpm cause EAS build failures
# when these aren't explicitly listed in package.json devDependencies.
#
# See: https://github.com/mrousavy/react-native-worklets-core#pnpm-hoisting

cd "$(dirname "$0")/.."

PLUGINS=(
  "@babel/plugin-transform-arrow-functions"
  "@babel/plugin-transform-shorthand-properties"
  "@babel/plugin-proposal-nullish-coalescing-operator"
  "@babel/plugin-proposal-optional-chaining"
  "@babel/plugin-transform-template-literals"
  "@babel/core"
  "@babel/generator"
  "@babel/traverse"
)

FAIL=0
for pkg in "${PLUGINS[@]}"; do
  if node -e "require.resolve('$pkg')" 2>/dev/null; then
    echo "  ✅ $pkg"
  else
    echo "  ❌ $pkg — MISSING (add to devDependencies in package.json)"
    FAIL=1
  fi
done

if [ $FAIL -eq 0 ]; then
  echo ""
  echo "✅ All 8 Babel worklet dependencies resolved. Build safe to proceed."
  exit 0
else
  echo ""
  echo "❌ Missing Babel worklet dependencies. EAS build WILL fail."
  echo "Run: pnpm add -D <missing-package> for each ❌ above."
  exit 1
fi

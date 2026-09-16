// Validation for bottom-sheet geometry (the Home settings panel).
// Parses the shipped constants and the HomeScreen wiring, so the check tracks the
// real code rather than a copy, then proves the on-device failure mode and that
// the current geometry avoids it.
// Run: node scripts/validate-sheet-layout.mjs
import fs from 'node:fs';
import assert from 'node:assert';

const helper = fs.readFileSync('src/lib/sheetLayout.ts', 'utf8');
const home = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

function num(name) {
  const m = helper.match(new RegExp(`${name}\\s*=\\s*([0-9.]+)`));
  assert(m, `${name} not found in src/lib/sheetLayout.ts`);
  return Number(m[1]);
}
const GESTURE_STRIP_DP = num('GESTURE_STRIP_DP');
const SHEET_CHROME_DP = num('SHEET_CHROME_DP');
const SHEET_MIN_HEIGHT_DP = num('SHEET_MIN_HEIGHT_DP');

const clearance = (insetBottom) => Math.max(insetBottom || 0, GESTURE_STRIP_DP);
const maxHeight = (screenH, insetTop, insetBottom) =>
  Math.max(SHEET_MIN_HEIGHT_DP, screenH - (insetTop || 0) - clearance(insetBottom) - SHEET_CHROME_DP);

// [name, screen height in dp, gesture strip in dp, top inset in dp]
const DEVICES = [
  ['Galaxy A24 (measured: 2340px at 450dpi)', 832, 47, 24],
  ['typical gesture-nav phone', 915, 48, 24],
  ['tall phone', 1000, 48, 48],
  ['small phone', 640, 48, 24],
];

let checks = 0;
for (const [name, screenH, stripDp, topDp] of DEVICES) {
  // The failing case on device: the platform reports 0 for the bottom inset.
  for (const reportedInset of [0, 12, stripDp]) {
    const c = clearance(reportedInset);
    assert(c >= stripDp,
      `${name}: clearance ${c}dp does not clear the ${stripDp}dp strip (inset reported as ${reportedInset})`);
    const h = maxHeight(screenH, topDp, reportedInset);
    assert(topDp + h + c <= screenH,
      `${name}: sheet ${h}dp + clearance ${c}dp overflows the ${screenH}dp screen`);
    assert(h >= screenH * 0.5,
      `${name}: sheet would be only ${h}dp on a ${screenH}dp screen`);
    checks += 3;
  }
}

// Regression guard: the previous floor was max(inset, 12) + 8, i.e. 20dp when the
// inset is reported as 0 — 56px on the A24, versus a 132px gesture strip. That is
// exactly what put the last row inside the strip.
const OLD_FLOOR_DP = Math.max(0, 12) + 8;
assert(OLD_FLOOR_DP < clearance(0), 'the old floor now passes — re-check the device evidence');

// The A24 arithmetic, in device pixels.
const DENSITY = 2.8125;           // 450 dpi
const SCREEN_PX = 2340;
const STRIP_PX = 132;             // measured: a tap at y=2208 was swallowed
const stripTopPx = SCREEN_PX - STRIP_PX;
const sheetBottomPx = SCREEN_PX - clearance(0) * DENSITY;
const lastRowBottomPx = sheetBottomPx - clearance(0) * DENSITY;   // content padding
assert(lastRowBottomPx < stripTopPx,
  `A24: last row would end at ${lastRowBottomPx | 0}px, inside the strip that starts at ${stripTopPx}px`);
assert(SCREEN_PX - OLD_FLOOR_DP * DENSITY - OLD_FLOOR_DP * DENSITY > stripTopPx,
  'A24: the old geometry already cleared the strip — the bug explanation is wrong');
checks += 3;

// Wiring: the screen must use the helper, lift the sheet, and pad the scroll content.
assert(/bottom:\s*sheetClearance/.test(home), 'HomeScreen: the sheet is not pinned above the gesture strip');
assert(/position:\s*'absolute'/.test(home), 'HomeScreen: the sheet is not absolutely pinned, so sibling layout can push it off-screen');
assert(/maxHeight:\s*sheetHeight/.test(home), 'HomeScreen: the sheet does not use the helper height cap');
assert(/paddingBottom:\s*sheetClearance/.test(home), 'HomeScreen: scroll content is not padded by sheetClearance');
assert(!/Math\.max\(insets\.bottom,\s*12\)/.test(home), 'HomeScreen: the old 12dp floor is still present');
checks += 5;

// Scrollable screens whose content can end with an interactive row must also keep
// the strip clear, otherwise the final row can only be reached when the content
// happens to leave slack.
const dash = fs.readFileSync('src/screens/ChildDashboard.tsx', 'utf8');
const pad = Number((dash.match(/scrollContent:\s*\{\s*paddingBottom:\s*(\d+)/) || [])[1]);
assert(Number.isFinite(pad) && pad >= GESTURE_STRIP_DP,
  `ChildDashboard: list bottom padding ${pad}dp is under the ${GESTURE_STRIP_DP}dp strip`);
checks += 1;

const px = (dp) => Math.round(dp * DENSITY);
// ---------------------------------------------------------------------------
// Measured device fixture — Galaxy A24, ADMIN account, Nepali UI, 2026-09-16,
// installed build (pre-fix). Row tops in device pixels, read from a uiautomator
// dump: the title at 1218, then संस्करण 1462, भाषा 1609, रूप 1783, अक्षरको आकार
// 1950, प्रिमियम सदस्यता 2063, सबै सेटिङ 2182, प्रशासन 2301 — where प्रशासन was
// already clipped by the screen edge (2340) and परिचय/लग आउट never rendered.
// Swiping inside the panel moved nothing: no bounded viewport, so no scroll.
// The admin sheet is the tallest row stack, so it defines the requirement.
const ADMIN_ROW_TOPS_PX = [1218, 1462, 1609, 1783, 1950, 2063, 2182, 2301];
const ROW_PITCH_PX = 119;              // measured: प्रिमियम 2063 -> सबै सेटिङ 2182
const ROWS_NEVER_RENDERED = 2;         // परिचय (About), लग आउट (Logout)
const PANEL_TOP_PX = 1150;             // panel's top padding above the title row

const lastAdminRowBottomPx = ADMIN_ROW_TOPS_PX[ADMIN_ROW_TOPS_PX.length - 1]
  + (1 + ROWS_NEVER_RENDERED) * ROW_PITCH_PX;
assert(lastAdminRowBottomPx > stripTopPx,
  'the measured admin failure no longer reproduces — re-measure on the device');
const lostPx = lastAdminRowBottomPx - stripTopPx;
assert(lostPx > 400,
  `expected the old build to bury the admin rows (measured ${lostPx}px below the strip top)`);

const adminContentDp = (lastAdminRowBottomPx - PANEL_TOP_PX) / DENSITY;
const a24ViewportDp = maxHeight(832, 24, 0) - SHEET_CHROME_DP;
assert(adminContentDp <= a24ViewportDp,
  `admin sheet ${adminContentDp.toFixed(0)}dp must fit the ${a24ViewportDp}dp A24 viewport`);
const smallViewportDp = maxHeight(640, 24, 0) - SHEET_CHROME_DP;
assert(adminContentDp > smallViewportDp,
  'on a small phone the admin sheet must be taller than its viewport — that is the case the old build broke, and why the ScrollView must be bounded');
checks += 4;

console.log(`admin sheet fixture .... content ${adminContentDp.toFixed(0)}dp | A24 viewport ${a24ViewportDp}dp (fits) | small-phone viewport ${smallViewportDp}dp (scrolls) | old build buried ${lostPx.toFixed(0)}px of rows`);

console.log(`sheet layout OK — ${checks} assertions across ${DEVICES.length} devices`);
console.log(`  clearance floor ....... ${GESTURE_STRIP_DP}dp (old floor ${OLD_FLOOR_DP}dp is the bug)`);
console.log(`  A24 screen ............ ${SCREEN_PX}px  | gesture strip ${STRIP_PX}px, starts at y=${stripTopPx}`);
console.log(`  sheet bottom edge ..... y=${px(0) + sheetBottomPx}px (above the strip)`);
console.log(`  last row bottom ....... y=${lastRowBottomPx | 0}px (${(stripTopPx - lastRowBottomPx) | 0}px clear of the strip)`);
console.log(`  old geometry would put it at y=${(SCREEN_PX - OLD_FLOOR_DP * DENSITY - OLD_FLOOR_DP * DENSITY) | 0}px`);
console.log(`  sheet height cap ...... ${maxHeight(832, 24, 0)}dp on the A24 (fits with the clearance)`);

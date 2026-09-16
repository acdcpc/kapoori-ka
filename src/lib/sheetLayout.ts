/**
 * Geometry for bottom sheets (the Home settings panel and anything shaped like it).
 *
 * Measured on the A24 (2340x1080 px, 450 dpi = 2.8125 px/dp, Android 16 gesture
 * navigation): the system gesture strip occupies the bottom ~132 px = 47 dp, and
 * `useSafeAreaInsets().bottom` reported 0 here. A sheet that trusts the reported
 * inset therefore renders its last rows inside the strip, where the tap is
 * swallowed by the home gesture — the row is visible but does nothing. Sheets
 * must carry a hard dp floor of their own.
 */
export const GESTURE_STRIP_DP = 48;

/** Handle + title + panel padding + breathing room, in dp. */
export const SHEET_CHROME_DP = 96;

/** Minimum usable sheet height, in dp. */
export const SHEET_MIN_HEIGHT_DP = 240;

/** Distance the sheet's bottom edge must keep from the screen bottom, in dp. */
export function sheetBottomClearance(insetBottom: number): number {
  return Math.max(insetBottom || 0, GESTURE_STRIP_DP);
}

/** Height cap that keeps the sheet fully on screen above the gesture strip. */
export function sheetMaxHeight(screenH: number, insetTop: number, insetBottom: number): number {
  const fits = screenH - (insetTop || 0) - sheetBottomClearance(insetBottom) - SHEET_CHROME_DP;
  return Math.max(SHEET_MIN_HEIGHT_DP, fits);
}

content = open("src/screens/HeightMeasureScreen.tsx", "r").read()

# === Module-scope helpers (add after _toOrientation) ===
helper_marker = "function _toOrientation(s: string): '0deg' | '90deg' | '270deg' | '180deg' | undefined {"
helpers_insert = """// ── Worklet-safe cast helpers (module scope) ──
// Called from within worklet closures to avoid TS-specific syntax.
function _asArrayBuffer(v: any): ArrayBuffer { return v; }
function _asLang(s: string): 'en' | 'ne' { return s as 'en' | 'ne'; }

"""
content = content.replace(helper_marker, helpers_insert + helper_marker)

# === FIX #1: onResult closure (line 417) — currentLanguage as 'en' | 'ne' ===
# Replace: currentLanguage as 'en' | 'ne'
# With: _asLang(currentLanguage)
old_lang_cast = "currentLanguage as 'en' | 'ne'"
new_lang_cast = "_asLang(currentLanguage)"
content = content.replace(old_lang_cast, new_lang_cast)

# === FIX #2: runDetectorJS (lines 478-500) ===
old_detector = """      const out = m.runSync([copy]);
        if (!out?.[0]) { _gCropRes = null; return; }
        const raw = new Float32Array(out[0] as unknown as ArrayBuffer);"""
new_detector = """      var out = m.runSync([copy]);
        var out0 = (out && out[0]) ? out[0] : null;
        if (!out0) { _gCropRes = null; return; }
        var raw = new Float32Array(_asArrayBuffer(out0));"""
content = content.replace(old_detector, new_detector)

# === FIX #3: runLandmarkJS (lines 505-513) ===
old_landmark = """      const out = m.runSync([copy]);
        if (!out?.[0]) return;
        const raw = new Float32Array(out[0] as unknown as ArrayBuffer);
        const crop = _gCropRes;
        const landmarks = parseLandmarks(raw, fw, fh, crop?.cx ?? 0, crop?.cy ?? 0, crop?.cw ?? 1, crop?.ch ?? 1);
        onResult(landmarks, crop?.score ?? 0.5);"""
new_landmark = """      var out = m.runSync([copy]);
        var out0 = (out && out[0]) ? out[0] : null;
        if (!out0) return;
        var raw = new Float32Array(_asArrayBuffer(out0));
        var crop = _gCropRes;
        var cCx = (crop && crop.cx !== undefined) ? crop.cx : 0;
        var cCy = (crop && crop.cy !== undefined) ? crop.cy : 0;
        var cCw = (crop && crop.cw !== undefined) ? crop.cw : 1;
        var cCh = (crop && crop.ch !== undefined) ? crop.ch : 1;
        var cScore = (crop && crop.score !== undefined) ? crop.score : 0.5;
        var landmarks = parseLandmarks(raw, fw, fh, cCx, cCy, cCw, cCh);
        onResult(landmarks, cScore);"""
content = content.replace(old_landmark, new_landmark)

open("src/screens/HeightMeasureScreen.tsx", "w").write(content)
print("SUCCESS")

content = open("src/screens/HeightMeasureScreen.tsx", "r").read()

# Problem: the `rotation` computed in the worklet is a `string` but resize.resize
# expects `"0deg" | "90deg" | "270deg" | "180deg" | undefined`.
# 
# Fix: add a small helper function OUTSIDE the worklet that does the cast.
# The worklet calls the helper which returns the right type.

# Insert helper before the fp definition
fp_marker = "  // ── TWO-STAGE FRAME PROCESSOR ──"
helper = """  // ── Worklet-safe orientation helper ──
  // The worklet cannot contain TS type assertions. This tiny helper does
  // the cast outside the worklet closure so the worklet body stays plain JS.
  const _toOrientation = (s: string): '0deg' | '90deg' | '270deg' | '180deg' | undefined => {
    if (s === 'portrait') return '0deg';
    if (s === 'landscape-left') return '90deg';
    if (s === 'landscape-right') return '270deg';
    if (s === 'landscape') return '180deg';
    return undefined;
  };

"""
content = content.replace(fp_marker, helper + fp_marker)

# Now replace the orientation computation inside the worklet
old_orient = """        var orientationStr = String(frame.orientation || ''); var rotation = orientationStr === 'portrait' ? '0deg'
          : orientationStr === 'landscape-left' ? '90deg'
          : orientationStr === 'landscape-right' ? '270deg'
          : '0deg';"""
new_orient = """        var rotation = _toOrientation(String(frame.orientation || ''));"""
content = content.replace(old_orient, new_orient)

# And fix the rotation line
old_rot_line = "          rotation: rotation,"
new_rot_line = "          rotation: rotation,"
content = content.replace(old_rot_line, new_rot_line)

open("src/screens/HeightMeasureScreen.tsx", "w").write(content)
print("SUCCESS")

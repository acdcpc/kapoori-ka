content = open("src/screens/HeightMeasureScreen.tsx", "r").read()

# Find the component function start
comp_start = content.find("export default function HeightMeasureScreen")
if comp_start == -1:
    print("ERROR: cannot find component")
    exit(1)

# Find the helper block to remove from inside the component
old_block = """  // ── Worklet-safe orientation helper ──
  // The worklet cannot contain TS type assertions. This tiny helper does
  // the cast outside the worklet closure so the worklet body stays plain JS.
  const _toOrientation = (s: string): '0deg' | '90deg' | '270deg' | '180deg' | undefined => {
    if (s === 'portrait') return '0deg';
    if (s === 'landscape-left') return '90deg';
    if (s === 'landscape-right') return '270deg';
    if (s === 'landscape') return '180deg';
    return undefined;
  };

  // ── TWO-STAGE FRAME PROCESSOR ──"""

# The replacement (just the FP header, helper moved to module scope)
new_block = """  // ── TWO-STAGE FRAME PROCESSOR ──"""

# The helper at module scope (before the component)
module_helper = """// ── Worklet-safe orientation helper (module scope) ──
// Must be at module scope so the worklet can reference it without
// capturing a component-local closure variable (which worklets can't do).
function _toOrientation(s: string): '0deg' | '90deg' | '270deg' | '180deg' | undefined {
  if (s === 'portrait') return '0deg';
  if (s === 'landscape-left') return '90deg';
  if (s === 'landscape-right') return '270deg';
  if (s === 'landscape') return '180deg';
  return undefined;
}

"""

# Replace inside component
if old_block in content:
    content = content.replace(old_block, new_block)
else:
    print("ERROR: helper block not found")
    exit(1)

# Insert at module scope (before export default)
module_scope_insert = "\n" + module_helper + "export default function HeightMeasureScreen"
content = content.replace("\nexport default function HeightMeasureScreen", module_scope_insert)

open("src/screens/HeightMeasureScreen.tsx", "w").write(content)
print("SUCCESS")

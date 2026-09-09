// Validation for WHO head-circumference tables + z-score/percentile math.
// Mirrors src/utils/growthCalculations.ts formulas; parses src/data/whoHCFA.ts
// directly so the test always checks the shipped data.
// Run: node scripts/validate-hc-calculations.mjs
import fs from 'node:fs';
import assert from 'node:assert';

const src = fs.readFileSync('src/data/whoHCFA.ts', 'utf8');
function parseTable(exportName) {
  const i = src.indexOf(`export const ${exportName}`);
  const j = src.indexOf('];', i);
  const rows = [];
  const re = /\[(\d+), ([\d.]+), ([\d.]+), ([\d.]+), ([\d.]+), ([\d.]+)\]/g;
  let m;
  while ((m = re.exec(src.slice(i, j + 2))) !== null) {
    rows.push([+m[1], +m[2], +m[3], +m[4], +m[5], +m[6]]);
  }
  return rows;
}
const BOYS = parseTable('WHO_HCFA_BOYS');
const GIRLS = parseTable('WHO_HCFA_GIRLS');
assert(BOYS.length >= 20 && GIRLS.length >= 20, 'HC tables present');

function rowAt(table, age) {
  if (age <= table[0][0]) return table[0].slice(1);
  const last = table[table.length - 1];
  if (age >= last[0]) return last.slice(1);
  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i], b = table[i + 1];
    if (age >= a[0] && age <= b[0]) {
      const f = (age - a[0]) / (b[0] - a[0]);
      return [1, 2, 3, 4, 5].map(k => a[k] + f * (b[k] - a[k]));
    }
  }
  return last.slice(1);
}
const zOf = (v, age, table) => { const r = rowAt(table, age); return (v - r[2]) / ((r[3] - r[1]) / 4); };
const pctOf = (z) => {
  const zz = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * zz);
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const p = (Math.exp(-zz * zz / 2) / Math.sqrt(2 * Math.PI)) * poly;
  return Math.round(Math.min(99.9, Math.max(0.1, (z >= 0 ? 1 - p : p) * 100)) * 10) / 10;
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// ── 1. WHO published anchors (dummy validation of the table itself) ──
assert(near(rowAt(BOYS, 0)[2], 34.5, 0.15), 'boys 0mo median 34.5');
assert(near(rowAt(GIRLS, 0)[2], 33.9, 0.15), 'girls 0mo median 33.9');
assert(near(rowAt(BOYS, 6)[2], 43.3, 0.2), 'boys 6mo median 43.3');
assert(near(rowAt(GIRLS, 6)[2], 42.2, 0.2), 'girls 6mo median 42.2');
assert(near(rowAt(BOYS, 12)[2], 46.1, 0.2), 'boys 12mo median 46.1');
assert(near(rowAt(GIRLS, 12)[2], 44.9, 0.2), 'girls 12mo median 44.9');
assert(rowAt(BOYS, 60)[2] > 50 && rowAt(BOYS, 60)[2] < 51.5, 'boys 60mo median ~50.7-51.2');
console.log('✓ WHO published anchors (boys/girls, 0/6/12/60 mo)');

// ── 2. z-score math with dummy values ──
assert(near(zOf(34.5, 0, BOYS), 0, 0.01), 'median → z=0');
// 1-decimal column rounding puts the ±2SD markers at z≈±1.96/±2.04
assert(near(zOf(rowAt(BOYS, 0)[3], 0, BOYS), 2, 0.06), '+2SD row → z≈2');
assert(near(zOf(rowAt(BOYS, 0)[1], 0, BOYS), -2, 0.06), '-2SD row → z≈-2');
console.log('✓ z-score anchors (median/±2SD)');

// ── 3. percentile conversion ──
assert(near(pctOf(0), 50, 0.2), 'z=0 → p50');
assert(near(pctOf(1.96), 97.5, 0.4), 'z≈1.96 → p97.5');
assert(near(pctOf(-1.28), 10, 0.6), 'z≈-1.28 → p10');
console.log('✓ percentile conversion (normal CDF)');

// ── 4. real-data style cases ──
// Newborn boy 35.5 cm → around p70 (typical healthy newborn)
const pNewborn = pctOf(zOf(35.5, 0, BOYS));
assert(pNewborn > 55 && pNewborn < 85, `newborn 35.5cm → ${pNewborn}th percentile (plausible range)`);
// 2-year-old girl 47.2 cm = WHO median → p50
assert(near(zOf(47.2, 24, GIRLS), 0, 0.05), 'girl 24mo 47.2cm = median');
// Microcephaly flag: 27-month boy at -2.5SD
assert(zOf(rowAt(BOYS, 27)[2] - 2.5 * ((rowAt(BOYS, 27)[3] - rowAt(BOYS, 27)[1]) / 2), 27, BOYS) < -2.4, 'microcephaly detection');
// Monotonic percentiles across a HC sweep at 12 months
const sweep = [41, 42.5, 44, 45.5, 47, 48.5].map(v => pctOf(zOf(v, 12, BOYS)));
for (let i = 1; i < sweep.length; i++) assert(sweep[i] > sweep[i - 1], `monotonic at ${i}`);
console.log('✓ real-data style cases (newborn, toddler, microcephaly, monotonic sweep)');
console.log('✓ HC calculations validated');

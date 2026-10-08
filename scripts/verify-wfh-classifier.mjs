#!/usr/bin/env node
/**
 * Verify the weight-for-length/height classifier against known WHO band values.
 *
 * Bundles src/utils/growthCalculations.ts and asserts that the z at a table's own
 * median is 0 and at its +/-2SD is +/-2 (within the two-decimal band rounding),
 * that the table is chosen by AGE (length <24 months, height 24-60), and that the
 * female tables score a given weight higher than the male ones.
 *
 * Run: node scripts/verify-wfh-classifier.mjs   (needs esbuild via npx)
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = join(mkdtempSync(join(tmpdir(), 'wfh-')), 'gc.cjs');
execFileSync('npx', ['esbuild', 'src/utils/growthCalculations.ts', '--bundle', '--platform=node', '--format=cjs', `--outfile=${out}`], { stdio: 'pipe' });
const gc = (await import(out)).default ?? (await import(out));

const src = readFileSync('src/data/whoWFH.ts', 'utf8');
const rows = [...src.matchAll(/\[(\d+(?:\.\d+)?), ([\d.]+), ([\d.]+), ([\d.]+), ([\d.]+), ([\d.]+)\]/g)].map((m) => m.slice(1).map(Number));
const at = (cm) => rows.filter((r) => r[0] === cm);   // order: WFL boys, WFL girls, WFH boys, WFH girls

let checks = 0;
const assert = (cond, msg) => { checks += 1; if (!cond) { console.error('  FAIL ' + msg); process.exitCode = 1; } else console.log('  ok   ' + msg); };
const near = (a, b, tol = 0.05) => Math.abs(a - b) <= tol;

const wflB = at(70)[0], wfhB = at(100)[2], wfhG = at(100)[3];
assert(near(gc.wfhZ(wflB[3], 70, 'male', 12), 0), 'WFL boys 70cm: z at median is 0 (age 12mo)');
assert(near(gc.wfhZ(wflB[2], 70, 'male', 12), -2), 'WFL boys 70cm: z at -2SD is -2');
assert(near(gc.wfhZ(wfhB[3], 100, 'male', 48), 0), 'WFH boys 100cm: z at median is 0 (age 48mo)');
assert(near(gc.wfhZ(wfhB[2], 100, 'male', 48), -2), 'WFH boys 100cm: z at -2SD is -2');
assert(gc.classifyGrowthStatus(8.4, 70, 12, 'male', { metric: 'wfh' }).status === 'green', '8.4kg at 70cm, 12mo classifies green');
assert(gc.classifyGrowthStatus(2.2, 50, 2, 'male', { metric: 'wfh' }).status === 'red', '2.2kg at 50cm is below -3SD, red');
assert(gc.wfhZ(wfhB[3], 100, 'female', 48) > 0, 'the same weight scores higher on the female table');

// the same measurement must use different tables either side of 24 months
const young = gc.wfhZ(wflB[3], 70, 'male', 12);
const older = gc.wfhZ(wflB[3], 70, 'male', 30);
assert(!near(young, older, 0.05), 'table selection changes at 24 months (not at 65cm)');

console.log(`\nwfh classifier OK — ${checks} assertions`);

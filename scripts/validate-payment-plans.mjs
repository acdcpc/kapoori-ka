#!/usr/bin/env node
/**
 * Static guard for the plan/price contract.
 *
 * Why this exists: the 6-month plan became unbuyable because
 * `payments_plan_check` still listed ('monthly','yearly') while the purchase
 * flow submitted '6months'. Every validator in this repo is static and offline,
 * so nothing ever inserted a row and the mismatch reached customers.
 *
 * This compares three sources that must agree:
 *   1. the latest `payments_plan_check` constraint in supabase/migrations
 *   2. the `p_plan` allowlist in the latest `create_payment_submission`
 *   3. the plan ids the client actually offers (src/lib/pricing.ts)
 *
 * Any disagreement fails.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS = 'supabase/migrations';
const PRICING = 'src/lib/pricing.ts';

let failures = 0;
const fail = (msg) => { console.error(`  FAIL  ${msg}`); failures++; };
const ok = (msg) => console.log(`  ok    ${msg}`);

// ── 1. constraint values, from the last migration that defines them ──────────
const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
let constraintPlans = null;
let constraintFile = null;

for (const file of files) {
  const sql = readFileSync(join(MIGRATIONS, file), 'utf8');
  // ADD CONSTRAINT payments_plan_check CHECK (plan IN ('a','b')) on one line
  const re = /payments_plan_check\s+CHECK\s*\(\s*plan\s+IN\s*\(([^)]*)\)/gi;
  let m;
  while ((m = re.exec(sql)) !== null) {
    constraintPlans = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    constraintFile = file;
  }
}

// ── 2. p_plan allowlist, from the last create_payment_submission ────────────
let submissionPlans = null;
let submissionFile = null;
let submissionAmounts = null;

for (const file of files) {
  const sql = readFileSync(join(MIGRATIONS, file), 'utf8');
  if (!/CREATE OR REPLACE FUNCTION public\.create_payment_submission/i.test(sql)) continue;
  const allow = /p_plan\s+NOT\s+IN\s*\(([^)]*)\)/i.exec(sql);
  if (allow) {
    submissionPlans = [...allow[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    submissionFile = file;
  }
  const amount = /v_amount\s*:=\s*CASE([\s\S]*?)END\s*;/i.exec(sql);
  if (amount) {
    submissionAmounts = {};
    for (const m of amount[1].matchAll(/WHEN\s+p_plan\s*=\s*'([^']+)'\s+THEN\s+(\d+)/gi)) {
      submissionAmounts[m[1]] = Number(m[2]);
    }
    const elseMatch = /ELSE\s+(\d+)/i.exec(amount[1]);
    if (elseMatch) submissionAmounts.__else = Number(elseMatch[1]);
  }
}

// ── 3. client plan ids + prices ─────────────────────────────────────────────
let clientPlans = null;
try {
  const ts = readFileSync(PRICING, 'utf8');
  const block = /PLAN_PRICES[^=]*=\s*\{([\s\S]*?)\}/.exec(ts);
  if (!block) throw new Error('PLAN_PRICES object not found');
  clientPlans = {};
  for (const m of block[1].matchAll(/['"]?([A-Za-z0-9_]+)['"]?\s*:\s*(\d+)/g)) {
    clientPlans[m[1]] = Number(m[2]);
  }
} catch (err) {
  fail(`could not read client plans from ${PRICING}: ${err.message}`);
}

console.log('Payment plan contract');
if (constraintPlans) ok(`constraint allows: ${constraintPlans.join(', ')}  (${constraintFile})`);
else fail('no payments_plan_check constraint found in migrations');

if (submissionPlans) ok(`submission allows: ${submissionPlans.join(', ')}  (${submissionFile})`);
else fail('no p_plan allowlist found in create_payment_submission');

if (clientPlans) ok(`client offers: ${Object.keys(clientPlans).join(', ')}  (${PRICING})`);

// ── assertions ─────────────────────────────────────────────────────────────
if (clientPlans && submissionPlans) {
  for (const plan of Object.keys(clientPlans)) {
    if (submissionPlans.includes(plan)) ok(`client plan '${plan}' is submittable`);
    else fail(`client offers '${plan}' but create_payment_submission rejects it`);
  }
}

if (submissionPlans && constraintPlans) {
  for (const plan of submissionPlans) {
    if (constraintPlans.includes(plan)) ok(`submittable plan '${plan}' passes the DB constraint`);
    else fail(`create_payment_submission inserts '${plan}' but payments_plan_check forbids it (SQLSTATE 23514)`);
  }
}

if (clientPlans && submissionAmounts) {
  for (const [plan, price] of Object.entries(clientPlans)) {
    const charged = submissionAmounts[plan];
    if (charged === undefined) {
      fail(`no amount branch for '${plan}' — it would fall through to the ELSE amount`);
    } else if (charged !== price) {
      fail(`price mismatch for '${plan}': client shows ${price}, RPC records ${charged}`);
    } else {
      ok(`price for '${plan}' agrees (${price})`);
    }
  }
}

console.log(failures === 0 ? '\npayment plan contract OK' : `\n${failures} contract violation(s)`);
process.exit(failures === 0 ? 0 : 1);

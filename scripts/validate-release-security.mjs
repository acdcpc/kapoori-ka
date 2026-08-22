import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const requireTrue = (condition, message) => {
  if (!condition) throw new Error(message);
};

function inlineScripts(html, filename) {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
  requireTrue(scripts.length > 0, `${filename}: expected an inline script`);
  for (const script of scripts) {
    // Compile only; this never runs the browser code. It catches syntax errors
    // introduced while editing HTML-inline JavaScript.
    new Function(script);
  }
}

const payment = read('netlify/payment.html');
const admin = read('netlify/admin/index.html');
const publicPayment = read('public/payment.html');
const publicAdmin = read('public/admin/index.html');
const migration = read('supabase/migrations/20260822000000_release_security_hardening.sql');
const netlifyConfig = read('netlify.toml');

inlineScripts(payment, 'netlify/payment.html');
inlineScripts(admin, 'netlify/admin/index.html');

requireTrue(payment === publicPayment, 'Public and Netlify payment pages have diverged.');
requireTrue(admin === publicAdmin, 'Public and Netlify admin pages have diverged.');
requireTrue(!payment.includes(".from('payments')"), 'Payment page must not insert or query payments directly.');
requireTrue(!payment.includes(".from('payment-screenshots')"), 'Payment page must not upload receipts directly.');
requireTrue(payment.includes("functions.invoke('submit-payment'"), 'Payment page must call the trusted submit-payment function.');
requireTrue(!admin.includes(".from('payments')"), 'Admin page must not read or update payment rows directly.');
requireTrue(!admin.includes(".from('payment-screenshots')"), 'Admin page must not mint receipt URLs directly.');
requireTrue(admin.includes("functions.invoke('admin-payments'"), 'Admin page must call the trusted admin-payments function.');
requireTrue(!admin.includes('adminEmails'), 'Admin page must not authorize with a client-side email allowlist.');
requireTrue(migration.includes('CREATE TABLE IF NOT EXISTS public.app_admins'), 'Migration must create the dedicated admin table.');
requireTrue(migration.includes("AND status = 'valid'\n  RETURNING plan"), 'Redemption must claim activation codes with a conditional atomic update.');
requireTrue(migration.includes("SET search_path = ''"), 'Definer functions must clear search_path.');
requireTrue(!migration.includes("plan = 'premium'"), 'Migration must not treat Premium subscribers as administrators.');
requireTrue(netlifyConfig.includes('Content-Security-Policy'), 'Netlify headers must include a Content Security Policy.');
requireTrue(fs.existsSync(path.join(root, 'netlify/vendor/supabase-js.min.js')), 'Netlify must self-host the pinned Supabase browser client.');
requireTrue(fs.existsSync(path.join(root, 'public/vendor/supabase-js.min.js')), 'Firebase Hosting must self-host the pinned Supabase browser client.');

console.log('Release-security static regression checks passed.');

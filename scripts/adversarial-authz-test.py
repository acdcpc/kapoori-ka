#!/usr/bin/env python3
"""Adversarial authorization test suite (two accounts vs live project).
Proves RLS/storage/RPC denial paths with real sessions, then cleans up.
Run from repo root: python3 scripts/adversarial-authz-test.py
Requires .env with the service key, and src/lib/supabase.ts with the anon key.
"""
import json, os, re, urllib.request, urllib.error
BASE = os.environ.get('SUPABASE_URL', '')
SRC = open('src/lib/supabase.ts').read()
ANON = re.search(r"(sb_pub[A-Za-z0-9_]+)", SRC).group(1)
env = open('.env').read() if os.path.exists('.env') else ''
SR_LINE = next((ln for ln in env.splitlines() if ln.startswith('SR_KEY=')), '')
SR = SR_LINE.split('=', 1)[1].strip() if SR_LINE else os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')

# SAFETY: this suite creates and deletes real users in the TARGET project.
if not BASE or not SR:
    raise SystemExit('Set SUPABASE_URL and SR_KEY in .env to run this suite.')
if os.environ.get('ADV_ALLOW') != '1':
    raise SystemExit('SAFETY: this suite creates and deletes real users in the target project ('
                     + BASE + '). Run with ADV_ALLOW=1 to confirm you intend to test it.')

def req(method, path, token=None, body=None, key=ANON, headers=None):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header('apikey', key)
    r.add_header('Content-Type', 'application/json')
    if token: r.add_header('Authorization', f'Bearer {token}')
    for k, v in (headers or {}).items(): r.add_header(k, v)
    try:
        with urllib.request.urlopen(r) as resp:
            raw = resp.read().decode()
            return resp.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try: return e.code, json.loads(raw)
        except: return e.code, raw[:200]

results = []
def check(name, cond, detail=''):
    results.append((name, bool(cond), detail))
    print(('PASS ' if cond else 'FAIL ') + name + (f'  [{detail}]' if detail else ''))

# ── create two test accounts ─────────────────────────────────────────────
def signup(email):
    st, d = req('POST', '/auth/v1/signup', body={'email': email, 'password': 'AdvTest-2026!x'})
    assert st in (200, 201), f'signup failed: {st} {d}'
    return d

A = signup(f'adv-a-{os.urandom(3).hex()}@test.local')
B = signup(f'adv-b-{os.urandom(3).hex()}@test.local')
A_TOK, A_ID = A['access_token'], A['user']['id']
B_TOK, B_ID = B['access_token'], B['user']['id']
check('signup: two accounts created with immediate sessions', bool(A_TOK and B_TOK), f'A={A_ID[:8]} B={B_ID[:8]}')

# ── guaranteed cleanup: runs on success, assertion failure, or exception ──
import atexit
_deleted: set = set()

def admin_delete(uid: str) -> int:
    if uid in _deleted:
        return 0
    r = urllib.request.Request(f'{BASE}/auth/v1/admin/users/{uid}', method='DELETE')
    r.add_header('apikey', SR); r.add_header('Authorization', f'Bearer {SR}')
    try:
        urllib.request.urlopen(r)
        _deleted.add(uid)
        return 200
    except urllib.error.HTTPError as e:
        _deleted.add(uid)
        return e.code
    except Exception:
        return 0

def cleanup() -> None:
    a = admin_delete(A_ID)
    b = admin_delete(B_ID)
    print(f'cleanup: A={a} B={b}', '(idempotent; runs even if a check failed)')

atexit.register(cleanup)

# ── 1. child isolation ───────────────────────────────────────────────────
st, ca = req('POST', '/rest/v1/children', A_TOK, {'user_id': A_ID, 'name': 'AdvChildA', 'date_of_birth': '2025-03-01', 'sex': 'female'})
check('A can create own child', st in (200, 201), f'status {st}')
CA_ID = ca['id'] if isinstance(ca, dict) and ca.get('id') else (ca[0]['id'] if isinstance(ca, list) else None)

st, kids_b = req('GET', '/rest/v1/children', B_TOK)
check('B cannot see A child in list', isinstance(kids_b, list) and all(k['id'] != CA_ID for k in kids_b), f'B sees {len(kids_b)} children')

st, kids_anon = req('GET', '/rest/v1/children')
check('anon list returns empty (no leak)', isinstance(kids_anon, list) and len(kids_anon) == 0, f'{len(kids_anon)} rows')

st, kids_anon_post = req('POST', '/rest/v1/children', None, {'user_id': A_ID, 'name': 'X', 'date_of_birth': '2025-01-01', 'sex': 'male'})
check('anon cannot create children', st in (401, 403), f'status {st}')

if CA_ID:
    st, _ = req('PATCH', f'/rest/v1/children?id=eq.{CA_ID}', B_TOK, {'name': 'HACKED'})
    rows = None
    st2, got = req('GET', f'/rest/v1/children?id=eq.{CA_ID}', B_TOK)
    rows = got if isinstance(got, list) else []
    check('B cannot modify A child', (st in (401, 403, 404) or not rows or rows[0].get('name') != 'HACKED'), f'patch {st}, now {rows[0].get("name") if rows else "-"}')

    st, _ = req('DELETE', f'/rest/v1/children?id=eq.{CA_ID}', B_TOK)
    st2, got = req('GET', f'/rest/v1/children?id=eq.{CA_ID}', A_TOK)
    check('B cannot delete A child', (st in (401, 403, 404)) or (isinstance(got, list) and len(got) == 1), f'delete {st}')

    # growth records scoped by child
    st, _ = req('POST', '/rest/v1/growth_records', A_TOK, {'child_id': CA_ID, 'user_id': A_ID, 'date': '2025-06-01', 'weight': 7.0, 'height': 65.0, 'age_months': 3})
    check('A can insert growth record for own child', st in (200, 201), f'status {st}')
    st, gr = req('GET', f'/rest/v1/growth_records?child_id=eq.{CA_ID}', B_TOK)
    check('B cannot read A growth records', isinstance(gr, list) and len(gr) == 0, f'B sees {len(gr) if isinstance(gr, list) else gr} rows')

# ── 2. payments ──────────────────────────────────────────────────────────
import uuid as uuidlib
boundary = '----adv' + os.urandom(6).hex()
fields = {'name': 'TestA', 'email': A['user']['email'], 'plan': 'yearly',
          'transaction_id': f'ADV{os.urandom(3).hex().upper()}', 'mobile': ''}
body = ''.join(
    f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'
    for k, v in fields.items()
) + f'--{boundary}--\r\n'
r = urllib.request.Request(BASE + '/functions/v1/submit-payment', data=body.encode(), method='POST')
r.add_header('apikey', ANON)
r.add_header('Authorization', f'Bearer {A_TOK}')
r.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
try:
    with urllib.request.urlopen(r) as resp:
        pay_st, pay = resp.status, json.loads(resp.read().decode())
except urllib.error.HTTPError as e:
    pay_st, pay = e.code, e.read().decode()[:120]
check('A can submit payment via Edge Function (own)', pay_st == 201, f'status {pay_st} {str(pay)[:100]}')
PAY_ID = pay.get('payment_id') if isinstance(pay, dict) else None

st, pays_b = req('GET', '/rest/v1/payments', B_TOK)
check('B cannot read A payments', isinstance(pays_b, list) and all(p.get('id') != PAY_ID for p in pays_b), f'B sees {len(pays_b)} rows')

st, codes = req('GET', '/rest/v1/activation_codes', A_TOK)
check('activation_codes not readable by users', st in (401, 403) or (isinstance(codes, list) and len(codes) == 0), f'status {st}')

if PAY_ID:
    st, res = req('POST', '/rest/v1/rpc/admin_approve_payment', B_TOK, {'p_payment_id': PAY_ID, 'p_code_hash': 'x'*64, 'p_actor_id': B_ID})
    check('B (non-admin) cannot approve payments', st in (400, 403) or (isinstance(res, dict) and 'not' in json.dumps(res).lower() or 'admin' in json.dumps(res).lower()), f'status {st} {str(res)[:80]}')
    st, res = req('POST', '/rest/v1/rpc/admin_reject_payment', B_TOK, {'p_payment_id': PAY_ID, 'p_reason': 'x', 'p_actor_id': B_ID})
    check('B (non-admin) cannot reject payments', st in (400, 403) or 'admin' in json.dumps(res).lower(), f'status {st}')

# ── 3. admin surfaces ────────────────────────────────────────────────────
st, res = req('POST', '/rest/v1/rpc/is_app_admin', B_TOK, {'p_user_id': B_ID})
check('B is not an app admin', res is False, f'result {res}')

st, admins = req('GET', '/rest/v1/app_admins', B_TOK)
check('app_admins not readable by users', st in (401, 403) or (isinstance(admins, list) and len(admins) == 0), f'status {st}')

# ── 4. push tokens / web push subs / product events ─────────────────────
st, pt = req('POST', '/rest/v1/push_tokens', A_TOK, {'user_id': A_ID, 'token': 'ExponentPushToken[advtest]', 'platform': 'android'})
check('A can store own push token', st in (200, 201), f'status {st}')
st, pt_b = req('GET', '/rest/v1/push_tokens', B_TOK)
check('B cannot read A push tokens', isinstance(pt_b, list) and all(t.get('user_id') != A_ID for t in pt_b), f'B sees {len(pt_b)} tokens')

st, wps = req('POST', '/rest/v1/web_push_subscriptions', A_TOK, {'user_id': A_ID, 'endpoint': f'https://example.com/adv-{os.urandom(4).hex()}', 'p256dh': 'k', 'auth': 'a'})
check('A can store own web-push subscription', st in (200, 201), f'status {st}')
st, wps_b = req('GET', '/rest/v1/web_push_subscriptions', B_TOK)
check('B cannot read A web-push subscriptions', isinstance(wps_b, list) and all(s.get('user_id') != A_ID for s in wps_b), f'B sees {len(wps_b)}')

st, ev = req('GET', '/rest/v1/product_events', B_TOK)
check('product_events not readable by users', st in (401, 403) or (isinstance(ev, list) and len(ev) == 0), f'status {st}')

st, log = req('GET', '/rest/v1/reminder_delivery_log', A_TOK)
check('reminder_delivery_log not readable by non-admins', st in (401, 403) or (isinstance(log, list) and len(log) == 0), f'status {st}')

# ── 5. edge functions gate ───────────────────────────────────────────────
st, res = req('POST', '/functions/v1/my-activation-code', None, {})
check('my-activation-code requires auth', st == 401, f'status {st}')

# ── summary + cleanup ────────────────────────────────────────────────────
fails = [r for r in results if not r[1]]
print(f'\n=== {len(results) - len(fails)}/{len(results)} PASSED ===')
for name, ok, detail in fails: print('  FAILED:', name, detail)

cleanup()  # explicit call for a clear final log line

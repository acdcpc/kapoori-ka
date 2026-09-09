#!/usr/bin/env python3
"""Audit the app's WHO growth tables against official day-level WHO data.
Sources: WHO 2006 Child Growth Standards (0-60mo) + WHO 2007 Reference (61-216mo)
via the AnthStat datasets. Run from the repo root: python3 scripts/audit-growth-tables.py
"""
import re, json, math, os

WHO06 = os.path.expanduser('~/.openclaw/tmp/who2006.data.cs')
WHO07 = os.path.expanduser('~/.openclaw/tmp/who2007.data.cs')
master_path = '/tmp/who_master.json'
if not os.path.exists(master_path):
    raise SystemExit('run the master-builder first (who_master.json missing)')

master = json.load(open(master_path))

def lms_at(dataset, key, sex, months):
    d = master[dataset][key][sex]
    if dataset.startswith('w2006'):
        age = round(months * 30.4375)   # 2006 datasets are day-keyed
    else:
        age = months                     # 2007 datasets are month-keyed
    if str(age) in d: return d[str(age)]
    keys = sorted(int(k) for k in d)
    lo = max([k for k in keys if k <= age], default=keys[0])
    hi = min([k for k in keys if k >= age], default=keys[-1])
    if lo == hi: return d[str(lo)]
    f = (age - lo) / (hi - lo)
    L1, M1, S1 = d[str(lo)]; L2, M2, S2 = d[str(hi)]
    return (L1 + f*(L2-L1), M1 + f*(M2-M1), S1 + f*(S2-S1))

def lms_z(v, L, M, S):
    if L == 0: return math.log(v / M) / S
    return ((v / M) ** L - 1) / (L * S)

def parse_app_table(path):
    s = open(path).read()
    out = {}
    for m in re.finditer(r'export const (\w+): number\[\]\[\] = \[(.*?)\n\];', s, re.S):
        name = m.group(1); rows = []
        for rm in re.finditer(r'\[(\d+), (-?[\d.]+), (-?[\d.]+), (-?[\d.]+), (-?[\d.]+), (-?[\d.]+)\]', m.group(2)):
            rows.append([int(rm.group(1))] + [float(rm.group(k)) for k in range(2, 7)])
        out[name] = rows
    return out

wfa = parse_app_table('src/data/whoWFA.ts')
hfa = parse_app_table('src/data/whoHFA.ts')
bfa = parse_app_table('src/data/whoBFA.ts')
lms = parse_app_table('src/data/whoLMS.ts')
hc = parse_app_table('src/data/whoHCFA.ts')

issues = []
def check(table_name, rows, sex, get_official, tol_med, tol_z2, tol_z3):
    for r in rows:
        age = r[0]
        off = get_official(age, sex)
        if off is None: continue
        L, M, S = off
        if abs(M - r[3]) > tol_med:
            issues.append((table_name, age, 'median', abs(M - r[3]), f'{table_name} {age}mo: median app {r[3]} vs official {M:.2f} (diff {abs(M-r[3]):.2f})'))
        z2 = lms_z(r[4], L, M, S)
        if abs(z2 - 2) > tol_z2:
            issues.append((table_name, age, '+2SD', abs(z2-2), f'{table_name} {age}mo: +2SD col z={z2:.2f}'))
        z2n = lms_z(r[2], L, M, S)
        if abs(z2n + 2) > tol_z2:
            issues.append((table_name, age, '-2SD', abs(z2n+2), f'{table_name} {age}mo: -2SD col z={z2n:.2f}'))
        z3 = lms_z(r[5], L, M, S)
        if abs(z3 - 3) > tol_z3:
            issues.append((table_name, age, '+3SD', abs(z3-3), f'{table_name} {age}mo: +3SD col z={z3:.2f}'))
        z3n = lms_z(r[1], L, M, S)
        if abs(z3n + 3) > tol_z3:
            issues.append((table_name, age, '-3SD', abs(z3n+3), f'{table_name} {age}mo: -3SD col z={z3n:.2f}'))

sexOf = lambda name: 'Male' if 'BOYS' in name else 'Female'
wfa_off = lambda a, s: lms_at('w2006', 'WeightForAge', s, a) if a <= 60 else (lms_at('w2007', 'WeightAge', s, a) if a <= 120 else None)
hfa_off = lambda a, s: lms_at('w2006', 'LengthHeightForAge', s, a) if a <= 60 else lms_at('w2007', 'HeightAge', s, a)
bfa_off = lambda a, s: lms_at('w2006', 'BMI', s, a) if a <= 60 else lms_at('w2007', 'BMI', s, a)

check('WFA_boys(0-120)', wfa['WHO_WFA_BOYS'], 'Male', wfa_off, 0.2, 0.3, 0.5)
check('WFA_girls(0-120)', wfa['WHO_WFA_GIRLS'], 'Female', wfa_off, 0.2, 0.3, 0.5)
check('HFA_boys(0-216)', hfa['WHO_HFA_BOYS'], 'Male', hfa_off, 0.2, 0.35, 0.55)
check('HFA_girls(0-216)', hfa['WHO_HFA_GIRLS'], 'Female', hfa_off, 0.2, 0.35, 0.55)
check('BFA_boys(24-216)', bfa['WHO_BFA_BOYS'], 'Male', bfa_off, 0.3, 0.5, 0.8)
check('BFA_girls(24-216)', bfa['WHO_BFA_GIRLS'], 'Female', bfa_off, 0.3, 0.5, 0.8)
check('HCFA_boys(0-60)', hc['WHO_HCFA_BOYS'], 'Male', lambda a, s: lms_at('w2006', 'HeadCircumference', s, a), 0.1, 0.15, 0.3)
check('HCFA_girls(0-60)', hc['WHO_HCFA_GIRLS'], 'Female', lambda a, s: lms_at('w2006', 'HeadCircumference', s, a), 0.1, 0.15, 0.3)
for name, rows in [('whoLMS_WAZ_boys', lms['WHO_WAZ_BOYS']), ('whoLMS_WAZ_girls', lms['WHO_WAZ_GIRLS'])]:
    sex = sexOf(name)
    for r in rows:
        L, M, S = lms_at('w2006', 'WeightForAge', sex, r[0])
        if abs(M - r[2]) > 0.15: issues.append((name, r[0], 'M', abs(M-r[2]), f'{name} {r[0]}mo: M app {r[2]} vs official {M:.2f}'))
        if abs(L - r[1]) > 0.03: issues.append((name, r[0], 'L', abs(L-r[1]), f'{name} {r[0]}mo: L app {r[1]} vs official {L:.3f}'))
        if abs(S - r[3]) > 0.004: issues.append((name, r[0], 'S', abs(S-r[3]), f'{name} {r[0]}mo: S app {r[3]} vs official {S:.4f}'))

print(f'TOTAL DISCREPANCIES: {len(issues)}')
groups = {}
for (t, age, kind, sev, msg) in issues:
    groups.setdefault((t, kind), []).append((age, sev, msg))
for key in sorted(groups, key=lambda k: -max(g[1] for g in groups[k])):
    lst = groups[key]
    ages = sorted(g[0] for g in lst)
    rng = f"{ages[0]}-{ages[-1]}" if len(ages) > 1 else str(ages[0])
    worst = max(lst, key=lambda g: g[1])[2]
    print(f"\n### {key[0]} [{key[1]}] ages {rng} mo — n={len(lst)}")
    print('    worst:', worst)
json.dump([i[4] for i in issues], open('/tmp/audit_issues.json', 'w'))
print('\nsaved: /tmp/audit_issues.json')

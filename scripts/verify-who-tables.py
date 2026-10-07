#!/usr/bin/env python3
"""Verify the app's WHO growth tables against the official WHO spreadsheets.

Downloads the official expanded percentile tables (WHO Child Growth Standards
2006 for 0-5 years, WHO 2007 reference for 5-19 years) and compares every stored
row with the -3SD/-2SD/median/+2SD/+3SD values computed from the official L/M/S.

The app stores the five chart bands (not the 3rd/15th/... percentiles), so this
compares bands; a tolerance of 0.051 accommodates the app's one-decimal rounding.

Note: the 0-5 expanded tables are day-keyed (column "Day"), the 5-19 tables are
month-keyed (column "Month"); the script handles both.

Run:  python3 scripts/verify-who-tables.py
Deps: pandas + openpyxl
"""
import os, re, sys, math
from urllib.request import urlopen, Request

CACHE = os.path.expanduser('~/.openclaw/tmp/who-official')
os.makedirs(CACHE, exist_ok=True)

S="https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators"
R="https://cdn.who.int/media/docs/default-source/child-growth/growth-reference-5-19-years"
FILES = {
  'wfa-boys-0-5':  f'{S}/weight-for-age/expanded-tables/wfa-boys-percentiles-expanded-tables.xlsx',
  'wfa-girls-0-5': f'{S}/weight-for-age/expanded-tables/wfa-girls-percentiles-expanded-tables.xlsx',
  'lhfa-boys-0-5': f'{S}/length-height-for-age/expandable-tables/lhfa-boys-percentiles-expanded-tables.xlsx',
  'lhfa-girls-0-5': f'{S}/length-height-for-age/expandable-tables/lhfa-girls-percentiles-expanded-tables.xlsx',
  'hcfa-boys-0-5': f'{S}/head-circumference-for-age/expanded-tables/hcfa-boys-percentiles-expanded-tables.xlsx',
  'hcfa-girls-0-5': f'{S}/head-circumference-for-age/expanded-tables/hcfa-girls-percentiles-expanded-tables.xlsx',
  'bfa-boys-0-5':  f'{S}/body-mass-index-for-age/expanded-tables/bfa-boys-percentiles-expanded-tables.xlsx',
  'bfa-girls-0-5': f'{S}/body-mass-index-for-age/expanded-tables/bfa-girls-percentiles-expanded-tables.xlsx',
  'hfa-boys-5-19': f'{R}/height-for-age-(5-19-years)/hfa-boys-perc-who2007-exp.xlsx',
  'hfa-girls-5-19': f'{R}/height-for-age-(5-19-years)/hfa-girls-perc-who2007-exp.xlsx',
  'bmi-boys-5-19': f'{R}/bmi-for-age-(5-19-years)/bmi-boys-perc-who2007-exp.xlsx',
  'bmi-girls-5-19': f'{R}/bmi-for-age-(5-19-years)/bmi-girls-perc-who2007-exp.xlsx',
  'wfa-boys-5-10': f'{R}/weight-for-age-(5-10-years)/hfa-boys-perc-who2007-exp_07eb5053-9a09-4910-aa6b-c7fb28012ce6.xlsx',
  'wfa-girls-5-10': f'{R}/weight-for-age-(5-10-years)/hfa-girls-perc-who2007-exp_6040a43e-81da-48fa-a2d4-5c856fe4fe71.xlsx',
}
Z = (-3, -2, 0, 2, 3)
TOL = 0.051

def fetch(key, url):
    path = os.path.join(CACHE, key + '.xlsx')
    if not os.path.exists(path) or os.path.getsize(path) < 5000:
        req = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urlopen(req, timeout=60) as r, open(path, 'wb') as fh:
            fh.write(r.read())
    return path

def read_lms(path):
    import pandas as pd
    raw = pd.read_excel(path, header=None)
    labels = [' '.join(str(v).split()).upper() for v in raw.iloc[0].tolist()]
    def find(*names):
        for j, l in enumerate(labels):
            if l in names: return j
        return None
    age, L, M, S = find('AGE','MONTH','DAY'), find('L'), find('M'), find('S')
    rows = {}
    for i in range(1, len(raw)):
        try: rows[int(float(raw.iloc[i, age]))] = (float(raw.iloc[i, L]), float(raw.iloc[i, M]), float(raw.iloc[i, S]))
        except Exception: pass
    day = max(rows) > 1000
    def at(month):
        key = round(month * 30.4375) if day else int(month)
        if key in rows: return rows[key]
        ks = sorted(rows)
        lo = max([k for k in ks if k <= key], default=ks[0]); hi = min([k for k in ks if k >= key], default=ks[-1])
        if lo == hi: return rows[lo]
        L1,M1,S1 = rows[lo]; L2,M2,S2 = rows[hi]; f = (key-lo)/(hi-lo)
        return (L1+f*(L2-L1), M1+f*(M2-M1), S1+f*(S2-S1))
    return at

def value_at(z, L, M, S):
    return M * (1 + L*S*z)**(1/L) if L != 0 else M * math.exp(S*z)

def app_table(fname, arr):
    s = open(os.path.join('src/data', fname)).read()
    m = re.search(r'export const ' + arr + r'[^=]*=\s*\[(.*?)\n\];', s, re.S)
    return {int(r[0]): [float(x) for x in r[1:]] for r in
            re.findall(r'\[\s*(\d+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]', m.group(1))}

COMPARISONS = [
  ('weight-for-age boys',  'whoWFA.ts', 'WHO_WFA_BOYS',  [((0,60),'wfa-boys-0-5'),    ((61,120),'wfa-boys-5-10')]),
  ('weight-for-age girls', 'whoWFA.ts', 'WHO_WFA_GIRLS', [((0,60),'wfa-girls-0-5'),   ((61,120),'wfa-girls-5-10')]),
  ('height-for-age boys',  'whoHFA.ts', 'WHO_HFA_BOYS',  [((0,60),'lhfa-boys-0-5'),   ((61,216),'hfa-boys-5-19')]),
  ('height-for-age girls', 'whoHFA.ts', 'WHO_HFA_GIRLS', [((0,60),'lhfa-girls-0-5'),  ((61,216),'hfa-girls-5-19')]),
  ('head circumference boys',  'whoHCFA.ts','WHO_HCFA_BOYS', [((0,60),'hcfa-boys-0-5')]),
  ('head circumference girls', 'whoHCFA.ts','WHO_HCFA_GIRLS',[((0,60),'hcfa-girls-0-5')]),
  ('BMI-for-age boys',  'whoBFA.ts', 'WHO_BFA_BOYS',  [((24,60),'bfa-boys-0-5'),  ((61,216),'bmi-boys-5-19')]),
  ('BMI-for-age girls', 'whoBFA.ts', 'WHO_BFA_GIRLS', [((24,60),'bfa-girls-0-5'), ((61,216),'bmi-girls-5-19')]),
]

def main():
    total = bad_total = 0
    failures = []
    for label, appf, arr, srcs in COMPARISONS:
        try:
            app = app_table(appf, arr)
            tables = [(rng, read_lms(fetch(k, FILES[k]))) for rng, k in srcs]
        except Exception as e:
            print('  %-28s SKIPPED (%s)' % (label, str(e)[:50])); failures.append(label); continue
        bad = []; checked = 0
        for month, vals in sorted(app.items()):
            for rng, at in tables:
                if rng[0] <= month <= rng[1]:
                    want = [value_at(z, *at(month)) for z in Z]
                    off = [abs(a-b) for a, b in zip(vals, want)]
                    checked += 1
                    if max(off) > TOL:
                        bad.append((month, [round(x,1) for x in vals], [round(x,1) for x in want], round(max(off),2)))
                    break
        print('  %-28s %3d months | %s%s' % (label, checked, 'CLEAN' if not bad else 'MISMATCH',
              '' if not bad else ' | worst: month %d app %s WHO %s (off %.2f)' % max(bad, key=lambda b: b[3])))
        total += checked; bad_total += len(bad)
    print('\nTOTAL: %d months compared, %d deviations beyond +/-0.05' % (total, bad_total))
    return 1 if (bad_total or failures) else 0

if __name__ == '__main__':
    sys.exit(main())

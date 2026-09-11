// src/screens/PDFReportScreen.tsx
import React, { useState, useContext } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { Palette } from '../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { LanguageContext } from '../context/LanguageContext';
import { translations } from '../i18n/translations';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { recordProductEvent } from '../lib/featureAnalytics';
import { getAgeInMonths, weightZScore, heightZScore, hcZScore, percentileFromZ, classifyGrowthStatus, classifyHC } from '../utils/growthCalculations';
import { WHO_WFA_BOYS, WHO_WFA_GIRLS } from '../data/whoWFA';
import { WHO_HFA_BOYS, WHO_HFA_GIRLS } from '../data/whoHFA';
import { WHO_HCFA_BOYS, WHO_HCFA_GIRLS } from '../data/whoHCFA';
import { PremiumGuard } from '../components/PremiumGuard';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// BS → AD conversion for PDF
const BS_MONTHS_NE = [
  'बैशाख','जेठ','असार','श्रावण','भाद्र','आश्विन',
  'कार्तिक','मंसिर','पुष','माघ','फाल्गुन','चैत्र',
];
const BS_YEAR_DATA: number[][] = [
  [30,32,31,32,31,30,30,30,29,30,29,31],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,31,32,32,31,30,30,29,30,29,30,30],[31,32,31,32,31,30,30,30,29,29,30,31],
  [30,32,31,32,31,30,30,30,29,30,29,31],[31,31,32,31,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,30,30,29,30,29,30,30],[31,31,32,32,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[31,31,31,32,31,31,29,30,30,29,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,32,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,30,30,30,29,30,29,31],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,31,32,32,31,30,30,29,30,29,30,30],[31,32,31,32,31,30,30,30,29,29,30,31],
  [30,32,31,32,31,30,30,30,29,30,29,31],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,31,32,31,31,30,30,29,30,29,30,30],[31,32,31,32,31,30,30,30,29,29,30,31],
  [30,32,31,32,31,30,30,30,29,30,29,31],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,31,32,31,31,30,30,29,30,29,30,30],[31,32,31,32,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[31,31,32,32,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[31,31,32,32,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[31,31,32,32,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[31,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[31,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[31,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[31,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[31,31,32,32,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[31,31,32,32,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],
];

const BS_START_YEAR = 2000;
const AD_REF = new Date(1943, 3, 13);

function adToBs(adDateStr: string): string {
  try {
    const adDate = new Date(adDateStr);
    let diff = Math.floor((adDate.getTime() - AD_REF.getTime()) / 86400000);
    if (diff < 0) return adDateStr;
    let year = BS_START_YEAR;
    let month = 1;
    while (true) {
      const yearIdx = year - BS_START_YEAR;
      if (yearIdx >= BS_YEAR_DATA.length) break;
      let yearDays = 0;
      for (let m = 0; m < 12; m++) yearDays += BS_YEAR_DATA[yearIdx][m];
      if (diff < yearDays) break;
      diff -= yearDays;
      year++;
    }
    const yearIdx = year - BS_START_YEAR;
    while (true) {
      const monthDays = BS_YEAR_DATA[yearIdx][month - 1];
      if (diff < monthDays) break;
      diff -= monthDays;
      month++;
    }
    const day = diff + 1;
    const toNe = (n: number) => n.toString().split('').map(d => '०१२३४५६७८९'[parseInt(d)]).join('');
    return `${toNe(year)} ${BS_MONTHS_NE[month - 1]} ${toNe(day)}`;
  } catch { return adDateStr; }
}

type Props = NativeStackScreenProps<RootStackParamList, 'PDFReport'>;

export default function PDFReportScreen({ route }: Props) {
  const { palette: t } = useContext(ThemeContext);
  const styles = makeStyles(t);
  const { user } = useAuth();
  const { child } = route.params || {};
  const { language } = useContext(LanguageContext);
  const isNe = language === 'ne';
  const navigation = useNavigation<any>();

  const [generating, setGenerating] = useState(false);

  const buildCurveSVG = (rows: number[][], childPts: { x: number; y: number }[], title: string, yLabel: string, xMax: number) => {
    const W = 640, H = 300, padL = 48, padB = 36, padT = 16, padR = 14;
    const allY = rows.flatMap(r => [r[1], r[5]]).concat(childPts.map(p => p.y));
    let yMin = Math.floor(Math.min(...allY)), yMax = Math.ceil(Math.max(...allY));
    if (yMax - yMin < 4) { yMin -= 2; yMax += 2; }
    const xs = (m: number) => padL + (m / xMax) * (W - padL - padR);
    const ys = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin)) * (H - padT - padB);
    const poly = (col: number, stroke: string, dash = '', width = 1.4) => {
      const pts = rows.filter(r => r[0] <= xMax).map(r => `${xs(r[0]).toFixed(1)},${ys(r[col]).toFixed(1)}`).join(' ');
      return `<polyline points="${pts}" fill="none" stroke="${stroke}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
    };
    const band = (hi: number, lo: number, fill: string) => {
      const top = rows.filter(r => r[0] <= xMax).map(r => `${xs(r[0]).toFixed(1)},${ys(r[hi]).toFixed(1)}`).join(' ');
      const bottom = rows.filter(r => r[0] <= xMax).reverse().map(r => `${xs(r[0]).toFixed(1)},${ys(r[lo]).toFixed(1)}`).join(' ');
      return `<polygon points="${top} ${bottom}" fill="${fill}" fill-opacity="0.45"/>`;
    };
    const xTicks = [] as string[];
    for (let m = 0; m <= xMax; m += 6) xTicks.push(`<text x="${xs(m)}" y="${H - padB + 14}" font-size="9" text-anchor="middle" fill="#777">${m}</text><line x1="${xs(m)}" y1="${H - padB}" x2="${xs(m)}" y2="${padT}" stroke="#eee" stroke-width="0.5"/>`);
    const yTicks = [] as string[];
    const step = Math.max(1, Math.round((yMax - yMin) / 6));
    for (let v = yMin; v <= yMax; v += step) yTicks.push(`<text x="${padL - 6}" y="${ys(v) + 3}" font-size="9" text-anchor="end" fill="#777">${v}</text><line x1="${padL}" y1="${ys(v)}" x2="${W - padR}" y2="${ys(v)}" stroke="#eee" stroke-width="0.5"/>`);
    const childPtsSvg = childPts.map(p => `<circle cx="${xs(p.x).toFixed(1)}" cy="${ys(p.y).toFixed(1)}" r="3.6" fill="#E8602C" stroke="#fff" stroke-width="1"/>`).join('');
    const cpLine = childPts.length > 1 ? `<polyline points="${childPts.map(p => `${xs(p.x).toFixed(1)},${ys(p.y).toFixed(1)}`).join(' ')}" fill="none" stroke="#E8602C" stroke-width="2.6"/>` : '';
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="font-family:Arial">
      <text x="${W / 2}" y="10" font-size="11" font-weight="bold" text-anchor="middle" fill="#444">${title}</text>
      ${band(5, 1, '#FFF3E0')}${band(4, 2, '#E8F5E9')}
      ${poly(5, '#F5A623', '3,3', 0.8)}${poly(1, '#F5A623', '3,3', 0.8)}
      ${poly(4, '#C8B9A8', '', 0.8)}${poly(2, '#C8B9A8', '', 0.8)}
      ${poly(3, '#3D8B5E', '5,4', 1.6)}
      ${yTicks.join('')}${xTicks.join('')}
      ${cpLine}${childPtsSvg}
      <text x="${W / 2}" y="${H - 6}" font-size="9" text-anchor="middle" fill="#777">${yLabel}</text>
    </svg>`;
  };

  const generatePDF = async () => {
    if (!child) {
      return Alert.alert('Error', isNe ? 'बच्चाको डाटा उपलब्ध छैन' : 'No child data available');
    }
    setGenerating(true);
    try {
      const { data: growthData } = await supabase
        .from('growth_records')
        .select('*')
        .eq('child_id', child.id)
        .eq('user_id', user?.uid || '')
        .order('date', { ascending: true });
      const { data: vaccineData } = await supabase
        .from('vaccinations')
        .select('*')
        .eq('child_id', child.id)
        .eq('user_id', user?.uid || '')
        .order('given_date', { ascending: false });
      const vaccineRecords = (vaccineData || []).map((v: any) => ({
        vaccineName: v.vaccine_name,
        vaccineNameNepali: v.vaccine_name_nepali,
        givenDate: v.given_date,
        scheduledDate: v.scheduled_date,
        isGiven: v.is_given,
        isMissed: v.is_missed,
      }));

      const growth = (growthData || []).map((r: any) => ({
        date: r.date,
        weight: r.weight as number | null,
        height: r.height as number | null,
        headCirc: (r.head_circumference ?? null) as number | null,
        ageMonths: getAgeInMonths(child.dateOfBirth, r.date),
      }));

      // Interpretation: latest value per metric with WHO z-score + percentile
      const sex = child.sex as 'male' | 'female';
      const latestW = [...growth].reverse().find(g => g.weight);
      const latestH = [...growth].reverse().find(g => g.height);
      const latestHC = [...growth].reverse().find(g => g.headCirc);
      const interp: any[] = [];
      if (latestW?.weight) {
        const z = weightZScore(latestW.weight, latestW.ageMonths, sex);
        interp.push({ metric: isNe ? 'तौल (WFA)' : 'Weight-for-age', value: `${latestW.weight} kg`, z, pct: percentileFromZ(z) });
      }
      if (latestH?.height) {
        const z = heightZScore(latestH.height, latestH.ageMonths, sex);
        interp.push({ metric: isNe ? 'उचाइ (HFA)' : 'Height-for-age', value: `${latestH.height} cm`, z, pct: percentileFromZ(z) });
      }
      if (latestHC?.headCirc && latestHC.ageMonths <= 60) {
        const z = hcZScore(latestHC.headCirc, latestHC.ageMonths, sex);
        interp.push({ metric: isNe ? 'टाउको परिधि (HCFA)' : 'Head circumference-for-age', value: `${latestHC.headCirc} cm`, z, pct: percentileFromZ(z) });
      }
      const interpRows = interp.map((r) => {
        const zz = r.z as number;
        const band = isNaN(zz) ? '—' : zz < -2 ? (isNe ? 'कमी (-2SD मुनि)' : 'Low (< -2SD)') : zz > 2 ? (isNe ? 'उच्च (+2SD माथि)' : 'High (> +2SD)') : (isNe ? 'सामान्य' : 'Normal');
        return `<tr><td>${r.metric}</td><td>${r.value}</td><td>${isNaN(zz) ? '—' : zz.toFixed(2)}</td><td>${isNaN(r.pct as number) ? '—' : `${r.pct}th`}</td><td>${band}</td></tr>`;
      }).join('');

      const xMaxW = Math.min(60, Math.max(6, Math.ceil((latestW?.ageMonths ?? 60) / 6) * 6));
      const xMaxH = Math.min(60, Math.max(6, Math.ceil((latestH?.ageMonths ?? 60) / 6) * 6));
      const wPts = growth.filter(g => g.weight).map(g => ({ x: g.ageMonths, y: g.weight as number }));
      const hPts = growth.filter(g => g.height).map(g => ({ x: g.ageMonths, y: g.height as number }));
      const hcPts = growth.filter(g => g.headCirc).map(g => ({ x: g.ageMonths, y: g.headCirc as number }));
      const wfaRows = sex === 'male' ? WHO_WFA_BOYS : WHO_WFA_GIRLS;
      const hfaRows = sex === 'male' ? WHO_HFA_BOYS : WHO_HFA_GIRLS;
      const hcfaRows = sex === 'male' ? WHO_HCFA_BOYS : WHO_HCFA_GIRLS;
      const svgW = buildCurveSVG(wfaRows, wPts, isNe ? 'तौल-उमेर (WHO)' : 'Weight-for-age (WHO)', isNe ? 'उमेर (महिना)' : 'Age (months)', xMaxW);
      const svgH = buildCurveSVG(hfaRows, hPts, isNe ? 'उचाइ-उमेर (WHO)' : 'Height-for-age (WHO)', isNe ? 'उमेर (महिना)' : 'Age (months)', Math.min(60, Math.max(24, xMaxH)));
      const svgHC = hcPts.length ? buildCurveSVG(hcfaRows, hcPts, isNe ? 'टाउको परिधि-उमेर (WHO)' : 'Head circumference-for-age (WHO)', isNe ? 'उमेर (महिना)' : 'Age (months)', 60) : '';

      const htmlContent = `
        <html><head><meta charset="utf-8"><style>
        body{font-family:Arial,sans-serif;padding:36px;line-height:1.55;color:#333}
        h1{text-align:center;color:#E8602C;margin-bottom:4px}h2{color:#444;margin-top:26px;border-bottom:2px solid #E8602C;padding-bottom:4px}
        table{width:100%;border-collapse:collapse;margin:12px 0}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background-color:#f0f4f8}
        .center{text-align:center}.chart{margin:10px 0 20px}
        .interp td:nth-child(3),.interp td:nth-child(4){text-align:center}
        .foot{margin-top:36px;color:#777;font-size:11px;border-top:1px solid #ddd;padding-top:8px}
        </style></head>
        <body>
          <h1>${isNe ? 'बाल स्वास्थ्य रिपोर्ट' : 'Child Health Report'}</h1>
          <h2 class="center">${child.name} ${child.nameNepali ? `(${child.nameNepali})` : ''}</h2>
          <p><strong>${isNe ? 'जन्म मिति' : 'Date of Birth'}:</strong> ${isNe ? adToBs(child.dateOfBirth) : child.dateOfBirth} · <strong>${isNe ? 'लिंग' : 'Sex'}:</strong> ${child.sex === 'male' ? (isNe ? 'छोरा' : 'Male') : (isNe ? 'छोरी' : 'Female')} · <strong>${isNe ? 'उमेर' : 'Age'}:</strong> ${getAgeInMonths(child.dateOfBirth)} ${isNe ? 'महिना' : 'months'}</p>

          <h2>${isNe ? '१. वृद्धि चार्ट (WHO मापदण्ड)' : '1. Growth charts (WHO standards)'}</h2>
          <div class="chart">${svgW}</div>
          <div class="chart">${svgH}</div>
          ${svgHC ? `<div class="chart">${svgHC}</div>` : ''}
          <p style="font-size:11px;color:#777">${isNe ? 'सेतो/हरियो पट्टी = WHO सामान्य दायरा; पहेँलो = ±2-3SD; रातो रेखा = तपाईंको बच्चा।' : 'Green band = WHO normal range; yellow = ±2-3SD; orange line = your child.'}</p>

          <h2>${isNe ? '२. व्याख्या — Z-स्कोर र प्रतिशत' : '2. Interpretation — z-scores & percentiles'}</h2>
          <table class="interp"><tr><th>${isNe ? 'सूचक' : 'Indicator'}</th><th>${isNe ? 'मान' : 'Value'}</th><th>Z-score</th><th>${isNe ? 'प्रतिशत' : 'Percentile'}</th><th>${isNe ? 'व्याख्या' : 'Reading'}</th></tr>
          ${interpRows || `<tr><td colspan="5">${isNe ? 'अझै नाप भएको छैन।' : 'No measurements yet.'}</td></tr>`}
          </table>
          <div style="background:#FDF8F2;border:1px solid #F0DED2;border-radius:10px;padding:12px 14px;margin:10px 0">
            <strong style="font-size:12px;color:#4A2B20">${isNe ? 'सरल शब्दमा:' : 'In simple words:'}</strong>
            <span style="font-size:12px;color:#5D5148">
            ${interp.length ? interp.map((r: any) => {
              const zz = r.z as number;
              if (isNaN(zz)) return '';
              const metricNe: Record<string, string> = { 'तौल (WFA)': 'तौल', 'उचाइ (HFA)': 'उचाइ', 'टाउको परिधि (HCFA)': 'टाउकोको नाप' };
              const metricEn: Record<string, string> = { 'तौल (WFA)': 'Weight', 'उचाइ (HFA)': 'Height', 'टाउको परिधि (HCFA)': 'Head size' };
              const name = isNe ? (metricNe[r.metric] ?? r.metric) : (metricEn[r.metric] ?? r.metric);
              if (zz >= -2 && zz <= 2) return isNe ? `${name} राम्रोसँग बढिरहेको छ।` : `${name} is growing well.`;
              if (zz < -2 && zz >= -3) return isNe ? `${name} सामान्यभन्दा अलि कम छ — अर्को जाँचमा स्वास्थ्यकर्मीलाई देखाउनुहोस्।` : `${name} is a little low — please show a health worker at your next visit.`;
              if (zz > 2 && zz <= 3) return isNe ? `${name} सामान्यभन्दा अलि बढी छ — अर्को जाँचमा कुरा गर्नुहोस्।` : `${name} is a little high — mention it at your next visit.`;
              if (zz < -3) return isNe ? `${name} सामान्यभन्दा धेरै कम छ — सीघै स्वास्थ्यकर्मीलाई देखाउनुहोस्। यो सुधार्न सकिन्छ।` : `${name} is much lower than usual — please see a health worker soon. This can be helped.`;
              return isNe ? `${name} सामान्यभन्दा धेरै बढी छ — सीघै स्वास्थ्यकर्मीलाई देखाउनुहोस्।` : `${name} is much higher than usual — please see a health worker soon.`;
            }).join(' ') : (isNe ? 'अझै नाप भएको छैन।' : 'No measurements yet.')}
            </span>
          </div>
          <p style="font-size:11px;color:#777">${isNe ? 'Z-score: WHO औसतबाट मानक विचलन (0 = औसत)। प्रतिशत: १०० जना स्वस्थ बच्चामध्ये तुलनात्मक स्थान।' : 'Z-score: standard deviations from the WHO median (0 = average). Percentile: rank among 100 healthy children.'}</p>

          <h2>${isNe ? '३. वृद्धि विवरण' : '3. Growth records'}</h2>
          <table><tr><th>${isNe ? 'मिति' : 'Date'}</th><th>${isNe ? 'तौल (किग्रा)' : 'Weight (kg)'}</th><th>${isNe ? 'उचाइ (से.मि.)' : 'Height (cm)'}</th><th>${isNe ? 'टाउको परिधि (से.मि.)' : 'Head circ. (cm)'}</th></tr>
          ${(growth || []).map((r: any) => `<tr><td>${isNe ? adToBs(r.date) : r.date}</td><td>${r.weight || '-'}</td><td>${r.height || '-'}</td><td>${r.headCirc || '-'}</td></tr>`).join('')}
          </table>

          <h2>${isNe ? '४. खोप विवरण' : '4. Vaccination records'}</h2>
          <table><tr><th>${isNe ? 'खोप' : 'Vaccine'}</th><th>${isNe ? 'दिइएको मिति' : 'Given Date'}</th></tr>
          ${vaccineRecords.map((v: any) => `<tr><td>${isNe ? (v.vaccineNameNepali || v.vaccineName) : v.vaccineName}</td><td>${v.givenDate ? (isNe ? adToBs(v.givenDate) : v.givenDate) : '-'}</td></tr>`).join('')}
          </table>

          <p class="foot">${isNe ? 'यो रिपोर्ट Kapoori Ka (kapoori-ka.app) द्वारा WHO बाल वृद्धि मापदण्ड २००६ आधारमा तयार गरिएको हो। यो शैक्षिक जानकारी मात्र हो — चिकित्सकीय निर्णयका लागि योग्य स्वास्थ्यकर्मीसँग परामर्श गर्नुहोस्।' : `Generated by Kapoori Ka on ${dayjs().format('YYYY-MM-DD HH:mm')} using the WHO Child Growth Standards 2006. Educational information only — always consult a qualified health professional for medical decisions.`}</p>
        </body></html>`;

      if (Platform.OS === 'web') {
        // Web: open the browser print dialog (Save as PDF) — no native FileSystem/Sharing.
        await Print.printAsync({ html: htmlContent });
        return;
      }

      recordProductEvent(user?.uid, 'health_report_generated').catch(() => undefined);
      const { uri: tempUri } = await Print.printToFileAsync({ html: htmlContent });
      const fileName = `Growth_Report_${child.name.replace(/\s+/g, '_')}_${dayjs().format('YYYYMMDD')}.pdf`;
      const safeUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.copyAsync({ from: tempUri, to: safeUri });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(safeUri, { mimeType: 'application/pdf', dialogTitle: isNe ? 'रिपोर्ट शेयर गर्नुहोस्' : 'Share Child Report', UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert(isNe ? 'सफल' : 'Success', isNe ? 'PDF तयार भयो!' : 'PDF generated successfully!');
      }
    } catch (error: any) {
      console.error('PDF Error:', error);
      Alert.alert('Error', isNe ? 'PDF बनाउन समस्या भयो। कृपया फेरि प्रयास गर्नुहोस्।' : 'Failed to generate PDF. Please try again.');
    } finally { setGenerating(false); }
  };

  return (
    <PremiumGuard feature="growth_report" >
      <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Document Icon */}
        <Text style={styles.docIcon}>📋</Text>

        <Text style={styles.title}>{isNe ? 'रिपोर्ट बनाउनुहोस्' : 'Generate Health Report'}</Text>
        <Text style={styles.childName}>{child?.name} {child?.nameNepali ? `(${child.nameNepali})` : ''}</Text>

        {/* What's Included */}
        <View style={styles.includedCard}>
          <Text style={styles.includedLabel}>{isNe ? 'समावेश गरिएको:' : "What's included"}</Text>
          {[
            isNe ? 'WHO वृद्धि चार्ट (तौल, उचाइ, टाउको)' : 'WHO growth charts (weight, height, head)',
            isNe ? 'Z-स्कोर र प्रतिशत व्याख्या' : 'Z-score & percentile interpretation',
            isNe ? 'तौल/उचाइ/टाउकोका नापहरू' : 'Growth measurements',
            isNe ? 'खोपको इतिहास' : 'Vaccination history',
          ].map((item, i) => (
            <View key={i} style={styles.includedRow}>
              <Text style={styles.checkmark}>✓</Text>
              <Text style={styles.includedText}>{item}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={[styles.generateButton, generating && styles.buttonDisabled]} onPress={generatePDF} disabled={generating}>
          {generating ? (
            <ActivityIndicator color={t.onAccent} size="large" />
          ) : (
            <Text style={styles.buttonText}>{isNe ? '📄 PDF रिपोर्ट तयार पार्नुहोस्' : 'Generate & Share PDF'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.clinicSummaryBtn} onPress={() => navigation.navigate('ClinicSummary', { child })}>
          <Ionicons name="medkit-outline" size={18} color={t.clay} />
          <Text style={styles.clinicSummaryText}>{isNe ? 'छोटो क्लिनिक सारांश पनि बनाउन सकिन्छ' : 'Or generate the short clinic summary'}</Text>
        </TouchableOpacity>

        <Text style={styles.note}>{isNe ? 'PDF तयार भएपछि शेयर गर्न सकिनेछ।' : 'The PDF will be generated and ready to share.'}</Text>
      </View>
      </SafeAreaView>
    </PremiumGuard>
  );
}

const makeStyles = (t: Palette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: t.surface },
  container: { flex: 1, padding: 20, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' },
  docIcon: { fontSize: 56, textAlign: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: t.text, marginBottom: 8, textAlign: 'center' },
  childName: { fontSize: 16, color: t.muted, marginBottom: 24, textAlign: 'center' },
  includedCard: { backgroundColor: t.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: t.border, marginBottom: 24, width: '100%' },
  includedLabel: { fontSize: 13, fontWeight: '700', color: t.muted, letterSpacing: 0.8, marginBottom: 10 },
  includedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  checkmark: { fontSize: 14, fontWeight: '700', color: t.green },
  includedText: { fontSize: 14, color: t.text },
  generateButton: { backgroundColor: t.clay, paddingVertical: 14, paddingHorizontal: 40, borderRadius: 28, width: '100%', alignItems: 'center', elevation: 3 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: t.onAccent, fontSize: 16, fontWeight: '700' },
  note: { marginTop: 20, fontSize: 13, color: t.muted, textAlign: 'center', lineHeight: 18 },
  clinicSummaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 46, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1.5, borderColor: t.border, backgroundColor: t.surface, marginBottom: 10, justifyContent: 'center' },
  clinicSummaryText: { color: t.clay, fontWeight: '700', fontSize: 14 },
});
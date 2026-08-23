// src/lib/clinicalSafety.ts — Informational trend flags, never diagnosis or triage.
import { GrowthRecord, GrowthTrendFlag } from '../types';

export const CLINICAL_SAFETY_NOTICE = {
  en: 'This app records information and reminders. It does not diagnose illness or replace a health professional.',
  ne: 'यो एपले जानकारी र सम्झना राख्छ। यसले रोग निदान गर्दैन र स्वास्थ्यकर्मीको सल्लाहको विकल्प होइन।',
};

export function getGrowthTrendFlags(records: GrowthRecord[], language: 'en' | 'ne'): GrowthTrendFlag[] {
  const sorted = [...records].filter(r => Number.isFinite(r.weight) && r.weight > 0).sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 2) return [];
  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];
  const elapsedDays = Math.max(1, Math.round((Date.parse(latest.date) - Date.parse(previous.date)) / 86400000));
  const change = latest.weight - previous.weight;
  const flags: GrowthTrendFlag[] = [];

  if (elapsedDays >= 14 && change <= 0) {
    flags.push({
      level: 'attention',
      title: language === 'ne' ? 'तौलको प्रवृत्ति समीक्षा गर्नुहोस्' : 'Review the weight trend',
      message: language === 'ne'
        ? 'दुई मापनबीच तौल बढेको देखिएन। मापन दोहोर्याउनुहोस् र चिन्ता भए स्वास्थ्यकर्मीसँग कुरा गर्नुहोस्।'
        : 'Weight did not increase between two measurements. Recheck the measurement and speak with a health professional if you are concerned.',
      measuredAt: latest.date,
    });
  }
  return flags;
}

export function getFollowUpReminder(lastMeasurementDate: string | undefined, language: 'en' | 'ne'): string | null {
  if (!lastMeasurementDate) return language === 'ne' ? 'पहिलो वृद्धि मापन थप्नुहोस्।' : 'Add a first growth measurement.';
  const days = Math.floor((Date.now() - Date.parse(lastMeasurementDate)) / 86400000);
  if (days >= 30) return language === 'ne' ? '३० दिनभन्दा बढी भयो—वृद्धि मापन अपडेट गर्ने समय हुन सक्छ।' : 'It has been over 30 days—consider updating the growth measurement.';
  return null;
}

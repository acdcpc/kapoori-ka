// src/utils/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import dayjs from 'dayjs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { NEPAL_NIP_SCHEDULE } from '../data/nepaliVaccines';

// Web does not support expo-notifications (no web-push bridge). Guard everything so the
// module is a safe no-op on web instead of throwing at import/call time.
const IS_WEB = Platform.OS === 'web';

if (!IS_WEB) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export const registerForPushNotifications = async (): Promise<string | null> => {
  if (IS_WEB || !Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('vaccine-reminders', {
      name: 'Vaccine Reminders | खोप सम्झाउने',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1a73e8',
    });
    await Notifications.setNotificationChannelAsync('milestone-reminders', {
      name: 'Milestone Reminders | विकास सम्झाउने',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.setNotificationChannelAsync('growth-alerts', {
      name: 'Growth Alerts | वृद्धि सतर्कता',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#F44336',
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  // Persist for payment/admin notifications (no-op when signed out).
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      await supabase.from('push_tokens').upsert({
        user_id: user.id,
        token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      });
    }
  } catch { /* non-fatal */ }

  return token;
};

/**
 * Schedule Vaccine Reminders
 * 2 days before and on the day of immunization
 */
export const scheduleVaccineReminders = async (
  childName: string,
  vaccines: any[], // ComputedVaccine
  language: 'en' | 'ne' = 'en'
) => {
  if (IS_WEB) return;
  await cancelVaccineReminders(childName);

  const toSchedule = vaccines.filter(v => v.status === 'due' || v.status === 'upcoming' || v.status === 'missed');

  for (const vaccine of toSchedule.slice(0, 10)) {
    const dueDate = dayjs(vaccine.scheduledDate);

    // REMINDER 1: 7 Days Before (premium only)
    const reminder7Days = dueDate.subtract(7, 'day').hour(9).minute(0).second(0);

    // REMINDER 2: 2 Days Before
    const reminder2Days = dueDate.subtract(2, 'day').hour(9).minute(0).second(0);

    // REMINDER 3: Day Of at 8:30am
    const reminderDayOf = dueDate.hour(8).minute(30).second(0);

    // 7-DAY REMINDER
    if (reminder7Days.isAfter(dayjs())) {
      await Notifications.scheduleNotificationAsync({
        identifier: `vaccine_7d_${childName}_${vaccine.id}`,
        content: {
          title: language === 'en'
            ? `💉 Vaccine in 7 Days — ${childName}`
            : `💉 ७ दिनमा खोप — ${childName}`,
          body: language === 'en'
            ? `${vaccine.name || vaccine.nameNe} is due on ${dueDate.format('YYYY-MM-DD')}. Mark your calendar!`
            : `${vaccine.nameNe || vaccine.name} को मिति ${dueDate.format('YYYY-MM-DD')} छ। तयारी गर्नुहोस्!`,
          data: { type: 'vaccine', vaccineId: vaccine.id, childName },
        },
        trigger: { channelId: 'vaccine-reminders', date: reminder7Days.toDate(), type: Notifications.SchedulableTriggerInputTypes.DATE } as Notifications.NotificationTriggerInput,
      });
    }

    if (reminder2Days.isAfter(dayjs())) {
      await Notifications.scheduleNotificationAsync({
        identifier: `vaccine_2d_${childName}_${vaccine.id}`,
        content: {
          title: language === 'en'
            ? `💉 Vaccine in 2 Days — ${childName}`
            : `💉 २ दिनमा खोप — ${childName}`,
          body: language === 'en'
            ? `${vaccine.name} is due on ${vaccine.scheduledDate}. Please prepare to visit the health post.`
            : `${vaccine.nameNe} को मिति ${vaccine.scheduledDate} छ। स्वास्थ्य चौकी जाने तयारी गर्नुहोला।`,
          data: { type: 'vaccine', vaccineId: vaccine.id, childName },
        },
        trigger: { channelId: 'vaccine-reminders', date: reminder2Days.toDate(), type: Notifications.SchedulableTriggerInputTypes.DATE } as Notifications.NotificationTriggerInput,
      });
    }

    if (reminderDayOf.isAfter(dayjs())) {
      await Notifications.scheduleNotificationAsync({
        identifier: `vaccine_today_${childName}_${vaccine.id}`,
        content: {
          title: language === 'en'
            ? `💉 Vaccine Today — ${childName}`
            : `💉 आज खोप लगाउने दिन — ${childName}`,
          body: language === 'en'
            ? `Today is the scheduled date for ${vaccine.name}. Don't miss it!`
            : `आज ${childName}लाई ${vaccine.nameNe} लगाउने दिन हो। छुटाउनु नहोस्!`,
          data: { type: 'vaccine', vaccineId: vaccine.id, childName },
        },
        trigger: { channelId: 'vaccine-reminders', date: reminderDayOf.toDate(), type: Notifications.SchedulableTriggerInputTypes.DATE } as Notifications.NotificationTriggerInput,
      });
    }
    // Nepal reality: parents often come later than the scheduled date.
    // For overdue vaccines (not yet given) remind tomorrow morning — catch-up
    // is always possible, and the reminder re-arms each time the app runs.
    if (vaccine.status === 'missed') {
      const catchUp = dayjs().add(1, 'day').hour(9).minute(0).second(0);
      await Notifications.scheduleNotificationAsync({
        identifier: `vaccine_catchup_${childName}_${vaccine.id}`,
        content: {
          title: language === 'en'
            ? `💉 Vaccine overdue — ${childName}`
            : `💉 खोप बाँकी छ — ${childName}`,
          body: language === 'en'
            ? `${vaccine.name} was due on ${vaccine.scheduledDate}. It is safe to get it now — visit your health post when you can.`
            : `${vaccine.nameNe} को मिति ${vaccine.scheduledDate} थियो। अहिले पनि लगाउन सकिन्छ — सक्दा स्वास्थ्य चौकी जानुहोस्।`,
          data: { type: 'vaccine', vaccineId: vaccine.id, childName },
        },
        trigger: { channelId: 'vaccine-reminders', date: catchUp.toDate(), type: Notifications.SchedulableTriggerInputTypes.DATE } as Notifications.NotificationTriggerInput,
      });
    }
  }
};

export const cancelVaccineReminders = async (childName: string) => {
  if (IS_WEB) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const toCancel = scheduled
    .filter(n => n.identifier.includes(`_${childName}_`))
    .map(n => n.identifier);
  for (const id of toCancel) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
};

export const scheduleMilestoneReminder = async (
  childName: string,
  childId: string,
  language: 'en' | 'ne' = 'en'
) => {
  if (IS_WEB) return;
  await Notifications.cancelScheduledNotificationAsync(`milestone_${childId}`);
  const nextMonth = dayjs().add(1, 'month').startOf('month').hour(10).minute(0);

  await Notifications.scheduleNotificationAsync({
    identifier: `milestone_${childId}`,
    content: {
      title: language === 'en'
        ? `🧠 Milestone Check — ${childName}`
        : `🧠 विकास जाँच — ${childName}`,
      body: language === 'en'
        ? `Time to check ${childName}'s developmental milestones for this month.`
        : `${childName}को यस महिनाको विकास मापदण्ड जाँच्ने समय भयो।`,
      data: { type: 'milestone', childId },
      // channelId removed in SDK 56
    },
    trigger: { date: nextMonth.toDate(), type: Notifications.SchedulableTriggerInputTypes.DATE } as Notifications.NotificationTriggerInput,
  });
};

/**
 * Growth Alert Notification
 * Called when WHO status is not Normal — non-urgent, informational
 */
export const scheduleGrowthAlert = async (
  childName: string,
  childId: string,
  statusLabel: string,
  statusLabelNe: string,
  language: 'en' | 'ne' = 'en'
) => {
  if (IS_WEB) return;
  // Send a local notification 1 hour from now (non-intrusive delay)
  const alertTime = dayjs().add(1, 'hour').toDate();
  const identifier = `growth_alert_${childId}`;

  await Notifications.cancelScheduledNotificationAsync(identifier);

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: language === 'en'
        ? `📊 Growth Update — ${childName}`
        : `📊 वृद्धि अद्यावधिक — ${childName}`,
      body: language === 'en'
        ? `${childName}'s latest measurement shows: ${statusLabel}. A pediatrician check is recommended — no rush, but don't delay.`
        : `${childName}को ताजा मापन: ${statusLabelNe}। बाल रोग विशेषज्ञसँग जाँच गराउन सिफारिस छ — हतार छैन, तर ढिलो नगर्नुहोस्।`,
      data: { type: 'growth', childId },
      // channelId removed in SDK 56
    },
    trigger: { date: alertTime, type: Notifications.SchedulableTriggerInputTypes.DATE } as Notifications.NotificationTriggerInput,
  });
};


// ── Arm reminders for every child at app startup ────────────────────────────
// Mirrors ImmunizationScreen's schedule logic (including parent-adjusted
// dates), so reminders exist even if the Immunization tab is never opened.
let armedForUser: string | null = null;

export const armAllVaccineRemindersForUser = async (userId: string): Promise<void> => {
  if (IS_WEB) return;
  if (armedForUser === userId) return; // once per session per user
  armedForUser = userId;

  try {
    let language: 'en' | 'ne' = 'ne';
    try {
      const saved = await AsyncStorage.getItem('user_language');
      if (saved === 'en' || saved === 'ne') language = saved;
    } catch { /* default */ }

    const { data: children, error: childErr } = await supabase
      .from('children')
      .select('id, name, date_of_birth')
      .eq('user_id', userId);
    if (childErr || !children?.length) return;

    const childIds = children.map((c: any) => c.id);
    const { data: vaccinations, error: vErr } = await supabase
      .from('vaccinations')
      .select('*')
      .in('child_id', childIds);
    if (vErr) return;

    const byChild: Record<string, any[]> = {};
    for (const v of vaccinations || []) {
      (byChild[v.child_id] = byChild[v.child_id] || []).push(v);
    }

    const today = dayjs().startOf('day');
    for (const child of children) {
      const records = byChild[child.id] || [];
      const recordMap = new Map(records.map((r: any) => [r.vaccine_name, r]));
      const givenIds = new Set(records.filter((r: any) => r.is_given).map((r: any) => r.vaccine_name));
      const missedIds = new Set(records.filter((r: any) => r.is_missed).map((r: any) => r.vaccine_name));

      const computed = NEPAL_NIP_SCHEDULE.map((v) => {
        const record = recordMap.get(v.id);
        const scheduledDate = record?.scheduled_date
          ? dayjs(record.scheduled_date).startOf('day')
          : dayjs(child.date_of_birth).add(v.ageInDays, 'day').startOf('day');
        const daysUntilDue = scheduledDate.diff(today, 'day');
        const isGiven = givenIds.has(v.id), isMissed = missedIds.has(v.id);
        let status: 'given' | 'due' | 'upcoming' | 'missed';
        if (isGiven) status = 'given';
        else if (isMissed) status = 'missed';
        else if (daysUntilDue < 0) status = 'missed';
        else if (daysUntilDue <= 14) status = 'due';
        else status = 'upcoming';
        return { id: v.id, name: v.name, nameNe: v.nameNepali, scheduledDate: scheduledDate.format('YYYY-MM-DD'), status, daysUntilDue };
      });

      const childName = child.name || (language === 'ne' ? 'बच्चा' : 'Your Child');
      await scheduleVaccineReminders(childName, computed, language);
    }
  } catch (err) {
    console.warn('[notifications] armAllVaccineReminders failed:', err);
  }
};
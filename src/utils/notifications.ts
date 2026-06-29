// src/utils/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import dayjs from 'dayjs';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const registerForPushNotifications = async (): Promise<string | null> => {
  if (!Device.isDevice) return null;

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
  await cancelVaccineReminders(childName);

  const toSchedule = vaccines.filter(v => v.status === 'due' || v.status === 'upcoming');

  for (const vaccine of toSchedule.slice(0, 10)) {
    const dueDate = dayjs(vaccine.scheduledDate);

    // REMINDER 1: 2 Days Before
    const reminder2Days = dueDate.subtract(2, 'day').hour(9).minute(0).second(0);

    // REMINDER 2: Day Of at 8:30am
    const reminderDayOf = dueDate.hour(8).minute(30).second(0);

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
          // channelId: 'vaccine-reminders',
        },
        trigger: { date: reminder2Days.toDate(), type: Notifications.SchedulableTriggerInputTypes.DATE } as Notifications.NotificationTriggerInput,
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
          // channelId: 'vaccine-reminders',
        },
        trigger: { date: reminderDayOf.toDate(), type: Notifications.SchedulableTriggerInputTypes.DATE } as Notifications.NotificationTriggerInput,
      });
    }
  }
};

export const cancelVaccineReminders = async (childName: string) => {
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
      // channelId: 'milestone-reminders',
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
      // channelId: 'growth-alerts',
    },
    trigger: { date: alertTime, type: Notifications.SchedulableTriggerInputTypes.DATE } as Notifications.NotificationTriggerInput,
  });
};

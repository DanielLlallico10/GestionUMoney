import { useEffect } from 'react';
import { Platform } from 'react-native';
import { AndroidImportance } from 'expo-notifications';
import * as Notifications from 'expo-notifications';

const REMINDER_ID = 'daily-movement-reminder';
const ANDROID_CHANNEL_ID = 'daily-reminders';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export function useDailyMovementReminder(enabled: boolean) {
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;

    const scheduleReminder = async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
          name: 'Recordatorios diarios',
          importance: AndroidImportance.DEFAULT,
        });
      }

      const { status: currentStatus } = await Notifications.getPermissionsAsync();
      const { status } =
        currentStatus === 'granted'
          ? { status: currentStatus }
          : await Notifications.requestPermissionsAsync();

      if (status !== 'granted') return;

      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const previousReminders = scheduledNotifications.filter(
        (notification) => notification.content.data?.reminderId === REMINDER_ID,
      );

      await Promise.all(
        previousReminders.map((notification) =>
          Notifications.cancelScheduledNotificationAsync(notification.identifier),
        ),
      );

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Registra tus movimientos de hoy',
          body: 'Tómate un momento para actualizar tus ingresos y gastos.',
          data: { reminderId: REMINDER_ID },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 20,
          minute: 0,
          ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
        },
      });
    };

    scheduleReminder().catch((error: unknown) => {
      console.error('No se pudo programar el recordatorio diario.', error);
    });
  }, [enabled]);
}

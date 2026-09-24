import { registerPlugin } from '@capacitor/core';

const AlarmPlugin = registerPlugin('AlarmPlugin');

export const scheduleNativeAlarm = async (reminder) => {
  try {
    if (!AlarmPlugin) return;
    
    // Parse the date and ensure it's in the future
    const alarmTime = new Date(reminder.dateTime).getTime();
    if (alarmTime <= Date.now()) return;

    await AlarmPlugin.scheduleAlarm({
      id: reminder._id,
      time: alarmTime,
      title: reminder.title,
      description: reminder.description || 'It is time for your reminder!'
    });
    console.log(`Native alarm scheduled for ${reminder.title}`);
  } catch (err) {
    console.error('Failed to schedule native alarm', err);
  }
};

export const cancelNativeAlarm = async (id) => {
  try {
    if (!AlarmPlugin) return;
    await AlarmPlugin.cancelAlarm({ id });
    console.log(`Native alarm cancelled for ${id}`);
  } catch (err) {
    console.error('Failed to cancel native alarm', err);
  }
};

export const updateNativeAlarms = async (reminders) => {
  try {
    if (!AlarmPlugin) return;
    for (const reminder of reminders) {
      if (!reminder.isCompleted && new Date(reminder.dateTime).getTime() > Date.now()) {
        await scheduleNativeAlarm(reminder);
      } else {
        await cancelNativeAlarm(reminder._id);
      }
    }
  } catch (err) {
    console.error('Failed to bulk sync alarms', err);
  }
};

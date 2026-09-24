const cron = require('node-cron');
const Reminder = require('./models/Reminder');
const Notification = require('./models/Notification');
const socketConfig = require('./socket');

const startScheduler = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      // Find reminders where alarm is enabled, due now or in past, and pending
      const dueReminders = await Reminder.find({
        'alarm.enabled': true,
        nextAlarmAt: { $lte: now },
        isCompleted: false,
        status: 'pending'
      }).populate('owner', 'name profileImage').populate('sharedWith', 'name profileImage');

      if (dueReminders.length > 0) {
        console.log(`Found ${dueReminders.length} due reminders.`);
      }

      const io = socketConfig.getIO();

      for (const reminder of dueReminders) {
        // Mark as triggered so we don't trigger it again immediately
        reminder.status = 'triggered';
        await reminder.save();

        const notifyTargets = [];
        if (reminder.owner) notifyTargets.push(reminder.owner._id.toString());
        if (reminder.sharedWith) {
          reminder.sharedWith.forEach(user => notifyTargets.push(user._id.toString()));
        }

        const uniqueTargets = [...new Set(notifyTargets)];

        const payload = {
          reminderId: reminder._id,
          title: reminder.title,
          date: reminder.dateTime,
          time: reminder.dateTime, // In frontend format as needed
          type: reminder.type,
          sound: reminder.alarm.sound || 'default',
          snoozeMinutes: reminder.alarm.snoozeMinutes || 5
        };

        for (const targetId of uniqueTargets) {
          // Emit socket event for real-time notification
          io.to(targetId).emit('REMINDER_TRIGGERED', payload);

          // Store notification history
          const notification = await Notification.create({
            recipient: targetId,
            sender: reminder.owner ? reminder.owner._id : null,
            type: 'reminder_alarm',
            message: `Reminder: ${reminder.title} is due!`,
            relatedId: reminder._id
          });
          
          const populatedNotif = await notification.populate('sender', 'name profileImage');
          io.to(targetId).emit('new_notification', populatedNotif);
        }
      }
    } catch (error) {
      console.error('Error in reminder scheduler:', error);
    }
  });

  console.log('Scheduler started.');
};

module.exports = { startScheduler };

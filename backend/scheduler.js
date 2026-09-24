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
      
      // AUTO-COMPLETE PAST DUE REMINDERS
      const pastDueReminders = await Reminder.find({
        dateTime: { $lte: now },
        isCompleted: false
      });

      if (pastDueReminders.length > 0) {
        console.log(`Auto-completing ${pastDueReminders.length} past-due reminders.`);
      }

      for (const reminder of pastDueReminders) {
        reminder.isCompleted = true;
        await reminder.save();

        let spawnedReminder = null;
        
        // Spawning logic for recurrence
        const recFreq = reminder.recurrence?.frequency || reminder.recurrenceType;
        const interval = reminder.recurrence?.interval || 1;
        const daysOfWeek = reminder.recurrence?.daysOfWeek || [];
        const endDate = reminder.recurrence?.endDate;

        if (recFreq && recFreq !== 'none') {
          let nextDate = new Date(reminder.dateTime);
          let shouldSpawn = true;

          if (recFreq === 'daily') {
            nextDate.setDate(nextDate.getDate() + interval);
          } else if (recFreq === 'weekly') {
            if (daysOfWeek.length > 0) {
              let currentDay = nextDate.getDay();
              let daysToAdd = 0;
              for (let i = 1; i <= 7; i++) {
                let nextDay = (currentDay + i) % 7;
                if (daysOfWeek.includes(nextDay)) {
                   daysToAdd = i;
                   if (nextDay <= currentDay) {
                      daysToAdd += (interval - 1) * 7;
                   }
                   break;
                }
              }
              if (daysToAdd === 0) daysToAdd = interval * 7;
              nextDate.setDate(nextDate.getDate() + daysToAdd);
            } else {
              nextDate.setDate(nextDate.getDate() + (interval * 7));
            }
          } else if (recFreq === 'monthly') {
            nextDate.setMonth(nextDate.getMonth() + interval);
          } else if (recFreq === 'yearly') {
            nextDate.setFullYear(nextDate.getFullYear() + interval);
          }

          if (endDate && nextDate > new Date(endDate)) {
            shouldSpawn = false;
          }

          if (shouldSpawn) {
            const newReminder = await Reminder.create({
               user: reminder.user,
               owner: reminder.owner,
               type: reminder.type,
               title: reminder.title,
               description: reminder.description,
               dateTime: nextDate,
               location: reminder.location,
               priority: reminder.priority,
               reminderTime: reminder.reminderTime,
               recurrence: reminder.recurrence,
               recurrenceType: reminder.recurrenceType,
               sharedWith: reminder.sharedWith,
               joinSettings: reminder.joinSettings,
               isCompleted: false
            });
            spawnedReminder = await newReminder.populate('owner', 'name');
          }
        }

        const updatedReminder = await Reminder.findById(reminder._id)
          .populate('user', 'name').populate('owner', 'name').populate('sharedWith', 'name');

        const notifyTargets = updatedReminder.sharedWith.map(user => (user._id || user).toString());
        if (updatedReminder.owner) notifyTargets.push(updatedReminder.owner._id ? updatedReminder.owner._id.toString() : updatedReminder.owner.toString());
        if (updatedReminder.user) notifyTargets.push(updatedReminder.user._id ? updatedReminder.user._id.toString() : updatedReminder.user.toString());
        
        const uniqueTargets = [...new Set(notifyTargets)];
        
        for (const targetId of uniqueTargets) {
          const notification = await Notification.create({
            recipient: targetId,
            sender: updatedReminder.owner ? updatedReminder.owner._id : null,
            type: 'reminder_completed',
            message: `The reminder "${updatedReminder.title}" was auto-completed as its time passed.`,
            relatedId: updatedReminder._id
          });
          const populatedNotif = await notification.populate('sender', 'name profileImage');
          io.to(targetId).emit('new_notification', populatedNotif);
          io.to(targetId).emit('reminder_updated', updatedReminder);
          if (spawnedReminder) io.to(targetId).emit('reminder_shared', spawnedReminder);
        }
      }

    } catch (error) {
      console.error('Error in reminder scheduler:', error);
    }
  });

  console.log('Scheduler started.');
};

module.exports = { startScheduler };

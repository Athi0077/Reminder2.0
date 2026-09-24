const Reminder = require('../models/Reminder');
const Notification = require('../models/Notification');
const TeamReminderInvitation = require('../models/TeamReminderInvitation');
const socketConfig = require('../socket');
const User = require('../models/User');
const EventMember = require('../models/EventMember');
const EventJoinRequest = require('../models/EventJoinRequest');
const { logEventActivity } = require('../utils/eventLogger');

const getReminders = async (req, res) => {
  try {
    const reminders = await Reminder.find({ 
      $or: [
        { user: req.user.id },
        { owner: req.user.id },
        { sharedWith: req.user.id }
      ]
    }).sort({ dateTime: 1 }).populate('user', 'name').populate('owner', 'name').populate('sharedWith', 'name');
    res.status(200).json(reminders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createReminder = async (req, res) => {
  try {
    const { title, description, dateTime, location, priority, reminderTime, type, sharedWith, recurrenceType, alarm, joinSettings } = req.body;
    if (!title || !dateTime) {
      return res.status(400).json({ message: 'Title and dateTime are required' });
    }

    const reminderType = type || 'personal';
    
    // For team reminders, the creator is automatically a member
    const initialMembers = reminderType === 'team' ? [req.user.id] : [];

    const reminder = await Reminder.create({
      user: req.user.id, // Legacy support
      owner: req.user.id,
      type: reminderType,
      title,
      description,
      dateTime,
      location,
      priority,
      reminderTime,
      recurrence: req.body.recurrence || { frequency: req.body.recurrenceType || 'none', interval: 1, daysOfWeek: [] },
      joinSettings: joinSettings || (reminderType === 'team' ? 'INVITE_ONLY' : undefined),
      sharedWith: initialMembers,
      alarm: alarm || { enabled: true, sound: 'default', snoozeMinutes: 5 },
      nextAlarmAt: new Date(new Date(dateTime).getTime() - (reminderTime || 15) * 60000),
      status: 'pending'
    });

    if (reminderType === 'team') {
      await EventMember.create({
        eventId: reminder._id,
        userId: req.user.id,
        role: 'owner'
      });
    }
    
    const populatedReminder = await reminder.populate('owner', 'name');
    const io = socketConfig.getIO();

    if (reminderType === 'team' && sharedWith && sharedWith.length > 0) {
      for (const friendId of sharedWith) {
        // Create invitation
        const invite = await TeamReminderInvitation.create({
          reminder: reminder._id,
          sender: req.user.id,
          receiver: friendId,
          status: 'pending'
        });

        // Send Notification
        const notification = await Notification.create({
          recipient: friendId,
          sender: req.user.id,
          type: 'team_invitation',
          message: `${req.user.name} invited you to join '${title}'.`,
          relatedId: invite._id
        });
        const populatedNotif = await notification.populate('sender', 'name profileImage');
        io.to(friendId.toString()).emit('new_notification', populatedNotif);
      }
    }
    
    await logEventActivity(populatedReminder._id, req.user.id, 'EVENT_CREATED', `Created the reminder: "${title}"`);

    res.status(201).json(populatedReminder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
    
    const isOwner = reminder.owner?.toString() === req.user.id || reminder.user?.toString() === req.user.id;
    if (!isOwner && !reminder.sharedWith.includes(req.user.id)) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    let updateData = req.body;
    if (updateData.dateTime || updateData.reminderTime !== undefined) {
      const dt = updateData.dateTime || reminder.dateTime;
      const rt = updateData.reminderTime !== undefined ? updateData.reminderTime : reminder.reminderTime;
      updateData.nextAlarmAt = new Date(new Date(dt).getTime() - rt * 60000);
      updateData.status = 'pending'; // Reset alarm status on time change
    }

    const updatedReminder = await Reminder.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate('user', 'name').populate('owner', 'name').populate('sharedWith', 'name');
    
    const io = socketConfig.getIO();
    
    const notifyTargets = updatedReminder.sharedWith.map(user => (user._id || user).toString());
    if (updatedReminder.owner && updatedReminder.owner._id.toString() !== req.user.id) notifyTargets.push(updatedReminder.owner._id.toString());
    if (updatedReminder.user && updatedReminder.user._id.toString() !== req.user.id) notifyTargets.push(updatedReminder.user._id.toString());
    
    // Deduplicate array
    const uniqueTargets = [...new Set(notifyTargets)];
    
    for (const targetId of uniqueTargets) {
      if (targetId !== req.user.id) {
        const notification = await Notification.create({
          recipient: targetId,
          sender: req.user.id,
          type: 'reminder_updated',
          message: `The reminder "${updatedReminder.title}" was updated.`,
          relatedId: updatedReminder._id
        });
        const populatedNotif = await notification.populate('sender', 'name profileImage');
        io.to(targetId).emit('new_notification', populatedNotif);
        io.to(targetId).emit('reminder_updated', updatedReminder);
      }
    }

    res.status(200).json(updatedReminder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
    
    const isOwner = reminder.owner?.toString() === req.user.id || reminder.user?.toString() === req.user.id;
    if (!isOwner) {
      return res.status(401).json({ message: 'Only owner can delete' });
    }

    await reminder.deleteOne();
    
    const io = socketConfig.getIO();
    for (const targetId of reminder.sharedWith) {
       io.to(targetId.toString()).emit('reminder_deleted', { id: req.params.id });
    }
    
    res.status(200).json({ id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const completeReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
    
    const isOwner = reminder.owner?.toString() === req.user.id || reminder.user?.toString() === req.user.id;
    if (!isOwner && !reminder.sharedWith.includes(req.user.id)) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const wasCompleted = reminder.isCompleted;
    reminder.isCompleted = !reminder.isCompleted;
    await reminder.save();
    
    let spawnedReminder = null;
    
    // Support legacy recurrenceType or new recurrence object
    const recFreq = reminder.recurrence?.frequency || reminder.recurrenceType;
    const interval = reminder.recurrence?.interval || 1;
    const daysOfWeek = reminder.recurrence?.daysOfWeek || [];
    const endDate = reminder.recurrence?.endDate;

    if (!wasCompleted && recFreq && recFreq !== 'none') {
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
           recurrenceType: reminder.recurrenceType, // legacy support
           sharedWith: reminder.sharedWith,
           joinSettings: reminder.joinSettings,
           isCompleted: false
        });
        spawnedReminder = await newReminder.populate('owner', 'name');
      }
    }
    
    const updatedReminder = await Reminder.findById(req.params.id)
      .populate('user', 'name').populate('owner', 'name').populate('sharedWith', 'name');

    const io = socketConfig.getIO();
    
    const notifyTargets = updatedReminder.sharedWith.map(user => (user._id || user).toString());
    if (updatedReminder.owner && updatedReminder.owner._id.toString() !== req.user.id) notifyTargets.push(updatedReminder.owner._id.toString());
    if (updatedReminder.user && updatedReminder.user._id.toString() !== req.user.id) notifyTargets.push(updatedReminder.user._id.toString());
    
    const uniqueTargets = [...new Set(notifyTargets)];
    
    for (const targetId of uniqueTargets) {
      if (targetId !== req.user.id) {
        if (updatedReminder.isCompleted) {
          const notification = await Notification.create({
            recipient: targetId,
            sender: req.user.id,
            type: 'reminder_completed',
            message: `The reminder "${updatedReminder.title}" was marked as completed.`,
            relatedId: updatedReminder._id
          });
          const populatedNotif = await notification.populate('sender', 'name profileImage');
          io.to(targetId).emit('new_notification', populatedNotif);
        }
        io.to(targetId).emit('reminder_updated', updatedReminder);
        if (spawnedReminder) io.to(targetId).emit('reminder_shared', spawnedReminder);
      }
    }

    await logEventActivity(updatedReminder._id, req.user.id, 'EVENT_UPDATED', `Updated event details`);

    res.status(200).json({ updatedReminder, spawnedReminder });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const acceptInvitation = async (req, res) => {
  try {
    const invite = await TeamReminderInvitation.findById(req.params.id);
    if (!invite || invite.receiver.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Invitation not found' });
    }
    
    if (invite.status !== 'pending') return res.status(400).json({ message: 'Invitation already processed' });
    
    invite.status = 'accepted';
    await invite.save();
    
    const reminder = await Reminder.findById(invite.reminder);
    if (reminder) {
      if (!reminder.sharedWith.includes(req.user.id)) {
        reminder.sharedWith.push(req.user.id);
        await reminder.save();
      }
      
      const populatedReminder = await Reminder.findById(reminder._id)
        .populate('user', 'name').populate('owner', 'name').populate('sharedWith', 'name');
        
      const io = socketConfig.getIO();
      io.to(req.user.id).emit('reminder_shared', populatedReminder);
    }
    
    res.status(200).json({ message: 'Invitation accepted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const rejectInvitation = async (req, res) => {
  try {
    const invite = await TeamReminderInvitation.findById(req.params.id);
    if (!invite || invite.receiver.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Invitation not found' });
    }
    
    if (invite.status !== 'pending') return res.status(400).json({ message: 'Invitation already processed' });
    
    invite.status = 'rejected';
    await invite.save();
    
    res.status(200).json({ message: 'Invitation rejected' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const snoozeReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
    
    const isOwner = reminder.owner?.toString() === req.user.id || reminder.user?.toString() === req.user.id;
    if (!isOwner && !reminder.sharedWith.includes(req.user.id)) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const snoozeMinutes = req.body.snoozeMinutes || reminder.alarm?.snoozeMinutes || 5;
    
    // Set nextAlarmAt to current time + snoozeMinutes
    reminder.nextAlarmAt = new Date(Date.now() + snoozeMinutes * 60000);
    reminder.status = 'pending'; // Re-activate for scheduler
    
    await reminder.save();
    res.status(200).json(reminder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const dismissReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
    
    const isOwner = reminder.owner?.toString() === req.user.id || reminder.user?.toString() === req.user.id;
    if (!isOwner && !reminder.sharedWith.includes(req.user.id)) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    reminder.status = 'dismissed';
    
    await reminder.save();
    res.status(200).json(reminder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const joinReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
    
    const isOwner = reminder.owner?.toString() === req.user.id || reminder.user?.toString() === req.user.id;
    const isAlreadyMember = reminder.sharedWith.includes(req.user.id);
    
    if (isOwner || isAlreadyMember) {
      return res.status(200).json({ message: 'Already a member', reminder });
    }

    if (reminder.joinSettings === 'INVITE_ONLY') {
      return res.status(403).json({ message: 'This event is invite-only.' });
    }

    const io = socketConfig.getIO();

    if (reminder.joinSettings === 'APPROVAL') {
      // Create Join Request
      const existingRequest = await EventJoinRequest.findOne({ eventId: reminder._id, userId: req.user.id, status: 'PENDING' });
      if (existingRequest) {
        return res.status(400).json({ message: 'Join request already pending.' });
      }

      const joinRequest = await EventJoinRequest.create({
        eventId: reminder._id,
        userId: req.user.id,
        status: 'PENDING'
      });

      // Notify owner
      if (reminder.owner) {
        const notification = await Notification.create({
          recipient: reminder.owner,
          sender: req.user.id,
          type: 'friend_request', // Reusing type for UI simplicity for now
          message: `${req.user.name} requested to join your event: "${reminder.title}"`,
          relatedId: joinRequest._id
        });
        const populatedNotif = await notification.populate('sender', 'name profileImage');
        io.to(reminder.owner.toString()).emit('new_notification', populatedNotif);
      }

      return res.status(202).json({ message: 'Join request sent. Waiting for approval.', status: 'PENDING' });
    }

    // Default ANYONE handling
    reminder.sharedWith.push(req.user.id);
    
    if (reminder.type !== 'team') {
      reminder.type = 'team'; // Convert to team reminder if it wasn't
      // Since it's converting, ensure the original owner has an EventMember record
      await EventMember.findOneAndUpdate(
        { eventId: reminder._id, userId: reminder.owner },
        { role: 'owner' },
        { upsert: true, new: true }
      );
    }
    await reminder.save();

    await EventMember.create({
      eventId: reminder._id,
      userId: req.user.id,
      role: 'member'
    });

    await logEventActivity(reminder._id, req.user.id, 'MEMBER_JOINED', `${req.user.name} joined the event.`);

    // Populate for socket emission
    const updatedReminder = await Reminder.findById(req.params.id)
      .populate('user', 'name').populate('owner', 'name').populate('sharedWith', 'name profileImage');

    // Notify owner
    if (reminder.owner && reminder.owner.toString() !== req.user.id) {
      const notification = await Notification.create({
        recipient: reminder.owner,
        sender: req.user.id,
        type: 'friend_request', // Using generic type
        message: `${req.user.name} joined your event: "${reminder.title}" via link/QR`,
        relatedId: reminder._id
      });
      const populatedNotif = await notification.populate('sender', 'name profileImage');
      io.to(reminder.owner.toString()).emit('new_notification', populatedNotif);
    }

    // Notify all participants about the updated reminder
    const notifyTargets = updatedReminder.sharedWith.map(user => (user._id || user).toString());
    if (updatedReminder.owner) notifyTargets.push(updatedReminder.owner._id ? updatedReminder.owner._id.toString() : updatedReminder.owner.toString());
    
    const uniqueTargets = [...new Set(notifyTargets)];
    for (const targetId of uniqueTargets) {
      io.to(targetId).emit('reminder_updated', updatedReminder);
    }

    res.status(200).json({ message: 'Successfully joined reminder', reminder: updatedReminder });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getJoinRequests = async (req, res) => {
  try {
    const { id } = req.params;
    const requests = await EventJoinRequest.find({ eventId: id, status: 'PENDING' }).populate('userId', 'name email profileImage');
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const respondToJoinRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'ACCEPT' or 'REJECT'
    
    const joinRequest = await EventJoinRequest.findById(requestId).populate('userId', 'name profileImage');
    if (!joinRequest || joinRequest.status !== 'PENDING') {
      return res.status(404).json({ message: 'Pending join request not found' });
    }

    const reminder = await Reminder.findById(joinRequest.eventId);
    if (!reminder) return res.status(404).json({ message: 'Event not found' });

    // Only owner/admin can respond (currently owner check only for simplicity)
    if (reminder.owner?.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (action === 'REJECT') {
      joinRequest.status = 'REJECTED';
      joinRequest.respondedAt = new Date();
      await joinRequest.save();

      const io = socketConfig.getIO();
      const notification = await Notification.create({
        recipient: joinRequest.userId._id,
        sender: req.user.id,
        type: 'friend_request',
        message: `Your request to join "${reminder.title}" was rejected.`,
        relatedId: reminder._id
      });
      const populatedNotif = await notification.populate('sender', 'name profileImage');
      io.to(joinRequest.userId._id.toString()).emit('new_notification', populatedNotif);

      return res.status(200).json({ message: 'Request rejected' });
    }

    if (action === 'ACCEPT') {
      joinRequest.status = 'ACCEPTED';
      joinRequest.respondedAt = new Date();
      await joinRequest.save();

      if (!reminder.sharedWith.includes(joinRequest.userId._id)) {
        reminder.sharedWith.push(joinRequest.userId._id);
        
        if (reminder.type !== 'team') {
          reminder.type = 'team';
          await EventMember.findOneAndUpdate({ eventId: reminder._id, userId: reminder.owner }, { role: 'owner' }, { upsert: true });
        }
        await reminder.save();

        await EventMember.create({
          eventId: reminder._id,
          userId: joinRequest.userId._id,
          role: 'member'
        });

        await logEventActivity(reminder._id, joinRequest.userId._id, 'MEMBER_JOINED', `${joinRequest.userId.name} joined the event.`);
      }

      const updatedReminder = await Reminder.findById(reminder._id).populate('user', 'name').populate('owner', 'name').populate('sharedWith', 'name profileImage');
      const io = socketConfig.getIO();

      const notification = await Notification.create({
        recipient: joinRequest.userId._id,
        sender: req.user.id,
        type: 'friend_request',
        message: `Your request to join "${reminder.title}" was approved!`,
        relatedId: reminder._id
      });
      const populatedNotif = await notification.populate('sender', 'name profileImage');
      io.to(joinRequest.userId._id.toString()).emit('new_notification', populatedNotif);

      const notifyTargets = updatedReminder.sharedWith.map(user => (user._id || user).toString());
      if (updatedReminder.owner) notifyTargets.push(updatedReminder.owner._id ? updatedReminder.owner._id.toString() : updatedReminder.owner.toString());
      const uniqueTargets = [...new Set(notifyTargets)];
      for (const targetId of uniqueTargets) {
        io.to(targetId).emit('reminder_updated', updatedReminder);
      }

      return res.status(200).json({ message: 'Request accepted', reminder: updatedReminder });
    }

    res.status(400).json({ message: 'Invalid action' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addMember = async (req, res) => {
  // Logic will be handled by joinReminder or acceptInvitation mostly,
  // but an owner could directly add a friend if implemented later.
  res.status(501).json({ message: 'Not implemented. Use invitations or join links.' });
};

const removeMember = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const reminder = await Reminder.findById(id);
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });

    // Permissions
    const isOwner = reminder.owner?.toString() === req.user.id;
    const isSelf = userId === req.user.id;
    
    // Only owner can remove others. Admin can be added later. Users can remove themselves.
    if (!isOwner && !isSelf) {
      return res.status(401).json({ message: 'Not authorized to remove this member' });
    }

    if (reminder.owner?.toString() === userId) {
      return res.status(400).json({ message: 'Cannot remove the owner' });
    }

    // Remove from sharedWith
    reminder.sharedWith = reminder.sharedWith.filter(uid => uid.toString() !== userId);
    await reminder.save();

    // Remove EventMember
    await EventMember.findOneAndDelete({ eventId: id, userId });

    const io = socketConfig.getIO();
    io.to(userId).emit('member_removed', { eventId: id, userId });

    const updatedReminder = await Reminder.findById(id).populate('user', 'name').populate('owner', 'name').populate('sharedWith', 'name profileImage');
    const notifyTargets = updatedReminder.sharedWith.map(user => (user._id || user).toString());
    if (updatedReminder.owner) notifyTargets.push(updatedReminder.owner._id ? updatedReminder.owner._id.toString() : updatedReminder.owner.toString());
    
    const uniqueTargets = [...new Set(notifyTargets)];
    for (const targetId of uniqueTargets) {
      io.to(targetId).emit('reminder_updated', updatedReminder);
    }

    await logEventActivity(id, req.user.id, 'MEMBER_REMOVED', `A member left or was removed from the event.`);

    res.status(200).json({ message: 'Member removed', reminder: updatedReminder });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const changeRole = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { role } = req.body; // 'admin' or 'member'

    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const reminder = await Reminder.findById(id);
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });

    // Only owner can change roles
    if (reminder.owner?.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Only the owner can change roles' });
    }

    const member = await EventMember.findOneAndUpdate(
      { eventId: id, userId },
      { role },
      { new: true }
    );

    if (!member) return res.status(404).json({ message: 'Member not found in event' });

    const updatedReminder = await Reminder.findById(id).populate('user', 'name').populate('owner', 'name').populate('sharedWith', 'name profileImage');
    
    const io = socketConfig.getIO();
    const notifyTargets = updatedReminder.sharedWith.map(user => (user._id || user).toString());
    if (updatedReminder.owner) notifyTargets.push(updatedReminder.owner._id ? updatedReminder.owner._id.toString() : updatedReminder.owner.toString());
    
    const uniqueTargets = [...new Set(notifyTargets)];
    for (const targetId of uniqueTargets) {
      io.to(targetId).emit('reminder_updated', updatedReminder);
      // Optional: Emit specific role change event
      io.to(targetId).emit('role_changed', { eventId: id, userId, role });
    }



    await logEventActivity(id, req.user.id, 'ROLE_CHANGED', `A member's role was changed to ${role}.`);

    res.status(200).json({ message: 'Role updated successfully', member });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getEventMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const reminder = await Reminder.findById(id).populate('owner', 'name email profileImage').populate('sharedWith', 'name email profileImage');
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });

    let members = await EventMember.find({ eventId: id }).populate('userId', 'name email profileImage');
    
    // Legacy migration: if members are empty but sharedWith exists, create them
    if (members.length === 0 && reminder.type === 'team') {
      const newMembers = [];
      if (reminder.owner) {
        newMembers.push({ eventId: id, userId: reminder.owner._id, role: 'owner' });
      }
      for (const sw of reminder.sharedWith) {
        newMembers.push({ eventId: id, userId: sw._id, role: 'member' });
      }
      
      if (newMembers.length > 0) {
        await EventMember.insertMany(newMembers);
        members = await EventMember.find({ eventId: id }).populate('userId', 'name email profileImage');
      }
    }

    res.status(200).json(members);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getEventLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const EventLog = require('../models/EventLog');
    const logs = await EventLog.find({ eventId: id }).populate('user', 'name profileImage').sort({ createdAt: -1 });
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const reminders = await Reminder.find({
      $or: [
        { owner: userId },
        { user: userId },
        { sharedWith: userId }
      ]
    });

    const totalCount = reminders.length;
    const completedCount = reminders.filter(r => r.isCompleted).length;
    const pendingCount = totalCount - completedCount;
    const completionRate = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

    const now = new Date();
    const next7Days = new Date(now);
    next7Days.setDate(next7Days.getDate() + 7);

    const upcomingCount = reminders.filter(r => !r.isCompleted && new Date(r.dateTime) > now && new Date(r.dateTime) <= next7Days).length;

    // Segment upcoming events
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    
    const tomorrowEnd = new Date(todayEnd);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    let todayCount = 0;
    let tomorrowCount = 0;
    let laterCount = 0;

    reminders.forEach(r => {
      if (r.isCompleted) return;
      const dt = new Date(r.dateTime);
      if (dt < now) return; // Overdue, technically not "upcoming" in the same way, but let's exclude for this specific widget or count it in today if needed.
      if (dt <= todayEnd) {
        todayCount++;
      } else if (dt <= tomorrowEnd) {
        tomorrowCount++;
      } else if (dt <= next7Days) {
        laterCount++;
      }
    });

    // Task aggregation (for team events)
    const EventTask = require('../models/EventTask');
    const teamEventIds = reminders.filter(r => r.type === 'team').map(r => r._id);
    const tasks = await EventTask.find({ eventId: { $in: teamEventIds } });
    
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED' || t.isCompleted).length; // Depending on task schema

    res.status(200).json({
      totalCount,
      completedCount,
      pendingCount,
      completionRate,
      upcomingCount,
      segments: { today: todayCount, tomorrow: tomorrowCount, later: laterCount },
      tasks: { total: totalTasks, completed: completedTasks }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getReminders, createReminder, updateReminder, deleteReminder, completeReminder, acceptInvitation, rejectInvitation, snoozeReminder, dismissReminder, joinReminder, getJoinRequests, respondToJoinRequest, addMember, removeMember, changeRole, getEventMembers, getEventLogs, getDashboardStats };

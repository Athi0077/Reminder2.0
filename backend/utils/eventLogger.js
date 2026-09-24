const EventLog = require('../models/EventLog');
const socketConfig = require('../socket');

const logEventActivity = async (eventId, userId, actionType, description, metadata = {}) => {
  try {
    const log = await EventLog.create({
      eventId,
      user: userId,
      actionType,
      description,
      metadata
    });

    const populatedLog = await EventLog.findById(log._id).populate('user', 'name profileImage');
    const io = socketConfig.getIO();
    io.emit(`event_log_${eventId}`, populatedLog);
    
    return populatedLog;
  } catch (error) {
    console.error('Failed to log event activity:', error);
  }
};

module.exports = { logEventActivity };

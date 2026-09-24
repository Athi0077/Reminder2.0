const EventPoll = require('../models/EventPoll');
const Reminder = require('../models/Reminder');
const EventMember = require('../models/EventMember');
const socketConfig = require('../socket');
const { logEventActivity } = require('../utils/eventLogger');

// Helper to check if user has access to the event
const checkAccess = async (eventId, userId) => {
  const reminder = await Reminder.findById(eventId);
  if (!reminder) throw new Error('Reminder not found');
  
  const isOwner = reminder.owner?.toString() === userId || reminder.user?.toString() === userId;
  const isMember = reminder.sharedWith.includes(userId);
  
  if (!isOwner && !isMember) {
    throw new Error('Not authorized to access this event');
  }

  const memberRecord = await EventMember.findOne({ eventId, userId });
  return { reminder, isOwner, isAdmin: isOwner || memberRecord?.role === 'admin' };
};

const getPolls = async (req, res) => {
  try {
    const { id } = req.params;
    await checkAccess(id, req.user.id);

    const polls = await EventPoll.find({ eventId: id }).populate('createdBy', 'name profileImage').sort({ createdAt: -1 });
    res.status(200).json(polls);
  } catch (error) {
    res.status(error.message === 'Not authorized to access this event' ? 403 : 500).json({ message: error.message });
  }
};

const createPoll = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, options } = req.body;

    await checkAccess(id, req.user.id);

    if (!question || !options || options.length < 2) {
      return res.status(400).json({ message: 'A poll needs a question and at least two options.' });
    }

    const formattedOptions = options.map(opt => ({ text: opt, votes: [] }));

    const poll = await EventPoll.create({
      eventId: id,
      question,
      options: formattedOptions,
      createdBy: req.user.id
    });

    const populatedPoll = await EventPoll.findById(poll._id).populate('createdBy', 'name profileImage');
    
    await logEventActivity(id, req.user.id, 'EVENT_UPDATED', `Created a poll: "${question}"`);

    const io = socketConfig.getIO();
    io.emit(`poll_created_${id}`, populatedPoll);

    res.status(201).json(populatedPoll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const votePoll = async (req, res) => {
  try {
    const { pollId } = req.params;
    const { optionId } = req.body;

    const poll = await EventPoll.findById(pollId);
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    if (poll.isClosed) return res.status(400).json({ message: 'Poll is closed' });

    await checkAccess(poll.eventId, req.user.id);

    // Remove user's vote from all options first (single vote per poll logic)
    poll.options.forEach(opt => {
      opt.votes = opt.votes.filter(v => v.toString() !== req.user.id);
    });

    // If an optionId is provided, cast the vote. If it's the same option they already voted for, 
    // it acts as a toggle-off (since we just removed them above, and we wouldn't add them back if optionId is null).
    if (optionId) {
      const optionToVote = poll.options.id(optionId);
      if (!optionToVote) return res.status(400).json({ message: 'Invalid option' });
      optionToVote.votes.push(req.user.id);
    }

    await poll.save();

    const populatedPoll = await EventPoll.findById(poll._id).populate('createdBy', 'name profileImage');
    
    const io = socketConfig.getIO();
    io.emit(`poll_updated_${poll.eventId}`, populatedPoll);

    res.status(200).json(populatedPoll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const closePoll = async (req, res) => {
  try {
    const { pollId } = req.params;
    const poll = await EventPoll.findById(pollId);
    if (!poll) return res.status(404).json({ message: 'Poll not found' });

    const { isAdmin } = await checkAccess(poll.eventId, req.user.id);
    if (!isAdmin && poll.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only admins or the creator can close this poll' });
    }

    poll.isClosed = true;
    await poll.save();

    const populatedPoll = await EventPoll.findById(poll._id).populate('createdBy', 'name profileImage');
    
    await logEventActivity(poll.eventId, req.user.id, 'EVENT_UPDATED', `Closed the poll: "${poll.question}"`);

    const io = socketConfig.getIO();
    io.emit(`poll_updated_${poll.eventId}`, populatedPoll);

    res.status(200).json(populatedPoll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deletePoll = async (req, res) => {
  try {
    const { pollId } = req.params;
    const poll = await EventPoll.findById(pollId);
    if (!poll) return res.status(404).json({ message: 'Poll not found' });

    const { isAdmin } = await checkAccess(poll.eventId, req.user.id);
    if (!isAdmin && poll.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only admins or the creator can delete this poll' });
    }

    await EventPoll.findByIdAndDelete(pollId);
    
    await logEventActivity(poll.eventId, req.user.id, 'EVENT_UPDATED', `Deleted a poll`);

    const io = socketConfig.getIO();
    io.emit(`poll_deleted_${poll.eventId}`, pollId);

    res.status(200).json({ message: 'Poll deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getPolls, createPoll, votePoll, closePoll, deletePoll };

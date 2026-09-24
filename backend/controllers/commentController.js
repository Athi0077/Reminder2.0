const Comment = require('../models/Comment');
const Reminder = require('../models/Reminder');
const socketConfig = require('../socket');

const getComments = async (req, res) => {
  try {
    const reminderId = req.params.reminderId;
    const reminder = await Reminder.findById(reminderId);

    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });

    // Authorization check
    const isOwner = reminder.owner?.toString() === req.user.id || reminder.user?.toString() === req.user.id;
    if (!isOwner && !reminder.sharedWith.includes(req.user.id)) {
      return res.status(401).json({ message: 'Not authorized to view comments' });
    }

    const comments = await Comment.find({ reminder: reminderId })
      .populate('user', 'name profileImage')
      .sort({ createdAt: 1 });

    res.status(200).json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addComment = async (req, res) => {
  try {
    const reminderId = req.params.reminderId;
    const { text } = req.body;

    if (!text) return res.status(400).json({ message: 'Comment text is required' });

    const reminder = await Reminder.findById(reminderId);
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });

    // Authorization check
    const isOwner = reminder.owner?.toString() === req.user.id || reminder.user?.toString() === req.user.id;
    if (!isOwner && !reminder.sharedWith.includes(req.user.id)) {
      return res.status(401).json({ message: 'Not authorized to post comments' });
    }

    const comment = await Comment.create({
      reminder: reminderId,
      user: req.user.id,
      text
    });

    const populatedComment = await comment.populate('user', 'name profileImage');

    // Emit socket event to all members
    const io = socketConfig.getIO();
    const notifyTargets = reminder.sharedWith.map(id => id.toString());
    if (reminder.owner) notifyTargets.push(reminder.owner.toString());
    if (reminder.user) notifyTargets.push(reminder.user.toString());

    const uniqueTargets = [...new Set(notifyTargets)];
    
    for (const targetId of uniqueTargets) {
      if (targetId !== req.user.id) {
        io.to(targetId).emit('new_comment', populatedComment);
      }
    }

    res.status(201).json(populatedComment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getComments, addComment };

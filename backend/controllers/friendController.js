const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const Notification = require('../models/Notification');
const socketConfig = require('../socket');

const searchUsers = async (req, res) => {
  try {
    const keyword = req.query.q ? {
      $or: [
        { name: { $regex: req.query.q, $options: 'i' } },
        { email: { $regex: req.query.q, $options: 'i' } }
      ],
      _id: { $ne: req.user.id }
    } : { _id: { $ne: req.user.id } };

    const users = await User.find(keyword).select('name email profileImage friends');
    
    // Calculate relationship status for each user
    const results = await Promise.all(users.map(async (u) => {
      let relationship = 'none';
      
      if (u.friends.includes(req.user.id)) {
        relationship = 'friends';
      } else {
        const request = await FriendRequest.findOne({
          $or: [
            { sender: req.user.id, receiver: u._id },
            { sender: u._id, receiver: req.user.id }
          ],
          status: 'pending'
        });
        
        if (request) {
          relationship = request.sender.toString() === req.user.id ? 'pending_sent' : 'pending_received';
        }
      }
      
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        profileImage: u.profileImage,
        relationship
      };
    }));

    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFriendsInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('friends', 'name email profileImage');
    
    // Get pending received requests
    const receivedRequests = await FriendRequest.find({ receiver: req.user.id, status: 'pending' })
      .populate('sender', 'name email profileImage');
      
    // Get pending sent requests
    const sentRequests = await FriendRequest.find({ sender: req.user.id, status: 'pending' })
      .populate('receiver', 'name email profileImage');
    
    res.status(200).json({
      friends: user.friends,
      received: receivedRequests.map(r => ({ ...r.sender.toObject(), requestId: r._id })),
      sent: sentRequests.map(r => ({ ...r.receiver.toObject(), requestId: r._id }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendRequest = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    if (targetUserId === req.user.id) return res.status(400).json({ message: 'Cannot add yourself' });

    const user = await User.findById(req.user.id);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) return res.status(404).json({ message: 'User not found' });
    if (user.friends.includes(targetUserId)) return res.status(400).json({ message: 'Already friends' });

    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: req.user.id, receiver: targetUserId },
        { sender: targetUserId, receiver: req.user.id }
      ],
      status: 'pending'
    });

    if (existingRequest) return res.status(400).json({ message: 'Request already exists' });

    await FriendRequest.create({
      sender: req.user.id,
      receiver: targetUserId,
      status: 'pending'
    });

    // Create Notification & Emit
    const notification = await Notification.create({
      recipient: targetUserId,
      sender: user.id,
      type: 'friend_request',
      message: `${user.name} sent you a friend request.`,
    });
    
    const populatedNotif = await notification.populate('sender', 'name profileImage');
    const io = socketConfig.getIO();
    io.to(targetUserId.toString()).emit('new_notification', populatedNotif);
    io.to(targetUserId.toString()).emit('friend_request_received');

    res.status(200).json({ message: 'Friend request sent' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const acceptRequest = async (req, res) => {
  try {
    const targetUserId = req.params.id; // User who sent the request
    const user = await User.findById(req.user.id);
    const targetUser = await User.findById(targetUserId);

    const request = await FriendRequest.findOne({
      sender: targetUserId,
      receiver: req.user.id,
      status: 'pending'
    });

    if (!request) return res.status(404).json({ message: 'Friend request not found' });

    request.status = 'accepted';
    await request.save();

    user.friends.push(targetUserId);
    targetUser.friends.push(user.id);

    await user.save();
    await targetUser.save();

    // Create Notification & Emit
    const notification = await Notification.create({
      recipient: targetUserId,
      sender: user.id,
      type: 'friend_accepted',
      message: `${user.name} accepted your friend request.`,
    });
    
    const populatedNotif = await notification.populate('sender', 'name profileImage');
    const io = socketConfig.getIO();
    io.to(targetUserId.toString()).emit('new_notification', populatedNotif);
    io.to(targetUserId.toString()).emit('friend_request_accepted');

    res.status(200).json({ message: 'Friend request accepted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const rejectRequest = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const request = await FriendRequest.findOne({
      sender: targetUserId,
      receiver: req.user.id,
      status: 'pending'
    });

    if (!request) return res.status(404).json({ message: 'Friend request not found' });

    request.status = 'rejected';
    await request.save();

    res.status(200).json({ message: 'Friend request rejected' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const removeFriend = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const user = await User.findById(req.user.id);
    const targetUser = await User.findById(targetUserId);

    user.friends = user.friends.filter(id => id.toString() !== targetUserId);
    targetUser.friends = targetUser.friends.filter(id => id.toString() !== user.id);

    await user.save();
    await targetUser.save();

    // Also delete any existing requests just to clean up
    await FriendRequest.deleteMany({
      $or: [
        { sender: req.user.id, receiver: targetUserId },
        { sender: targetUserId, receiver: req.user.id }
      ]
    });
    
    const io = socketConfig.getIO();
    io.to(targetUserId.toString()).emit('friend_removed');

    res.status(200).json({ message: 'Friend removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { searchUsers, getFriendsInfo, sendRequest, acceptRequest, rejectRequest, removeFriend };

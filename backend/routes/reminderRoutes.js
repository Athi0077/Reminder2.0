const express = require('express');
const router = express.Router();
const { 
  getReminders, 
  createReminder, 
  updateReminder, 
  deleteReminder, 
  completeReminder,
  acceptInvitation,
  rejectInvitation,
  snoozeReminder,
  dismissReminder,
  joinReminder,
  getJoinRequests,
  respondToJoinRequest,
  addMember,
  removeMember,
  changeRole,
  getEventMembers,
  getEventLogs,
  getDashboardStats
} = require('../controllers/reminderController');
const { getTasks, createTask, updateTask, deleteTask } = require('../controllers/taskController');
const { getPolls, createPoll, votePoll, closePoll, deletePoll } = require('../controllers/pollController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getReminders)
  .post(protect, createReminder);

router.get('/dashboard-stats', protect, getDashboardStats);

router.route('/:id')
  .put(protect, updateReminder)
  .delete(protect, deleteReminder);

router.patch('/:id/complete', protect, completeReminder);
router.post('/:id/snooze', protect, snoozeReminder);
router.post('/:id/dismiss', protect, dismissReminder);
router.post('/:id/join', protect, joinReminder);
router.get('/:id/join-requests', protect, getJoinRequests);
router.patch('/join-requests/:requestId', protect, respondToJoinRequest);

// Member Management
router.get('/:id/members', protect, getEventMembers);
router.post('/:id/members', protect, addMember);
router.delete('/:id/members/:userId', protect, removeMember);
router.patch('/:id/members/:userId/role', protect, changeRole);

// Logs
router.get('/:id/logs', protect, getEventLogs);

// Task Management
router.get('/:id/tasks', protect, getTasks);
router.post('/:id/tasks', protect, createTask);
router.patch('/tasks/:taskId', protect, updateTask);
router.delete('/tasks/:taskId', protect, deleteTask);

router.post('/invitations/:id/accept', protect, acceptInvitation);
router.post('/invitations/:id/reject', protect, rejectInvitation);

// Poll Management
router.get('/:id/polls', protect, getPolls);
router.post('/:id/polls', protect, createPoll);
router.post('/polls/:pollId/vote', protect, votePoll);
router.patch('/polls/:pollId/close', protect, closePoll);
router.delete('/polls/:pollId', protect, deletePoll);

module.exports = router;

const express = require('express');
const router = express.Router();
const { searchUsers, getFriendsInfo, sendRequest, acceptRequest, rejectRequest, removeFriend } = require('../controllers/friendController');
const { protect } = require('../middleware/authMiddleware');

router.get('/search', protect, searchUsers);
router.get('/', protect, getFriendsInfo);
router.post('/request/:id', protect, sendRequest);
router.post('/accept/:id', protect, acceptRequest);
router.post('/reject/:id', protect, rejectRequest);
router.delete('/remove/:id', protect, removeFriend);

module.exports = router;

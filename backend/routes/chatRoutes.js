const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getThreads, getThread, sendMessage } = require('../controllers/chatController');

const router = express.Router();

router.get('/threads', protect, getThreads);
router.get('/:partnerId', protect, getThread);
router.post('/:partnerId', protect, sendMessage);

module.exports = router;

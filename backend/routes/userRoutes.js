const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getUserProfile, updateMyProfile, getMyTransactions } = require('../controllers/userController');
const { uploadAvatar } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.put('/me/profile', protect, uploadAvatar.single('avatar'), updateMyProfile);
router.get('/me/transactions', protect, getMyTransactions);
router.get('/:id/profile', getUserProfile);

module.exports = router;

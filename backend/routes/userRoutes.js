const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getUserProfile, updateMyProfile, updateMySkills, getMyTransactions } = require('../controllers/userController');
const { uploadAvatar } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.put('/me/profile', protect, uploadAvatar.single('avatar'), updateMyProfile);
router.put('/me/skills', protect, updateMySkills);
router.get('/me/transactions', protect, getMyTransactions);
router.get('/:id/profile', getUserProfile);

module.exports = router;

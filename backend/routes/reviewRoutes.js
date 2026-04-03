const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { createReview } = require('../controllers/reviewController');

const router = express.Router();

router.post('/', protect, createReview);

module.exports = router;

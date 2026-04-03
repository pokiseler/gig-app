const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { subscribe } = require('../controllers/eventController');

// GET /api/events  — token passed as ?token= query param (EventSource limitation)
router.get('/', protect, subscribe);

module.exports = router;

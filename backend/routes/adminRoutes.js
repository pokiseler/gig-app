// backend/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { protect, adminGuard } = require('../middleware/authMiddleware');
const { getDashboardStats, getAllUsers, deleteUser, getAllGigs, deleteGig } = require('../controllers/adminController');

// All routes require authentication + admin role
router.use(protect, adminGuard);

router.get('/stats', getDashboardStats);
router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);
router.get('/gigs', getAllGigs);
router.delete('/gigs/:id', deleteGig);

module.exports = router;

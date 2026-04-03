const express = require('express');
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const {
  createGig,
  filterGigs,
  updateGig,
  getGigById,
  deleteGig,
  hireFreelancer,
  requestGigAssignment,
  acceptGigApplicant,
  denyGigApplicant,
  getMyGigRequests,
  markAsFinished,
  confirmReceipt,
  getMyTasks,
} = require('../controllers/gigController');

const router = express.Router();

router.post('/', protect, createGig);
router.get('/my/tasks', protect, getMyTasks);
router.get('/my/requests', protect, getMyGigRequests);
router.get('/', optionalProtect, filterGigs);
router.post('/:id/hire', protect, hireFreelancer);
router.post('/:id/request', protect, requestGigAssignment);
router.post('/:id/applications/:applicantId/accept', protect, acceptGigApplicant);
router.post('/:id/applications/:applicantId/deny', protect, denyGigApplicant);
router.post('/:id/finish', protect, markAsFinished);
router.post('/:id/confirm', protect, confirmReceipt);
router.get('/:id', getGigById);
router.patch('/:id', protect, updateGig);
router.delete('/:id', protect, deleteGig);

module.exports = router;
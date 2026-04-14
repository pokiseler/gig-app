const Review = require('../models/Review');
const User = require('../models/User');
const Gig = require('../models/Gig');
const { createReviewSchema } = require('../validation/schemas');
const sseManager = require('../events/sseManager');

const createReview = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized. Login is required for this action.' });
    }

    const parsed = createReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0].message });
    }

    const { targetUser, gigId, gigName, rating, comment } = parsed.data;

    if (targetUser === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot review yourself.' });
    }

    const targetUserDoc = await User.findById(targetUser);
    if (!targetUserDoc) {
      return res.status(404).json({ message: 'Target user not found.' });
    }

    if (gigId) {
      const gigDoc = await Gig.findById(gigId);
      if (!gigDoc) {
        return res.status(404).json({ message: 'Gig not found.' });
      }
      const gigOwnerId = gigDoc.author ? gigDoc.author.toString() : gigDoc.postedBy?.toString();
      const gigFreelancerId = gigDoc.freelancer ? gigDoc.freelancer.toString() : null;
      const reviewerId = req.user._id.toString();
      const allowedTargets = [gigOwnerId, gigFreelancerId].filter(Boolean);
      const allowedReviewers = [gigOwnerId, gigFreelancerId].filter(Boolean);

      if (!allowedTargets.includes(targetUser)) {
        return res.status(400).json({ message: 'targetUser must be one of the gig participants.' });
      }

      if (!allowedReviewers.includes(reviewerId)) {
        return res.status(403).json({ message: 'Only gig participants can leave this review.' });
      }
    }

    const review = await Review.create({
      reviewer: req.user._id,
      targetUser,
      gigId: gigId || undefined,
      gigName: gigName || '',
      rating,
      comment: comment || '',
    });

    const populatedReview = await Review.findById(review._id)
      .populate('reviewer', 'name averageRating totalReviews')
      .populate('targetUser', 'name averageRating totalReviews')
      .populate('gigId', 'title postType status');

    // Notify the reviewed user in real-time if they are connected.
    sseManager.send(targetUser, 'new_review', {
      message: `${req.user.name} left you a ${rating}-star review.`,
      reviewId: review._id,
      rating,
    });

    return res.status(201).json({
      message: 'Review created successfully.',
      review: populatedReview,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'You already reviewed this gig.' });
    }

    console.error('createReview error:', error);
    return res.status(500).json({ message: 'Server error while creating review.' });
  }
};

module.exports = {
  createReview,
};

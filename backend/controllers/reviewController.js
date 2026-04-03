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

    const { targetUser, gigId, rating, comment } = parsed.data;

    if (targetUser === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot review yourself.' });
    }

    const [targetUserDoc, gigDoc] = await Promise.all([
      User.findById(targetUser),
      Gig.findById(gigId),
    ]);

    if (!targetUserDoc) {
      return res.status(404).json({ message: 'Target user not found.' });
    }

    if (!gigDoc) {
      return res.status(404).json({ message: 'Gig not found.' });
    }

    const gigOwnerId = gigDoc.author ? gigDoc.author.toString() : gigDoc.postedBy?.toString();
    if (!gigOwnerId || gigOwnerId !== targetUser) {
      return res.status(400).json({ message: 'targetUser must match the gig owner.' });
    }

    // Prepared for future transaction check: can enforce completed status here.
    const review = await Review.create({
      reviewer: req.user._id,
      targetUser,
      gigId,
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

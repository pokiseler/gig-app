const User = require('../models/User');
const Gig = require('../models/Gig');
const Review = require('../models/Review');
const Transaction = require('../models/Transaction');
const { mapGigForResponse } = require('../utils/gigMapper');
const { updateProfileSchema } = require('../validation/schemas');
const { uploadBuffer } = require('../utils/cloudinary');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const buildProfilePayload = (body) => {
  const skills = typeof body.skillsInput === 'string'
    ? body.skillsInput.split(',').map((item) => item.trim()).filter(Boolean)
    : Array.isArray(body.skills)
      ? body.skills.map((item) => String(item).trim()).filter(Boolean)
      : undefined;

  return {
    name: body.name,
    phone: body.phone,
    avatarUrl: body.avatarUrl,
    bio: body.bio,
    skills,
    location: {
      city: body.city,
      address: body.address,
    },
  };
};

const updateMyProfile = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'Not authorized.' });
    }

    const payload = buildProfilePayload(req.body || {});

    if (req.file) {
      const uploadedAsset = await uploadBuffer(
        req.file.buffer,
        'tasker-il/avatars',
        req.file.originalname,
        req.file.mimetype,
      );
      payload.avatarUrl = uploadedAsset.secure_url.startsWith('http')
        ? uploadedAsset.secure_url
        : `${req.protocol}://${req.get('host')}${uploadedAsset.secure_url}`;
    }

    const parsed = updateProfileSchema.safeParse(payload);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0].message });
    }

    const nextProfile = { ...parsed.data };

    if (nextProfile.skills) {
      nextProfile.skills = nextProfile.skills.map((s) => s.trim()).filter(Boolean);
    }

    if (nextProfile.location) {
      nextProfile.location = {
        city: nextProfile.location.city || '',
        address: nextProfile.location.address || '',
      };
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      nextProfile,
      { new: true, runValidators: true },
    ).select('_id name email role phone verified balance escrowBalance avatarUrl bio skills location averageRating totalReviews createdAt updatedAt');

    return res.status(200).json({
      message: 'Profile updated successfully.',
      user: updatedUser,
    });
  } catch (error) {
    console.error('updateMyProfile error:', error);
    return res.status(500).json({ message: 'Server error while updating profile.' });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!objectIdRegex.test(id)) {
      return res.status(400).json({ message: 'User id is invalid.' });
    }

    const user = await User.findById(id).select('_id name email role phone verified usageQuota avatarUrl bio skills location averageRating totalReviews createdAt updatedAt');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const [requests, reviews] = await Promise.all([
      Gig.find({ author: user._id, status: 'open', postType: 'WANTED' })
        .sort({ createdAt: -1 })
        .populate('author', 'name averageRating totalReviews'),
      Review.find({ targetUser: user._id })
        .sort({ createdAt: -1 })
        .populate('reviewer', 'name averageRating totalReviews')
        .populate('gigId', 'title postType status'),
    ]);

    return res.status(200).json({
      user,
      offers: [],
      requests: requests.map(mapGigForResponse),
      reviews,
    });
  } catch (error) {
    console.error('getUserProfile error:', error);
    return res.status(500).json({ message: 'Server error while fetching profile.' });
  }
};

const getMyTransactions = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'Not authorized.' });
    }

    const transactions = await Transaction.find({
      $or: [
        { senderId: req.user._id },
        { receiverId: req.user._id },
      ],
    })
      .populate('senderId', 'name email')
      .populate('receiverId', 'name email')
      .populate('gigId', 'title price status')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({
      total: transactions.length,
      transactions,
    });
  } catch (error) {
    console.error('getMyTransactions error:', error);
    return res.status(500).json({ message: 'Server error while fetching transactions.' });
  }
};

module.exports = {
  updateMyProfile,
  getUserProfile,
  getMyTransactions,
};

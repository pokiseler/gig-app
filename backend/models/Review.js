const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  gigId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gig',
    required: false,
    index: true,
    sparse: true,
  },
  gigName: {
    type: String,
    trim: true,
    maxlength: 200,
    default: '',
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  comment: {
    type: String,
    trim: true,
    default: '',
    maxlength: 1000,
  },
}, { timestamps: true });

ReviewSchema.index({ reviewer: 1, gigId: 1 }, { unique: true, sparse: true });

ReviewSchema.statics.recalculateTargetUserStats = async function recalculateTargetUserStats(targetUserId) {
  const stats = await this.aggregate([
    { $match: { targetUser: new mongoose.Types.ObjectId(targetUserId) } },
    {
      $group: {
        _id: '$targetUser',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const User = mongoose.model('User');
  await User.findByIdAndUpdate(targetUserId, {
    averageRating: Number((stats[0]?.averageRating || 0).toFixed(2)),
    totalReviews: stats[0]?.totalReviews || 0,
  });
};

ReviewSchema.post('save', async function postSave() {
  await this.constructor.recalculateTargetUserStats(this.targetUser);
});

module.exports = mongoose.model('Review', ReviewSchema);

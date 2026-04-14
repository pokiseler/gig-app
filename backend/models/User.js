const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['provider', 'consumer', 'admin'],
    required: true,
  },
  phone: {
    type: String,
    default: '',  // e.g. '050-1234567'
  },
  verified: {
    type: Boolean,
    default: false, // false = regular user, true = verified real user (not a bot)
  },
  usageQuota: {
    performedThisMonth: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastReset: {
      type: Date,
      default: Date.now,
    },
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  totalReviews: {
    type: Number,
    default: 0,
    min: 0,
  },
  avatarUrl: {
    type: String,
    default: '',
  },
  bio: {
    type: String,
    default: '',
    maxlength: 600,
  },
  skills: {
    type: [String],
    default: [],
  },
  categories: {
    type: [String],
    default: [],
  },
  location: {
    city: {
      type: String, // e.g. "Tel Aviv", "Bat Yam"
      default: '',
    },
    address: {
      type: String, // Full human-readable address
      default: '',
    },
  },
  // GPS coordinates stored separately — only set when the user shares their location
  geoLocation: {
    type: {
      type: String,
      enum: ['Point'],
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
    },
  },
}, { timestamps: true });

// sparse: true = only index users who have actual GPS coordinates
UserSchema.index({ geoLocation: '2dsphere' }, { sparse: true });
UserSchema.index({ averageRating: -1, totalReviews: -1 });

module.exports = mongoose.model('User', UserSchema);
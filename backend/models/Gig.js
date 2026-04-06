const mongoose = require('mongoose');

const GigSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['wanted'],
    required: false,
  },
  postType: {
    type: String,
    enum: ['WANTED'],
    required: true,
  },
  category: {
    type: String,
    required: true, // e.g., 'web development', 'design', etc.
  },
  price: {
    type: Number,
    required: true,
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User who posted
    required: false,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  freelancer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'completed'],
    default: 'open',
  },
  freelancerConfirmed: {
    type: Boolean,
    default: false,
  },
  clientConfirmed: {
    type: Boolean,
    default: false,
  },
  escrowAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  taskTransaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null,
  },
  applications: {
    type: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        status: {
          type: String,
          enum: ['REQUESTED', 'DENIED', 'ACCEPTED'],
          default: 'REQUESTED',
        },
        requestedAt: {
          type: Date,
          default: Date.now,
        },
        actedAt: {
          type: Date,
          default: null,
        },
      },
    ],
    default: [],
  },
  tags: {
    type: [String],
    default: [],
  },
  images: {
    type: [String], // Array of image URLs, e.g. ['https://...', 'https://...']
    default: [],
  },
  location: {
    city: {
      type: String, // e.g. "Tel Aviv", "Bat Yam" — used for filtering
      default: '',
    },
    address: {
      type: String, // Full address
      default: '',
    },
  },
  // GPS coordinates stored separately — only set when poster shares their location
  geoLocation: {
    type: {
      type: String,
      enum: ['Point'],
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
    },
  },
  // Real-money tip offered on top of the points reward (optional)
  tipAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  tipMethod: {
    type: String,
    enum: ['cash', 'bit'],
    default: 'cash',
  },
}, { timestamps: true }); // timestamps auto-adds createdAt and updatedAt

// Compound index for the most common list query pattern: filter by status + category,
// sorted by newest first. Covers filterGigs() with any combination of those fields.
GigSchema.index({ status: 1, category: 1, createdAt: -1 });

// Standalone status index for queries that filter on status alone.
GigSchema.index({ status: 1 });

// Sparse 2dsphere index — only indexes gigs that have GPS coordinates set.
GigSchema.index({ geoLocation: '2dsphere' }, { sparse: true });

module.exports = mongoose.model('Gig', GigSchema);
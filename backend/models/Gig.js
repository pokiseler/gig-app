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
}, { timestamps: true }); // timestamps auto-adds createdAt and updatedAt

// sparse: true = only index gigs that have actual GPS coordinates
GigSchema.index({ geoLocation: '2dsphere' }, { sparse: true });

module.exports = mongoose.model('Gig', GigSchema);
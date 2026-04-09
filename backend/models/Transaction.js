const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  gigId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gig',
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  type: {
    type: String,
    enum: ['DEPOSIT', 'PAYMENT', 'ESCROW_RELEASE', 'REFUND', 'USAGE'],
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED'],
    default: 'PENDING',
    index: true,
  },
  platformFee: {
    type: Number,
    default: 0,
    min: 0,
  },
  netAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
}, { timestamps: true });

TransactionSchema.index({ gigId: 1, status: 1, type: 1 });

module.exports = mongoose.model('Transaction', TransactionSchema);

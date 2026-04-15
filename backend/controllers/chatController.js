const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const sseManager = require('../events/sseManager');

/**
 * GET /api/messages/threads
 * List all conversation threads for the authenticated user.
 */
const getThreads = async (req, res) => {
  try {
    const userId = req.user._id;

    // Aggregate the latest message per conversation partner
    const threads = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: userId }, { receiverId: userId }],
        },
      },
      {
        $addFields: {
          partnerId: {
            $cond: [{ $eq: ['$senderId', userId] }, '$receiverId', '$senderId'],
          },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$partnerId',
          lastMessage: { $first: '$content' },
          lastAt: { $first: '$createdAt' },
          unread: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiverId', userId] },
                    { $eq: ['$read', false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { lastAt: -1 } },
      { $limit: 50 },
    ]);

    const partnerIds = threads.map((t) => t._id);
    const partners = await User.find({ _id: { $in: partnerIds } }).select(
      'name avatarUrl averageRating totalReviews',
    );
    const partnerMap = {};
    partners.forEach((p) => {
      partnerMap[p._id.toString()] = p;
    });

    const result = threads.map((t) => ({
      partnerId: t._id,
      partnerName: partnerMap[t._id.toString()]?.name ?? 'Unknown',
      partnerAvatar: partnerMap[t._id.toString()]?.avatarUrl ?? '',
      partnerRating: partnerMap[t._id.toString()]?.averageRating ?? null,
      partnerTotalReviews: partnerMap[t._id.toString()]?.totalReviews ?? 0,
      lastMessage: t.lastMessage,
      lastAt: t.lastAt,
      unread: t.unread,
    }));

    return res.json({ threads: result });
  } catch (err) {
    console.error('getThreads error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

/**
 * GET /api/messages/:partnerId
 * Fetch the full message thread between the current user and partner.
 */
const getThread = async (req, res) => {
  try {
    const userId = req.user._id;
    const { partnerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      return res.status(400).json({ message: 'Invalid partner ID.' });
    }

    const partnerObjId = new mongoose.Types.ObjectId(partnerId);

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: partnerObjId },
        { senderId: partnerObjId, receiverId: userId },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(200)
      .populate('senderId', 'name avatarUrl averageRating totalReviews')
      .lean();

    // Mark incoming unread messages as read
    await Message.updateMany(
      { senderId: partnerObjId, receiverId: userId, read: false },
      { $set: { read: true } },
    );

    const partner = await User.findById(partnerId).select('name avatarUrl averageRating totalReviews').lean();

    return res.json({ messages, partner });
  } catch (err) {
    console.error('getThread error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

/**
 * POST /api/messages/:partnerId
 * Send a message to a partner.
 */
const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { partnerId } = req.params;
    const { content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      return res.status(400).json({ message: 'Invalid partner ID.' });
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ message: 'Content is required.' });
    }

    const partner = await User.findById(partnerId).select('_id name');
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found.' });
    }

    const msg = await Message.create({
      senderId,
      receiverId: new mongoose.Types.ObjectId(partnerId),
      content: content.trim().slice(0, 2000),
    });

    // Real-time push to receiver
    sseManager.send(String(partnerId), 'new_message', {
      message: `הודעה חדשה מ-${req.user.name}`,
      senderId: String(senderId),
      senderName: req.user.name,
      messageId: String(msg._id),
      content: msg.content,
    });

    return res.status(201).json({ message: msg });
  } catch (err) {
    console.error('sendMessage error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { getThreads, getThread, sendMessage };

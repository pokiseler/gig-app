const jwt = require('jsonwebtoken');
const User = require('../models/User');

const extractTokenFromHeader = (authorizationHeader) => {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return null;
  }

  return authorizationHeader.split(' ')[1];
};

const protect = async (req, res, next) => {
  try {
    // SSE connections cannot set headers, so we also accept ?token= as a fallback.
    const token =
      extractTokenFromHeader(req.headers.authorization) ||
      (typeof req.query.token === 'string' ? req.query.token : null);

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, token is missing.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded.userId || decoded._id;

    if (!userId) {
      return res.status(401).json({ message: 'Not authorized, token payload is invalid.' });
    }

    const user = await User.findById(userId).select('_id name email role phone verified balance escrowBalance avatarUrl bio skills location averageRating totalReviews createdAt updatedAt');

    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user no longer exists.' });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Not authorized, token has expired.' });
    }

    return res.status(401).json({ message: 'Not authorized, token is invalid.' });
  }
};

const optionalProtect = async (req, _res, next) => {
  try {
    const token =
      extractTokenFromHeader(req.headers.authorization) ||
      (typeof req.query.token === 'string' ? req.query.token : null);

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded.userId || decoded._id;

    if (!userId) {
      return next();
    }

    const user = await User.findById(userId).select('_id name email role phone verified balance escrowBalance avatarUrl bio skills location averageRating totalReviews createdAt updatedAt');
    if (user) {
      req.user = user;
    }

    return next();
  } catch {
    return next();
  }
};

module.exports = {
  protect,
  optionalProtect,
};
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const allowedRoles = ['provider', 'consumer'];

const signToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is missing in environment variables.');
  }

  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  verified: user.verified,
  balance: user.balance,
  escrowBalance: user.escrowBalance,
  avatarUrl: user.avatarUrl,
  bio: user.bio,
  skills: user.skills,
  location: user.location,
  averageRating: user.averageRating,
  totalReviews: user.totalReviews,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      location,
      geoLocation,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email, and password are required.' });
    }

    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'role must be provider or consumer.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'password must be at least 6 characters.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ message: 'A user with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: role || 'consumer',
      phone: phone || '',
      location: {
        city: location?.city || '',
        address: location?.address || '',
      },
      geoLocation,
    });

    const token = signToken(user._id);

    return res.status(201).json({
      message: 'Registration successful.',
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('register error:', error);
    return res.status(500).json({ message: 'Server error while registering user.' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(user._id);

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('login error:', error);
    return res.status(500).json({ message: 'Server error while logging in.' });
  }
};

const getMe = async (req, res) => {
  try {
    return res.status(200).json({ user: req.user });
  } catch (error) {
    console.error('getMe error:', error);
    return res.status(500).json({ message: 'Server error while fetching profile.' });
  }
};

module.exports = {
  register,
  login,
  getMe,
};

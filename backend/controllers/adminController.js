// backend/controllers/adminController.js
const User = require('../models/User');
const Gig = require('../models/Gig');

const getDashboardStats = async (req, res) => {
  try {
    // 1. ספירת כל המשתמשים
    const totalUsers = await User.countDocuments();
    
    // 2. ספירת כל החלתורות במערכת
    const totalGigs = await Gig.countDocuments();

    // 3. חישוב כל הכלכלה (כמה נקודות מסתובבות במערכת בסך הכל)
    const users = await User.find({}, 'balance escrowBalance');
    let totalEconomyPoints = 0;
    
    users.forEach(user => {
      totalEconomyPoints += (user.balance || 0) + (user.escrowBalance || 0);
    });

    return res.status(200).json({
      totalUsers,
      totalGigs,
      totalEconomyPoints
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ message: 'Server error fetching admin stats.' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Cannot delete an admin' });
    
    await user.deleteOne();
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user' });
  }
};

const getAllGigs = async (req, res) => {
  try {
    const gigs = await Gig.find({}).populate('author', 'name email').sort({ createdAt: -1 });
    res.status(200).json(gigs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching gigs' });
  }
};

const deleteGig = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) return res.status(404).json({ message: 'Gig not found' });
    await gig.deleteOne();
    res.status(200).json({ message: 'Gig deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting gig' });
  }
};

module.exports = { getDashboardStats, getAllUsers, deleteUser, getAllGigs, deleteGig };
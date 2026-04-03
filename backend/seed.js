const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Gig = require('./models/Gig');
const Transaction = require('./models/Transaction');
const { connectDB, disconnectDB } = require('./db');

const dropIndexesIfCollectionExists = async (collectionName) => {
  const existingCollections = await mongoose.connection.db.listCollections({ name: collectionName }).toArray();

  if (existingCollections.length === 0) {
    return;
  }

  await mongoose.connection.collection(collectionName).dropIndexes();
};

const seedData = async () => {
  try {
    await connectDB();

    // Hash password once and reuse for all sample users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Sample Users
    const users = [
      {
        name: 'John Provider',
        email: 'john@example.com',
        password: hashedPassword,
        role: 'provider',
        phone: '050-1111111',
        balance: 600,
        escrowBalance: 0,
        location: { city: 'Tel Aviv' },
      },
      {
        name: 'Jane Consumer',
        email: 'jane@example.com',
        password: hashedPassword,
        role: 'consumer',
        phone: '052-2222222',
        balance: 1200,
        escrowBalance: 0,
        location: { city: 'Bat Yam' },
      },
      {
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        phone: '054-3333333',
        balance: 5000,
        escrowBalance: 0,
      },
    ];

    // Drop old indexes and clear existing data
    await dropIndexesIfCollectionExists('users');
    await dropIndexesIfCollectionExists('gigs');
    await dropIndexesIfCollectionExists('transactions');
    await User.deleteMany({});
    await Gig.deleteMany({});
    await Transaction.deleteMany({});

    // Insert users
    const insertedUsers = await User.insertMany(users);
    console.log('Sample users inserted:', insertedUsers.length);

    // Sample Gigs
    const gigs = [
      {
        title: 'Website Development',
        description: 'I can build a full-stack website for your business.',
        type: 'offering',
        postType: 'OFFER',
        category: 'Web Development',
        price: 500,
        author: insertedUsers[0]._id,
        postedBy: insertedUsers[0]._id,
        status: 'open',
        tags: ['web', 'fullstack', 'business'],
        location: { city: 'Tel Aviv' },
      },
      {
        title: 'Need Logo Design',
        description: 'Looking for a professional logo for my startup.',
        type: 'wanted',
        postType: 'WANTED',
        category: 'Graphic Design',
        price: 200,
        author: insertedUsers[1]._id,
        postedBy: insertedUsers[1]._id,
        status: 'open',
        tags: ['logo', 'branding'],
        location: { city: 'Bat Yam' },
      },
    ];

    // Insert gigs
    const insertedGigs = await Gig.insertMany(gigs);
    console.log('Sample gigs inserted:', insertedGigs.length);

    console.log('Seeding completed!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
};

seedData();
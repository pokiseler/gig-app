require('dotenv').config();

const mongoose = require('mongoose');
const { connectDB, disconnectDB, getMongoUri } = require('../db');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

const REQUIRED_INDEX_KEYS = {
  users: [
    { email: 1 },
    { geoLocation: '2dsphere' },
    { averageRating: -1, totalReviews: -1 },
  ],
  transactions: [
    { senderId: 1 },
    { receiverId: 1 },
    { gigId: 1 },
    { status: 1 },
    { gigId: 1, status: 1, type: 1 },
  ],
};

const formatIndexKey = (indexKey) => JSON.stringify(indexKey);

const hasMatchingIndex = (existingIndexes, expectedKey) => (
  existingIndexes.some((indexDefinition) => formatIndexKey(indexDefinition.key) === formatIndexKey(expectedKey))
);

const ensureModelIndexes = async (model, collectionName, expectedIndexes) => {
  await model.createIndexes();

  const existingIndexes = await model.collection.indexes();
  const missingIndexes = expectedIndexes.filter((indexKey) => !hasMatchingIndex(existingIndexes, indexKey));

  if (missingIndexes.length > 0) {
    const error = new Error(
      `Missing indexes on ${collectionName}: ${missingIndexes.map(formatIndexKey).join(', ')}`
    );
    error.code = 'MISSING_INDEXES';
    throw error;
  }

  return existingIndexes;
};

const isAtlasUri = () => /mongodb(\+srv)?:\/\/.*mongodb\.net/i.test(getMongoUri());

const runHealthCheck = async () => {
  const startTime = Date.now();

  try {
    if (!isAtlasUri()) {
      const error = new Error('MONGO_URI must point to a MongoDB Atlas cluster (mongodb.net) for this health check.');
      error.code = 'ATLAS_URI_REQUIRED';
      throw error;
    }

    await connectDB();

    await mongoose.connection.db.admin().command({ ping: 1 });

    const [userIndexes, transactionIndexes] = await Promise.all([
      ensureModelIndexes(User, 'users', REQUIRED_INDEX_KEYS.users),
      ensureModelIndexes(Transaction, 'transactions', REQUIRED_INDEX_KEYS.transactions),
    ]);

    console.log('Database health check passed');
    console.log(`Database: ${mongoose.connection.name}`);
    console.log(`Host: ${mongoose.connection.host}`);
    console.log(`Atlas URI detected: ${isAtlasUri() ? 'yes' : 'no'}`);
    console.log(`Users indexes: ${userIndexes.length}`);
    console.log(`Transactions indexes: ${transactionIndexes.length}`);
    console.log(`Duration: ${Date.now() - startTime}ms`);
  } catch (error) {
    if (error.code === 'MONGO_TIMEOUT') {
      console.error(error.message);
    } else if (error.code === 'ATLAS_URI_REQUIRED') {
      console.error(`Database health check failed: ${error.message}`);
    } else if (error.code === 'MISSING_INDEXES') {
      console.error(`Database health check failed: ${error.message}`);
    } else {
      console.error('Database health check failed:', error.message);
    }

    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
};

runHealthCheck();
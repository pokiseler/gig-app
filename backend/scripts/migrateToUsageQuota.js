/**
 * One-time migration: Points → Monthly Usage Limit
 *
 * Run once with:  node backend/scripts/migrateToUsageQuota.js
 *
 * What this does:
 *   1. Removes `balance` and `escrowBalance` from every user document.
 *   2. Sets `usageQuota` defaults on users that don't have it yet.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI is not set in environment.');
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.');

  const db = mongoose.connection.db;
  const users = db.collection('users');

  // Step 1: Remove legacy points fields from ALL users
  const unsetResult = await users.updateMany(
    { $or: [{ balance: { $exists: true } }, { escrowBalance: { $exists: true } }] },
    { $unset: { balance: '', escrowBalance: '' } },
  );
  console.log(`Removed balance/escrowBalance from ${unsetResult.modifiedCount} users.`);

  // Step 2: Set usageQuota defaults on users that don't have it yet
  const now = new Date();
  const setResult = await users.updateMany(
    { usageQuota: { $exists: false } },
    { $set: { usageQuota: { performedThisMonth: 0, lastReset: now } } },
  );
  console.log(`Initialised usageQuota on ${setResult.modifiedCount} users.`);

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

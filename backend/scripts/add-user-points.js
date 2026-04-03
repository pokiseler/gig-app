require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const [emailArg, amountArg] = process.argv.slice(2);
const email = String(emailArg || '').trim().toLowerCase();
const amount = Number.parseInt(amountArg || '0', 10);

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not set');
  }

  if (!email) {
    throw new Error('Usage: node scripts/add-user-points.js <email> <amount>');
  }

  if (!Number.isFinite(amount) || amount === 0) {
    throw new Error('Amount must be a non-zero integer');
  }

  await mongoose.connect(process.env.MONGO_URI);

  const user = await User.findOneAndUpdate(
    { email },
    { $inc: { balance: amount } },
    { new: true }
  );

  if (!user) {
    console.log('USER_NOT_FOUND');
    return;
  }

  console.log(`UPDATED_USER ${user.email} BALANCE ${user.balance}`);
};

run()
  .catch((error) => {
    console.error('UPDATE_FAILED', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

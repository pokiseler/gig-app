const mongoose = require('mongoose');
require('dotenv').config();
const logger = require('./utils/logger');

const DEFAULT_MONGO_TIMEOUT_MS = 10000;
const DEFAULT_MONGO_MAX_POOL_SIZE = 10;

let connectionListenersRegistered = false;

const parsePositiveInt = (value, fallbackValue) => {
  const parsedValue = Number.parseInt(value, 10);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallbackValue;
};

const createMongoConfigError = (message) => {
  const error = new Error(message);
  error.code = 'MONGO_CONFIG_ERROR';
  return error;
};

const getMongoUri = () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw createMongoConfigError('MONGO_URI is not set. Add it to your environment before starting the API.');
  }

  return mongoUri;
};

const getMongoOptions = () => {
  const timeoutMs = parsePositiveInt(process.env.MONGO_TIMEOUT_MS, DEFAULT_MONGO_TIMEOUT_MS);

  return {
    serverSelectionTimeoutMS: timeoutMs,
    connectTimeoutMS: timeoutMs,
    socketTimeoutMS: timeoutMs,
    maxPoolSize: parsePositiveInt(process.env.MONGO_MAX_POOL_SIZE, DEFAULT_MONGO_MAX_POOL_SIZE),
  };
};

const isTimeoutError = (error) => {
  const message = error?.message || '';
  return error?.name === 'MongooseServerSelectionError' || /timed out|server selection/i.test(message);
};

const registerConnectionListeners = () => {
  if (connectionListenersRegistered) {
    return;
  }

  connectionListenersRegistered = true;

  // Only enable verbose Mongoose query logging in development.
  if (process.env.NODE_ENV !== 'production') {
    mongoose.set('debug', false); // flip to true locally if you want query logging
  }

  mongoose.connection.on('connected', () => {
    logger.info(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  });

  mongoose.connection.on('error', (error) => {
    logger.error('MongoDB connection error:', error.message);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
};

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  registerConnectionListeners();

  const mongoOptions = getMongoOptions();

  try {
    await mongoose.connect(getMongoUri(), mongoOptions);
    return mongoose.connection;
  } catch (error) {
    if (isTimeoutError(error)) {
      const timeoutError = new Error(
        `MongoDB connection timed out after ${mongoOptions.serverSelectionTimeoutMS}ms. Check MONGO_URI and Atlas network access.`
      );
      timeoutError.code = 'MONGO_TIMEOUT';
      timeoutError.cause = error;
      throw timeoutError;
    }

    throw error;
  }
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
};

module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.disconnectDB = disconnectDB;
module.exports.getMongoUri = getMongoUri;
module.exports.getMongoOptions = getMongoOptions;
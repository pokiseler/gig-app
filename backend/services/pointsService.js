const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

const DEFAULT_TRANSACTION_OPTIONS = {
  readConcern: { level: 'snapshot' },
  writeConcern: { w: 'majority' },
};

const isReplicaSetTxnError = (error) => (
  error?.code === 20
  || error?.codeName === 'IllegalOperation'
  || String(error?.message || '').includes('Transaction numbers are only allowed on a replica set member or mongos')
);

const createTransactionUnavailableError = (error) => {
  const wrappedError = new Error('MongoDB transactions require a replica set or mongos deployment.');
  wrappedError.code = 'TRANSACTIONS_UNAVAILABLE';
  wrappedError.cause = error;
  return wrappedError;
};

const createInsufficientBalanceError = (amount) => {
  const error = new Error(`Insufficient balance for ${amount} points.`);
  error.code = 'INSUFFICIENT_BALANCE';
  return error;
};

const saveWithMaybeSession = (doc, session) => (session ? doc.save({ session }) : doc.save());
const createWithMaybeSession = (Model, docs, session) => (
  session ? Model.create(docs, { session }) : Model.create(docs)
);

const createPointsService = ({
  userModel = User,
  transactionModel = Transaction,
  startSession = () => mongoose.startSession(),
} = {}) => {
  const lockPointsInEscrow = async ({ userId, amount, session }) => userModel.findOneAndUpdate(
    {
      _id: userId,
      balance: { $gte: amount },
    },
    {
      $inc: {
        balance: -amount,
        escrowBalance: amount,
      },
    },
    {
      new: true,
      session,
    },
  );

  const runAtomicOperation = async (work) => {
    const session = await startSession();

    try {
      let output;

      try {
        await session.withTransaction(async () => {
          output = await work(session);
        }, DEFAULT_TRANSACTION_OPTIONS);

        return output;
      } catch (error) {
        if (isReplicaSetTxnError(error)) {
          throw createTransactionUnavailableError(error);
        }

        throw error;
      }
    } finally {
      await session.endSession();
    }
  };

  // In production, transactions are always required.
  // In local development, if the MongoDB instance does not support transactions
  // (standalone, no replica set), we fall back to running without a session so
  // dev work is not completely blocked. A warning is printed to the console
  // so the developer is aware of the degraded behaviour.
  const runAtomicOperationWithDevFallback = async (work) => {
    const isProduction = process.env.NODE_ENV === 'production'
      || process.env.REQUIRE_MONGO_TRANSACTIONS === 'true';

    if (isProduction) {
      return runAtomicOperation(work);
    }

    try {
      return await runAtomicOperation(work);
    } catch (error) {
      if (error.code === 'TRANSACTIONS_UNAVAILABLE') {
        logger.warn(
          '[PointsService] MongoDB transactions are not available — running without a transaction.\n'
          + '               This is acceptable in local development but must NOT happen in production.\n'
          + '               Set REQUIRE_MONGO_TRANSACTIONS=true to enforce strict mode.',
        );
        return work(null);
      }

      throw error;
    }
  };

  const openTask = async ({ userId, amount, session }) => {
    const updatedUser = await lockPointsInEscrow({ userId, amount, session });

    if (!updatedUser) {
      throw createInsufficientBalanceError(amount);
    }

    return updatedUser;
  };

  const releaseEscrowBalances = async ({
    clientUserId,
    freelancerUserId,
    paymentAmount,
    freelancerAmount = paymentAmount,
    adminUserId = null,
    session,
  }) => {
    if (freelancerAmount < 0 || freelancerAmount > paymentAmount) {
      throw new Error('Freelancer payout must be between 0 and the total payment amount.');
    }

    const adminAmount = paymentAmount - freelancerAmount;

    const updatedClient = await userModel.findOneAndUpdate(
      {
        _id: clientUserId,
        escrowBalance: { $gte: paymentAmount },
      },
      {
        $inc: {
          escrowBalance: -paymentAmount,
        },
      },
      {
        new: true,
        session,
      },
    );

    if (!updatedClient) {
      throw new Error('Escrow balance is lower than required payout amount.');
    }

    const updatedFreelancer = await userModel.findOneAndUpdate(
      { _id: freelancerUserId },
      {
        $inc: {
          balance: freelancerAmount,
        },
      },
      {
        new: true,
        session,
      },
    );

    if (!updatedFreelancer) {
      throw new Error('Freelancer user was not found.');
    }

    let updatedAdmin = null;

    if (adminAmount > 0 && adminUserId) {
      updatedAdmin = await userModel.findOneAndUpdate(
        { _id: adminUserId },
        {
          $inc: {
            balance: adminAmount,
          },
        },
        {
          new: true,
          session,
        },
      );

      if (!updatedAdmin) {
        throw new Error('Admin user was not found.');
      }
    }

    return {
      updatedClient,
      updatedFreelancer,
      updatedAdmin,
      adminAmount,
    };
  };

  const releaseEscrowPayout = async ({
    session,
    gig,
    clientUserId,
    freelancerUserId,
    paymentAmount,
    freelancerAmount = paymentAmount,
    adminUserId = null,
  }) => {
    const {
      adminAmount,
    } = await releaseEscrowBalances({
      clientUserId,
      freelancerUserId,
      paymentAmount,
      freelancerAmount,
      adminUserId,
      session,
    });

    let pendingPaymentTx = null;

    if (gig.taskTransaction) {
      pendingPaymentTx = await transactionModel.findOne({
        _id: gig.taskTransaction,
        status: 'PENDING',
        type: 'PAYMENT',
      }, null, { session });
    }

    if (!pendingPaymentTx) {
      pendingPaymentTx = await transactionModel.findOne({
        gigId: gig._id,
        status: 'PENDING',
        type: 'PAYMENT',
      }, null, { session });
    }

    if (!pendingPaymentTx) {
      throw new Error('Pending escrow transaction was not found.');
    }

    pendingPaymentTx.status = 'COMPLETED';
    pendingPaymentTx.platformFee = adminAmount;
    pendingPaymentTx.netAmount = freelancerAmount;
    await saveWithMaybeSession(pendingPaymentTx, session);

    await createWithMaybeSession(transactionModel, [
      {
        senderId: gig.client,
        receiverId: gig.freelancer,
        gigId: gig._id,
        amount: freelancerAmount,
        type: 'ESCROW_RELEASE',
        status: 'COMPLETED',
        platformFee: adminAmount,
        netAmount: freelancerAmount,
      },
    ], session);

    gig.status = 'completed';
    gig.escrowAmount = 0;
    await saveWithMaybeSession(gig, session);

    return {
      platformFee: adminAmount,
      netAmount: freelancerAmount,
      completionReward: freelancerAmount,
      freelancerCredit: freelancerAmount,
      adminCredit: adminAmount,
    };
  };

  return {
    runAtomicOperation: runAtomicOperationWithDevFallback,
    lockPointsInEscrow,
    openTask,
    releaseEscrowPayout,
  };
};

module.exports = createPointsService();
module.exports.createPointsService = createPointsService;
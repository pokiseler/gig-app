const test = require('node:test');
const assert = require('node:assert/strict');

const { createPointsService } = require('../services/pointsService').default;

const createSession = () => ({
  async withTransaction(work) {
    return work();
  },
  async endSession() {},
});

const createDocument = (state) => {
  const doc = { ...state };

  doc.save = async () => {
    Object.assign(state, doc);
    return doc;
  };

  return doc;
};

const matchesFilter = (state, filter) => Object.entries(filter).every(([key, expected]) => {
  if (expected && typeof expected === 'object' && '$gte' in expected) {
    return state[key] >= expected.$gte;
  }

  return String(state[key]) === String(expected);
});

const createFakeUserModel = (seedUsers) => {
  const users = new Map(seedUsers.map((user) => [String(user._id), { escrowBalance: 0, ...user }]));

  return {
    users,
    async findOneAndUpdate(filter, update) {
      const user = users.get(String(filter._id));

      if (!user || !matchesFilter(user, filter)) {
        return null;
      }

      Object.entries(update.$inc || {}).forEach(([field, delta]) => {
        user[field] = (user[field] || 0) + delta;
      });

      return createDocument(user);
    },
  };
};

const createFakeTransactionModel = (seedTransactions = []) => {
  const transactions = seedTransactions.map((transaction) => ({ ...transaction }));
  let createdCount = 0;

  return {
    transactions,
    async findOne(filter) {
      const transaction = transactions.find((entry) => matchesFilter(entry, filter));
      return transaction ? createDocument(transaction) : null;
    },
    async create(docs) {
      return docs.map((doc) => {
        const created = { _id: `tx-created-${createdCount += 1}`, ...doc };
        transactions.push(created);
        return createDocument(created);
      });
    },
  };
};

const createHarness = ({ users, transactions = [], gig }) => {
  const userModel = createFakeUserModel(users);
  const transactionModel = createFakeTransactionModel(transactions);

  const service = createPointsService({
    userModel,
    transactionModel,
    startSession: async () => createSession(),
  });

  const gigState = gig ? { ...gig } : null;
  const gigDoc = gigState ? createDocument(gigState) : null;

  return {
    service,
    users: userModel.users,
    transactions: transactionModel.transactions,
    gig: gigDoc,
  };
};

test('Insufficient Balance: opening a task fails when the user lacks points', async () => {
  const { service, users } = createHarness({
    users: [
      { _id: 'user-a', balance: 10, escrowBalance: 0 },
    ],
  });

  await assert.rejects(
    service.openTask({ userId: 'user-a', amount: 30 }),
    (error) => {
      assert.equal(error.code, 'INSUFFICIENT_BALANCE');
      return true;
    },
  );

  assert.equal(users.get('user-a').balance, 10);
  assert.equal(users.get('user-a').escrowBalance, 0);
});

test('Successful Completion: payer funds are split between freelancer and admin', async () => {
  const { service, users, transactions, gig } = createHarness({
    users: [
      { _id: 'user-a', balance: 0, escrowBalance: 30 },
      { _id: 'user-b', balance: 0, escrowBalance: 0 },
      { _id: 'admin-user', balance: 0, escrowBalance: 0 },
    ],
    transactions: [
      { _id: 'payment-1', gigId: 'gig-1', status: 'PENDING', type: 'PAYMENT', platformFee: 0, netAmount: 30 },
    ],
    gig: {
      _id: 'gig-1',
      client: 'user-a',
      freelancer: 'user-b',
      taskTransaction: 'payment-1',
      status: 'in_progress',
      escrowAmount: 30,
    },
  });

  const result = await service.runAtomicOperation((session) => service.releaseEscrowPayout({
    session,
    gig,
    clientUserId: 'user-a',
    freelancerUserId: 'user-b',
    paymentAmount: 30,
    freelancerAmount: 15,
    adminUserId: 'admin-user',
  }));

  assert.equal(users.get('user-a').escrowBalance, 0);
  assert.equal(users.get('user-b').balance, 15);
  assert.equal(users.get('admin-user').balance, 15);
  assert.equal(result.freelancerCredit, 15);
  assert.equal(result.adminCredit, 15);
  assert.equal(transactions[0].status, 'COMPLETED');
  assert.equal(transactions[0].platformFee, 15);
  assert.equal(transactions[0].netAmount, 15);
  assert.equal(gig.status, 'completed');
  assert.equal(gig.escrowAmount, 0);
});

test('The Zero-Sum Check: total points remain constant after settlement', async () => {
  const { service, users, gig } = createHarness({
    users: [
      { _id: 'user-a', balance: 0, escrowBalance: 30 },
      { _id: 'user-b', balance: 5, escrowBalance: 0 },
      { _id: 'admin-user', balance: 10, escrowBalance: 0 },
    ],
    transactions: [
      { _id: 'payment-1', gigId: 'gig-1', status: 'PENDING', type: 'PAYMENT', platformFee: 0, netAmount: 30 },
    ],
    gig: {
      _id: 'gig-1',
      client: 'user-a',
      freelancer: 'user-b',
      taskTransaction: 'payment-1',
      status: 'in_progress',
      escrowAmount: 30,
    },
  });

  const totalBefore = users.get('user-a').balance
    + users.get('user-a').escrowBalance
    + users.get('user-b').balance
    + users.get('admin-user').balance;

  await service.runAtomicOperation((session) => service.releaseEscrowPayout({
    session,
    gig,
    clientUserId: 'user-a',
    freelancerUserId: 'user-b',
    paymentAmount: 30,
    freelancerAmount: 15,
    adminUserId: 'admin-user',
  }));

  const totalAfter = users.get('user-a').balance
    + users.get('user-a').escrowBalance
    + users.get('user-b').balance
    + users.get('admin-user').balance;

  assert.equal(totalAfter, totalBefore);
});

test('Concurrency Test: only one simultaneous spend request can reserve the same points', async () => {
  const { service, users } = createHarness({
    users: [
      { _id: 'user-a', balance: 30, escrowBalance: 0 },
    ],
  });

  const results = await Promise.allSettled([
    service.runAtomicOperation((session) => service.openTask({ userId: 'user-a', amount: 30, session })),
    service.runAtomicOperation((session) => service.openTask({ userId: 'user-a', amount: 30, session })),
  ]);

  const succeeded = results.filter((entry) => entry.status === 'fulfilled');
  const failed = results.filter((entry) => entry.status === 'rejected');

  assert.equal(succeeded.length, 1);
  assert.equal(failed.length, 1);
  assert.equal(failed[0].reason.code, 'INSUFFICIENT_BALANCE');
  assert.equal(users.get('user-a').balance, 0);
  assert.equal(users.get('user-a').escrowBalance, 30);
});
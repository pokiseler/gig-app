/**
 * Manages Server-Sent Event connections keyed by userId (string).
 * One active connection per user; a second login replaces the first.
 */
const connections = new Map();

const addConnection = (userId, res) => {
  // Close any existing connection for this user before replacing.
  const existing = connections.get(userId);
  if (existing && !existing.writableEnded) existing.end();
  connections.set(userId, res);
};

const removeConnection = (userId) => {
  connections.delete(userId);
};

/**
 * Send an event to a specific user.
 * @param {string} userId
 * @param {string} event  - event name (e.g. "new_review", "new_gig")
 * @param {object} data
 */
const send = (userId, event, data) => {
  const res = connections.get(String(userId));
  if (res && !res.writableEnded) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
};

module.exports = { addConnection, removeConnection, send };

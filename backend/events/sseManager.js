/**
 * Manages Server-Sent Event connections keyed by userId (string).
 * One active connection per user; a second login replaces the first.
 */
const connections = new Map();
const heartbeats = new Map();
const HEARTBEAT_MS = 20_000;

const stopHeartbeat = (userId) => {
  const timer = heartbeats.get(userId);
  if (timer) {
    clearInterval(timer);
    heartbeats.delete(userId);
  }
};

const startHeartbeat = (userId, res) => {
  stopHeartbeat(userId);

  const timer = setInterval(() => {
    if (res.writableEnded || res.destroyed) {
      stopHeartbeat(userId);
      return;
    }
    // SSE comment frame to keep idle mobile connections alive.
    res.write(': ping\n\n');
  }, HEARTBEAT_MS);

  if (typeof timer.unref === 'function') timer.unref();
  heartbeats.set(userId, timer);
};

const addConnection = (userId, res) => {
  const normalizedUserId = String(userId);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  // Close any existing connection for this user before replacing.
  const existing = connections.get(normalizedUserId);
  if (existing && !existing.writableEnded) existing.end();

  stopHeartbeat(normalizedUserId);
  connections.set(normalizedUserId, res);
  startHeartbeat(normalizedUserId, res);
};

const removeConnection = (userId) => {
  const normalizedUserId = String(userId);
  stopHeartbeat(normalizedUserId);

  const connection = connections.get(normalizedUserId);
  connections.delete(normalizedUserId);
  if (connection && !connection.writableEnded) connection.end();
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

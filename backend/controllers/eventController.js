const { addConnection, removeConnection } = require('../events/sseManager');

/**
 * GET /api/events
 * Opens an SSE stream for the authenticated user.
 * The token can be passed as a query param (?token=...) because
 * EventSource does not support custom headers in the browser.
 */
const subscribe = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const userId = String(req.user._id);
  addConnection(userId, res);

  // Confirm connection to the client.
  res.write('event: connected\ndata: {}\n\n');

  req.on('close', () => {
    removeConnection(userId);
  });
};

module.exports = { subscribe };

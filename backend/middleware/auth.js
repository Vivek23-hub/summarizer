const jwt = require('jsonwebtoken');

const authMW = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];

  if (!token) {
    // If there's no token, we still want to allow the request to proceed
    // since guests can use the summarizer, but req.user will be undefined.
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.user = decoded;
    next();
  } catch (err) {
    // Token is invalid
    return res.status(401).json({ error: 'Token is not valid' });
  }
};

const requireAuth = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token is not valid' });
  }
};

module.exports = { authMW, requireAuth };

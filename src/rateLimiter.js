import rateLimit from 'express-rate-limit';
import logger from './lib/logger.js';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    logger.warn(`🚨 Rate limit exceeded: IP=${req.ip}, URL=${req.originalUrl}, Method=${req.method}`);

    // Respond to the client
    res.status(429).json({ message: "Too many requests, please try again later." });
  }
});

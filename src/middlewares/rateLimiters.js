import rateLimit from 'express-rate-limit';


const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  skipSuccessfulRequests: true,
  message: {
    status: 429,
    error: "Too many failed signup attempts. Please try again later."
  }
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts. Please try again later."
});

export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many password reset attempts. Please try again later."
});

module.exports = {
  signupLimiter
};

import express from 'express';
import passport from 'passport';  // Import passport
import { checkAuth, login, logout, signup, updateProfile, requestPasswordReset, resetPassword, verifyEmailSignup, getToken, checkGoogleUser, logoutGoogleUser, fetchUser, refreshToken, verifySession, googleAuth } from '../controllers/auth.controllers.js';
import { signupLimiter, loginLimiter, resetPasswordLimiter } from '../controllers/auth.controllers.js';
import { generateToken } from '../lib/utils.js';
import { protectRoute } from '../middlewares/auth.middleware.js';
import { uploadProfilePic } from '../middlewares/uploadProductImages.middleware.js';


const router = express.Router();

// User authentication routes
router.post('/signup', signupLimiter, signup);
router.post('/verify-email', verifyEmailSignup);
router.post('/login', loginLimiter, login);
router.get('/verify', verifySession)
router.post('/token',getToken);
// router.post('/refresh', refreshToken);
router.get('/refresh', (req, res, next) => {
  console.log('[AUTH ROUTES] /refresh route HIT'); // ✅ Log when route is triggered
  return refreshToken(req, res, next);
});
router.post('/logout', protectRoute, logout);
router.post('/update-profile', protectRoute, uploadProfilePic, updateProfile);
router.get('/check', protectRoute, checkAuth);
router.get('/fetch', protectRoute, fetchUser);
//route to get google user data
router.post('/get', checkGoogleUser)

router.post('/google-signup', googleAuth)
// Google OAuth Login
// router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false  }));

// Google OAuth Callback
// Step 1: redirect user to Google
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email', 'openid'],
  session: false
}));

// Step 2: handle callback from Google
router.get('/google/callback', async (req, res, next) => {
  try {
    const user = await new Promise((resolve, reject) => {
      passport.authenticate('google', { session: false }, (err, user, info) => {
        if (err) return reject(err);
        if (!user) return reject(new Error(info?.message || 'Google login failed.'));
        resolve(user);
      })(req, res, next);
    });

    await generateToken(user.id, user.role, res);
    return res.redirect(process.env.FRONTEND_URL);
  } catch (error) {
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=${encodeURIComponent(error.message)}`);
  }
});

// Google OAuth Callback
// router.get('/google/callback', async (req, res, next) => {
//   try {
//     const user = await new Promise((resolve, reject) => {
//       passport.authenticate('google', { session: false }, (err, user, info) => {
//         if (err) {
//           return reject(new Error('Authentication failed'));
//         }

//         if (!user) {
//           const message = info?.message || 'Google login failed.';
//           return reject(new Error(message));
//         }

//         resolve(user);
//       })(req, res, next);
//     });

//     // ✅ Generate and set token
//     await generateToken(user.id, user.role, res);

//     // ✅ Redirect after successful login
//     return res.redirect(process.env.FRONTEND_URL);
//   } catch (error) {
//     // ✅ Handle failure and redirect with error message
//     const message = encodeURIComponent(error.message || 'Something went wrong during login.');
//     return res.redirect(`${process.env.FRONTEND_URL}/login?error=${message}`);
//   }
// });




router.get('/google/logout', logoutGoogleUser)




// Password reset routes
router.post('/forgot-password', resetPasswordLimiter, requestPasswordReset);
router.post('/reset-password', resetPassword);

export default router;

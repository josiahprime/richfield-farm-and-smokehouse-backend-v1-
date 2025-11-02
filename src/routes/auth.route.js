import express from 'express';
import passport from 'passport';  // Import passport
import { checkAuth, login, logout, signup, updateProfile, requestPasswordReset, resetPassword, verifyEmailSignup, getToken, checkGoogleUser, logoutGoogleUser, fetchUser, refreshToken, verifySession } from '../controllers/auth.controllers.js';
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
// Google OAuth Login
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false  }));

// Google OAuth Callback
// Google OAuth Callback
router.get('/google/callback', async (req, res, next) => {
  try {
    const user = await new Promise((resolve, reject) => {
      passport.authenticate('google', { session: false }, (err, user, info) => {
        if (err) {
          return reject(new Error('Authentication failed'));
        }

        if (!user) {
          const message = info?.message || 'Google login failed.';
          return reject(new Error(message));
        }

        resolve(user);
      })(req, res, next);
    });

    // ✅ Generate and set token
    await generateToken(user.id, user.role, res);

    // ✅ Redirect after successful login
    return res.redirect(process.env.FRONTEND_URL);
  } catch (error) {
    // ✅ Handle failure and redirect with error message
    const message = encodeURIComponent(error.message || 'Something went wrong during login.');
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=${message}`);
  }
});

// Google OAuth Callback
// router.get('/google/callback', (req, res, next) => {
//   passport.authenticate('google', { session: false }, (err, user, info) => {
//     if (err) {
//       console.error('OAuth error:', err);
//       const message = encodeURIComponent('Authentication failed.');
//       console.log("Redirecting due to OAuth error...");
//       console.log("Headers already sent?", res.headersSent); // ✅ Add this
//       return res.redirect(`${process.env.FRONTEND_URL}/login?error=${message}`);
//     }

//     if (!user) {
//       const errorMessage = encodeURIComponent(info?.message || 'Google login failed.');
//       console.log("Redirecting due to missing user...");
//       console.log("Headers already sent?", res.headersSent); // ✅ Add this
//       return res.redirect(`${process.env.FRONTEND_URL}/login?error=${errorMessage}`);
//     }

//     try {
//       // ✅ Only sets cookie (does NOT end response)
//       generateToken(user.id, user.role, res);

//       console.log("Redirecting after successful token generation...");
//       console.log("Headers already sent?", res.headersSent); // ✅ Add this
//       return res.redirect(process.env.FRONTEND_URL);
//     } catch (e) {
//       const message = encodeURIComponent('Token generation failed.');
//       console.log("Redirecting due to token generation error...");
//       console.log("Headers already sent?", res.headersSent); // ✅ Add this
//       return res.redirect(`${process.env.FRONTEND_URL}/login?error=${message}`);
//     }
//   })(req, res, next);
// });


router.get('/google/logout', logoutGoogleUser)




// Password reset routes
router.post('/forgot-password', resetPasswordLimiter, requestPasswordReset);
router.post('/reset-password', resetPassword);

export default router;

import passport from 'passport';
import { generateToken } from '../lib/utils.js';

export const googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false
});

export const googleCallback = (req, res, next) => {
  passport.authenticate('google', { session: false }, async (err, user, info) => {
    try {
      if (err) {
        console.error('OAuth error:', err);
        const message = encodeURIComponent('Authentication failed.');
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=${message}`);
      }

      if (!user) {
        const errorMessage = encodeURIComponent(info?.message || 'Google login failed.');
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=${errorMessage}`);
      }

      // ✅ Make this callback async so we can await
      const { accessToken, refreshToken } = await generateToken(user.id, user.role);

      // ✅ Use unified cookie util
      setCookie(res, 'jwt', accessToken, { maxAge: 15 * 60 * 1000 }); // 15 min
      setCookie(res, 'refreshToken', refreshToken, { maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days

      return res.redirect(process.env.FRONTEND_URL);
    } catch (error) {
      console.error('Google callback error:', error);
      const message = encodeURIComponent('Internal server error.');
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=${message}`);
    }
  })(req, res, next);
};


// export const googleLogout = (req, res) => {
//   // Add logout logic here if needed
//   res.clearCookie('token');
//   res.status(200).json({ message: 'Logged out from Google.' });
// };

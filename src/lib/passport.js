import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import { prisma } from './prisma.js';


dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      // console.log('callback url', callbackURL)
      const email = profile.emails?.[0]?.value;
      const googleId = profile.id;
      const displayName = profile.displayName || email?.split("@")[0];
      const profilePic = profile.photos?.[0]?.value;

      if (!email) {
        return done(null, false, { message: 'Google account must have a verified email.' });
      }

      try {
        const user = await prisma.$transaction(async (tx) => {
          // First, find if there's a user with this Google ID
          let user = await tx.user.findUnique({ where: { googleId } });

          if (user) return user;

          // Now check if a user exists with this email
          const existingEmailUser = await tx.user.findUnique({ where: { email } });

          // If a user exists with the same email but not from Google, stop here
          if (existingEmailUser && existingEmailUser.authProvider !== 'google') {
            return done(null, false, {
              message: 'An account already exists with this email. Please log in with your email and password.'
            });
          }

          // Otherwise, create new user with Google
          if (!existingEmailUser) {
            user = await tx.user.create({
              data: {
                googleId,
                username: displayName,
                password: undefined, // Not needed for Google users
                role: 'customer',
                email,
                profilePic,
                verified: true,
                authProvider: 'google',
              },
            });
          } else {
            // Rare: A user exists with Google authProvider but missing googleId (maybe legacy?)
            user = await tx.user.update({
              where: { email },
              data: { googleId },
            });
          }

          return user;
        });

        return done(null, user);
      } catch (error) {
        console.error("Google login error:", error);
        return done(null, false, { message: error.message || 'Something went wrong.' });
      }
    }
  )
);



// Serialize user to session
// passport.serializeUser((user, done) => {
//   done(null, user._id);
// });

// Deserialize user from session
// passport.deserializeUser(async (id, done) => {
//   try {
//     const user = await User.findById(id);
//     done(null, user);
//   } catch (error) {
//     done(error, null);
//   }
// });

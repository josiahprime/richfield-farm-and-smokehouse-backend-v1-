import { prisma } from "../lib/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from 'crypto'
import User from "../models/user.model.js";
import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import rateLimit from "express-rate-limit";
import Joi from "joi";
import winston from "winston";
import dotenv from "dotenv";
import sharp from "sharp";
import streamifier from 'streamifier';
import { COOKIE_OPTIONS, setCookie, clearCookie } from "../utils/cookieUtils.js";
import axios from "axios";

import { OAuth2Client } from "google-auth-library"; 

import { generateVerificationToken, generatePasswordResetToken, generateAuthToken } from "../lib/token.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../lib/email.js";
import { hashPassword, comparePasswords } from "../lib/password.js";
import logger from "../lib/logger.js";
import checkUserCount from "../lib/checkUserCount.js";


dotenv.config();


// === Joi Schemas ===
const signupSchema = Joi.object({
  username: Joi.string().min(3).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const resetPasswordSchema = Joi.object({
  newPassword: Joi.string().min(8).max(64).required(),
  token: Joi.string().required(),
});

// const updateProfileSchema = Joi.object({
//   profilePic: Joi.string().uri().required(),
// });

const updateProfileSchema = Joi.object({
  profilePic: Joi.string()
    .pattern(/^data:image\/(jpeg|png|gif|webp);base64,/)
    .required()
});

// === Rate Limiters ===
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts. Please try again later.",
});

export const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many signup attempts. Please try again later.",
});

export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many password reset attempts. Please try again later.",
});


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


// === Controllers ===





export const signup = async (req, res) => {
  const { username, email, password, token} = req.body;

  const secret = process.env.RECAPTCHA_BACKEND_SECRET 

  const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`;

  const response = await axios.post(verifyUrl)
  
  const data = response.data;

  
  if (!data.success) {
    return res.status(400).json({ message: 'reCAPTCHA verification failed.' });
  }

  
  const { error } = signupSchema.validate({ username, email, password });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }



  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      if (existingUser.verified) {
        return res.status(400).json({ message: 'User already exists and is verified.' });
      }

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      if (existingUser.verificationTokenCreatedAt > oneDayAgo) {
        return res.status(400).json({
          message: 'Verification email was already sent recently. Please check your inbox.',
        });
      }


      const verificationToken = generateVerificationToken(existingUser.email)

      await prisma.user.update({
        where: { email },
        data: {
          verificationToken,
          verificationTokenCreatedAt: new Date(),
          verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      
      await sendVerificationEmail(existingUser.email, verificationToken);

      return res.status(200).json({
        message: 'Account is unverified. A new verification email has been sent.',
      });
    }

    const hashedPassword = await hashPassword(password);

    const userCount = await prisma.user.count(); // First user becomes admin

    // const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET, {
    //   expiresIn: '24h',
    // });

    const verificationToken = generateVerificationToken(email)

    await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: userCount === 0 ? 'admin' : 'customer',
        verified: false,
        status: 'active',
        verificationToken,
        verificationTokenCreatedAt: new Date(),
        verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        authProvider: 'local',
      },
    });

    
    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({
      message: 'User registered successfully. A verification email has been sent.',
    });
  } catch (err) {
    console.error('Signup Error:', err);
    res.status(500).json({ message: 'Internal server error. Please try again later.' });
  }
};




export const verifyEmailSignup = async (req, res) => {
  const { emailToken } = req.body;
  console.log('email verification route triggered')

  if (!emailToken) {
    console.log('no token was sent')
    return res.status(400).json({ message: 'Verification token is required.' });
  }

  try {
    const decoded = jwt.verify(emailToken, process.env.JWT_SECRET);
    const userEmail = decoded.email;

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (user) {
      console.log('user to verify exists')
    }

    if (!user) {
      console.log('user not found')
      return res.status(400).json({ message: 'Invalid or expired verification token.' });
    }

    if (user.verified) {
      return res.status(200).json({
        message: 'Your email has already been verified. You can log in now.',
        success: true,
      });
    }

    const success = await prisma.user.update({
      where: { email: userEmail },
      data: {
        verified: true,
        verificationToken: null,
        verificationTokenCreatedAt: null,
        verificationTokenExpires: null,
      },
    });

    if (success) {
      console.log('update to verified user done')
    }

    return res.status(200).json({ message: 'Email verified successfully!', success: true });
  } catch (error) {
    console.error('Email Verification Error:', error);
    return res.status(400).json({ message: 'Invalid or expired verification token.' });
  }
};






export const login = async (req, res) => {
  console.log('we reached here')
  const { email, password } = req.body;
  // console.log(req.body)

  const { error } = loginSchema.validate({ email, password });
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    // const user = await User.findOne({ email });
    const user = await prisma.user.findUnique({ where: { email } });
    console.log('user from login controller', user)

    if (!user) {
      logger.warn(`Login failed: no user found for email ${email}`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.verified) {
      return res.status(403).json({ message: 'Please verify your email before logging in.' });
    }

    if (!password || !user.password) {
      logger.error("Missing password or hash during login", { email });
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await comparePasswords(password, user.password);

    if (!isMatch) {
      logger.warn(`Login failed: incorrect password for ${email}`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = await generateToken(user.id, user.role);

    // ✅ Use your centralized cookie utility
    setCookie(res, "jwt", accessToken, { maxAge: 15 * 60 * 1000 }); // 15 min
    setCookie(res, "refreshToken", refreshToken, { maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days

    // Log what cookies will be sent
    console.log("🍪 Set-Cookie headers:", res.getHeader("Set-Cookie"));


    logger.info(`User ${user.email} logged in successfully.`);

    

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        profilePic: user.profilePic,
        verified: user.verified,
      },
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const checkGoogleUser = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  res.json({
    _id: req.user.id,
    username: req.user.username,
    email: req.user.email,
    profilePic: req.user.profilePic,
    verified: req.user.verified,
    authProvider: req.user.authProvider,
  });
}


export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      console.log('No refresh token found in request.');
      return res.status(401).json({ message: 'Refresh token missing' });
    }

    // Verify structure and signature
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

    // Fetch user and their tokens
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { refreshToken: true }, // fetch related tokens
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the matching refresh token record in DB
    const storedToken = user.refreshToken.find(rt => rt.token === token);
    if (!storedToken) {
      console.log('Refresh token not found in DB.');
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    // Check expiration properly
    if (new Date(storedToken.expiresAt) < new Date()) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      console.log('Refresh token expired.');
      return res.status(403).json({ message: 'Refresh token expired' });
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1m' }
    );

    // Set HttpOnly cookie
    setCookie(res, "jwt", newAccessToken, { maxAge: 15 * 60 * 1000 });

    console.log(`[AUTH] Refresh successful for userId=${user.id}. New access token set in HttpOnly cookie.`);
    return res.status(200).json({ message: 'Refresh successful' });

  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};




const generateOAuthToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// OAuth Login Function
export const oauthLogin = async (req, res) => {
  try {
    const { token } = req.body; // OAuth token from client (Google, GitHub, etc.)
    console.log(token)

    // Verify Google OAuth token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create a new user
      user = await User.create({
        username: name,
        email,
        profilePic: picture,
        authProvider: "google",
      });
    }

    // If the user already exists → Just generate JWT
    const jwtToken = generateOAuthToken(user);

    res.status(200).json({ token: jwtToken, user });
  } catch (error) {
    console.error("OAuth login error:", error);
    res.status(500).json({ message: "OAuth login failed", error });
  }
};





// **4. Set Password for Google Users**
export const setPassword = async (req, res) => {
  try {
    const { userId, password } = req.body;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = await bcrypt.hash(password, 10);
    user.authProvider = "local";
    await user.save();

    res.json({ message: "Password set successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error setting password", error });
  }
};



// export const logout = async (req, res) => {
//   try {
//     const token = req.cookies.refreshToken;
//     if (!token) {
//       return res.status(400).json({ message: "No refresh token provided" });
//     }

//     // Decode token to identify the user
//     let decoded;
//     try {
//       decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
//     } catch (err) {
//       // Even if token expired or invalid, we’ll still clear cookies
//       console.warn("⚠️ Invalid or expired refresh token during logout:", err.message);
//       decoded = null;
//     }

//     // Remove the specific refresh token from DB if user exists
//     if (decoded?.userId) {
//       const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
//       if (user && Array.isArray(user.refreshToken)) {
//         const updatedTokens = user.refreshToken.filter(t => t !== token);

//         await prisma.user.update({
//           where: { id: user.id },
//           data: { refreshToken: updatedTokens },
//         });

//         console.log("✅ Removed refresh token for user:", user.email);
//       }
//     }

//     // Always clear both cookies
//     res.clearCookie("jwt", {
//       httpOnly: true,
//       sameSite: "lax",
//       secure: process.env.NODE_ENV !== "development",
//       path: "/",
//     });

//     res.clearCookie("refreshToken", {
//       httpOnly: true,
//       sameSite: "lax",
//       secure: process.env.NODE_ENV !== "development",
//       path: "/",
//     });

//     return res.status(200).json({
//       message: "Logged out successfully",
//       logout: true,
//     });

//   } catch (error) {
//     console.error("Logout error:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

export const logout = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(400).json({ message: "No refresh token provided" });
    }

    console.log('token from frontend in logout',token)

    // Decode just for logging purposes; optional
    try {
      jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      console.warn("⚠️ Invalid or expired refresh token during logout:", err.message);
    }

    // Delete refresh token record from DB
    const tokenToDelete = await prisma.refreshToken.deleteMany({
      where: { token },
    });

    console.log('token to delete',tokenToDelete)

    // Always clear cookies
    clearCookie(res, "jwt");
    clearCookie(res, "refreshToken");
    // res.clearCookie("jwt", {
    //   httpOnly: true,
    //   sameSite: "lax",
    //   secure: process.env.NODE_ENV !== "development",
    //   path: "/",
    // });

    // res.clearCookie("refreshToken", {
    //   httpOnly: true,
    //   sameSite: "lax",
    //   secure: process.env.NODE_ENV !== "development",
    //   path: "/",
    // });

    return res.status(200).json({
      message: "Logged out successfully",
      logout: true,
    });

  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};






export const logoutGoogleUser = (req, res) => {
  console.log("Attempting to log out...");
  console.log("Incoming cookies:", req.cookies);
  if (!req.cookies || Object.keys(req.cookies).length === 0) {
    return res.status(400).json({ message: "Invalid or no cookies" });
  }

  // Destroy session if it exists
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        console.error("Session destruction failed:", err);
        // Proceed to clear cookies anyway
      }
    });
  }

  // Clear cookies always
  res.clearCookie('connect.sid', { path: '/' });
  res.clearCookie('jwt', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV !== 'development',
    path: '/',
  });

  console.log("Session destroyed (if existed), cookies cleared.");

  // Respond with success
  return res.status(200).json({ message: 'Logged out successfully' });
};


export const updateProfile = async (req, res) => {
  console.log("Updating profile picture...");


  const file = req.file;
  if (!file) return res.status(400).json({ message: "No image provided" });

  try {
    // 1️⃣ Get current user to check if an old image exists
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { profilePicPublicId: true },
    });

    // 2️⃣ If old image exists, delete it from Cloudinary
    if (user?.profilePicPublicId) {
      try {
        await cloudinary.uploader.destroy(user.profilePicPublicId);
        console.log("Old image deleted:", user.profilePicPublicId);
      } catch (err) {
        console.warn("Failed to delete old image:", err.message);
      }
    }

    // 3️⃣ Compress and prepare new image (from multer buffer)
    const compressedImage = await sharp(file.buffer)
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    // 4️⃣ Upload new image to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "profile_pics" },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      streamifier.createReadStream(compressedImage).pipe(uploadStream);
    });

    // 5️⃣ Update the user's profile info in DB
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        profilePic: uploadResult.secure_url,
        profilePicPublicId: uploadResult.public_id,
      },
      select: {
        id: true,
        username: true,
        email: true,
        profilePic: true,
      },
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Server error updating profile" });
  }
};







export const requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });


  try {
    // const user = await User.findOne({ email });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "If your email exists, a reset link will be sent." });

    if (!user.verified) {
      // console.log('user not verified')
      return res.status(403).json({ message: 'Please verify your email before logging in.' });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = await bcrypt.hash(resetToken, 10);
    // console.log(`token before we encode it:`, resetToken)


    await prisma.user.update({
      where: { email },
      data: {
        resetToken: hashedToken,
      },
    });
    // user.resetToken = hashedToken;
    // await user.save();

    // IMPORTANT: Sign a JWT that includes the plain resetToken
    const token = generatePasswordResetToken(user.id, resetToken)
    // console.log(`token after we encode it:`, token)

    // Build the reset link using the JWT
    // const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    // console.log(resetLink)
    // ❌ ISSUE: You previously called sendPasswordResetEmail(user, user.resetToken)
    // **Fix:** Use the reset link:
    await sendPasswordResetEmail(user, token);

    logger.info(`Password reset link sent to ${email}`);
    res.status(200).json({ message: "If your email exists, a reset link will be sent." });
  } catch (error) {
    logger.error("Password reset request error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};




export const resetPassword = async (req, res) => {
  const { newPassword, token } = req.body;
  console.log(token)
    // Validate Input
    const { error } = resetPasswordSchema.validate({ newPassword, token });
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

  try {
    const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);

    if (!decoded || Date.now() >= decoded.exp * 1000) {
      return res.status(400).json({ message: "Reset token has expired." });
    }

    // const user = await User.findById(decoded.userId);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user || !user.resetToken) {
      return res.status(400).json({ message: "Invalid request" });
    }

    const isTokenValid = await comparePasswords(decoded.resetToken, user.resetToken);
    if (!isTokenValid) return res.status(400).json({ message: "Invalid request" });

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null
      },
    });


    logger.info(`Password reset successful for userId: ${user.id}`);
    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    logger.error("Reset password error:", error);
    res.status(400).json({ message: "Invalid request" });
  }
};

// ✅ Check Auth
export const checkAuth = (req, res) => {
  try {
    const { id, username, email, authProvider, profilePic, phone } = req.user;
    res.status(200).json({ id, username, email, authProvider, profilePic, phone });
  } catch (error) {
    logger.error("Check auth error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};




// ✅ Fetch User
export const fetchUser = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    logger.error("Check auth error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Protected Route to Get JWT After Login
export const getToken = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Generate JWT
  const token = jwt.sign(
    { id: req.user._id, email: req.user.email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({ token });
}


export const verifySession = async (req, res) => {
  try {
    // 1️⃣ Check for token in cookies first
    let accessToken = req.cookies?.jwt;

    // 2️⃣ If not in cookies, check Authorization header (Bearer token)
    if (!accessToken) {
      console.log('no access token trying headers')
      const authHeader = req.headers['authorization'] || req.headers['Authorization'];
      console.log('autheader from /verify', authHeader)
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.slice(7); // Remove "Bearer " prefix
      }
    }

    // 3️⃣ If still missing, reject
    if (!accessToken) {
      return res.status(401).json({
        valid: false,
        reason: "missing",
        message: "No access token found"
      });
    }

    // ✅ Verify JWT
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);

    // ✅ Optional: fetch minimal user info
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, email: true, role: true },
    });

    if (!user) {
      return res.status(404).json({
        valid: false,
        reason: "not_found",
        message: "User not found"
      });
    }

    // ✅ Return structured response
    return res.status(200).json({
      valid: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role.toLowerCase(),
      }
    });

  } catch (error) {
    console.error("Session verification failed:", error.message);

    let reason = "invalid";
    if (error.name === "TokenExpiredError") reason = "expired";

    return res.status(401).json({
      valid: false,
      reason,
      message: "Invalid or expired token"
    });
  }
};

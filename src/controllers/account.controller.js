import { prisma } from "../lib/prisma.js";
import bcrypt from "bcrypt";
import crypto from 'crypto';
import { sendEmailChangeVerification } from "../lib/email.js";
import { validatePhone } from "../lib/validatePhone.js";

// 🔹 Change username
export const changeUsername = async (req, res) => {
  const { userId, username } = req.body;
  console.log(req.body)
  if (!username) {
    console.error("Failed to update username: username is required");
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId }, // keep as string
      data: { username },
    });

    console.log(`Username updated successfully for userId: ${userId}`);
    res.json({ message: "Username updated successfully", user });
  } catch (err) {
    console.error(`Failed to update username for userId: ${userId}`, err);
    res.status(500).json({ error: "Failed to update username" });
  }
};



const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown

export const requestEmailChange = async (req, res) => {
  const { userId, newEmail } = req.body;
  console.log("[Request Body]", req.body);

  if (!newEmail) {
    console.log("[Error] New email is missing");
    return res.status(400).json({ error: "New email is required" });
  }

  // ✅ Gmail-specific validation
  const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  if (!gmailRegex.test(newEmail)) {
    console.log("[Error] Invalid Gmail address:", newEmail);
    return res.status(400).json({ error: "Please enter a valid Gmail address" });
  }

  try {
    // Check if email is already in use
    console.log("[Info] Checking if email already exists:", newEmail);
    const existingUser = await prisma.user.findUnique({ where: { email: newEmail } });
    if (existingUser) {
      console.log("[Error] Email already in use:", newEmail);
      return res.status(400).json({ error: "Email already in use" });
    }

    // Get current user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.log("[Error] User not found:", userId);
      return res.status(404).json({ error: "User not found" });
    }

    // ✅ Rate-limit / cooldown check
    const now = new Date();
    if (
      user.emailChangeToken &&
      user.emailChangeTokenExpiry &&
      user.emailChangeTokenExpiry > now
    ) {
      const lastRequestTime = user.emailChangeRequestedAt || new Date(0);
      if (now.getTime() - lastRequestTime.getTime() < COOLDOWN_MS) {
        console.log("[Info] Email change request too soon for user:", userId);
        return res.status(429).json({
          error: `A verification email has already been sent. Please wait a few minutes before trying again.`,
        });
      }
    }

    // Generate a new token (expires in 24 hours)
    console.log("[Info] Generating verification token");
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Save token, pending email, and request timestamp
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        emailChangeToken: verificationToken,
        emailChangeTokenExpiry: tokenExpiry,
        pendingEmail: newEmail,
        emailChangeRequestedAt: now,
      },
    });
    console.log("[Success] Database updated:", updatedUser.id);

    // Send verification email
    console.log("[Info] Sending verification email to:", newEmail);
    await sendEmailChangeVerification(newEmail, verificationToken);
    console.log("[Success] Email verification sent to:", newEmail);

    return res.json({ message: "Verification email sent. Please check your new email." });
  } catch (err) {
    console.error("[Error] Failed to initiate email change:", err);
    return res.status(500).json({ error: "Failed to initiate email change" });
  }
};




// 🔹 Verify Email Change
export const verifyEmailChange = async (req, res) => {
  const { token } = req.body;
  console.log(req.query)
  if (!token) return res.status(400).json({ error: "Token is required" });

  try {
    const user = await prisma.user.findFirst({
      where: {
        emailChangeToken: token,
        emailChangeTokenExpiry: { gt: new Date() }, // token not expired
      },
    });

    if (!user) return res.status(400).json({ error: "Invalid or expired token" });

    // Update the email and clear pending fields
    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.pendingEmail,
        pendingEmail: null,
        emailChangeToken: null,
        emailChangeTokenExpiry: null,
      },
    });

    res.json({ message: "Email updated successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to verify email change" });
  }
};



export const updatePassword = async (req, res) => {
  try {
    const userId = req.user.id; // from authenticateUser middleware
    // console.log('userid from update password',userId)
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "New password must be at least 8 characters." });
    }

    // Fetch user from DB
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password in DB
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("[Password Update Error]", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}



export const updatePhone = async (req, res) => {
  const { userId, phone } = req.body;
  // console.log(req.body)

  if (!userId || !phone) {
    return res.status(400).json({ error: 'Missing userId or phone' });
  }

  // ✅ Validate number format
  const validation = validatePhone(phone, 'NG'); // Change default country if needed
  if (!validation.valid) {
    console.log('number invalid')
    return res.status(400).json({ error: validation.error });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { phone: validation.formatted },
    });

    return res.json({
      message: 'Phone number updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Failed to update phone number:', error);
    return res.status(500).json({ error: 'Failed to update phone number' });
  }
};


export const updateAddress = async (req, res) => {
  try {
    const userId = req.user?.id; // from JWT or middleware
    const { fullName, email, state, city, address, landmark, postalCode } = req.body;

    if (!fullName || !state || !city || !address) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Update existing address or create one if it doesn't exist
    const updatedAddress = await prisma.address.upsert({
      where: { userId },
      update: {
        fullName,
        email,
        state,
        city,
        address,
        landmark,
        postalCode,
      },
      create: {
        userId,
        fullName,
        email,
        state,
        city,
        address,
        landmark,
        postalCode,
      },
    });

    res.json({
      success: true,
      message: "Address updated successfully",
      address: updatedAddress,
    });
  } catch (error) {
    console.error("Error updating address:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update address",
    });
  }
};


export const getUserAddress = async (req, res) => {
  try {
    const userId = req.user?.id; // should come from your auth middleware

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const address = await prisma.address.findUnique({
      where: { userId },
    });

    if (!address) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    res.json({
      success: true,
      address,
    });
  } catch (error) {
    console.error("Error fetching user address:", error);
    res.status(500).json({ success: false, message: "Failed to fetch address" });
  }
};


export const sendPhoneOtp = async (req, res) => {
  try {
    const { userId, phone } = req.body;
    if (!userId || !phone) return res.status(400).json({ error: "Missing fields" });

    // Basic phone normalization/validation: use libphonenumber
    if (!isPossiblePhoneNumber(phone)) {
      return res.status(400).json({ error: "Invalid phone number" });
    }

    // Rate limit: check existing recent sends (simple example)
    const recent = await prisma.phoneOtp.findFirst({
      where: { phone },
      orderBy: { createdAt: "desc" },
    });
    if (recent && (new Date() - recent.createdAt) < 60_000) {
      return res.status(429).json({ error: "Wait before requesting another code" });
    }

    const otp = generateOtp(6);
    const codeHash = hashOtp(otp);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.phoneOtp.create({
      data: {
        userId,
        phone,
        codeHash,
        expiresAt,
      },
    });

    // Send SMS via your provider
    const text = `Your verification code is ${otp}. It expires in 5 minutes.`;
    await sendSms(phone, text); // implement sendSms with Twilio/Firebase/Textbelt/etc

    return res.json({ success: true, message: "OTP sent" });
  } catch (err) {
    console.error("sendPhoneOtp error", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
};




export const verifyPhoneOtp = async (req, res) => {
  try {
    const { userId, phone, code } = req.body;
    if (!userId || !phone || !code) return res.status(400).json({ error: "Missing fields" });

    const record = await prisma.phoneOtp.findFirst({
      where: { userId, phone },
      orderBy: { createdAt: "desc" },
    });

    if (!record) return res.status(400).json({ error: "No OTP sent" });
    if (record.attempts >= 5) return res.status(400).json({ error: "Too many attempts" });
    if (new Date() > record.expiresAt) return res.status(400).json({ error: "OTP expired" });

    const codeHash = hashOtp(code);
    if (codeHash !== record.codeHash) {
      // increment attempts
      await prisma.phoneOtp.update({
        where: { id: record.id },
        data: { attempts: record.attempts + 1 },
      });
      return res.status(400).json({ error: "Invalid code" });
    }

    // success: update user's phone + verified flag
    await prisma.user.update({
      where: { id: userId },
      data: { phone, /* phoneVerifiedAt: new Date() or verified boolean */ },
    });

    // (optional) remove OTP records for this phone
    await prisma.phoneOtp.deleteMany({ where: { id: record.id } });

    return res.json({ success: true, message: "Phone verified" });
  } catch (err) {
    console.error("verifyPhoneOtp error", err);
    res.status(500).json({ error: "Failed to verify OTP" });
  }
};

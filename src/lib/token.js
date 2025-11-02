import crypto from "crypto";
import jwt from "jsonwebtoken";

export const generateVerificationToken = (email) => {
  return jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: '24h',})
};

export const generatePasswordResetToken = (userId, resetToken) => {
  return jwt.sign(
        { userId: userId, resetToken },
        process.env.JWT_RESET_SECRET,
        { expiresIn: "1h" }
      );
  // return jwt.sign({ userId }, process.env.JWT_RESET_SECRET, { expiresIn: "1h" });
};


export const generateAuthToken = (userId, role, res) => {
  const token = jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
    // sameSite: "Strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};



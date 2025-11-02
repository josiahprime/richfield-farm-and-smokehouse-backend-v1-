// utils/otp.js
import crypto from "crypto";

export function generateOtp(digits = 6) {
  const max = 10 ** digits;
  const n = Math.floor(Math.random() * (max - max/10)) + max/10; // ensure leading digit non-zero
  return String(n).slice(0, digits);
}

export function hashOtp(otp, salt) {
  // use HMAC with server secret or SHA256 with salt
  const h = crypto.createHmac("sha256", salt || process.env.OTP_SECRET || "change_me");
  h.update(otp);
  return h.digest("hex");
}

// emailService.js
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

const SENDER_EMAIL = process.env.EMAIL_USER;     // must be from your domain
const FRONTEND_URL = process.env.FRONTEND_URL;

// Helper to send transactional emails
const sendEmail = async (to, subject, htmlContent) => {
  try {
    const data = await resend.emails.send({
      from: `Richfield <${SENDER_EMAIL}>`, // e.g. no-reply@richfield.site
      to,
      subject,
      html: htmlContent,
    });

    console.log(`✅ Email sent successfully to: ${to}`, data);
  } catch (err) {
    console.error(`❌ Failed to send email to ${to}:`, err.message || err);
    throw new Error(`Failed to send email to ${to}`);
  }
};

// Styled HTML wrapper
const emailWrapper = (title, bodyHtml) => `
  <div style="font-family: Arial, sans-serif; background: #f4f4f7; padding: 40px 0;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      
      <div style="background: #4CAF50; color: #ffffff; padding: 20px; text-align: center; font-size: 24px; font-weight: bold;">
        Richfield
      </div>
      
      <div style="padding: 30px; font-size: 16px; color: #333333; line-height: 1.6;">
        <h2 style="color: #333333;">${title}</h2>
        ${bodyHtml}
      </div>

      <div style="padding: 20px; background: #f4f4f7; text-align: center; font-size: 12px; color: #999999;">
        © ${new Date().getFullYear()} Richfield. If you did not request this email, please ignore it or contact support.
      </div>
    </div>
  </div>
`;

// ✅ Send verification email
export const sendVerificationEmail = async (email, verificationToken) => {
  const verificationLink = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;
  console.log(verificationLink)
  const bodyHtml = `
    <p>Thank you for signing up! Please confirm your email address by clicking the button below:</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="${verificationLink}" style="background: #4CAF50; color: #ffffff; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: bold;">Verify Email</a>
    </p>
    <p>This link will expire in 24 hours.</p>
  `;
  await sendEmail(email, "Verify Your Email", emailWrapper("Verify Your Email", bodyHtml));
};

// ✅ Send password reset email
export const sendPasswordResetEmail = async (user, resetToken) => {
  const resetLink = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
  const bodyHtml = `
    <p>Hello ${user.username},</p>
    <p>We received a request to reset your password. Click the button below to proceed:</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" style="background: #4CAF50; color: #ffffff; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: bold;">Reset Password</a>
    </p>
    <p>If you did not request a password reset, please ignore this email.</p>
  `;
  await sendEmail(user.email, "Password Reset Request", emailWrapper("Password Reset Request", bodyHtml));
};

// ✅ Send email change verification
export const sendEmailChangeVerification = async (newEmail, verificationToken) => {
  const verificationLink = `${FRONTEND_URL}/verify-new-email?token=${verificationToken}`;
  const bodyHtml = `
    <p>You requested to change your email. Click the button below to confirm this change:</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="${verificationLink}" style="background: #4CAF50; color: #ffffff; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: bold;">Confirm New Email</a>
    </p>
    <p>This link will expire in 24 hours.</p>
  `;
  await sendEmail(newEmail, "Confirm Your New Email Address", emailWrapper("Confirm Your New Email Address", bodyHtml));
};

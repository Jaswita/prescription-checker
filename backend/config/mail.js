// ============================================
// EMAIL CONFIGURATION
// Nodemailer SMTP setup for OTP delivery
// LAB MARK: Multi-Factor Authentication (MFA)
// ============================================

const nodemailer = require("nodemailer");

// Create transporter with SMTP settings
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false, // MUST be false for port 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // MUST be App Password (not Gmail password)
  },
  tls: {
    rejectUnauthorized: false, // Prevents TLS handshake issues on Windows
  },
});

// Verify transporter connection at startup
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email server connection failed:", error);
  } else {
    console.log("✅ Email server is ready to send OTPs");
  }
});

// Send OTP Email
const sendOTPEmail = async (email, otp) => {
  try {
    const mailOptions = {
      from: `"Secure Prescription System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP - Secure Prescription Verification",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Secure Prescription System</h2>
          <p>Your One-Time Password (OTP) is:</p>
          <div style="background: #f1f1f1; padding: 15px; text-align: center; font-size: 28px; letter-spacing: 6px; font-weight: bold;">
            ${otp}
          </div>
          <p style="color: #555; margin-top: 15px;">
            This code will expire in <b>10 minutes</b>.
          </p>
          <p style="color: #999; font-size: 12px;">
            If you did not request this OTP, please ignore this email.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error("❌ Email Send Error:", error.message);
    return false;
  }
};

module.exports = { transporter, sendOTPEmail };
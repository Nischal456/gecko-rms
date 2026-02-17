import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER, // Your Gmail address
    pass: process.env.GMAIL_APP_PASSWORD, // Your Gmail App Password (Not your real password)
  },
});

export async function sendResetEmail(email: string, link: string) {
  const htmlContent = `
<div style="font-family: 'Inter', Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 46px; background-color: #ffffff; border-radius: 24px; box-shadow: 0 30px 70px rgba(15,23,42,0.10); border: 1px solid #e5e7eb;">
  
  <!-- Subtle Top Accent -->
  <div style="height: 4px; width: 100%; background: linear-gradient(90deg, #10b981, #22c55e); border-radius: 999px; margin-bottom: 34px;"></div>

  <!-- Brand -->
  <div style="margin-bottom: 36px;">
    <h3 style="margin: 0; font-size: 21px; font-weight: 900; color: #020617; letter-spacing: -0.4px;">
      Gecko RMS
    </h3>
    <p style="margin: 6px 0 0; font-size: 13px; color: #64748b;">
      Smart Restaurant Management System
    </p>
  </div>

  <!-- Title -->
  <h2 style="color: #020617; font-size: 29px; font-weight: 900; margin-bottom: 16px; letter-spacing: -0.5px;">
    Reset your password
  </h2>

  <!-- Description -->
  <p style="color: #475569; line-height: 1.8; font-size: 15.5px; margin-bottom: 38px;">
    We received a request to reset the password for your <strong>Gecko RMS</strong> account.
    Click the button below to securely set a new password and continue managing your restaurant without interruption.
  </p>

  <!-- CTA Button -->
  <a href="${link}"
     style="display: inline-block;
            background: linear-gradient(135deg, #10b981, #059669);
            color: #ffffff;
            padding: 17px 42px;
            border-radius: 999px;
            text-decoration: none;
            font-weight: 800;
            font-size: 14.5px;
            letter-spacing: 0.4px;
            box-shadow: 0 18px 40px rgba(16,185,129,0.45);">
     Reset Password
  </a>

  <!-- Trust Info -->
  <div style="margin-top: 44px; padding: 20px; background-color: #f8fafc; border-radius: 16px; border: 1px solid #e5e7eb;">
    <p style="color: #64748b; font-size: 13.5px; line-height: 1.65; margin: 0;">
      ⏳ This secure link expires in <strong>1 hour</strong>.<br/>
      If you didn’t request this reset, no action is required.
    </p>
  </div>

  <!-- Footer -->
  <p style="margin-top: 34px; font-size: 11.5px; color: #94a3b8;">
    © ${new Date().getFullYear()} Gecko RMS · Built for modern restaurants
  </p>

</div>
`;


  try {
    await transporter.sendMail({
      from: '"Gecko Security" <security@gecko.works>',
      to: email,
      subject: "Action Required: Reset Your Restaurant Password",
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error("Email Error:", error);
    return false;
  }
}
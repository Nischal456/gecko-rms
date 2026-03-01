"use server";

import nodemailer from "nodemailer";

export async function requestSubscription(data: any) {
  try {
    const { restaurantName, fullName, email, phone, message } = data;

    // 1. Configure the Email Transporter (Ensure SMTP_USER and SMTP_PASS are in your .env.local)
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Or host: 'smtp.hostinger.com', port: 465, secure: true
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // ====================================================
    // EMAIL 1: TO YOU (THE ADMIN/SALES TEAM)
    // ====================================================
    const adminHtmlBody = `
      <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h2 style="color: #0f172a; margin-bottom: 5px;">New RMS Subscription Request 🚀</h2>
        <p style="color: #64748b; font-size: 14px; margin-top: 0; margin-bottom: 20px;">A new restaurant wants to use Gecko RMS.</p>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #f8fafc; border-bottom: 2px solid #fff;">
            <td style="padding: 12px; font-weight: bold; color: #334155; width: 150px;">Restaurant</td>
            <td style="padding: 12px; color: #0f172a; font-weight: bold;">${restaurantName}</td>
          </tr>
          <tr style="background-color: #f8fafc; border-bottom: 2px solid #fff;">
            <td style="padding: 12px; font-weight: bold; color: #334155;">Contact Person</td>
            <td style="padding: 12px; color: #0f172a;">${fullName}</td>
          </tr>
          <tr style="background-color: #f8fafc; border-bottom: 2px solid #fff;">
            <td style="padding: 12px; font-weight: bold; color: #334155;">Email</td>
            <td style="padding: 12px; color: #0ea5e9;">
              <a href="mailto:${email}" style="color: #0ea5e9; text-decoration: none;">${email}</a>
            </td>
          </tr>
          <tr style="background-color: #f8fafc; border-bottom: 2px solid #fff;">
            <td style="padding: 12px; font-weight: bold; color: #334155;">Phone</td>
            <td style="padding: 12px; color: #0f172a;">${phone}</td>
          </tr>
        </table>

        ${message ? `
          <div style="margin-top: 20px; background-color: #f8fafc; padding: 15px; border-left: 4px solid #10b981; border-radius: 4px;">
            <strong style="color: #334155; font-size: 12px; text-transform: uppercase;">Message / Requirements:</strong>
            <p style="color: #0f172a; margin-top: 8px; margin-bottom: 0;">${message}</p>
          </div>
        ` : ''}

        <p style="color: #94a3b8; font-size: 12px; margin-top: 30px; text-align: center;">
          Sent securely via Gecko RMS Website
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Gecko RMS Sales" <${process.env.SMTP_USER}>`,
      to: process.env.SALES_RECEIVER_EMAIL || process.env.SMTP_USER, // Your email
      replyTo: email, 
      subject: `🔥 New RMS Lead: ${restaurantName}`,
      html: adminHtmlBody,
    });


    // ====================================================
    // EMAIL 2: TO THE CUSTOMER (AUTO-REPLY)
    // ====================================================
    const customerHtmlBody = `
      <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #0f172a; margin: 0;">Gecko<span style="color: #10b981;">RMS</span></h1>
        </div>
        <h2 style="color: #0f172a;">Hi ${fullName},</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.5;">
          Thank you for requesting a subscription to Gecko RMS for <strong>${restaurantName}</strong>! We have received your details.
        </p>
        <p style="color: #475569; font-size: 16px; line-height: 1.5;">
          Our enterprise sales team is reviewing your request and will contact you at <strong>${phone}</strong> very soon to discuss your specific requirements, pricing, and onboarding setup.
        </p>
        <p style="color: #475569; font-size: 16px; line-height: 1.5;">
          We are excited to help you streamline your operations, sync your kitchen, and maximize your profit.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
          If you have any urgent questions, feel free to reply directly to this email.<br/>
          &copy; ${new Date().getFullYear()} Gecko RMS. All rights reserved.
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Gecko RMS Team" <${process.env.SMTP_USER}>`,
      to: email, // The customer's email
      subject: `Welcome to Gecko RMS! We received your request.`,
      html: customerHtmlBody,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Email Error:", error);
    return { success: false, error: "We couldn't send your request. Please try contacting us directly." };
  }
}
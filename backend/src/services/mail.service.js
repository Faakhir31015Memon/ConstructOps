import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

export const isMailConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.MAIL_FROM);

let transport;
const getTransport = () => {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transport;
};

/**
 * Sends mail when SMTP is configured; otherwise records the intent and reports
 * back so callers (and tests) can still proceed without a provider.
 */
export const sendMail = async ({ to, subject, html, text }) => {
  if (!isMailConfigured()) {
    logger.warn('SMTP not configured — email not sent', { to, subject });
    return { delivered: false, reason: 'SMTP_NOT_CONFIGURED' };
  }
  try {
    await getTransport().sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject,
      text: text || html.replace(/<[^>]+>/g, ' '),
      html,
    });
    logger.info('Email sent', { to, subject });
    return { delivered: true };
  } catch (error) {
    logger.error('Email delivery failed', { to, subject, error: error.message });
    return { delivered: false, reason: 'SMTP_ERROR' };
  }
};

const BRAND_ORANGE = '#ff6b00';

export const passwordResetEmail = (name, resetUrl, ttlMinutes) => ({
  subject: 'ConstructOps — reset your password',
  html: `
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e6e8eb;border-radius:10px">
      <h2 style="margin:0 0 6px;color:#2b2f36">Construct<span style="color:${BRAND_ORANGE}">Ops</span></h2>
      <p style="color:#5b6470;font-size:14px">Hi ${String(name || 'there').replace(/[<>&]/g, '')}, we received a request to reset your password.</p>
      <a href="${resetUrl}" style="display:inline-block;background:${BRAND_ORANGE};color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;margin:12px 0">Reset password</a>
      <p style="color:#5b6470;font-size:13px">This link works once and expires in ${ttlMinutes} minutes. If you did not ask for it, no action is needed.</p>
      <p style="color:#9aa3ad;font-size:12px;word-break:break-all">${resetUrl}</p>
    </div>`,
});

export default sendMail;

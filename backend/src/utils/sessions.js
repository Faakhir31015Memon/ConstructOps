import crypto from 'crypto';
import mongoose from 'mongoose';
import RefreshToken from '../models/refreshToken.model.js';
import { signAccessToken, REFRESH_TTL_DAYS } from '../config/jwt.js';
import logger from './logger.js';

const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');

const clientIp = (req) =>
  String(req?.headers?.['x-forwarded-for'] || '').split(',')[0].trim() || req?.ip || '';

/**
 * Issues an access token plus a rotating refresh token bound to a family id.
 * Only the hash of the refresh token is persisted.
 */
export const issueSession = async (user, { family, req }) => {
  const raw = crypto.randomBytes(48).toString('base64url');
  await RefreshToken.create({
    user: user._id,
    tokenHash: hash(raw),
    family: family || crypto.randomUUID(),
    expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
    ip: req ? clientIp(req) : '',
    userAgent: req ? String(req.headers['user-agent'] || '').slice(0, 200) : '',
  });

  return {
    token: signAccessToken(user),
    refreshToken: raw,
    refreshTokenExpiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
  };
};

/**
 * Rotates a presented refresh token. A token that was already used/revoked means
 * it was stolen or replayed, so the entire family is dropped.
 */
export const rotateSession = async (rawToken, req) => {
  const record = await RefreshToken.findOne({ tokenHash: hash(rawToken) }).populate('user');

  if (!record || !record.user) {
    return { error: 'INVALID_REFRESH_TOKEN' };
  }
  if (record.revokedAt) {
    await RefreshToken.updateMany({ family: record.family, revokedAt: null }, { revokedAt: new Date() });
    logger.warn('Refresh token reuse detected — family revoked', { userId: String(record.user._id), family: record.family });
    return { error: 'REFRESH_TOKEN_REUSED' };
  }
  if (record.expiresAt.getTime() <= Date.now()) {
    return { error: 'REFRESH_TOKEN_EXPIRED' };
  }

  const user = record.user;
  const next = await issueSession(user, { family: record.family, req });
  const nextHash = hash(next.refreshToken);
  record.revokedAt = new Date();
  record.replacedBy = nextHash;
  await record.save();

  return { user, session: next };
};

export const revokeRawToken = async (rawToken) => {
  if (!rawToken) return;
  await RefreshToken.updateOne({ tokenHash: hash(rawToken), revokedAt: null }, { revokedAt: new Date() });
};

/** Kill every session for a user — password change, ban, deactivation. */
export const revokeAllSessions = async (userId, reason = '') => {
  if (!mongoose.isValidObjectId(userId)) return 0;
  const result = await RefreshToken.updateMany(
    { user: userId, revokedAt: null },
    { revokedAt: new Date(), revokeReason: reason || 'revoked' }
  );
  return result.modifiedCount || 0;
};

export const hashToken = hash;
export { RefreshToken };

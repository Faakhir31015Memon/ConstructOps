import jwt from 'jsonwebtoken';

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set — refusing to sign or verify tokens.');
  }
  return secret;
};

// Access tokens are short-lived; long-lived access is the refresh token's job.
export const ACCESS_TTL = process.env.JWT_EXPIRES_IN || '15m';
export const REFRESH_TTL_DAYS = Math.max(1, Number(process.env.REFRESH_TOKEN_DAYS || 7));
// The system admin token reaches every tenant, so it expires fast.
export const ADMIN_TTL = process.env.ADMIN_JWT_EXPIRES_IN || '2h';

export const signAccessToken = (user) =>
  jwt.sign({ id: user._id.toString(), role: user.role, v: user.tokenVersion ?? 0 }, getSecret(), {
    expiresIn: ACCESS_TTL,
  });

export const signAdminToken = (email) =>
  jwt.sign({ role: 'admin', email }, getSecret(), { expiresIn: ADMIN_TTL });

export const verifyToken = (token) => jwt.verify(token, getSecret());

export default getSecret;

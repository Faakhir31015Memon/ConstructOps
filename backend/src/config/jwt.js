const DEV_SECRET = 'constructops_super_secure_jwt_secret_key_2026_dev';

const getSecret = () => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.VERCEL) {
    throw new Error('JWT_SECRET is not set. Add it under Vercel Project Settings → Environment Variables.');
  }
  return DEV_SECRET;
};

export default getSecret;

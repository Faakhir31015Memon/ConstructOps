const DEV_SECRET = 'constructops_super_secure_jwt_secret_key_2026_dev';

const getSecret = () => {
  return process.env.JWT_SECRET || DEV_SECRET;
};

export default getSecret;

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set — refusing to sign or verify tokens.');
  }
  return secret;
};

export default getSecret;

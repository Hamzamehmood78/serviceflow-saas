import jwt from 'jsonwebtoken';

const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';
const ACCESS_MS = 15 * 60 * 1000;
const REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

const isProd = () => process.env.NODE_ENV === 'production';

const secret = (name) => {
  const value = process.env[name];
  if (!value || value.length < 32) {
    throw new Error(`${name} is missing or too short (min 32 characters) in .env`);
  }
  return value;
};

// Server start hote hi check: secrets na hon to server shuru hi na ho
export const assertAuthEnv = () => {
  const a = secret('JWT_ACCESS_SECRET');
  const r = secret('JWT_REFRESH_SECRET');
  if (a === r) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');
  }
};

export const signAccessToken = (userId) =>
  jwt.sign({ sub: String(userId) }, secret('JWT_ACCESS_SECRET'), { expiresIn: ACCESS_TTL });

export const signRefreshToken = (userId) =>
  jwt.sign({ sub: String(userId) }, secret('JWT_REFRESH_SECRET'), { expiresIn: REFRESH_TTL });

export const verifyAccessToken = (token) => jwt.verify(token, secret('JWT_ACCESS_SECRET'));
export const verifyRefreshToken = (token) => jwt.verify(token, secret('JWT_REFRESH_SECRET'));

const cookieBase = () => ({
  httpOnly: true,
  secure: isProd(),
  sameSite: isProd() ? 'none' : 'lax',
});

export const setAuthCookies = (res, userId) => {
  res.cookie('access_token', signAccessToken(userId), {
    ...cookieBase(),
    maxAge: ACCESS_MS,
    path: '/',
  });
  res.cookie('refresh_token', signRefreshToken(userId), {
    ...cookieBase(),
    maxAge: REFRESH_MS,
    path: '/api/auth',
  });
};

export const clearAuthCookies = (res) => {
  res.clearCookie('access_token', { ...cookieBase(), path: '/' });
  res.clearCookie('refresh_token', { ...cookieBase(), path: '/api/auth' });
};


// utils/cookieOptions.js
const isDev = process.env.NODE_ENV === 'development';

export const cookieOptions = {
  httpOnly: true,
  sameSite: isDev ? 'lax' : 'none',
  secure: !isDev, // true only in production
  path: '/',
};

const isDev = process.env.NODE_ENV !== "production";
console.log("🍪 Cookie env:", process.env.NODE_ENV, "→ secure:", !isDev);

export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: isDev ? "lax" : "none",
  secure: !isDev,
  path: "/",
};

export const setCookie = (res, name, value, options = {}) => {
  res.cookie(name, value, {
    ...COOKIE_OPTIONS,
    ...options,
  });
};

export const clearCookie = (res, name) => {
  res.clearCookie(name, {...COOKIE_OPTIONS, maxAge: 0 });
};

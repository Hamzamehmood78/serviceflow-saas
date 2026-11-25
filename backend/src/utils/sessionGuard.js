// Password badalne se pehle bane hue token ko purana (stale) maana jata hai.
// Token ka iat seconds mein hota hai, isliye comparison bhi seconds mein.
export const isTokenStale = (payload, user) => {
  if (!user.passwordChangedAt) return false;
  return payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000);
};
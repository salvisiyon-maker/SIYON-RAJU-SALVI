export const CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'vitallink-healthcare-ultra-secure-jwt-secret-2026',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'vitallink-healthcare-ultra-secure-refresh-token-2026',
  ACCESS_TOKEN_EXPIRY: '2h',
  REFRESH_TOKEN_EXPIRY: '7d',
  MAX_FAILED_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,
};

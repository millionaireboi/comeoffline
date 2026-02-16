import rateLimit from "express-rate-limit";

const isDev = process.env.NODE_ENV !== "production";

// In express-rate-limit v7+, max:0 blocks ALL requests (not disables).
// Use the `skip` function to disable in dev instead.
const skipInDev = isDev ? () => true : undefined;

/**
 * General API rate limiter
 * - 500 requests per 15 minutes per IP
 * - Skipped in development
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  skip: skipInDev,
  message: {
    success: false,
    error: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for expensive operations
 * - 10 requests per 15 minutes per IP
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skip: skipInDev,
  message: {
    success: false,
    error: "Too many requests for this resource. Please try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth rate limiter
 * - 30 auth attempts per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  skip: skipInDev,
  message: {
    success: false,
    error: "Too many authentication attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Admin rate limiter
 * - 500 requests per 15 minutes per IP
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  skip: skipInDev,
  message: {
    success: false,
    error: "Too many admin requests. Please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

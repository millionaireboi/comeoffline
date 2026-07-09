import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

const isDev = process.env.NODE_ENV !== "production";

// In express-rate-limit v7+, max:0 blocks ALL requests (not disables).
// Use the `skip` function to disable in dev instead.
const skipInDev = isDev ? () => true : undefined;

/**
 * Key generator that uses the authenticated user's UID when available,
 * falling back to IP for unauthenticated requests.
 * Uses ipKeyGenerator for IPv6 normalization as required by express-rate-limit v7+.
 */
function keyByUser(req: Request): string {
  const uid = (req as any).uid;
  if (uid) return `user:${uid}`;
  return ipKeyGenerator(req.ip!);
}

/**
 * General API rate limiter
 * - 1500 requests per 15 minutes per user/IP
 * - Skipped in development
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1500,
  keyGenerator: keyByUser,
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
 * - 10 requests per 15 minutes per user/IP
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: keyByUser,
  skip: skipInDev,
  message: {
    success: false,
    error: "Too many requests for this resource. Please try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Discount-code check limiter — its own bucket so trying a few codes at
 * checkout never eats into the strictLimiter budget shared with /create,
 * while still blocking brute-force code guessing
 * - 30 checks per 15 minutes per user/IP
 */
export const discountCheckLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  keyGenerator: keyByUser,
  skip: skipInDev,
  message: {
    success: false,
    error: "Too many code attempts. Please try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Campaign send limiter — its own bucket because the resumable send loop
 * re-invokes POST /campaigns/:id/send every ~45s until the blast completes,
 * which would exhaust the shared strictLimiter budget on larger campaigns.
 * - 60 calls per 15 minutes per user (≈ 9k sends per window at current batch throughput)
 */
export const campaignSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  keyGenerator: keyByUser,
  skip: skipInDev,
  message: {
    success: false,
    error: "Too many send requests. Please try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Sign-in rate limiter — prevent brute-force but allow real users to retry
 * - 15 sign-in attempts per 15 minutes per IP
 */
export const signInLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  skip: skipInDev,
  message: {
    success: false,
    error: "Too many sign-in attempts. Please try again in 15 minutes.",
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
 * Form submission rate limiter
 * - 15 submissions per 15 minutes per IP
 * - For public forms: contact, brands, applications
 */
export const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  skip: skipInDev,
  message: {
    success: false,
    error: "Too many submissions. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Admin rate limiter
 * - 5000 requests per 15 minutes per user
 * - High limit since admin panels are data-heavy and authenticated single-user
 * - Real protection comes from backend Firestore cache, not request count
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5000,
  keyGenerator: keyByUser,
  skip: skipInDev,
  message: {
    success: false,
    error: "Too many admin requests. Please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

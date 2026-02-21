import type { Request, Response, NextFunction, RequestHandler } from "express";

// Wrapper to catch async errors in route handlers
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

interface AppError extends Error {
  statusCode?: number;
}

const SAFE_PREFIXES = [
  "Missing required",
  "Invalid",
  "Not found",
  "Already",
  "Unauthorized",
  "Forbidden",
  "Admin access required",
  "Image exceeds",
  "Unsupported image",
  "Maximum",
];

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error("[Error]", err.message, err.stack);

  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === "production";

  let clientMessage: string;
  if (!isProduction) {
    clientMessage = err.message;
  } else if (statusCode >= 500) {
    clientMessage = "An internal error occurred";
  } else if (SAFE_PREFIXES.some((p) => err.message.startsWith(p))) {
    clientMessage = err.message;
  } else {
    clientMessage = "An error occurred";
  }

  res.status(statusCode).json({ success: false, error: clientMessage });
}

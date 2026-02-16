import type { Request, Response, NextFunction, RequestHandler } from "express";

// Wrapper to catch async errors in route handlers
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error("[Error]", err.message);
  res.status(500).json({ success: false, error: err.message });
}

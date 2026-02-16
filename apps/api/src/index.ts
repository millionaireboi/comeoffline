import { config } from "dotenv";
import { join, resolve } from "path";
import { existsSync } from "fs";

console.log('[startup] Starting API server...');
console.log('[startup] Current working directory:', process.cwd());

// Load .env from monorepo root - handle both turbo dev and direct execution
const possibleEnvPaths = [
  join(process.cwd(), ".env"),           // When run from monorepo root via turbo
  join(process.cwd(), "..", "..", ".env"), // When run from apps/api directory
];

console.log('[startup] Checking env paths:', possibleEnvPaths);
const envPath = possibleEnvPaths.find(p => existsSync(p)) || possibleEnvPaths[0];
console.log('[startup] Loading .env from:', envPath);
config({ path: envPath });
console.log('[startup] Environment loaded');
console.log('[startup] Importing express...');
import express from "express";
console.log('[startup] Importing cors...');
import cors from "cors";
console.log('[startup] Importing env config...');
import { env } from "./config/env";
console.log('[startup] Env config loaded:', { port: env.port, origins: env.allowedOrigins });
console.log('[startup] Importing middleware...');
import { errorHandler } from "./middleware/errorHandler";
import { generalLimiter, authLimiter, adminLimiter } from "./middleware/rateLimit";
console.log('[startup] Middleware imported');
console.log('[startup] Importing routes...');
import healthRouter from "./routes/health";
import authRouter from "./routes/auth";
import eventsRouter from "./routes/events";
import adminEventsRouter from "./routes/admin/events";
import rsvpRouter from "./routes/rsvp";
import memoriesRouter from "./routes/memories";
import connectionsRouter from "./routes/connections";
import vouchRouter from "./routes/vouch";
import adminContentRouter from "./routes/admin/content";
import profileRouter from "./routes/profile";
import chatRouter from "./routes/chat";
import applicationsRouter from "./routes/applications";
import adminMembersRouter from "./routes/admin/members";
import adminSettingsRouter from "./routes/admin/settings";
import ticketsRouter from "./routes/tickets";
import pollsRouter from "./routes/polls";
import adminValidationRouter from "./routes/admin/validation";
import adminDashboardRouter from "./routes/admin/dashboard";
import adminNotificationsRouter from "./routes/admin/notifications";
import adminVouchRouter from "./routes/admin/vouch";
console.log('[startup] All routes imported');

console.log('[startup] Creating Express app...');
const app = express();
console.log('[startup] Express app created');

// Middleware
console.log('[startup] Setting up middleware...');
app.use(cors({ origin: env.allowedOrigins, credentials: true }));
app.use(express.json());
console.log('[startup] Middleware configured');

// Apply general rate limiting to all routes
console.log('[startup] Applying rate limiting...');
app.use("/api", generalLimiter);

// Routes
console.log('[startup] Registering routes...');
app.use("/api/health", healthRouter);
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/events", eventsRouter);
app.use("/api/events", rsvpRouter);
app.use("/api/events", memoriesRouter);
app.use("/api/events", connectionsRouter);
app.use("/api/vouch-codes", vouchRouter);
app.use("/api/users", profileRouter);
app.use("/api/chat", chatRouter);
app.use("/api/applications", applicationsRouter);
app.use("/api/admin/events", adminLimiter, adminEventsRouter);
app.use("/api/admin/events", adminLimiter, adminContentRouter);
app.use("/api/admin/applications", adminLimiter, applicationsRouter);
app.use("/api/admin/members", adminLimiter, adminMembersRouter);
app.use("/api/admin/settings", adminLimiter, adminSettingsRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/events", pollsRouter);
app.use("/api/admin", adminLimiter, adminValidationRouter);
app.use("/api/admin", adminLimiter, adminDashboardRouter);
app.use("/api/admin", adminLimiter, adminNotificationsRouter);
app.use("/api/admin", adminLimiter, adminVouchRouter);
console.log('[startup] Routes registered');

// Error handling
console.log('[startup] Setting up error handler...');
app.use(errorHandler);
console.log('[startup] Error handler configured');

console.log('[startup] Starting server on port', env.port);
app.listen(env.port, () => {
  console.log(`[api] ✓ comeoffline API running on port ${env.port}`);
  console.log(`[api] ✓ http://localhost:${env.port}/api/health`);
});

export default app;

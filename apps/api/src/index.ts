import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
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

const app = express();

// Middleware
app.use(cors({ origin: env.allowedOrigins, credentials: true }));
app.use(express.json());

// Routes
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/events", eventsRouter);
app.use("/api/events", rsvpRouter);
app.use("/api/events", memoriesRouter);
app.use("/api/events", connectionsRouter);
app.use("/api/vouch-codes", vouchRouter);
app.use("/api/users", profileRouter);
app.use("/api/chat", chatRouter);
app.use("/api/applications", applicationsRouter);
app.use("/api/admin/events", adminEventsRouter);
app.use("/api/admin/events", adminContentRouter);
app.use("/api/admin/applications", applicationsRouter);
app.use("/api/admin/members", adminMembersRouter);
app.use("/api/admin/settings", adminSettingsRouter);

// Error handling
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`[api] comeoffline API running on port ${env.port}`);
});

export default app;

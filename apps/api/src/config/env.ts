function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: parseInt(process.env.PORT || "8080", 10),
  allowedOrigins: (() => {
    const origins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:3001,http://localhost:3002").split(",");
    if (process.env.NODE_ENV === "production" && origins.every(o => o.includes("localhost"))) {
      console.warn("[env] WARNING: ALLOWED_ORIGINS only contains localhost domains in production!");
    }
    return origins;
  })(),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "", // Optional - only needed for AI features
  googleAiApiKey: process.env.GOOGLE_AI_API_KEY || "", // Optional - only needed for AI features
  firebaseStorageBucket: requireEnv("FIREBASE_STORAGE_BUCKET"),
  firebaseServiceAccountKey: requireEnv("FIREBASE_SERVICE_ACCOUNT_KEY"),
} as const;

export const env = {
  port: parseInt(process.env.PORT || "8080", 10),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:3001,http://localhost:3002").split(","),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET || "",
} as const;

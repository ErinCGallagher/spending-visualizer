/** BetterAuth configuration with Google OAuth. */

import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const auth = betterAuth({
  database: {
    provider: "pg",
    db: new Pool({ connectionString: process.env.DATABASE_URL }),
  },
  trustedOrigins: [process.env.FRONTEND_URL ?? "http://localhost:3000"],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
  cookies: {
    sameSite: "lax",
  },
});

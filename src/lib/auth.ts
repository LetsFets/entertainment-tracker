import "server-only"; // Importing this will result in errors if this file should ever be imported on the client-side.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as dbSchema from "@/db/schema";
import { nextCookies } from "better-auth/next-js";

/**
 * This file simply follows the guide from the better-auth docs: https://www.better-auth.com/docs/installation
 */

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL!,
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: dbSchema,
  }),
  plugins: [nextCookies()],
  emailAndPassword: {
    enabled: true,
  },
  appName: "Boilerplate app",
  telemetry: {
    enabled: false, // Please keep this off for study stuff... You should also turn this when deploying to prod
    debug: false,
  },
});

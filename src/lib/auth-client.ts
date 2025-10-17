import { createAuthClient } from "better-auth/react";

/**
 * See: https://www.better-auth.com/docs/installation#create-client-instance
 *
 * We make use of the "object destructuring" syntax to get the individual functions, making stuff a bit shorter in imports.
 *
 * All these functions here should be called from client side only! (IMO, you should prefer the server side stuff tho, see auth-server.ts).
 */

export const { signIn, signUp, signOut, useSession, getSession } =
  createAuthClient({
    // biome-ignore lint/style/noNonNullAssertion: We have a .env file so we expect this to be fine
    baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL!,
  });

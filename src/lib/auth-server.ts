import "server-only";
import { auth } from "./auth";
import { headers } from "next/headers";

/**
 * Helper to get easy access to the auth session on the server-side.
 * See: https://www.better-auth.com/docs/basic-usage#server-side
 *
 * Use all these functions only in your server-side actions, not in your client-side components.
 */

export const getServerSession = async () =>
  await auth.api.getSession({
    headers: await headers(),
  });

export const signInEmail = auth.api.signInEmail;

export const signUpEmail = auth.api.signUpEmail;

export const signOut = auth.api.signOut;

export const changeEmail = auth.api.changeEmail;

export const changePassword = auth.api.changePassword;

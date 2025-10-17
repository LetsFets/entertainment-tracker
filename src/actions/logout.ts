"use server";

import "server-only";
import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth-server";
import { headers } from "next/headers";

export const logout = async (_prevState: {
  error?: string;
}): Promise<never | { error?: string }> => {
  console.debug("Calling logout server action!");

  try {
    await signOut({
      headers: await headers(),
      asResponse: false,
    });
  } catch (err) {
    console.error(err);
    return {
      error: (err as Error).message ?? "Something went wrong",
    };
  }

  console.debug("Logout successful");

  redirect("/login");
};

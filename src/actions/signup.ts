"use server";

import "server-only";
import { signUpEmail } from "@/lib/auth-server";
import { z } from "zod";
import { redirect } from "next/navigation";

const signupSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export type SignupSchema = z.infer<typeof signupSchema>;

export const signUp = async (
  _prevState: { error?: string },
  formData: FormData,
): Promise<never | { error?: string }> => {
  console.debug("Calling signup server action!");

  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
  };

  const { success, data, error } = signupSchema.safeParse(rawData);

  if (!success) {
    console.error(error);
    return { error: z.prettifyError(error) };
  }

  try {
    await signUpEmail({
      body: {
        email: data.email,
        password: data.password,
        name: data.name,
      },
      asResponse: false,
    });
  } catch (err) {
    console.error(err);
    return {
      error: (err as Error).message ?? "Something went wrong",
    };
  }

  console.debug("Signup successful");

  redirect("/login");
};

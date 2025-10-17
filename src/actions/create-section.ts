"use server";

import "server-only";
import { z } from "zod";
import { db } from "@/db";
import { demoData } from "@/db/schema";
import { revalidatePath } from "next/cache";

const sectionSchema = z.object({
  header: z.string(),
  type: z.string(),
  status: z.string(),
  target: z.number(),
  limit: z.number(),
  reviewer: z.string(),
});

export type SectionSchema = z.infer<typeof sectionSchema>;

export const createSection = async (
  _prevState: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> => {
  console.debug("Calling create section server action!");

  const rawData = {
    header: formData.get("header"),
    type: formData.get("type"),
    status: formData.get("status"),
    target: Number(formData.get("target")),
    limit: Number(formData.get("limit")),
    reviewer: formData.get("reviewer"),
  };

  const { success, data, error } = sectionSchema.safeParse(rawData);

  if (!success) {
    return { error: z.prettifyError(error) };
  }

  try {
    await db.insert(demoData).values(data);
  } catch (err) {
    console.error(err);
    return {
      error: (err as Error).message ?? "Something went wrong",
    };
  }

  console.debug("Section created successfully");

  revalidatePath("/", "layout");

  return {};
};

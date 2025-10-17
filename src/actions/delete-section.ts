"use server";

import "server-only";
import { z } from "zod";
import { db } from "@/db";
import { demoData } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

const deleteSectionSchema = z.object({
  id: z.number(),
});

export type DeleteSectionSchema = z.infer<typeof deleteSectionSchema>;

export const deleteSection = async (
  _prevState: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> => {
  console.debug("Calling delete section server action!");

  const rawData = {
    id: Number(formData.get("id")),
  };

  const { success, data, error } = deleteSectionSchema.safeParse(rawData);

  if (!success) {
    return { error: z.prettifyError(error) };
  }

  try {
    await db.delete(demoData).where(eq(demoData.id, data.id));
  } catch (err) {
    console.error(err);
    return {
      error: (err as Error).message ?? "Something went wrong",
    };
  }

  console.debug("Section deleted successfully");

  revalidatePath("/", "layout");

  return {};
};

"use server";

import { db } from "@/db";
import { createOrUpdateDynamicEntry } from "@/lib/sqlite-entries";
import { revalidatePath } from "next/cache";
import type { EntryData } from "@/lib/types";

export async function updateEntry(data: EntryData & { id: string }) {
  console.log("Server Action: Aktualisiere Eintrag", { id: data.id, title: data.title });
  
  if (!data.id) {
    return { success: false, error: "ID ist erforderlich für Update" };
  }
  
  try {
    const result = await createOrUpdateDynamicEntry(db, data);
    revalidatePath("/home");
    return { success: true, id: result.id };
  } catch (error) {
    console.error("Fehler beim Aktualisieren:", error);
    return { success: false, error: String(error) };
  }
}

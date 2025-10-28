"use server";

import { db } from "@/db";
import { createOrUpdateDynamicEntry } from "@/lib/sqlite-entries";
import { revalidatePath } from "next/cache";
import type { EntryData } from "@/lib/types";

export async function createEntry(data: EntryData & { id?: string }) {
  console.log("Server Action: Erstelle neuen Eintrag", { title: data.title });
  
    try {
      const result = await createOrUpdateDynamicEntry(db, data);
      revalidatePath("/home");
      return { success: true, id: result.id };
    } catch (error) {
      console.error("Fehler beim Erstellen:", error);
      return { success: false, error: String(error) };
    }
}
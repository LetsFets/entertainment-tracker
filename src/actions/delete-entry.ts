"use server";

import { db } from "@/db";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { Category } from "@/lib/types";

const dbSchema = {
  books: "books",
  series: "series",
  movies: "movies",
  videogames: "videogames",
  podcasts: "podcasts",
} as const;

export async function deleteEntry(category: Category, id: string) {
  console.log(`Server Action: Lösche Eintrag ${id} aus Kategorie ${category}`);
  
  try {
    const tableName = dbSchema[category];
    if (!tableName) {
      return { success: false, error: "Ungültige Kategorie" };
    }

    const numericId = parseInt(id);
    if (isNaN(numericId)) {
      console.error(`Ungültige ID: ${id}`);
      return { success: false, error: "Ungültige ID" };
    }
    
    const deleteQuery = sql`DELETE FROM ${sql.identifier(tableName)} WHERE id = ${numericId}`;
    await db.run(deleteQuery);
    
    console.log(`Eintrag ${id} erfolgreich gelöscht`);
    
    revalidatePath('/home');
    return { success: true };
  } catch (error) {
    console.error("Fehler beim Löschen:", error);
    return { success: false, error: "Fehler beim Löschen" };
  }
}

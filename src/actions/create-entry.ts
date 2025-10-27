"use server";

import { db } from "@/db";
import { createOrUpdateDynamicEntry } from "@/lib/sqlite-entries";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { EntryData, MediaEntry, Category } from "@/lib/types";

const dbSchema = {
  books: "books",
  series: "series",
  movies: "movies",
  videogames: "videogames",
  podcasts: "podcasts",
} as const;

export async function createEntry(data: EntryData & { id?: string }) {
  console.log("Server Action: Speichervorgang gestartet", { hasId: !!data.id });
  
  try {
    const result = await createOrUpdateDynamicEntry(db, data);
    revalidatePath("/home"); // Seite neu laden, um die Änderungen anzuzeigen
    return { success: true, id: result.id };
  } catch (error) {
    console.error("Fehler in Server Action:", error);
    return { success: false, error: String(error) };
  }
}

export async function deleteEntry(category: string, id: string) {
  try {
    const tableName = dbSchema[category as keyof typeof dbSchema];
    if (!tableName) {
      return { success: false, error: "Ungültige Kategorie" };
    }

    console.log(`Lösche Eintrag ID ${id} aus Tabelle ${tableName}`);
    
    // ID als INTEGER behandeln
    const numericId = parseInt(id);
    if (isNaN(numericId)) {
      console.error(`Ungültige ID: ${id}`);
      return { success: false, error: "Ungültige ID" };
    }
    
    const deleteQuery = sql`DELETE FROM ${sql.identifier(tableName)} WHERE id = ${numericId}`;
    const result = await db.run(deleteQuery);
    
    console.log("Delete erfolgreich:", result);
    
    revalidatePath('/home');
    return { success: true };
  } catch (error) {
    console.error("Delete error:", error);
    return { success: false, error: "Fehler beim Löschen" };
  }
}

export async function getAllEntries(): Promise<{ success: boolean; entries: MediaEntry[]; error?: string }> {
  try {
    const allEntries: MediaEntry[] = [];
    
    for (const [category, tableName] of Object.entries(dbSchema)) {
      try {
        const result = await db.run(sql`SELECT * FROM ${sql.identifier(tableName)}`);
        const rows = Array.isArray(result) ? result : (result as any)?.rows || [];
        
        const entries = rows.map((row: any) => ({
          id: String(row.id),
          category: category as Category,
          title: row.title,
          image: row.image || undefined,
          categorySpecificFields: parseFields(row),
          customFields: [],
          readingSessions: row.reading_sessions ? JSON.parse(row.reading_sessions) : undefined,
          gamingSessions: row.gaming_sessions ? JSON.parse(row.gaming_sessions) : undefined,
          completed: row.completed === 1,
          abandoned: row.abandoned === 1,
          createdAt: new Date(row.created_at || Date.now()),
        }));
        
        allEntries.push(...entries);
      } catch (err) {
        console.log(`Tabelle ${tableName} existiert noch nicht oder ist leer`);
      }
    }
    
    return { success: true, entries: allEntries };
  } catch (error) {
    console.error("Fehler beim Laden:", error);
    return { success: false, entries: [], error: "Fehler beim Laden" };
  }
}

function parseFields(row: any): Record<string, string | string[]> {
  const fields: Record<string, string | string[]> = {};
  const systemFields = ['id', 'title', 'image', 'completed', 'abandoned', 'reading_sessions', 'gaming_sessions', 'created_at'];
  
  const fieldNameMapping: Record<string, string> = {
    'autor': 'Autor',
    'seitenanzahl': 'Seitenanzahl',
    'genre': 'Genre',
    'reihe': 'Reihe',
  };
  
  for (const [key, value] of Object.entries(row)) {
    const lowerKey = key.toLowerCase();
    if (!systemFields.includes(lowerKey) && value !== null && value !== undefined) {
      const displayName = fieldNameMapping[lowerKey] || key;
      
      try {
        const parsed = JSON.parse(value as string);
        fields[displayName] = Array.isArray(parsed) ? parsed : (value as string);
      } catch {
        fields[displayName] = value as string;
      }
    }
  }
  
  return fields;
}
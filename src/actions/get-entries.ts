"use server";

import { db } from "@/db";
import { sql } from "drizzle-orm";
import type { MediaEntry, Category } from "@/lib/types";

const dbSchema = {
  books: "books",
  series: "series",
  movies: "movies",
  videogames: "videogames",
  podcasts: "podcasts",
} as const;

export async function getAllEntries(): Promise<{ 
  success: boolean; 
  entries: MediaEntry[]; 
  error?: string 
}> {
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
          completionCount: row.completion_count ? Number(row.completion_count) : 0,
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
  const systemFields = ['id', 'title', 'image', 'completed', 'abandoned', 'completion_count', 'reading_sessions', 'gaming_sessions', 'created_at'];
  
  const fieldNameMapping: Record<string, string> = {
    'autor': 'Autor',
    'seitenanzahl': 'Seitenanzahl',
    'genre': 'Genre',
    'reihe': 'Reihe',
    'staffeln': 'Staffeln',
    'aktuelle staffel': 'Aktuelle Staffel',
    'aktuelle folge': 'Aktuelle Folge',
    'durchschnittliche folgenlänge': 'Durchschnittliche Folgenlänge',
    'laufzeit': 'Laufzeit',
    'aktuelle minute': 'Aktuelle Minute',
    'spielzeit': 'Spielzeit',
    'entwickler': 'Entwickler',
    'host': 'Host',
    'folgen gesamt': 'Folgen gesamt',
    'minute': 'Minute',
    'durchschn. länge': 'Durchschn. Länge',
  };
  
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = key.toLowerCase().replace(/_/g, ' ');
    
    if (!systemFields.includes(key.toLowerCase()) && value !== null && value !== undefined) {
      const displayName = fieldNameMapping[normalizedKey] || key;
      
      try {
        const parsed = JSON.parse(value as string);
        
        // WICHTIG: Behalte Arrays als Arrays!
        if (Array.isArray(parsed)) {
          fields[displayName] = parsed;
        } else {
          fields[displayName] = value as string;
        }
      } catch {
        // Wenn JSON.parse fehlschlägt, normaler String
        fields[displayName] = value as string;
      }
    }
  }
  
  return fields;
}

// Datei: actions/create-entry.ts

"use server";

// --- IMPORTS ---
import { db } from "@/db"; // Dein konfigurierter Drizzle Client
// Importiere deine gesamte DB-Logik-Funktion
import { createOrUpdateDynamicEntry } from "@/app/home/_components/sqlite-entries";
// Importiere die benötigten Typen für die Daten
import { EntryData } from "../lib/types"; // PASSE DIESEN PFAD AN!
import { revalidatePath } from "next/cache"; 

// --- SERVER ACTION ---

/**
 * Verarbeitet die kompletten Formulardaten vom Frontend und ruft die DB-Logik auf.
 * Diese Funktion dient als Server Action und verarbeitet sowohl CREATE als auch UPDATE.
 * * @param data Die übermittelten Formulardaten (Typ EntryData).
 * @returns Ein Ergebnisobjekt mit Erfolg, Fehlermeldung und der ID (für Updates/Frontend-Sync).
 */
export async function createEntry(data: EntryData & { id?: string }): Promise<{ success: boolean; error?: string; id?: string }> {
    
    console.log("Server Action: Speichervorgang gestartet.");
    
    // 1. Beispiel-Validierung
    if (!data.title || data.title.trim().length === 0) {
        return { success: false, error: "Titel ist erforderlich" };
    }
    
    try {
        // 2. Datenbank-Interaktion: Ruft deine dynamische Drizzle-Logik auf
        const result = await createOrUpdateDynamicEntry(db as any, data);

        // 3. Ergebnis-Handling
        // SQLite gibt lastInsertRowid zurück, nutze das für die ID, falls es ein neuer Eintrag ist.
        const insertedId = data.id || result.result?.lastInsertRowid ? String(result.result.lastInsertRowid) : undefined;
        
        // Caching: Revalidiert die Hauptseite, damit die neuen Daten sofort angezeigt werden.
        revalidatePath('/'); 

        return { 
            success: true, 
            id: insertedId // Gibt die (neue oder bestehende) ID an das Frontend zurück
        };

    } catch (error) {
        console.error("Fehler in Server Action (DB-Speicherung):", error);
        const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler beim Speichern des Eintrags.";
        return { success: false, error: errorMessage };
    }
}
// Dies ist eine serverseitige Datei, die über eine Next.js API-Route oder Server Action
// aufgerufen werden sollte, um direkten Zugriff auf die Datenbank zu haben.

import { db } from "@/db";
import { sql, SQL } from "drizzle-orm"; // SQL für den Typ der Query importiert
import { AnySQLiteTable } from "drizzle-orm/sqlite-core"; // Korrekter Typ für Drizzle-Tabellen

// --- TYPEN ANPASSUNG AN new-entry-form.tsx ---

type Category = "books" | "series" | "movies" | "videogames" | "podcasts";

// Entspricht den Strukturen aus new-entry-form.tsx
interface ReadingSession {
  id: string;
  pages: number;
  year?: number;
  month?: number;
  day?: number;
}
interface GamingSession {
  id: string;
  duration: number;
  year?: number;
  month?: number;
  day?: number;
}
interface CustomField {
  name: string;
  value: string;
}

// Die serverseitige Struktur, die die Formdaten empfängt (MediaEntry ohne ID/createdAt für CREATE)
interface EntryData {
  category: Category;
  title: string;
  image?: string; // Neu hinzugefügt
  categorySpecificFields: Record<string, string | string[]>; // Enthält Staffeln (als JSON-String)
  customFields: CustomField[];
  readingSessions?: ReadingSession[];
  gamingSessions?: GamingSession[];
  completed: boolean;
  abandoned: boolean;
}

// --- MOCKUP: DATABASE & SCHEMA SETUP ---

// Beispiel-Schema (erforderlich, um Drizzle-Operationen durchzuführen)
const baseTable = {
  id: "id", // primary key
  title: "title",
  completed: "completed",
  abandoned: "abandoned",
} as const;

// NEUE HELPER-FUNKTION: Erstellt eine Mock-Tabelle mit der notwendigen Drizzle-Struktur
const createMockTable = (name: string) => ({
    ...baseTable,
    _: { // Fügt die Drizzle-Metadaten-Struktur hinzu
        config: {
            name: name, // Der Name der SQL-Tabelle
        }
    }
}) as unknown as AnySQLiteTable;

// Angenommen, Sie haben für jede Kategorie eine eigene Drizzle-Tabelle
const dbSchema = {
    books: createMockTable("books"),
    series: createMockTable("series"),
    movies: createMockTable("movies"),
    videogames: createMockTable("videogames"),
    podcasts: createMockTable("podcasts"),
};


// Angenommene Drizzle DB-Instanz, die injiziert oder importiert wird
type DrizzleDB = {
  run: (sql: SQL) => Promise<any>;
  // WICHTIG: db.insert entfernt, da Mock-Tabelle nicht die korrekten Column-Objekte für Drizzle-Insert hat.
};


// --- HELPER FUNKTIONEN ---

/**
 * Ruft die aktuellen Spaltennamen einer SQLite-Tabelle über PRAGMA ab.
 * @param db Ihre Drizzle DB-Instanz.
 * @param tableName Der Name der zu inspizierenden Tabelle.
 * @returns Ein Set von Spaltennamen (alles Kleinbuchstaben).
 */
async function getTableColumns(db: DrizzleDB, tableName: string): Promise<Set<string>> {
  // Wichtig: Verwende sql.identifier() für dynamische Tabellennamen in PRAGMA,
  // da Drizzle Strings sonst als Parameter (mit ?) behandelt.
  const query = sql`PRAGMA table_info(${sql.identifier(tableName)})`;
  const result = await db.run(query);

  // WICHTIGER HINWEIS: Das ResultSetImpl ist kein Array im JavaScript-Sinne,
  // sondern ein Objekt mit einer 'rows'-Eigenschaft, die das Array enthält,
  // wenn es von manchen SQL-Adaptern (wie libSQL) kommt.
  // Wir müssen hier die 'rows' extrahieren, um korrekt zu arbeiten.
  const rows = Array.isArray(result) ? result : (result as any)?.rows || [];

  if (!Array.isArray(rows)) {
    console.error("PRAGMA table_info lieferte kein Array in 'rows':", result);
    return new Set();
  }

  const columnNames = rows.map((col: { name: string }) => col.name.toLowerCase());
  return new Set(columnNames);
}

/**
 * Stellt sicher, dass die Basistabelle in der Datenbank existiert.
 * Wird verwendet, um die dynamische Schema-Erweiterung zu initialisieren.
 * * @param db Drizzle DB-Instanz
 * @param table Die Drizzle-Tabelle (für Typinformationen)
 * @param tableName Der Name der SQL-Tabelle
 */
async function ensureTableExists(db: DrizzleDB, table: AnySQLiteTable, tableName: string) {
    // Erstellt die Tabelle mit den Basisspalten, falls sie nicht existiert.
    const createTableQuery = sql`
        CREATE TABLE IF NOT EXISTS ${sql.identifier(tableName)} (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            completed INTEGER NOT NULL DEFAULT 0,
            abandoned INTEGER NOT NULL DEFAULT 0
        );
    `;
    console.log(`Versuche, Basistabelle '${tableName}' zu erstellen (falls nicht vorhanden)...`);
    await db.run(createTableQuery);
    console.log(`Tabelle '${tableName}' ist jetzt vorhanden.`);
}


/**
 * Überprüft, ob eine Spalte existiert, und erstellt sie ggf.
 * @param db Drizzle DB-Instanz
 * @param table Die Drizzle-Tabelle
 * @param columnName Der Spaltenname (kleingeschrieben)
 * @param existingColumns Set der bereits existierenden Spalten
 */
async function ensureColumnExists(
  db: DrizzleDB,
  table: AnySQLiteTable,
  columnName: string,
  existingColumns: Set<string>
) {
  if (!existingColumns.has(columnName)) {
    const sqliteType = 'TEXT';
    console.warn(`Spalte '${columnName}' existiert nicht. Erstelle neue Spalte vom Typ ${sqliteType}...`);

    const tableName = table._.config.name; // NEU: Extrahiere den Tabellennamen-String

    // Drizzle's `sql` Tag verwenden, um rohes SQL für ALTER TABLE zu injizieren.
    // Wichtig: Verwende sql.identifier() für den Tabellennamen-String!
    const alterQuery = sql`ALTER TABLE ${sql.identifier(tableName)} ADD COLUMN ${sql.identifier(columnName)} ${sql.raw(sqliteType)}`;

    await db.run(alterQuery);

    existingColumns.add(columnName);
    console.log(`Spalte '${columnName}' erfolgreich als ${sqliteType} erstellt.`);
  }
}


// --- HAUPT-METHODE ---

/**
 * Erstellt einen neuen Eintrag, passt das Tabellenschema dynamisch an (ALLE Spalten als TEXT)
 * und fügt die Daten ein.
 *
 * @param db Ihre Drizzle DB-Instanz.
 * @param data Die übermittelten Formulardaten (mit komplexen Feldern).
 */
export async function createOrUpdateDynamicEntry(db: DrizzleDB, data: EntryData) {
  console.log("createOrUpdateDynamicEntry started");
  const { category, title, image, categorySpecificFields, customFields, readingSessions, gamingSessions, completed, abandoned } = data;

  // 1. Tabellen-Lookup
  const table = dbSchema[category];
  if (!table) {
    throw new Error(`Unbekannte Kategorie: ${category}`);
  }
  // DIESE ZEILE FUNKTIONIERT JETZT, DA table._ EXISTIERT
  const tableName = table._.config.name;

  try {
    // NEU: 1.1. Basistabelle erstellen, falls nicht vorhanden
    await ensureTableExists(db, table, tableName);

    // 2. Schema-Introspektion: Aktuelle Spaltennamen abrufen
    // Kann jetzt sicher ausgeführt werden, da die Tabelle existiert
    const existingColumns = await getTableColumns(db, tableName);
    console.log(`Bestehende Spalten für ${tableName}:`, existingColumns);

    // 3. Dynamische Schema-Anpassung und Datenvorbereitung
    const dataToInsert: Record<string, any> = {};

    // --- A. STATISCHE FELDER (Basic & Serials) ---

    dataToInsert.title = title;
    dataToInsert.completed = completed ? 1 : 0;
    dataToInsert.abandoned = abandoned ? 1 : 0;
    
    // IMAGE: Behandle 'image' als statisches Feld
    const imageColName = 'image';
    await ensureColumnExists(db, table, imageColName, existingColumns);
    dataToInsert[imageColName] = image || null;
    
    // READING SESSIONS: Sessions als JSON-String speichern
    if (readingSessions && readingSessions.length > 0) {
        const sessionsColName = 'reading_sessions';
        await ensureColumnExists(db, table, sessionsColName, existingColumns);
        // IDs entfernen, da sie nur für React im Frontend wichtig sind
        const serializableSessions = readingSessions.map(({ id, ...rest }) => rest);
        dataToInsert[sessionsColName] = JSON.stringify(serializableSessions);
    }
    
    // GAMING SESSIONS: Sessions als JSON-String speichern
    if (gamingSessions && gamingSessions.length > 0) {
        const sessionsColName = 'gaming_sessions';
        await ensureColumnExists(db, table, sessionsColName, existingColumns);
        // IDs entfernen
        const serializableSessions = gamingSessions.map(({ id, ...rest }) => rest);
        dataToInsert[sessionsColName] = JSON.stringify(serializableSessions);
    }
    
    // --- B. KATEGORIESPEZIFISCHE & CUSTOM FIELDS ---

    // Kategorie-spezifische Felder (z.B. Autor, Seitenanzahl, Staffeln)
    for (const [key, value] of Object.entries(categorySpecificFields)) {
      const columnName = key.trim().toLowerCase();
      if (!columnName) continue;

      await ensureColumnExists(db, table, columnName, existingColumns);
      
      // Werte als String speichern. Arrays (wie Genre, Autor) und Staffeln (als JSON-String)
      // werden in der Form bereits als String[] oder JSON-String vorbereitet.
      if (Array.isArray(value)) {
        // String-Arrays als JSON speichern (z.B. Genres, Autoren)
        dataToInsert[columnName] = JSON.stringify(value.filter(v => v.trim() !== ''));
      } else {
        dataToInsert[columnName] = value;
      }
    }

    // Custom Fields
    for (const field of customFields) {
      const columnName = field.name.trim().toLowerCase();
      
      // Nur Felder mit gültigem Namen berücksichtigen
      if (!columnName) continue;

      await ensureColumnExists(db, table, columnName, existingColumns);
      
      // Wert eintragen (wird als String/TEXT gespeichert)
      dataToInsert[columnName] = field.value;
    }

    // 4. Daten-Insertion
    console.log(`Füge Daten in Tabelle ${tableName} ein/aktualisiere sie:`, dataToInsert);

    // HINWEIS: Da der Mock-Table-Type (AnySQLiteTable) nicht alle Drizzle-Metadaten für db.insert() enthält,
    // verwenden wir hier einen dynamischen Raw SQL INSERT mit db.run().

    const keys = Object.keys(dataToInsert);
    const columnNames = keys.map(key => sql.identifier(key));
    const valueExpressions = keys.map(key => dataToInsert[key]); // Drizzle interpoliert diese als Parameter

    const insertQuery = sql`
        INSERT INTO ${sql.identifier(tableName)} (${sql.join(columnNames, sql.raw(','))})
        VALUES (${sql.join(valueExpressions, sql.raw(','))})
    `;
    
    // const result = await db.insert(table).values(dataToInsert); // Alte, fehlerhafte Zeile
    const result = await db.run(insertQuery);

    console.log("Eintrag erfolgreich erstellt/aktualisiert.", result);

    return { success: true, result };
  } catch (error) {
    console.error("Fehler bei dynamischer Schema-Anpassung oder Insertion/Update:", error);
    throw new Error("Fehler beim Speichern des Eintrags.");
  }
}

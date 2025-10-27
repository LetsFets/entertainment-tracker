import { db } from "@/db";
import { sql, SQL } from "drizzle-orm";
import { AnySQLiteTable } from "drizzle-orm/sqlite-core";

type Category = "books" | "series" | "movies" | "videogames" | "podcasts";

interface ReadingSession {
  id?: string; // Optional, da nur für React-Keys benötigt
  pages: number;
  year?: number;
  month?: number;
  day?: number;
}

interface GamingSession {
  id?: string; // Optional
  duration: number;
  year?: number;
  month?: number;
  day?: number;
}

interface CustomField {
  name: string;
  value: string;
}

interface EntryData {
  category: Category;
  title: string;
  image?: string;
  categorySpecificFields: Record<string, string | string[]>;
  customFields: CustomField[];
  readingSessions?: ReadingSession[];
  gamingSessions?: GamingSession[];
  completed: boolean;
  abandoned: boolean;
}

const createMockTable = (name: string) => ({
    _: { config: { name } }
}) as unknown as AnySQLiteTable;

const dbSchema = {
    books: createMockTable("books"),
    series: createMockTable("series"),
    movies: createMockTable("movies"),
    videogames: createMockTable("videogames"),
    podcasts: createMockTable("podcasts"),
};

type DrizzleDB = typeof db;

// Hilfsfunktionen (unverändert)
async function getTableColumns(db: DrizzleDB, tableName: string): Promise<Set<string>> {
  const query = sql`PRAGMA table_info(${sql.identifier(tableName)})`;
  const result = await db.run(query);
  const rows = Array.isArray(result) ? result : (result as any)?.rows || [];
  if (!Array.isArray(rows)) return new Set();
  return new Set(rows.map((col: { name: string }) => col.name.toLowerCase()));
}

async function ensureTableExists(db: DrizzleDB, tableName: string) {
    const createTableQuery = sql`
        CREATE TABLE IF NOT EXISTS ${sql.identifier(tableName)} (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            completed INTEGER NOT NULL DEFAULT 0,
            abandoned INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
    `;
    await db.run(createTableQuery);
}

async function ensureColumnExists(
  db: DrizzleDB,
  table: AnySQLiteTable,
  columnName: string,
  existingColumns: Set<string>
) {
  if (!existingColumns.has(columnName.toLowerCase())) {
    const sqliteType = 'TEXT';
    const tableName = table._.config.name;
    const alterQuery = sql`ALTER TABLE ${sql.identifier(tableName)} ADD COLUMN ${sql.identifier(columnName)} ${sql.raw(sqliteType)}`;
    await db.run(alterQuery);
    existingColumns.add(columnName.toLowerCase());
  }
}

// HAUPTFUNKTION: JETZT MIT UPDATE-UNTERSTÜTZUNG
export async function createOrUpdateDynamicEntry(
  db: DrizzleDB, 
  data: EntryData & { id?: string } // id ist optional für CREATE, erforderlich für UPDATE
) {
  const { id, category, title, image, categorySpecificFields, customFields, readingSessions, gamingSessions, completed, abandoned } = data;
  
  // NEUE LOGIK: Prüfe, ob wir einen vorhandenen Eintrag aktualisieren oder einen neuen erstellen
  const isUpdate = !!id;
  
  const table = dbSchema[category];
  if (!table) throw new Error(`Unbekannte Kategorie: ${category}`);
  const tableName = table._.config.name;

  try {
    // 1. Tabelle sicherstellen
    await ensureTableExists(db, tableName);
    const existingColumns = await getTableColumns(db, tableName);

    // 2. Daten vorbereiten
    const dataToInsert: Record<string, any> = {
        title,
        completed: completed ? 1 : 0,
        abandoned: abandoned ? 1 : 0,
    };

    // Image-Spalte
    await ensureColumnExists(db, table, 'image', existingColumns);
    dataToInsert['image'] = image || null;

    // Reading Sessions
    if (readingSessions && readingSessions.length > 0) {
        await ensureColumnExists(db, table, 'reading_sessions', existingColumns);
        const serializableSessions = readingSessions.map(({ id, ...rest }) => rest);
        dataToInsert['reading_sessions'] = JSON.stringify(serializableSessions);
    } else {
        // Wenn keine Sessions vorhanden sind, setze auf null
        await ensureColumnExists(db, table, 'reading_sessions', existingColumns);
        dataToInsert['reading_sessions'] = null;
    }

    // Gaming Sessions
    if (gamingSessions && gamingSessions.length > 0) {
        await ensureColumnExists(db, table, 'gaming_sessions', existingColumns);
        const serializableSessions = gamingSessions.map(({ id, ...rest }) => rest);
        dataToInsert['gaming_sessions'] = JSON.stringify(serializableSessions);
    } else {
        await ensureColumnExists(db, table, 'gaming_sessions', existingColumns);
        dataToInsert['gaming_sessions'] = null;
    }

    // Kategoriespezifische Felder
    for (const [key, value] of Object.entries(categorySpecificFields)) {
      const columnName = key.trim().toLowerCase();
      if (!columnName) continue;
      await ensureColumnExists(db, table, columnName, existingColumns);
      
      if (Array.isArray(value)) {
        dataToInsert[columnName] = JSON.stringify(value.filter(v => v.trim() !== ''));
      } else {
        dataToInsert[columnName] = value || null;
      }
    }

    // Custom Fields
    for (const field of customFields) {
      const columnName = field.name.trim().toLowerCase();
      if (!columnName) continue;
      await ensureColumnExists(db, table, columnName, existingColumns);
      dataToInsert[columnName] = field.value || null;
    }

    // 3. UPDATE oder INSERT
    if (isUpdate) {
      // UPDATE-LOGIK
      console.log(`Aktualisiere Eintrag mit ID ${id} in Tabelle ${tableName}`);
      
      const updates = Object.entries(dataToInsert).map(([key, value]) => 
        sql`${sql.identifier(key)} = ${value}`
      );
      
      const updateQuery = sql`
        UPDATE ${sql.identifier(tableName)}
        SET ${sql.join(updates, sql`, `)}
        WHERE id = ${id}
      `;
      
      const result = await db.run(updateQuery);
      console.log("UPDATE erfolgreich:", result);
      return { success: true, result, id };
      
    } else {
      // INSERT-LOGIK
      console.log(`Erstelle neuen Eintrag in Tabelle ${tableName}`);
      
      // Generiere eine neue ID
      const newId = crypto.randomUUID();
      dataToInsert.id = newId;
      
      const keys = Object.keys(dataToInsert);
      const values = Object.values(dataToInsert);
      const columns = sql.join(keys.map(k => sql.identifier(k)), sql`, `);
      const placeholders = sql.join(values.map(v => sql`${v}`), sql`, `);
      
      const insertQuery = sql`
        INSERT INTO ${sql.identifier(tableName)} (${columns})
        VALUES (${placeholders})
      `;
      
      const result = await db.run(insertQuery);
      console.log("INSERT erfolgreich:", result);
      return { success: true, result, id: newId };
    }

  } catch (error) {
    console.error("[createOrUpdateDynamicEntry] Fehler:", error);
    throw error;
  }
}
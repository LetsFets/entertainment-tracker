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
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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

export async function createOrUpdateDynamicEntry(db: DrizzleDB, data: EntryData & { id?: string }) {
  const { category, title, image, categorySpecificFields, customFields, readingSessions, gamingSessions, completed, abandoned } = data;
  const isUpdate = !!data.id;

  const table = dbSchema[category];
  if (!table) {
    throw new Error(`Unbekannte Kategorie: ${category}`);
  }
  
  const tableName = table._.config.name;

  try {
    await ensureTableExists(db, tableName);
    const existingColumns = await getTableColumns(db, tableName);

    const dataToInsert: Record<string, any> = {};
    dataToInsert.title = title;
    dataToInsert.completed = completed ? 1 : 0;
    dataToInsert.abandoned = abandoned ? 1 : 0;
    
    // IMAGE
    const imageColName = 'image';
    await ensureColumnExists(db, table, imageColName, existingColumns);
    dataToInsert[imageColName] = image || null;
    
    // READING SESSIONS
    if (readingSessions && readingSessions.length > 0) {
      const sessionsColName = 'reading_sessions';
      await ensureColumnExists(db, table, sessionsColName, existingColumns);
      const serializableSessions = readingSessions.map(({ id, ...rest }) => rest);
      dataToInsert[sessionsColName] = JSON.stringify(serializableSessions);
    }
    
    // GAMING SESSIONS
    if (gamingSessions && gamingSessions.length > 0) {
      const sessionsColName = 'gaming_sessions';
      await ensureColumnExists(db, table, sessionsColName, existingColumns);
      const serializableSessions = gamingSessions.map(({ id, ...rest }) => rest);
      dataToInsert[sessionsColName] = JSON.stringify(serializableSessions);
    }
    
    // CATEGORY-SPECIFIC FIELDS
    for (const [key, value] of Object.entries(categorySpecificFields)) {
      const columnName = key.trim().toLowerCase();
      if (!columnName) continue;

      await ensureColumnExists(db, table, columnName, existingColumns);
      
    if (Array.isArray(value)) {
    // Prüfe den Typ der Array-Elemente vor dem Filter
    const filtered = value.filter(v => {
        if (typeof v === 'string') {
        return v.trim() !== '';
        }
        // Für Objekte (wie Staffeln), behalte alle nicht-null Werte
        return v !== null && v !== undefined;
    });
    dataToInsert[columnName] = JSON.stringify(filtered);
    } else {
        dataToInsert[columnName] = value;
      }
    }

    // CUSTOM FIELDS
    for (const field of customFields) {
      const columnName = field.name.trim().toLowerCase();
      if (!columnName) continue;

      await ensureColumnExists(db, table, columnName, existingColumns);
      dataToInsert[columnName] = field.value;
    }

    if (isUpdate) {
      const numericId = parseInt(data.id!);
      if (isNaN(numericId)) {
        throw new Error(`Ungültige ID für Update: ${data.id}`);
      }

      const keys = Object.keys(dataToInsert);
      const setExpressions = keys.map(key => sql`${sql.identifier(key)} = ${dataToInsert[key]}`);
      const updateQuery = sql`
        UPDATE ${sql.identifier(tableName)}
        SET ${sql.join(setExpressions, sql.raw(', '))}
        WHERE id = ${numericId}
      `;

      await db.run(updateQuery);
      console.log("UPDATE erfolgreich für ID:", numericId);
      return { success: true, result: null, id: String(numericId) };
    } else {
      // INSERT: Lass SQLite die ID automatisch generieren (NICHT die UUID verwenden!)
      const keys = Object.keys(dataToInsert);
      const columnNames = keys.map(key => sql.identifier(key));
      const valueExpressions = keys.map(key => dataToInsert[key]);

      const insertQuery = sql`
        INSERT INTO ${sql.identifier(tableName)} (${sql.join(columnNames, sql.raw(','))})
        VALUES (${sql.join(valueExpressions, sql.raw(','))})
      `;
      
      const result = await db.run(insertQuery);
      console.log("INSERT erfolgreich:", result);
      
      // Die neue ID aus dem result extrahieren (lastInsertRowid)
      const newId = String((result as any).lastInsertRowid || (result as any).lastID);
      return { success: true, result, id: newId };
    }
  } catch (error) {
    console.error("[createOrUpdateDynamicEntry] Fehler:", error);
    throw error;
  }
}

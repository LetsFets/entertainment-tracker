import { db } from "@/db";
import { sql, SQL } from "drizzle-orm";
import { AnySQLiteTable } from "drizzle-orm/sqlite-core";
import type { EntryData, Category } from "./types";

const baseTable = {
  id: "id",
  title: "title",
  completed: "completed",
  abandoned: "abandoned",
} as const;

const createMockTable = (name: string) => ({
    ...baseTable,
    _: {
        config: {
            name: name,
        }
    }
}) as unknown as AnySQLiteTable;

const dbSchema = {
    books: createMockTable("books"),
    series: createMockTable("series"),
    movies: createMockTable("movies"),
    videogames: createMockTable("videogames"),
    podcasts: createMockTable("podcasts"),
};

type DrizzleDB = {
  run: (sql: SQL) => Promise<any>;
};

async function getTableColumns(db: DrizzleDB, tableName: string): Promise<Set<string>> {
  const query = sql`PRAGMA table_info(${sql.identifier(tableName)})`;
  const result = await db.run(query);
  const rows = Array.isArray(result) ? result : (result as any)?.rows || [];

  if (!Array.isArray(rows)) {
    console.error("PRAGMA table_info lieferte kein Array in 'rows':", result);
    return new Set();
  }

  const columnNames = rows.map((col: { name: string }) => col.name.toLowerCase());
  return new Set(columnNames);
}

async function ensureTableExists(db: DrizzleDB, table: AnySQLiteTable, tableName: string) {
    const createTableQuery = sql`
        CREATE TABLE IF NOT EXISTS ${sql.identifier(tableName)} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            completed INTEGER NOT NULL DEFAULT 0,
            abandoned INTEGER NOT NULL DEFAULT 0
        );
    `;
    console.log(`Versuche, Basistabelle '${tableName}' zu erstellen...`);
    await db.run(createTableQuery);
    console.log(`Tabelle '${tableName}' ist jetzt vorhanden.`);
}

async function ensureColumnExists(
  db: DrizzleDB,
  table: AnySQLiteTable,
  columnName: string,
  existingColumns: Set<string>
) {
  // Case-insensitive Check
  if (!existingColumns.has(columnName.toLowerCase())) {
    const sqliteType = 'TEXT';
    console.warn(`Spalte '${columnName}' existiert nicht. Erstelle neue Spalte...`);

    const tableName = table._.config.name;
    const alterQuery = sql`ALTER TABLE ${sql.identifier(tableName)} ADD COLUMN ${sql.identifier(columnName)} ${sql.raw(sqliteType)}`;

    await db.run(alterQuery);
    existingColumns.add(columnName.toLowerCase());
    console.log(`Spalte '${columnName}' erfolgreich erstellt.`);
  }
}

export async function createOrUpdateDynamicEntry(db: DrizzleDB, data: EntryData & { id?: string }) {
  console.log("createOrUpdateDynamicEntry started", data);
  const { category, title, image, categorySpecificFields, customFields, readingSessions, gamingSessions, completed, abandoned } = data;

  const table = dbSchema[category];
  if (!table) {
    throw new Error(`Unbekannte Kategorie: ${category}`);
  }
  const tableName = table._.config.name;

  try {
    await ensureTableExists(db, table, tableName);
    const existingColumns = await getTableColumns(db, tableName);
    console.log(`Bestehende Spalten für ${tableName}:`, existingColumns);

    const dataToInsert: Record<string, any> = {};

    dataToInsert.title = title;
    dataToInsert.completed = completed ? 1 : 0;
    dataToInsert.abandoned = abandoned ? 1 : 0;
    
    const imageColName = 'image';
    await ensureColumnExists(db, table, imageColName, existingColumns);
    dataToInsert[imageColName] = image || null;
    
    if (readingSessions && readingSessions.length > 0) {
        const sessionsColName = 'reading_sessions';
        await ensureColumnExists(db, table, sessionsColName, existingColumns);
        dataToInsert[sessionsColName] = JSON.stringify(readingSessions);
    }
    
    if (gamingSessions && gamingSessions.length > 0) {
        const sessionsColName = 'gaming_sessions';
        await ensureColumnExists(db, table, sessionsColName, existingColumns);
        dataToInsert[sessionsColName] = JSON.stringify(gamingSessions);
    }
    
    for (const [key, value] of Object.entries(categorySpecificFields)) {
    const columnName = key.trim().toLowerCase();
    if (!columnName) continue;

    await ensureColumnExists(db, table, columnName, existingColumns);
    
    if (Array.isArray(value)) {
        dataToInsert[columnName] = JSON.stringify(value.filter(v => v.trim() !== ''));
    } else {
        dataToInsert[columnName] = value;
    }
    }

    for (const field of customFields) {
      const columnName = field.name.trim()
      if (!columnName) continue;

      await ensureColumnExists(db, table, columnName, existingColumns);
      dataToInsert[columnName] = field.value;
    }

    // UPDATE oder INSERT
    if (data.id) {
      // UPDATE
      console.log(`UPDATE: Aktualisiere Eintrag ID ${data.id}`);
      
      const updates = Object.entries(dataToInsert).map(([key, value]) => {
        return sql`${sql.identifier(key)} = ${value}`;
      });
      
      const updateQuery = sql`
        UPDATE ${sql.identifier(tableName)}
        SET ${sql.join(updates, sql`, `)}
        WHERE id = ${parseInt(data.id)}
      `;
      
      const result = await db.run(updateQuery);
      console.log("UPDATE erfolgreich:", result);
      
      return { success: true, result };
    } else {
      // INSERT
      console.log(`INSERT: Füge Daten in Tabelle ${tableName} ein:`, dataToInsert);

      const keys = Object.keys(dataToInsert);
      const values = Object.values(dataToInsert);
      
      const columns = sql.join(keys.map(k => sql.identifier(k)), sql`, `);
      const placeholders = sql.join(values.map(v => sql`${v}`), sql`, `);

      const insertQuery = sql`INSERT INTO ${sql.identifier(tableName)} (${columns}) VALUES (${placeholders})`;
      
      const result = await db.run(insertQuery);
      console.log("INSERT erfolgreich:", result);

      return { success: true, result };
    }
  } catch (error) {
    console.error("Fehler:", error);
    throw error;
  }
}
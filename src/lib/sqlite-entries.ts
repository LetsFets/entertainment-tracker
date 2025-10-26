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
  transaction: <T>(cb: (tx: DrizzleDB) => Promise<T>) => Promise<T>;
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

async function ensureTableExists(db: DrizzleDB, tableName: string) {
    const createTableQuery = sql`
        CREATE TABLE IF NOT EXISTS ${sql.identifier(tableName)} (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            image TEXT,
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
    const { category, id } = data;
    const isUpdate = !!id;

    const table = dbSchema[category];
    if (!table) {
        throw new Error(`[translate:Unbekannte Kategorie:] ${category}`);
    }
    const tableName = table._.config.name;

    await db.transaction(async (tx) => {
        await ensureTableExists(tx, tableName);
        const existingColumns = await getTableColumns(tx, tableName);

        // 1. Alle Spalten sicherstellen, bevor Daten eingefügt werden
        const allKeys = [
            ...Object.keys(data.categorySpecificFields),
            ...data.customFields.map(f => f.name),
            'reading_sessions',
            'gaming_sessions'
        ];
        for (const key of allKeys) {
            if (key.trim()) await ensureColumnExists(tx, table, key.trim().toLowerCase(), existingColumns);
        }
        
        // 2. Daten für das Einfügen/Aktualisieren vorbereiten
        const dataToInsert: Record<string, any> = {
            title: data.title,
            image: data.image || null,
            completed: data.completed ? 1 : 0,
            abandoned: data.abandoned ? 1 : 0,
        };

        if (data.readingSessions?.length) {
            dataToInsert['reading_sessions'] = JSON.stringify(data.readingSessions);
        }
        if (data.gamingSessions?.length) {
            dataToInsert['gaming_sessions'] = JSON.stringify(data.gamingSessions);
        }

        for (const [key, value] of Object.entries(data.categorySpecificFields)) {
            const columnName = key.trim().toLowerCase();
            if (!columnName) continue;
            dataToInsert[columnName] = Array.isArray(value) ? JSON.stringify(value) : value;
        }

        for (const field of data.customFields) {
            const columnName = field.name.trim().toLowerCase();
            if (!columnName) continue;
            dataToInsert[columnName] = field.value;
        }

        // 3. UPDATE oder INSERT ausführen
        if (isUpdate) {
            const setClauses = Object.entries(dataToInsert).map(
                ([key, value]) => sql`${sql.identifier(key)} = ${value}`
            );
            await tx.run(sql`
                UPDATE ${sql.identifier(tableName)}
                SET ${sql.join(setClauses, sql`, `)}
                WHERE id = ${id}
            `);
        } else {
            const newId = data.id || crypto.randomUUID(); // ID hier generieren
            dataToInsert.id = newId;

            const cols = Object.keys(dataToInsert).map(k => sql.identifier(k));
            const vals = Object.values(dataToInsert);
            
            await tx.run(sql`
                INSERT INTO ${sql.identifier(tableName)} (${sql.join(cols, sql`, `)})
                VALUES (${sql.join(vals.map(v => sql`${v}`), sql`, `)})
            `);
        }
    });
}
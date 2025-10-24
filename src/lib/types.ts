// src/lib/types.ts

// 1. Definiert alle erlaubten Kategorien
export type Category = "books" | "series" | "movies" | "videogames" | "podcasts";

// --- Spezielle Strukturen für Sessions und benutzerdefinierte Felder (Frontend-spezifisch) ---

// Struktur für Lese-Sessions (Bücher)
export interface ReadingSession {
    id: string; // Wird im Frontend für React-Keys verwendet (z.B. UUID)
    pages: number;
    year?: number;
    month?: number;
    day?: number;
}

// Struktur für Gaming-Sessions (Videospiele)
export interface GamingSession {
    id: string; // Wird im Frontend für React-Keys verwendet
    duration: number; // Gespielte Zeit, z.B. in Stunden oder Minuten
    year?: number;
    month?: number;
    day?: number;
}

// Struktur für die dynamische Staffelung (Serien)
export interface SeasonConfig {
    seasonNumber: number; // Z.B. 1, 2, 3...
    episodes: number;     // Anzahl Folgen in dieser Staffel
}

// Struktur für benutzerdefinierte Felder
export interface CustomField {
    id: string; // Wird im Frontend für React-Keys verwendet
    name: string;
    value: string;
}

// --- Der zentrale Datenaustausch-Typ ---

/**
 * Der Haupt-Typ für die Datenübergabe vom Frontend (NewEntryForm) zur Server Action.
 * Beinhaltet alle Felder, die zur Erstellung oder Aktualisierung eines Eintrags benötigt werden.
 */
export interface EntryData {
    // Basisdaten
    category: Category;
    title: string;
    image?: string; // Optionaler Bild-URL/Pfad

    // Kategorien-spezifische Felder (dynamisch für die DB)
    // Enthält Felder wie 'Autor', 'Erscheinungsjahr', 'Länge', etc.
    // ACHTUNG: Die 'seasons'-Daten aus dem Frontend werden HIER als JSON-String übergeben
    // oder müssen im Frontend in einem JSON-String serialisiert werden, um Drizzle/DB-kompatibel zu sein.
    categorySpecificFields: Record<string, string | string[]>;

    // Dynamische Listen (werden meist als JSON in der DB gespeichert)
    customFields: CustomField[];
    readingSessions?: ReadingSession[]; // Nur für category="books" relevant
    gamingSessions?: GamingSession[];   // Nur für category="videogames" relevant
    
    // Statusfelder
    completed: boolean;
    abandoned: boolean;

    // Nur bei UPDATES: ID des Eintrags
    id?: string;
}


// --- Optional: Der Typ für das Lesen aus der Datenbank (Vollständiger Eintrag) ---

/**
 * Der Typ eines vollständigen Eintrags, wie er aus der Datenbank gelesen wird.
 * (Nur zur Vollständigkeit; EntryData ist der Fokus für create-entry.ts)
 */
export interface MediaEntry extends EntryData {
    id: string; // Bei einem gelesenen Eintrag ist die ID immer vorhanden
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}
import type { Category, ReadingSession, GamingSession } from "@/lib/types";

// Lokale Interfaces NUR für React State (MIT id für Rendering)
export interface ReadingSessionWithId extends ReadingSession {
  id: string;
  pages: number;
  year?: number;
  month?: number;
  day?: number;
}

export interface GamingSessionWithId extends GamingSession {
  id: string;
  duration: number;
  year?: number;
  month?: number;
  day?: number;
}

export interface CustomField {
  id: string;
  name: string;
  value: string;
}

export type FieldType = "text" | "number";

export const categoryFields: Record<
  Category,
  {
    name: string;
    multi?: boolean;
    type?: FieldType;
    isSeasonConfig?: boolean;
    isReadingSession?: boolean;
    isGamingSession?: boolean;
  }[]
> = {
  books: [
    { name: "Autor", multi: true, type: "text" },
    { name: "Seitenanzahl", type: "number" },
    { name: "Lese-Sessions", isReadingSession: true },
    { name: "Genre", multi: true, type: "text" },
    { name: "Reihe", type: "text" },
  ],
  series: [
    { name: "Staffeln", isSeasonConfig: true },
    { name: "Aktuelle Staffel", type: "number" },
    { name: "Aktuelle Folge", type: "number" },
    { name: "Durchschnittliche Folgenlänge", type: "number" },
    { name: "Genre", multi: true, type: "text" },
    { name: "Reihe", type: "text" },
  ],
  movies: [
    { name: "Laufzeit", type: "number" },
    { name: "Aktuelle Minute", type: "number" },
    { name: "Genre", multi: true, type: "text" },
    { name: "Reihe", type: "text" },
  ],
  videogames: [
    { name: "Spielzeit", type: "number" },
    { name: "Spiel-Sessions", isGamingSession: true },
    { name: "Entwickler", multi: true, type: "text" },
    { name: "Genre", multi: true, type: "text" },
    { name: "Reihe", type: "text" },
  ],
  podcasts: [
    { name: "Host", multi: true, type: "text" },
    { name: "Folgen gesamt", type: "number" },
    { name: "Aktuelle Folge", type: "number" },
    { name: "Minute", type: "number" },
    { name: "Durchschn. Länge", type: "number" },
    { name: "Genre", multi: true, type: "text" },
    { name: "Reihe", type: "text" },
  ],
};

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function normalizeSeasons(
  seasons: Record<string, number>
): Record<string, number> {
  const entries = Object.entries(seasons);
  const normalized: Record<string, number> = {};
  entries.forEach(([key, value], index) => {
    normalized[String(index + 1)] = value;
  });
  return normalized;
}

export function validateTextInput(value: string): string {
  return value.replace(/[^a-zA-Z0-9äöüÄÖÜß\s\-_.,:;!?()'"/&]/g, "");
}

export type Category = "books" | "series" | "movies" | "videogames" | "podcasts";

export interface ReadingSession {
  pages: number;
  year?: number;
  month?: number;
  day?: number;
}

export interface GamingSession {
  duration: number;
  year?: number;
  month?: number;
  day?: number;
}

export interface EntryData {
  id?: string;
  category: Category;
  title: string;
  image?: string;
  categorySpecificFields: Record<string, string | string[]>;
  customFields: { name: string; value: string }[];
  readingSessions?: ReadingSession[];
  gamingSessions?: GamingSession[];
  completed: boolean;
  abandoned: boolean;
}

export interface MediaEntry {
  id: string;
  title: string;
  category: Category;
  completed: boolean;
  abandoned: boolean;
  completionCount?: number;
  categorySpecificFields: Record<string, string | string[]>;
  customFields: Array<{ name: string; value: string }>;
  readingSessions?: ReadingSession[];
  gamingSessions?: GamingSession[];
  image?: string;
  createdAt: number;
}

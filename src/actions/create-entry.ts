// actions/create-entry.ts
"use server";

export async function createEntry(data: {
  category: string;
  title: string;
  customFields: { name: string; value: string }[];
  completed: boolean;
  abandoned: boolean;
}) {
  // Hier würdest du die Daten in deine Datenbank speichern
  // z.B. mit Prisma, Drizzle oder deinem bevorzugten ORM
  
  console.log("Creating entry:", data);
  
  // Beispiel-Validierung
  if (!data.title || data.title.trim().length === 0) {
    return { error: "Titel ist erforderlich" };
  }

  // Speichere in DB...
  // await db.entry.create({ data: ... });

  return { success: true };
}
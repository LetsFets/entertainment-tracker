"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewEntryForm, type Category, type MediaEntry } from "./_components/new-entry-form";
import { EntryList } from "./_components/entry-list";

const categories: { value: Category; label: string }[] = [
  { value: "books", label: "Bücher" },
  { value: "series", label: "Serien" },
  { value: "movies", label: "Filme" },
  { value: "videogames", label: "Videospiele" },
  { value: "podcasts", label: "Podcasts" },
];

const STORAGE_KEY = "media-tracker-entries";

export default function HomePage() {
  const [entries, setEntries] = useState<MediaEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>("books");
  const [isLoaded, setIsLoaded] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MediaEntry | undefined>(undefined);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const entriesWithDates = parsed.map((entry: any) => ({
          ...entry,
          createdAt: new Date(entry.createdAt),
        }));
        setEntries(entriesWithDates);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Daten:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      } catch (error) {
        console.error("Fehler beim Speichern der Daten:", error);
      }
    }
  }, [entries, isLoaded]);

  const handleEntryCreated = (entry: MediaEntry) => {
    // Prüfe auf Duplikate
    const isDuplicate = entries.some(
      e => e.title.toLowerCase().trim() === entry.title.toLowerCase().trim() 
      && e.category === entry.category
    );
    
    if (isDuplicate) {
      alert(`Ein Eintrag mit dem Titel "${entry.title}" existiert bereits in dieser Kategorie!`);
      return;
    }
    
    setEntries([entry, ...entries]);
  };

  const handleEntryUpdated = (updatedEntry: MediaEntry) => {
    // Prüfe auf Duplikate (außer der Eintrag selbst)
    const isDuplicate = entries.some(
      e => e.id !== updatedEntry.id 
      && e.title.toLowerCase().trim() === updatedEntry.title.toLowerCase().trim() 
      && e.category === updatedEntry.category
    );
    
    if (isDuplicate) {
      alert(`Ein anderer Eintrag mit dem Titel "${updatedEntry.title}" existiert bereits in dieser Kategorie!`);
      return;
    }
    
    setEntries(entries.map(e => e.id === updatedEntry.id ? updatedEntry : e));
    setEditingEntry(undefined);
  };

  const handleDelete = (id: string) => {
    setEntries(entries.filter((e) => e.id !== id));
  };

  const handleEdit = (entry: MediaEntry) => {
    setEditingEntry(entry);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingEntry(undefined);
  };

  const filteredEntries = entries.filter((e) => e.category === activeCategory);

  if (!isLoaded) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-center">Lade Daten...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Media Tracker</h1>

      <Tabs value={activeCategory} onValueChange={(v) => {
        setActiveCategory(v as Category);
        setEditingEntry(undefined);
      }}>
        <TabsList className="grid w-full grid-cols-5">
          {categories.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value}>
              {cat.label} ({entries.filter(e => e.category === cat.value).length})
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((cat) => (
          <TabsContent key={cat.value} value={cat.value} className="mt-6">
            <div className="space-y-6">
              <NewEntryForm 
                category={cat.value} 
                onEntryCreated={handleEntryCreated}
                onEntryUpdated={handleEntryUpdated}
                editingEntry={activeCategory === cat.value ? editingEntry : undefined}
                onCancelEdit={handleCancelEdit}
                existingTitles={entries
                  .filter(e => e.category === cat.value)
                  .map(e => e.title)
                }
              />
              <EntryList 
                entries={filteredEntries} 
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
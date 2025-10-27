"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewEntryForm } from "./_components/new-entry-form";
import { EntryList } from "./_components/entry-list";
import { StatisticsView } from "./_components/statistics-view";
import { IconChartBar, IconLogout } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";
import { getAllEntries } from "@/actions/get-entries";
import { deleteEntry } from "@/actions/delete-entry";
import type { Category, MediaEntry } from "@/lib/types";

const categories: { value: Category; label: string }[] = [
  { value: "books", label: "Bücher" },
  { value: "series", label: "Serien" },
  { value: "movies", label: "Filme" },
  { value: "videogames", label: "Videospiele" },
  { value: "podcasts", label: "Podcasts" },
];

export default function HomePage() {
  const [entries, setEntries] = useState<MediaEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category | "stats">("books");
  const [isLoaded, setIsLoaded] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MediaEntry | undefined>(undefined);

  useEffect(() => {
    async function loadEntries() {
      try {
        const result = await getAllEntries();
        if (result.success) {
          setEntries(result.entries);
        }
      } catch (error) {
        console.error("Fehler beim Laden:", error);
      } finally {
        setIsLoaded(true);
      }
    }
    
    loadEntries();
  }, []);

  const handleEntryCreated = (entry: MediaEntry) => {
    setEntries([entry, ...entries]);
  };

  const handleEntryUpdated = (updatedEntry: MediaEntry) => {
    setEntries(entries.map(e => e.id === updatedEntry.id ? updatedEntry : e));
    setEditingEntry(undefined);
  };

  const handleDelete = async (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    
    const result = await deleteEntry(entry.category, id);
    if (result.success) {
      setEntries(entries.filter((e) => e.id !== id));
    }
  };

  const handleEdit = (entry: MediaEntry) => {
    setEditingEntry(entry);
    setActiveCategory(entry.category);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingEntry(undefined);
  };

  const handleLogout = async () => {
    if (confirm("Möchtest du dich wirklich ausloggen?")) {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.href = "/login";
          },
        },
      });
    }
  };

  const filteredEntries = activeCategory !== "stats" 
    ? entries.filter((e) => e.category === activeCategory)
    : [];

  if (!isLoaded) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-center">Lade Daten...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Media Tracker</h1>
        <Button onClick={handleLogout} variant="outline" size="sm">
          <IconLogout className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      <Tabs value={activeCategory} onValueChange={(v) => {
        setActiveCategory(v as Category | "stats");
        if (v !== activeCategory) {
          setEditingEntry(undefined);
        }
      }}>
        <TabsList className="grid w-full grid-cols-6">
          {categories.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value}>
              {cat.label} ({entries.filter(e => e.category === cat.value).length})
            </TabsTrigger>
          ))}
          <TabsTrigger value="stats">
            <IconChartBar className="h-4 w-4 mr-2" />
            Statistiken
          </TabsTrigger>
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
                  .filter(e => e.category === cat.value && (!editingEntry || e.id !== editingEntry.id))
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
        
        <TabsContent value="stats" className="mt-6">
          <StatisticsView entries={entries} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
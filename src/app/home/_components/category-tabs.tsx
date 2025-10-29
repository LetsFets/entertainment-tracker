// src/app/home/_components/category-tabs.tsx
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewEntryForm } from "./new-entry-form";

type Category = "books" | "series" | "movies" | "videogames" | "podcasts";

const categories: { value: Category; label: string }[] = [
  { value: "books", label: "Bücher" },
  { value: "series", label: "Serien" },
  { value: "movies", label: "Filme" },
  { value: "videogames", label: "Videospiele" },
  { value: "podcasts", label: "Podcasts" },
];

export function CategoryTabs() {
  const [activeCategory, setActiveCategory] = useState<Category>("books");

  return (
    <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as Category)}>
      <TabsList className="w-full justify-start">
        {categories.map((cat) => (
          <TabsTrigger key={cat.value} value={cat.value}>
            {cat.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {categories.map((cat) => (
        <TabsContent key={cat.value} value={cat.value} className="mt-6">
          <div className="space-y-6">
            <NewEntryForm
              category={cat.value}
              onEntryCreated={(entry) => {
                // handle the created entry here (e.g., add to a list or show a message)
                // For now, just log it:
                console.log("Entry created:", entry);
              }}
              onEntryUpdated={(entry) => {
                // handle the updated entry here (e.g., update a list or show a message)
                // For now, just log it:
                console.log("Entry updated:", entry);
              }}
            />
            
            {/* Hier kommt die Liste der Einträge */}
            <div className="grid gap-4">
              {/* Entry cards werden hier gerendert */}
            </div>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

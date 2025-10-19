// components/category-tabs.tsx
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewEntryDialog } from "./new-entry-dialog";
import { Button } from "@/components/ui/button";
import { Plus as IconPlus } from "lucide-react";

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
        <TabsContent key={cat.value} value={cat.value} className="mt-4">
          <div className="space-y-4">
            <NewEntryDialog category={cat.value}>
              <Button>
                <IconPlus className="mr-2 h-4 w-4" />
                Neuer Eintrag
              </Button>
            </NewEntryDialog>
            
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
"use client";

import { useState, useEffect } from "react";
import type { MediaEntry, Category } from "@/lib/types";
import type {
  ReadingSessionWithId,
  GamingSessionWithId,
  CustomField,
} from "./new-entry-form-utils";

interface UseEntryFormStateProps {
  editingEntry?: MediaEntry;
  category: Category;
}

export function useEntryFormState({
  editingEntry,
  category,
}: UseEntryFormStateProps) {
  const [title, setTitle] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [categorySpecificFields, setCategorySpecificFields] = useState<
    Record<string, string | string[]>
  >({});
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [readingSessions, setReadingSessions] = useState<ReadingSessionWithId[]>(
    []
  );
  const [gamingSessions, setGamingSessions] = useState<GamingSessionWithId[]>(
    []
  );
  const [seasons, setSeasons] = useState<
    { seasonNumber: number; episodes: number }[]
  >([]);
  const [completed, setCompleted] = useState(false);
  const [abandoned, setAbandoned] = useState(false);
  const [completionCount, setCompletionCount] = useState(0);
  const [pending, setPending] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Load editing entry data
  useEffect(() => {
    if (editingEntry) {
      setIsExpanded(true);
      setTitle(editingEntry.title);
      setImage(editingEntry.image || null);
      setCategorySpecificFields(editingEntry.categorySpecificFields || {});
      
      if (editingEntry.customFields) {
        setCustomFields(
          editingEntry.customFields.map((field) => ({
            id: crypto.randomUUID(),
            name: field.name,
            value: field.value,
          }))
        );
      }
      
      setCompleted(editingEntry.completed || false);
      setAbandoned(editingEntry.abandoned || false);
      setCompletionCount(editingEntry.completionCount ?? 1);

      if (editingEntry.readingSessions) {
        setReadingSessions(
          editingEntry.readingSessions.map((session) => ({
            ...session,
            id: crypto.randomUUID(),
          }))
        );
      }

      if (editingEntry.gamingSessions) {
        setGamingSessions(
          editingEntry.gamingSessions.map((session) => ({
            ...session,
            id: crypto.randomUUID(),
          }))
        );
      }

      // Seasons aus categorySpecificFields laden
      if (category === "series" && editingEntry.categorySpecificFields["Staffeln"]) {
        const seasonsData = editingEntry.categorySpecificFields["Staffeln"];
        if (typeof seasonsData === "string") {
          try {
            const parsed = JSON.parse(seasonsData);
            setSeasons(parsed);
          } catch {
            setSeasons([]);
          }
        }
      }
    }
  }, [editingEntry, category]);

  const resetForm = () => {
    setTitle("");
    setImage(null);
    setCategorySpecificFields({});
    setCustomFields([]);
    setReadingSessions([]);
    setGamingSessions([]);
    setSeasons([]);
    setCompleted(false);
    setAbandoned(false);
    setCompletionCount(0);
    setIsExpanded(false);
  };

  // Image handlers with validation
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 5MB Limit
      if (file.size > 5 * 1024 * 1024) {
        alert("Bild darf maximal 5MB groß sein!");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
  };

  // Season handlers
  const addSeason = () => {
    setSeasons([...seasons, { seasonNumber: seasons.length + 1, episodes: 0 }]);
  };

  const updateSeasonEpisodes = (seasonNumber: number, episodes: number) => {
    setSeasons(
      seasons.map((s) =>
        s.seasonNumber === seasonNumber ? { ...s, episodes } : s
      )
    );
  };

  const removeSeason = (seasonNumber: number) => {
    const filtered = seasons.filter((s) => s.seasonNumber !== seasonNumber);
    const renumbered = filtered.map((s, index) => ({
      ...s,
      seasonNumber: index + 1,
    }));
    setSeasons(renumbered);
  };

  // Reading session handlers with validation
  const addReadingSession = () => {
    const totalPages = parseInt(
      categorySpecificFields["Seitenanzahl"] as string || "0"
    );
    
    if (!totalPages || totalPages <= 0) {
      alert("Bitte zuerst die Seitenanzahl des Buches eingeben!");
      return;
    }
    
    const currentPagesRead = readingSessions.reduce(
      (sum, s) => sum + s.pages,
      0
    );
    const remainingPages = totalPages - currentPagesRead;
    
    if (remainingPages <= 0) {
      alert("Alle Seiten wurden bereits gelesen!");
      return;
    }
    
    setReadingSessions([
      ...readingSessions,
      { id: crypto.randomUUID(), pages: 0 },
    ]);
  };

  const updateReadingSession = (
    id: string,
    field: keyof ReadingSessionWithId,
    value: number | undefined
  ) => {
    if (field === "pages" && value !== undefined) {
      const totalPages = parseInt(
        categorySpecificFields["Seitenanzahl"] as string || "0"
      );
      
      const otherSessionsPages = readingSessions
        .filter((s) => s.id !== id)
        .reduce((sum, s) => sum + s.pages, 0);
      
      const maxAllowedPages = totalPages - otherSessionsPages;
      
      if (value > maxAllowedPages) {
        alert(
          `Maximal ${maxAllowedPages} Seiten möglich (von insgesamt ${totalPages} Seiten)`
        );
        return;
      }
    }
    
    setReadingSessions(
      readingSessions.map((session) =>
        session.id === id ? { ...session, [field]: value } : session
      )
    );
  };

  const removeReadingSession = (id: string) => {
    setReadingSessions(readingSessions.filter((session) => session.id !== id));
  };

  // Gaming session handlers
  const addGamingSession = () => {
    setGamingSessions([
      ...gamingSessions,
      { id: crypto.randomUUID(), duration: 0 },
    ]);
  };

  const updateGamingSession = (
    id: string,
    field: keyof GamingSessionWithId,
    value: number | undefined
  ) => {
    setGamingSessions(
      gamingSessions.map((session) =>
        session.id === id ? { ...session, [field]: value } : session
      )
    );
  };

  const removeGamingSession = (id: string) => {
    setGamingSessions(gamingSessions.filter((session) => session.id !== id));
  };

  // Custom field handlers
  const addCustomField = () => {
    setCustomFields([
      ...customFields,
      { id: crypto.randomUUID(), name: "", value: "" },
    ]);
  };

  const updateCustomField = (
    id: string,
    field: "name" | "value",
    value: string
  ) => {
    setCustomFields(
      customFields.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter((f) => f.id !== id));
  };

  const updateCategoryField = (fieldName: string, value: string | string[]) => {
    setCategorySpecificFields({
      ...categorySpecificFields,
      [fieldName]: value,
    });
  };

  return {
    // State values
    title,
    image,
    categorySpecificFields,
    customFields,
    readingSessions,
    gamingSessions,
    seasons,
    completed,
    abandoned,
    completionCount,
    pending,
    isExpanded,

    // State setters
    setTitle,
    setImage,
    setCategorySpecificFields,
    setCompleted,
    setAbandoned,
    setCompletionCount,
    setPending,
    setIsExpanded,

    // Helper functions
    resetForm,
    handleImageUpload,
    removeImage,

    // Season handlers
    addSeason,
    updateSeasonEpisodes,
    removeSeason,

    // Reading session handlers
    addReadingSession,
    updateReadingSession,
    removeReadingSession,

    // Gaming session handlers
    addGamingSession,
    updateGamingSession,
    removeGamingSession,

    // Custom field handlers
    addCustomField,
    updateCustomField,
    removeCustomField,

    // Category field handlers
    updateCategoryField,
  };
}

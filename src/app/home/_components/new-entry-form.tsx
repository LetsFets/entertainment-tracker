"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconPlus, IconX, IconPhoto, IconDeviceFloppy } from "@tabler/icons-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2Icon } from "lucide-react";
import Image from "next/image";
import { createEntry } from "@/actions/create-entry";
import type { Category, MediaEntry, ReadingSession, GamingSession } from "@/lib/types";

// Lokale Interfaces NUR für React State (MIT id für Rendering)
interface ReadingSessionWithId extends ReadingSession {
  id: string;
}

interface GamingSessionWithId extends GamingSession {
  id: string;
}

interface CustomField {
  id: string;
  name: string;
  value: string;
}

type FieldType = "text" | "number";

const categoryFields: Record<Category, { name: string; multi?: boolean; type?: FieldType; isSeasonConfig?: boolean; isReadingSession?: boolean; isGamingSession?: boolean }[]> = {
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
    { name: "Reihe", type: "text" },
    { name: "Genre", multi: true, type: "text" },
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
    { name: "Durchschn. Länge", type: "number" },
    { name: "Genre", multi: true, type: "text" },
    { name: "Reihe", type: "text" },
  ],
};

interface NewEntryFormProps {
  category: Category;
  onEntryCreated: (entry: MediaEntry) => void;
  onEntryUpdated: (entry: MediaEntry) => void;
  editingEntry?: MediaEntry;
  onCancelEdit?: () => void;
  existingTitles?: string[];
}

export function NewEntryForm({
  category,
  onEntryCreated,
  onEntryUpdated,
  editingEntry,
  onCancelEdit,
  existingTitles = []
}: NewEntryFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [image, setImage] = useState<string | undefined>(undefined);
  const [categorySpecificFields, setCategorySpecificFields] = useState<Record<string, string | string[]>>({});
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [completed, setCompleted] = useState(false);
  const [abandoned, setAbandoned] = useState(false);
  const [pending, setPending] = useState(false);
  const [seasons, setSeasons] = useState<{ seasonNumber: number; episodes: number }[]>([]);
  const [readingSessions, setReadingSessions] = useState<ReadingSessionWithId[]>([]);
  const [gamingSessions, setGamingSessions] = useState<GamingSessionWithId[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableFields = categoryFields[category];
  const isEditing = !!editingEntry;

  const titleExists = existingTitles.some(
    t => t.toLowerCase().trim() === title.toLowerCase().trim()
  );

  useEffect(() => {
    if (editingEntry) {
      setIsExpanded(true);
      setTitle(editingEntry.title);
      setImage(editingEntry.image);
      setCategorySpecificFields(editingEntry.categorySpecificFields);
      setCustomFields(
        editingEntry.customFields.map(f => ({ ...f, id: crypto.randomUUID() }))
      );
      setCompleted(editingEntry.completed);
      setAbandoned(editingEntry.abandoned);

      if (editingEntry.readingSessions) {
        setReadingSessions(editingEntry.readingSessions.map(s => ({
          ...s,
          id: crypto.randomUUID()
        })));
      }

      if (editingEntry.gamingSessions) {
        setGamingSessions(editingEntry.gamingSessions.map(s => ({
          ...s,
          id: crypto.randomUUID()
        })));
      }

      const staffelnData = editingEntry.categorySpecificFields["Staffeln"];
      if (typeof staffelnData === "string") {
        try {
          const parsed = JSON.parse(staffelnData);
          if (Array.isArray(parsed)) {
            setSeasons(parsed);
          }
        } catch (e) {
          console.error("Fehler beim Parsen der Staffel-Daten", e);
        }
      }
    }
  }, [editingEntry]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Bild ist zu groß! Maximal 5MB erlaubt.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImage(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const addCustomField = () => {
    setCustomFields([
      ...customFields,
      { id: crypto.randomUUID(), name: "", value: "" },
    ]);
  };

  const updateCustomField = (id: string, field: "name" | "value", newValue: string) => {
    setCustomFields(
      customFields.map((f) => (f.id === id ? { ...f, [field]: newValue } : f))
    );
  };

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter((f) => f.id !== id));
  };

  const addSeason = () => {
    setSeasons([...seasons, { seasonNumber: seasons.length + 1, episodes: 0 }]);
  };

  const updateSeasonEpisodes = (seasonNumber: number, episodes: number) => {
    setSeasons(seasons.map(s => 
      s.seasonNumber === seasonNumber ? { ...s, episodes } : s
    ));
  };

  const removeSeason = (seasonNumber: number) => {
    setSeasons(seasons.filter(s => s.seasonNumber !== seasonNumber)
      .map((s, idx) => ({ ...s, seasonNumber: idx + 1 })));
  };

  const addReadingSession = () => {
    // Validierung: Prüfe ob Seitenanzahl existiert
    const totalPages = parseInt(categorySpecificFields["Seitenanzahl"] as string || "0");
    
    if (!totalPages || totalPages <= 0) {
      alert("Bitte zuerst die Seitenanzahl des Buches eingeben!");
      return;
    }
    
    // Berechne bereits gelesene Seiten
    const currentPagesRead = readingSessions.reduce((sum, s) => sum + s.pages, 0);
    const remainingPages = totalPages - currentPagesRead;
    
    if (remainingPages <= 0) {
      alert(`Du hast bereits alle ${totalPages} Seiten gelesen!`);
      return;
    }
    
    setReadingSessions([
      ...readingSessions,
      { id: crypto.randomUUID(), pages: 0 }
    ]);
  };

  const updateReadingSession = (id: string, field: keyof ReadingSession, value: number | undefined) => {
    if (field === "pages" && value !== undefined) {
      const totalPages = parseInt(categorySpecificFields["Seitenanzahl"] as string || "0");
      
      // Berechne Seiten der anderen Sessions
      const otherSessionsPages = readingSessions
        .filter(s => s.id !== id)
        .reduce((sum, s) => sum + s.pages, 0);
      
      const maxAllowedPages = totalPages - otherSessionsPages;
      
      if (value > maxAllowedPages) {
        alert(`Maximal ${maxAllowedPages} Seiten möglich!\n(Gesamt: ${totalPages}, bereits in anderen Sessions: ${otherSessionsPages})`);
        return; // Verhindere die Änderung
      }
    }
    
    setReadingSessions(readingSessions.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const removeReadingSession = useCallback((id: string) => {
    setReadingSessions(prev => prev.filter(s => s.id !== id));
  }, []);

  const addGamingSession = () => {
    setGamingSessions([
      ...gamingSessions,
      { id: crypto.randomUUID(), duration: 0 }
    ]);
  };

  const updateGamingSession = (id: string, field: keyof GamingSession, value: number | undefined) => {
    setGamingSessions(gamingSessions.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const removeGamingSession = useCallback((id: string) => {
    setGamingSessions(prev => prev.filter(s => s.id !== id));
  }, []);

  const addMultiValue = (fieldName: string) => {
    const current = categorySpecificFields[fieldName] as string[] || [];
    setCategorySpecificFields({
      ...categorySpecificFields,
      [fieldName]: [...current, ""],
    });
  };

  const updateMultiValue = (fieldName: string, index: number, value: string) => {
    const current = categorySpecificFields[fieldName] as string[] || [];
    const updated = [...current];
    updated[index] = value;
    setCategorySpecificFields({
      ...categorySpecificFields,
      [fieldName]: updated,
    });
  };

  const removeMultiValue = (fieldName: string, index: number) => {
    const current = categorySpecificFields[fieldName] as string[] || [];
    setCategorySpecificFields({
      ...categorySpecificFields,
      [fieldName]: current.filter((_, i) => i !== index),
    });
  };

  const getMultiValues = (fieldName: string): string[] => {
    const value = categorySpecificFields[fieldName];
    if (Array.isArray(value)) return value;
    return [];
  };

  const handleNumberInput = (fieldName: string, value: string) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    setCategorySpecificFields({
      ...categorySpecificFields,
      [fieldName]: sanitized,
    });
  };

  const validateTextInput = (value: string): boolean => {
    return /^[a-zA-ZäöüÄÖÜß0-9\s\-.,]*$/.test(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);

    // VALIDIERUNG: Prüfe ob mehr Seiten gelesen als vorhanden
    if (category === "books" && readingSessions.length > 0) {
      const totalPages = parseInt(categorySpecificFields["Seitenanzahl"] as string || "0");
      const pagesRead = readingSessions.reduce((sum, s) => sum + s.pages, 0);
      
      if (pagesRead > totalPages) {
        alert(`Fehler: Du hast ${pagesRead} Seiten eingetragen, aber das Buch hat nur ${totalPages} Seiten!`);
        setPending(false);
        return;
      }
    }

    const cleanedFields: Record<string, string | string[]> = {};
    Object.entries(categorySpecificFields).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        const filtered = value.filter(v => v.trim() !== "");
        if (filtered.length > 0) {
          cleanedFields[key] = filtered;
        }
      } else if (value && value.trim() !== "") {
        cleanedFields[key] = value;
      }
    });

    if (category === "series" && seasons.length > 0) {
      cleanedFields["Staffeln"] = JSON.stringify(seasons);
    }

    const entryData = {
      id: isEditing ? editingEntry!.id : undefined,
      category,
      title,
      image,
      categorySpecificFields: cleanedFields,
      customFields: customFields.filter(f => f.name && f.value).map(({ name, value }) => ({ name, value })),
      readingSessions: category === "books" && readingSessions.length > 0 
        ? readingSessions.map(({ id, ...rest }) => rest) 
        : undefined,
      gamingSessions: category === "videogames" && gamingSessions.length > 0 
        ? gamingSessions.map(({ id, ...rest }) => rest)
        : undefined,
      completed,
      abandoned,
    };

    try {
      const result = await createEntry(entryData);

      if (result.success) {
        const finalEntry: MediaEntry = {
          ...entryData,
          id: result.id!,
          createdAt: isEditing ? editingEntry!.createdAt : new Date(),
        };
        
        if (isEditing) {
          onEntryUpdated(finalEntry);
        } else {
          onEntryCreated(finalEntry);
        }
        
        resetForm();
      } else {
        alert(`Fehler: ${result.error}`);
      }
    } catch (error) {
      console.error("Fehler:", error);
      alert("Ein Fehler ist aufgetreten.");
    } finally {
      setPending(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setImage(undefined);
    setCategorySpecificFields({});
    setCustomFields([]);
    setSeasons([]);
    setReadingSessions([]);
    setGamingSessions([]);
    setCompleted(false);
    setAbandoned(false);
    setIsExpanded(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (onCancelEdit) {
      onCancelEdit();
    }
  };

  const handleCancel = () => {
    resetForm();
  };

  if (!isExpanded && !isEditing) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Button onClick={() => setIsExpanded(true)} className="w-full">
            <IconPlus className="mr-2 h-4 w-4" />
            Neuer Eintrag hinzufügen
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Eintrag bearbeiten" : "Neuer Eintrag"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Titel */}
          <div className="space-y-2">
            <Label htmlFor="title-input">
              Titel <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titel eingeben..."
              required
              disabled={pending}
              className={titleExists ? "border-destructive" : ""}
            />
            {titleExists && (
              <p className="text-sm text-destructive">
                ⚠️ Ein Eintrag mit diesem Titel existiert bereits in dieser Kategorie!
              </p>
            )}
          </div>

          {/* Bild Upload */}
          <div className="space-y-2">
            <Label>Cover/Bild</Label>
            {image ? (
              <div className="relative w-full aspect-[3/4] max-w-[200px] rounded-lg overflow-hidden border">
                <Image
                  src={image}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={removeImage}
                  disabled={pending}
                >
                  <IconX className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={pending}
                  className="hidden"
                  id="image-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={pending}
                >
                  <IconPhoto className="mr-2 h-4 w-4" />
                  Bild hochladen
                </Button>
                <span className="text-xs text-muted-foreground">Max. 5MB</span>
              </div>
            )}
          </div>

          {/* Kategoriespezifische Felder */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Optionale Informationen</h3>
            
            {/* Staffel-Konfiguration für Serien */}
            {category === "series" && (
              <div className="space-y-2">
                <Label>Staffeln</Label>
                
                {seasons.length === 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSeason}
                    disabled={pending}
                    className="w-full"
                  >
                    <IconPlus className="h-3 w-3 mr-1" />
                    Erste Staffel hinzufügen
                  </Button>
                ) : (
                  <div className="space-y-2">
                    {seasons.map((season) => (
                      <div key={season.seasonNumber} className="flex gap-2 items-center">
                        <span className="text-sm text-muted-foreground w-20">
                          Staffel {season.seasonNumber}:
                        </span>
                        <Input
                          type="number"
                          value={season.episodes || ""}
                          onChange={(e) =>
                            updateSeasonEpisodes(season.seasonNumber, parseInt(e.target.value) || 0)
                          }
                          placeholder="Anzahl Folgen"
                          disabled={pending}
                          min="0"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSeason(season.seasonNumber)}
                          disabled={pending}
                        >
                          <IconX className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addSeason}
                      disabled={pending}
                      className="w-full"
                    >
                      <IconPlus className="h-3 w-3 mr-1" />
                      Weitere Staffel hinzufügen
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Lese-Sessions für Bücher */}
            {category === "books" && (
              <div className="space-y-2">
                <Label>Lese-Sessions</Label>
                
                {readingSessions.length === 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addReadingSession}
                    disabled={pending}
                    className="w-full"
                  >
                    <IconPlus className="h-3 w-3 mr-1" />
                    Erste Lese-Session hinzufügen
                  </Button>
                ) : (
                  <div className="space-y-3">
                    {readingSessions.map((session, index) => (
                      <Card key={session.id} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Session {index + 1}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeReadingSession(session.id)}
                              disabled={pending}
                            >
                              <IconX className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Gelesene Seiten *</Label>
                            <Input
                              type="number"
                              value={session.pages || ""}
                              onChange={(e) =>
                                updateReadingSession(session.id, "pages", parseInt(e.target.value) || 0)
                              }
                              placeholder="Anzahl Seiten"
                              disabled={pending}
                              min="0"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Datum (optional)</Label>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <Input
                                  type="number"
                                  value={session.year || ""}
                                  onChange={(e) => {
                                    const year = e.target.value ? parseInt(e.target.value) : undefined;
                                    updateReadingSession(session.id, "year", year);
                                    if (!year) {
                                      updateReadingSession(session.id, "month", undefined);
                                      updateReadingSession(session.id, "day", undefined);
                                    }
                                  }}
                                  placeholder="Jahr"
                                  disabled={pending}
                                  min="1900"
                                  max="2100"
                                />
                              </div>
                              <div>
                                <Input
                                  type="number"
                                  value={session.month || ""}
                                  onChange={(e) => {
                                    const month = e.target.value ? parseInt(e.target.value) : undefined;
                                    updateReadingSession(session.id, "month", month);
                                    if (!month) {
                                      updateReadingSession(session.id, "day", undefined);
                                    }
                                  }}
                                  placeholder="Monat"
                                  disabled={pending || !session.year}
                                  min="1"
                                  max="12"
                                />
                              </div>
                              <div>
                                <Input
                                  type="number"
                                  value={session.day || ""}
                                  onChange={(e) =>
                                    updateReadingSession(session.id, "day", e.target.value ? parseInt(e.target.value) : undefined)
                                  }
                                  placeholder="Tag"
                                  disabled={pending || !session.year || !session.month}
                                  min="1"
                                  max="31"
                                />
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Jahr ist erforderlich für Monat/Tag
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addReadingSession}
                      disabled={pending}
                      className="w-full"
                    >
                      <IconPlus className="h-3 w-3 mr-1" />
                      Weitere Lese-Session hinzufügen
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Gaming-Sessions für Videospiele */}
            {category === "videogames" && (
              <div className="space-y-2">
                <Label>Spiel-Sessions</Label>
                
                {gamingSessions.length === 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addGamingSession}
                    disabled={pending}
                    className="w-full"
                  >
                    <IconPlus className="h-3 w-3 mr-1" />
                    Erste Spiel-Session hinzufügen
                  </Button>
                ) : (
                  <div className="space-y-3">
                    {gamingSessions.map((session, index) => (
                      <Card key={session.id} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Session {index + 1}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeGamingSession(session.id)}
                              disabled={pending}
                            >
                              <IconX className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Gespielte Zeit (Stunden) *</Label>
                            <Input
                              type="number"
                              value={session.duration || ""}
                              onChange={(e) =>
                                updateGamingSession(session.id, "duration", parseFloat(e.target.value) || 0)
                              }
                              placeholder="Stunden"
                              disabled={pending}
                              min="0"
                              step="0.5"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Datum (optional)</Label>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <Input
                                  type="number"
                                  value={session.year || ""}
                                  onChange={(e) => {
                                    const year = e.target.value ? parseInt(e.target.value) : undefined;
                                    updateGamingSession(session.id, "year", year);
                                    if (!year) {
                                      updateGamingSession(session.id, "month", undefined);
                                      updateGamingSession(session.id, "day", undefined);
                                    }
                                  }}
                                  placeholder="Jahr"
                                  disabled={pending}
                                  min="1900"
                                  max="2100"
                                />
                              </div>
                              <div>
                                <Input
                                  type="number"
                                  value={session.month || ""}
                                  onChange={(e) => {
                                    const month = e.target.value ? parseInt(e.target.value) : undefined;
                                    updateGamingSession(session.id, "month", month);
                                    if (!month) {
                                      updateGamingSession(session.id, "day", undefined);
                                    }
                                  }}
                                  placeholder="Monat"
                                  disabled={pending || !session.year}
                                  min="1"
                                  max="12"
                                />
                              </div>
                              <div>
                                <Input
                                  type="number"
                                  value={session.day || ""}
                                  onChange={(e) =>
                                    updateGamingSession(session.id, "day", e.target.value ? parseInt(e.target.value) : undefined)
                                  }
                                  placeholder="Tag"
                                  disabled={pending || !session.year || !session.month}
                                  min="1"
                                  max="31"
                                />
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Jahr ist erforderlich für Monat/Tag
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addGamingSession}
                      disabled={pending}
                      className="w-full"
                    >
                      <IconPlus className="h-3 w-3 mr-1" />
                      Weitere Spiel-Session hinzufügen
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {/* Andere Felder */}
            <div className="space-y-4">
              {availableFields.map((field) => {
                if (field.isSeasonConfig || field.isReadingSession || field.isGamingSession) return null;
                
                if (category === "series" && field.name === "Aktuelle Staffel") {
                  if (seasons.length === 0) {
                    return (
                      <div key={field.name} className="space-y-2">
                        <Label>Aktuelle Staffel</Label>
                        <p className="text-sm text-muted-foreground">
                          Bitte füge zuerst Staffeln hinzu
                        </p>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={field.name} className="space-y-2">
                      <Label htmlFor="current-season">Aktuelle Staffel</Label>
                      <Select
                        value={(categorySpecificFields["Aktuelle Staffel"] as string) || ""}
                        onValueChange={(value) => {
                          setCategorySpecificFields({
                            ...categorySpecificFields,
                            "Aktuelle Staffel": value,
                            "Aktuelle Folge": "",
                          });
                        }}
                        disabled={pending}
                      >
                        <SelectTrigger id="current-season">
                          <SelectValue placeholder="Staffel auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {seasons.map((season) => (
                            <SelectItem key={season.seasonNumber} value={season.seasonNumber.toString()}>
                              Staffel {season.seasonNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }
                
                if (category === "series" && field.name === "Aktuelle Folge") {
                  const currentSeasonNum = categorySpecificFields["Aktuelle Staffel"] as string;
                  
                  if (!currentSeasonNum) {
                    return (
                      <div key={field.name} className="space-y-2">
                        <Label>Aktuelle Folge</Label>
                        <p className="text-sm text-muted-foreground">
                          Bitte wähle zuerst eine Staffel aus
                        </p>
                      </div>
                    );
                  }
                  
                  const currentSeason = seasons.find(s => s.seasonNumber === parseInt(currentSeasonNum));
                  
                  if (!currentSeason || currentSeason.episodes === 0) {
                    return (
                      <div key={field.name} className="space-y-2">
                        <Label>Aktuelle Folge</Label>
                        <p className="text-sm text-muted-foreground">
                          Bitte trage die Anzahl der Folgen für Staffel {currentSeasonNum} ein
                        </p>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={field.name} className="space-y-2">
                      <Label htmlFor="current-episode">Aktuelle Folge</Label>
                      <Select
                        value={(categorySpecificFields["Aktuelle Folge"] as string) || ""}
                        onValueChange={(value) => {
                          setCategorySpecificFields({
                            ...categorySpecificFields,
                            "Aktuelle Folge": value,
                          });
                        }}
                        disabled={pending}
                      >
                        <SelectTrigger id="current-episode">
                          <SelectValue placeholder="Folge auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: currentSeason.episodes }, (_, i) => i + 1).map((episode) => (
                            <SelectItem key={episode} value={episode.toString()}>
                              Folge {episode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }
                
                return (
                  <div key={field.name} className="space-y-2">
                    <Label htmlFor={`field-${field.name}`}>{field.name}</Label>

                    {field.multi ? (
                      <div className="space-y-2">
                        {getMultiValues(field.name).length === 0 ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addMultiValue(field.name)}
                            disabled={pending}
                            className="w-full"
                          >
                            <IconPlus className="h-3 w-3 mr-1" />
                            {field.name} hinzufügen
                          </Button>
                        ) : (
                          <>
                            {getMultiValues(field.name).map((value, index) => (
                              <div key={index} className="flex gap-2">
                                <Input
                                  type={field.type === "number" ? "number" : "text"}
                                  value={value}
                                  onChange={(e) => {
                                    const newValue = e.target.value;
                                    if (field.type === "text" && !validateTextInput(newValue)) {
                                      return;
                                    }
                                    updateMultiValue(field.name, index, newValue);
                                  }}
                                  placeholder={`${field.name} ${index + 1}`}
                                  disabled={pending}
                                  min={field.type === "number" ? "0" : undefined}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeMultiValue(field.name, index)}
                                  disabled={pending}
                                >
                                  <IconX className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addMultiValue(field.name)}
                              disabled={pending}
                              className="w-full"
                            >
                              <IconPlus className="h-3 w-3 mr-1" />
                              Weiteren {field.name} hinzufügen
                            </Button>
                          </>
                        )}
                      </div>
                    ) : (
                      <Input
                        id={`field-${field.name}`}
                        type={field.type === "number" ? "number" : "text"}
                        value={(categorySpecificFields[field.name] as string) || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (field.type === "number") {
                            handleNumberInput(field.name, value);
                          } else if (field.type === "text") {
                            if (validateTextInput(value)) {
                              setCategorySpecificFields({
                                ...categorySpecificFields,
                                [field.name]: value,
                              });
                            }
                          } else {
                            setCategorySpecificFields({
                              ...categorySpecificFields,
                              [field.name]: value,
                            });
                          }
                        }}
                        disabled={pending}
                        min={field.type === "number" ? "0" : undefined}
                        placeholder={field.type === "number" ? "Nur Zahlen erlaubt" : ""}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Fields */}
          {customFields.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Zusätzliche Felder</h3>
              {customFields.map((field) => (
                <div key={field.id} className="flex gap-2 items-end">
                  <div className="flex-1 space-y-2">
                    <Label>Feldname</Label>
                    <Input
                      placeholder="z.B. Bewertung..."
                      value={field.name}
                      onChange={(e) =>
                        updateCustomField(field.id, "name", e.target.value)
                      }
                      disabled={pending}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>Wert</Label>
                    <Input
                      placeholder="z.B. 4/5 Sterne..."
                      value={field.value}
                      onChange={(e) =>
                        updateCustomField(field.id, "value", e.target.value)
                      }
                      disabled={pending}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCustomField(field.id)}
                    disabled={pending}
                  >
                    <IconX className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={addCustomField}
            className="w-full"
            disabled={pending}
          >
            <IconPlus className="mr-2 h-4 w-4" />
            Weiteres eigenes Feld hinzufügen
          </Button>

          {/* Status */}
          <div className="space-y-3 pt-4 border-t">
            <h3 className="text-sm font-medium">Status</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="completed"
                  checked={completed}
                  onCheckedChange={(checked) => {
                    setCompleted(checked as boolean);
                    if (checked) setAbandoned(false);
                  }}
                  disabled={pending}
                />
                <label htmlFor="completed" className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Abgeschlossen
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="abandoned"
                  checked={abandoned}
                  onCheckedChange={(checked) => {
                    setAbandoned(checked as boolean);
                    if (checked) setCompleted(false);
                  }}
                  disabled={pending}
                />
                <label htmlFor="abandoned" className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Abgebrochen
                </label>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={pending || !title} className="flex-1">
              {pending ? (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              ) : isEditing ? (
                <>
                  <IconDeviceFloppy className="mr-2 h-4 w-4" />
                  Speichern
                </>
              ) : (
                <>
                  <IconPlus className="mr-2 h-4 w-4" />
                  Erstellen
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={pending}>
              Abbrechen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}


/*
Die Änderungen hier müssen noch eingearbeitet werden, ich will aber nicht, dass der Code noch verloren geht:
ich hoffe die änderungen helfen was ;-;



// ...existing code...
  const table = dbSchema[category];
  if (!table) {
    throw new Error(`Unbekannte Kategorie: ${category}`);
  }
// ...existing code...
-  const tableName = table._.config.name;
+  // Fallback: benutze verschiedene mögliche Orte für den Tabellennamen
+  const tableName =
+    (table as any)?._?.config?.name ??
+    (table as any).tableName ??
+    (table as any).name;
  try {
    // 2. Schema-Introspektion: Aktuelle Spaltennamen abrufen
// ...existing code...

------

import { NextResponse } from "next/server";
import { createOrUpdateDynamicEntry } from "@/app/home/_components/sqlite-entries";
// WICHTIG: Ersetze den Import / die Initialisierung durch deine tatsächliche Drizzle DB-Instanz.
// Beispiel: import { db } from "@/lib/db";
import { getDrizzleDbInstance } from "@/lib/db"; // <-- anpassen / ersetzen

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // Hole hier deine echte Drizzle/SQLite-DB-Instanz.
    // Implementiere getDrizzleDbInstance() in src/lib/db.ts oder passe diesen Aufruf an.
    const db = getDrizzleDbInstance();

    const result = await createOrUpdateDynamicEntry(db, data);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("API /api/entries Fehler:", error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

------

// ...existing code...
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);

    const cleanedFields: Record<string, string | string[]> = {};
    Object.entries(categorySpecificFields).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        const filtered = value.filter(v => v.trim() !== "");
        if (filtered.length > 0) {
          cleanedFields[key] = filtered;
        }
      } else if (value && value.trim() !== "") {
        cleanedFields[key] = value;
      }
    });

    if (category === "series" && seasons.length > 0) {
      cleanedFields["Staffeln"] = JSON.stringify(seasons);
    }

    const entryData: MediaEntry = {
      id: isEditing ? editingEntry.id : crypto.randomUUID(),
      category,
      title,
      image,
      categorySpecificFields: cleanedFields,
      customFields: customFields.filter(f => f.name && f.value).map(({ name, value }) => ({ name, value })),
      readingSessions: category === "books" && readingSessions.length > 0 ? readingSessions : undefined,
      gamingSessions: category === "videogames" && gamingSessions.length > 0 ? gamingSessions : undefined,
      completed,
      abandoned,
      createdAt: isEditing ? editingEntry.createdAt : new Date(),
    };

    try {
      // POST an die Server-API, die createOrUpdateDynamicEntry verwendet
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entryData),
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        console.error("Server-Fehler beim Speichern:", json);
        throw new Error(json?.error || "Server-Fehler beim Speichern des Eintrags");
      }

      // UI-Callback erst nach erfolgreichem Speichern auf dem Server aufrufen
      if (isEditing) {
        onEntryUpdated(entryData);
      } else {
        onEntryCreated(entryData);
      }

      resetForm();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      alert("Fehler beim Speichern. Siehe Konsole für Details.");
    } finally {
      setPending(false);
    }
  };
// ...existing code...

*/
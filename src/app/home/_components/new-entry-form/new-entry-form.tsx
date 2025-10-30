"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconDeviceFloppy, IconPlus } from "@tabler/icons-react";
import { Loader2Icon } from "lucide-react";
import type { Category, MediaEntry } from "@/lib/types";
import { validateTextInput } from "./new-entry-form-utils";
import { useEntryFormState } from "./use-entry-form-state";
import { ImageUploadSection } from "./image-upload-section";
import { SeasonConfigSection } from "./season-config-section";
import { ReadingSessionsSection } from "./reading-sessions-section";
import { GamingSessionsSection } from "./gaming-sessions-section";
import { CategoryFieldsSection } from "./category-fields-section";
import { CustomFieldsSection } from "./custom-fields-section";
import { StatusSection } from "./status-section";
import { createEntry } from "@/actions/create-entry";
import { updateEntry } from "@/actions/update-entry";

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
  existingTitles = [],
}: NewEntryFormProps) {
  const {
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
    setTitle,
    setCompleted,
    setAbandoned,
    setCompletionCount,
    setPending,
    setIsExpanded,
    resetForm,
    handleImageUpload,
    removeImage,
    addSeason,
    updateSeasonEpisodes,
    removeSeason,
    addReadingSession,
    updateReadingSession,
    removeReadingSession,
    addGamingSession,
    updateGamingSession,
    removeGamingSession,
    addCustomField,
    updateCustomField,
    removeCustomField,
    updateCategoryField,
  } = useEntryFormState({ editingEntry, category });

  const isEditing = !!editingEntry;
  const titleExists = existingTitles.some(
    (t) => t.toLowerCase().trim() === title.toLowerCase().trim()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      alert("Bitte gib einen Titel ein.");
      setPending(false);
      return;
    }

    if (!isEditing && titleExists) {
      alert("Ein Eintrag mit diesem Titel existiert bereits.");
      setPending(false);
      return;
    }

    // Auto-increment completionCount logic
    const wasCompletedBefore = isEditing && editingEntry?.completed;
    const wasAbandonedBefore = isEditing && editingEntry?.abandoned;
    const isNowCompleted = completed;
    const isNowAbandoned = abandoned;

    const shouldIncrementCount =
      (!wasCompletedBefore && isNowCompleted) ||
      (!wasAbandonedBefore && isNowAbandoned);

    const finalCompletionCount = shouldIncrementCount
      ? (isEditing ? (editingEntry?.completionCount || 0) + 1 : 1)
      : completionCount >= 0
      ? completionCount
      : 0;

    // customFields als Array von {name, value} Objekten (ohne id)
    const customFieldsArray = customFields
      .filter((f) => f.name && f.value)
      .map(({ name, value }) => ({ name, value }));

    // Reading/Gaming Sessions ohne id
    const readingSessionsClean = readingSessions.map(({ id, ...rest }) => rest);
    const gamingSessionsClean = gamingSessions.map(({ id, ...rest }) => rest);

    // Seasons in categorySpecificFields speichern
    const fieldsWithSeasons = { ...categorySpecificFields };
    if (category === "series" && seasons.length > 0) {
      fieldsWithSeasons["Staffeln"] = JSON.stringify(seasons);
    }

    const entryData = {
      id: isEditing ? editingEntry.id : undefined,
      category,
      title: trimmedTitle,
      image: image || undefined,
      categorySpecificFields: fieldsWithSeasons,
      customFields: customFieldsArray,
      readingSessions:
        category === "books" && readingSessionsClean.length > 0
          ? readingSessionsClean
          : undefined,
      gamingSessions:
        category === "videogames" && gamingSessionsClean.length > 0
          ? gamingSessionsClean
          : undefined,
      completed,
      abandoned,
      completionCount: finalCompletionCount,
    };

    try {
      const result = isEditing
        ? await updateEntry({ ...entryData, id: editingEntry.id })
        : await createEntry(entryData);

      if (result.success) {
        const finalEntry: MediaEntry = {
          id: result.id!,
          title: trimmedTitle,
          category,
          image: image || undefined,
          categorySpecificFields: fieldsWithSeasons,
          customFields: customFieldsArray,
          readingSessions:
            category === "books" && readingSessionsClean.length > 0
              ? readingSessionsClean
              : undefined,
          gamingSessions:
            category === "videogames" && gamingSessionsClean.length > 0
              ? gamingSessionsClean
              : undefined,
          completed,
          abandoned,
          completionCount: finalCompletionCount,
          createdAt: isEditing ? editingEntry.createdAt : Date.now(),
        };

        if (isEditing) {
          onEntryUpdated(finalEntry);
        } else {
          onEntryCreated(finalEntry);
        }

        resetForm();
      } else {
        throw new Error(result.error || "Fehler beim Speichern");
      }
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      alert("Fehler beim Speichern. Siehe Konsole für Details.");
    } finally {
      setPending(false);
    }
  };

  // Wenn nicht im Edit-Modus und nicht expanded, zeige nur Button
  if (!isEditing && !isExpanded) {
    return (
      <Button
        onClick={() => setIsExpanded(true)}
        className="w-full"
        variant="outline"
      >
        <IconPlus className="mr-2 h-4 w-4" />
        Neuer Eintrag
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? "Eintrag bearbeiten" : "Neuer Eintrag"}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>
              Titel *
              {!isEditing && titleExists && (
                <span className="text-red-500 ml-2 text-sm">
                  (Titel existiert bereits!)
                </span>
              )}
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(validateTextInput(e.target.value))}
              placeholder="Titel eingeben"
              required
              disabled={pending}
              className={titleExists && !isEditing ? "border-red-500" : ""}
            />
          </div>

          <ImageUploadSection
            image={image}
            onImageUpload={handleImageUpload}
            onRemoveImage={removeImage}
          />

          {category === "series" && (
            <SeasonConfigSection
              seasons={seasons}
              onAddSeason={addSeason}
              onUpdateSeasonEpisodes={updateSeasonEpisodes}
              onRemoveSeason={removeSeason}
            />
          )}

          {category === "books" && (
            <ReadingSessionsSection
              readingSessions={readingSessions}
              onAddSession={addReadingSession}
              onUpdateSession={updateReadingSession}
              onRemoveSession={removeReadingSession}
              categorySpecificFields={categorySpecificFields}
              onUpdateCategoryField={updateCategoryField}
              pending={pending}
            />
          )}

          {category === "videogames" && (
            <GamingSessionsSection
              gamingSessions={gamingSessions}
              onAddSession={addGamingSession}
              onUpdateSession={updateGamingSession}
              onRemoveSession={removeGamingSession}
            />
          )}

          <CategoryFieldsSection
            category={category}
            categorySpecificFields={categorySpecificFields}
            onUpdateField={updateCategoryField}
            pending={pending}
          />

          <CustomFieldsSection
            customFields={customFields}
            onAddField={addCustomField}
            onUpdateField={updateCustomField}
            onRemoveField={removeCustomField}
            pending={pending}
          />

          <StatusSection
            completed={completed}
            abandoned={abandoned}
            completionCount={completionCount}
            onCompletedChange={setCompleted}
            onAbandonedChange={setAbandoned}
            onCompletionCountChange={setCompletionCount}
            pending={pending}
          />

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={pending || (!isEditing && titleExists)}
              className="flex-1"
            >
              {pending ? (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <IconDeviceFloppy className="mr-2 h-4 w-4" />
              )}
              {isEditing ? "Aktualisieren" : "Speichern"}
            </Button>
            {isEditing && onCancelEdit && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancelEdit}
                disabled={pending}
              >
                Abbrechen
              </Button>
            )}
            {!isEditing && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsExpanded(false)}
                disabled={pending}
              >
                Abbrechen
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

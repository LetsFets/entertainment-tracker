// components/new-entry-dialog.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { IconPlus, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { Loader2Icon } from "lucide-react";

type Category = "books" | "series" | "movies" | "videogames" | "podcasts";

interface CustomField {
  id: string;
  name: string;
  value: string;
}

export function NewEntryDialog({ 
  children, 
  category 
}: { 
  children: React.ReactNode;
  category: Category;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [completed, setCompleted] = useState(false);
  const [abandoned, setAbandoned] = useState(false);
  const [pending, setPending] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);

    // Hier kannst du die Daten an deine API senden
    const entryData = {
      category,
      title,
      customFields: customFields.filter(f => f.name && f.value),
      completed,
      abandoned,
    };

    try {
      // await createEntry(entryData);
      console.log(entryData);
      
      // Reset form
      setTitle("");
      setCustomFields([]);
      setCompleted(false);
      setAbandoned(false);
      setOpen(false);
    } catch (error) {
      console.error("Fehler beim Erstellen:", error);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent showCloseButton={!pending} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Neuer Eintrag</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} id="new-entry-form">
          <div className="space-y-4">
            {/* Pflichtfeld: Titel */}
            <Field>
              <FieldContent>
                <FieldLabel htmlFor="title-input">
                  Titel <span className="text-destructive">*</span>
                </FieldLabel>
              </FieldContent>
              <Input
                name="title"
                id="title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                minLength={1}
              />
            </Field>

            {/* Optionale Custom Fields */}
            {customFields.map((field) => (
              <div key={field.id} className="flex gap-2 items-end">
                <Field className="flex-1">
                  <FieldLabel>Feldname</FieldLabel>
                  <Input
                    placeholder="z.B. Seitenanzahl, Länge..."
                    value={field.name}
                    onChange={(e) =>
                      updateCustomField(field.id, "name", e.target.value)
                    }
                  />
                </Field>
                <Field className="flex-1">
                  <FieldLabel>Wert</FieldLabel>
                  <Input
                    placeholder="z.B. 350, 2h 30min..."
                    value={field.value}
                    onChange={(e) =>
                      updateCustomField(field.id, "value", e.target.value)
                    }
                  />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCustomField(field.id)}
                >
                  <IconX className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addCustomField}
              className="w-full"
            >
              <IconPlus className="mr-2 h-4 w-4" />
              Weiteres Feld hinzufügen
            </Button>

            {/* Status Checkboxen */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="completed"
                  checked={completed}
                  onCheckedChange={(checked) => {
                    setCompleted(checked as boolean);
                    if (checked) setAbandoned(false);
                  }}
                />
                <label
                  htmlFor="completed"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
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
                />
                <label
                  htmlFor="abandoned"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Abgebrochen
                </label>
              </div>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button type="submit" disabled={pending || !title} form="new-entry-form">
            {pending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <IconPlus />
            )}
            Erstellen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IconPlus, IconX } from "@tabler/icons-react";
import { validateTextInput } from "./new-entry-form-utils";
import type { CustomField } from "./new-entry-form-utils";

interface CustomFieldsSectionProps {
  customFields: CustomField[];
  onAddField: () => void;
  onUpdateField: (id: string, field: "name" | "value", value: string) => void;
  onRemoveField: (id: string) => void;
  pending: boolean;
}

export function CustomFieldsSection({
  customFields,
  onAddField,
  onUpdateField,
  onRemoveField,
  pending,
}: CustomFieldsSectionProps) {
  return (
    <div className="space-y-2">
      <Label>Zusätzliche Felder</Label>
      <div className="space-y-2">
        {customFields.map((field) => (
          <div key={field.id} className="flex gap-2">
            <Input
              placeholder="Feldname"
              value={field.name}
              onChange={(e) =>
                onUpdateField(field.id, "name", validateTextInput(e.target.value))
              }
              disabled={pending}
              className="flex-1"
            />
            <Input
              placeholder="Wert"
              value={field.value}
              onChange={(e) =>
                onUpdateField(field.id, "value", validateTextInput(e.target.value))
              }
              disabled={pending}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemoveField(field.id)}
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
          onClick={onAddField}
          disabled={pending}
          className="w-full"
        >
          <IconPlus className="h-3 w-3 mr-1" />
          Feld hinzufügen
        </Button>
      </div>
    </div>
  );
}

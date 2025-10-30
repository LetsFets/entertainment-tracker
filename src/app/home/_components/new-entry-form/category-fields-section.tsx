"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IconPlus, IconX } from "@tabler/icons-react";
import { validateTextInput, categoryFields } from "./new-entry-form-utils";
import type { Category } from "@/lib/types";

interface CategoryFieldsSectionProps {
  category: Category;
  categorySpecificFields: Record<string, string | string[]>;
  onUpdateField: (fieldName: string, value: string | string[]) => void;
  pending: boolean;
}

export function CategoryFieldsSection({
  category,
  categorySpecificFields,
  onUpdateField,
  pending,
}: CategoryFieldsSectionProps) {
  const handleMultiValueAdd = (fieldName: string) => {
    const current = categorySpecificFields[fieldName];
    const values = Array.isArray(current) ? current : [];
    onUpdateField(fieldName, [...values, ""]);
  };

  const handleMultiValueUpdate = (
    fieldName: string,
    index: number,
    value: string
  ) => {
    const current = categorySpecificFields[fieldName];
    const values = Array.isArray(current) ? [...current] : [];
    values[index] = validateTextInput(value);
    onUpdateField(fieldName, values);
  };

  const handleMultiValueRemove = (fieldName: string, index: number) => {
    const current = categorySpecificFields[fieldName];
    const values = Array.isArray(current) ? [...current] : [];
    values.splice(index, 1);
    onUpdateField(fieldName, values);
  };

  return (
    <>
      {categoryFields[category]
        .filter(
          (field) =>
            !field.isSeasonConfig &&
            !field.isReadingSession &&
            !field.isGamingSession &&
            // Seitenanzahl für books ausschließen (wird in ReadingSessionsSection gerendert)
            !(category === "books" && field.name === "Seitenanzahl")
        )
        .map((field) => {
          if (field.multi) {
            const values = Array.isArray(categorySpecificFields[field.name])
              ? (categorySpecificFields[field.name] as string[])
              : [];

            return (
              <div key={field.name} className="space-y-2">
                <Label>{field.name}</Label>
                <div className="space-y-2">
                  {values.map((value, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        type="text"
                        value={value}
                        onChange={(e) =>
                          handleMultiValueUpdate(
                            field.name,
                            index,
                            e.target.value
                          )
                        }
                        placeholder={field.name}
                        disabled={pending}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMultiValueRemove(field.name, index)}
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
                    onClick={() => handleMultiValueAdd(field.name)}
                    disabled={pending}
                    className="w-full"
                  >
                    <IconPlus className="h-3 w-3 mr-1" />
                    {field.name} hinzufügen
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <div key={field.name} className="space-y-2">
              <Label>{field.name}</Label>
              <Input
                type={field.type === "number" ? "number" : "text"}
                value={
                  typeof categorySpecificFields[field.name] === "string"
                    ? categorySpecificFields[field.name]
                    : ""
                }
                onChange={(e) => {
                  const value =
                    field.type === "number"
                      ? e.target.value
                      : validateTextInput(e.target.value);
                  onUpdateField(field.name, value);
                }}
                placeholder={field.name}
                disabled={pending}
                min={field.type === "number" ? "0" : undefined}
              />
            </div>
          );
        })}
    </>
  );
}

"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { IconPlus, IconX } from "@tabler/icons-react";
import { getDaysInMonth } from "./new-entry-form-utils";
import type { GamingSessionWithId } from "./new-entry-form-utils";

interface GamingSessionsSectionProps {
  gamingSessions: GamingSessionWithId[];
  onAddSession: () => void;
  onUpdateSession: (
    id: string,
    field: keyof GamingSessionWithId,
    value: number | undefined
  ) => void;
  onRemoveSession: (id: string) => void;
}

export function GamingSessionsSection({
  gamingSessions,
  onAddSession,
  onUpdateSession,
  onRemoveSession,
}: GamingSessionsSectionProps) {
  const currentYear = new Date().getFullYear();

  const months = [
    { value: 1, label: "Januar" },
    { value: 2, label: "Februar" },
    { value: 3, label: "März" },
    { value: 4, label: "April" },
    { value: 5, label: "Mai" },
    { value: 6, label: "Juni" },
    { value: 7, label: "Juli" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "Oktober" },
    { value: 11, label: "November" },
    { value: 12, label: "Dezember" },
  ];

  return (
    <div className="space-y-2">
      <Label>Spiel-Sessions</Label>
      {gamingSessions.length === 0 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddSession}
          className="w-full"
        >
          <IconPlus className="h-3 w-3 mr-1" />
          Erste Spiel-Session hinzufügen
        </Button>
      ) : (
        <div className="space-y-3">
          {gamingSessions.map((session, index) => {
            const maxDay =
              session.year && session.month
                ? getDaysInMonth(session.year, session.month)
                : 31;

            return (
              <Card key={session.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Session {index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveSession(session.id)}
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
                        onUpdateSession(
                          session.id,
                          "duration",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="Stunden"
                      min="0"
                      step="0.5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Datum (optional)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={session.year || ""}
                        onChange={(e) => {
                          const year = e.target.value
                            ? parseInt(e.target.value)
                            : undefined;
                          onUpdateSession(session.id, "year", year);
                          if (!year) {
                            onUpdateSession(session.id, "month", undefined);
                            onUpdateSession(session.id, "day", undefined);
                          }
                        }}
                        placeholder="Jahr"
                        min="1900"
                        max="2100"
                        className="w-24"
                      />
                      <Select
                        value={session.month ? String(session.month) : ""}
                        onValueChange={(value) => {
                          const month = value ? parseInt(value) : undefined;
                          onUpdateSession(session.id, "month", month);
                          if (!month) {
                            onUpdateSession(session.id, "day", undefined);
                          }
                        }}
                        disabled={!session.year}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Monat" />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((m) => (
                            <SelectItem key={m.value} value={String(m.value)}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={session.day ? String(session.day) : ""}
                        onValueChange={(value) => {
                          const day = value ? parseInt(value) : undefined;
                          onUpdateSession(session.id, "day", day);
                        }}
                        disabled={!session.year || !session.month}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue placeholder="Tag" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: maxDay }, (_, i) => i + 1).map(
                            (day) => (
                              <SelectItem key={day} value={String(day)}>
                                {day}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Jahr ist erforderlich für Monat/Tag
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddSession}
            className="w-full"
          >
            <IconPlus className="h-3 w-3 mr-1" />
            Weitere Spiel-Session hinzufügen
          </Button>
        </div>
      )}
    </div>
  );
}

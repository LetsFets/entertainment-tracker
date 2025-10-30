"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface StatusSectionProps {
  completed: boolean;
  abandoned: boolean;
  completionCount: number;
  onCompletedChange: (checked: boolean) => void;
  onAbandonedChange: (checked: boolean) => void;
  onCompletionCountChange: (count: number) => void;
  pending: boolean;
}

export function StatusSection({
  completed,
  abandoned,
  completionCount,
  onCompletedChange,
  onAbandonedChange,
  onCompletionCountChange,
  pending,
}: StatusSectionProps) {
  return (
    <>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="completed"
          checked={completed}
          onCheckedChange={onCompletedChange}
          disabled={pending}
        />
        <Label
          htmlFor="completed"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Abgeschlossen
        </Label>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="abandoned"
          checked={abandoned}
          onCheckedChange={onAbandonedChange}
          disabled={pending}
        />
        <Label
          htmlFor="abandoned"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Abgebrochen
        </Label>
      </div>

      <div className="space-y-2">
        <Label>Wie oft abgeschlossen/abgebrochen</Label>
        <Input
          type="number"
          min="0"
          value={completionCount || ""}
          onChange={(e) => onCompletionCountChange(Number(e.target.value))}
          placeholder="Anzahl"
          disabled={pending}
        />
      </div>
    </>
  );
}

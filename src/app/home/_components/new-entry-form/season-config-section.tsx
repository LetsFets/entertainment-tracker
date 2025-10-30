"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconPlus, IconX } from "@tabler/icons-react";

interface SeasonConfigSectionProps {
  seasons: { seasonNumber: number; episodes: number }[];
  onAddSeason: () => void;
  onUpdateSeasonEpisodes: (seasonNumber: number, episodes: number) => void;
  onRemoveSeason: (seasonNumber: number) => void;
}

export function SeasonConfigSection({
  seasons,
  onAddSeason,
  onUpdateSeasonEpisodes,
  onRemoveSeason,
}: SeasonConfigSectionProps) {
  return (
    <div className="space-y-2">
      <Label>Staffeln</Label>
      {seasons.length === 0 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddSeason}
          className="w-full"
        >
          <IconPlus className="h-3 w-3 mr-1" />
          Erste Staffel hinzufügen
        </Button>
      ) : (
        <div className="space-y-2">
          {seasons.map((season) => (
            <div key={season.seasonNumber} className="flex items-center gap-2">
              <span className="w-20 text-sm">Staffel {season.seasonNumber}</span>
              <Input
                type="number"
                min="0"
                value={season.episodes || ""}
                onChange={(e) =>
                  onUpdateSeasonEpisodes(
                    season.seasonNumber,
                    Number(e.target.value)
                  )
                }
                placeholder="Folgen"
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onRemoveSeason(season.seasonNumber)}
              >
                <IconX className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={onAddSeason}>
            <IconPlus className="mr-2 h-4 w-4" />
            Staffel hinzufügen
          </Button>
        </div>
      )}
    </div>
  );
}

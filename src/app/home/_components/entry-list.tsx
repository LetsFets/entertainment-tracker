"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconTrash, IconEdit } from "@tabler/icons-react";
import type { MediaEntry } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

interface EntryListProps {
  entries: MediaEntry[];
  onDelete: (id: string) => void;
  onEdit: (entry: MediaEntry) => void;
}

// Helper für case-insensitive Lookup
function getField(entry: MediaEntry, fieldName: string): string | string[] | undefined {
  const key = Object.keys(entry.categorySpecificFields).find(
    k => k.toLowerCase() === fieldName.toLowerCase()
  );
  return key ? entry.categorySpecificFields[key] : undefined;
}

export function EntryList({ entries, onDelete, onEdit }: EntryListProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Noch keine Einträge vorhanden. Erstelle deinen ersten Eintrag!
          </p>
        </CardContent>
      </Card>
    );
  }

  const calculateSeriesProgress = (entry: MediaEntry): { text: string; percentage: number; seasonsInfo: string } | null => {
    const seasonsData = getField(entry, "Staffeln");
    const currentSeason = getField(entry, "Aktuelle Staffel");
    const currentEpisode = getField(entry, "Aktuelle Folge");
    
    if (!seasonsData || !currentSeason || !currentEpisode ||
        Array.isArray(seasonsData) || Array.isArray(currentSeason) || Array.isArray(currentEpisode)) {
      return null;
    }
    
    try {
      const seasons: { seasonNumber: number; episodes: number }[] = JSON.parse(seasonsData as string);
      const currentS = parseInt(currentSeason as string);
      const currentE = parseInt(currentEpisode as string);
      
      if (!Array.isArray(seasons) || seasons.length === 0 || currentS <= 0 || currentE < 0) {
        return null;
      }
      
      const totalEpisodes = seasons.reduce((sum, s) => sum + s.episodes, 0);
      
      let watchedEpisodes = 0;
      for (let i = 0; i < currentS - 1 && i < seasons.length; i++) {
        watchedEpisodes += seasons[i].episodes;
      }
      watchedEpisodes += currentE;
      
      const percentage = totalEpisodes > 0 ? Math.min((watchedEpisodes / totalEpisodes) * 100, 100) : 0;
      
      const seasonsInfo = seasons.map(s => `S${s.seasonNumber}: ${s.episodes} Folgen`).join(" • ");
      
      return {
        text: `Staffel ${currentS}, Folge ${currentE}`,
        percentage,
        seasonsInfo
      };
    } catch (e) {
      console.error("Fehler beim Parsen der Staffel-Daten", e);
      return null;
    }
  };

  const calculatePodcastProgress = (entry: MediaEntry): { text: string; percentage: number } | null => {
    const totalEpisodes = getField(entry, "Folgen gesamt");
    const currentEpisode = getField(entry, "Aktuelle Folge");
    
    if (totalEpisodes && currentEpisode && !Array.isArray(totalEpisodes) && !Array.isArray(currentEpisode)) {
      const total = parseInt(totalEpisodes as string);
      const current = parseInt(currentEpisode as string);
      
      if (total > 0 && current >= 0) {
        const percentage = Math.min((current / total) * 100, 100);
        return {
          text: `Folge ${current} von ${total}`,
          percentage
        };
      }
    }
    
    return null;
  };

  const calculateBookProgress = (entry: MediaEntry): { 
    text: string; 
    segments: { pages: number; percentage: number; color: string; info: string }[];
    totalPercentage: number;
    sessionsInfo: string;
  } | null => {
    const totalPages = getField(entry, "Seitenanzahl");
    const sessions = entry.readingSessions;
    
    if (!totalPages || Array.isArray(totalPages) || !sessions || sessions.length === 0) {
      return null;
    }
    
    const total = parseInt(totalPages as string);
    
    if (total <= 0) return null;
    
    const colors = [
      "bg-blue-400",
      "bg-purple-400",
      "bg-teal-400",
      "bg-amber-400",
      "bg-rose-400",
      "bg-emerald-400",
      "bg-indigo-400",
      "bg-cyan-400",
      "bg-orange-400",
      "bg-fuchsia-400",
    ];
    
    const readPages = sessions.reduce((sum, s) => sum + s.pages, 0);
    const totalPercentage = Math.min((readPages / total) * 100, 100);
    
    const segments = sessions.map((s, index) => {
      const percentage = (s.pages / total) * 100;
      const color = colors[index % colors.length];
      
      let dateStr = "";
      if (s.year) {
        dateStr = ` (${s.year}`;
        if (s.month) {
          dateStr += `-${String(s.month).padStart(2, '0')}`;
          if (s.day) {
            dateStr += `-${String(s.day).padStart(2, '0')}`;
          }
        }
        dateStr += ")";
      }
      
      return {
        pages: s.pages,
        percentage,
        color,
        info: `${s.pages} Seiten${dateStr}`
      };
    });
    
    const sessionsInfo = segments.map(s => s.info).join(" • ");
    
    return {
      text: `${readPages} von ${total} Seiten`,
      segments,
      totalPercentage,
      sessionsInfo
    };
  };

  const calculateTimeBar = (entry: MediaEntry): { 
    totalTime: number;
    segments: { duration: number; color: string; info: string }[];
    sessionsInfo: string;
  } | null => {
    const sessions = entry.gamingSessions;
    if (!sessions || sessions.length === 0) return null;
    
    const colors = [
      "bg-blue-400","bg-purple-400","bg-teal-400","bg-amber-400","bg-rose-400",
      "bg-emerald-400","bg-indigo-400","bg-cyan-400","bg-orange-400","bg-fuchsia-400"
    ];
    
    const totalTime = sessions.reduce((sum, s) => sum + Number(s.duration), 0);
    
    const segments = sessions.map((s, idx) => {
      let dateStr = "";
      if (s.year) {
        dateStr = ` (${s.year}`;
        if (s.month) {
          dateStr += `-${String(s.month).padStart(2, '0')}`;
          if (s.day) {
            dateStr += `-${String(s.day).padStart(2, '0')}`;
          }
        }
        dateStr += ")";
      }
      return {
        duration: s.duration,
        color: colors[idx % colors.length],
        info: `${s.duration} h${dateStr}`
      };
    });
    
    const sessionsInfo = segments.map(s => s.info).join(" • ");
    return { totalTime, segments, sessionsInfo };
  };

  return (
    <div className="space-y-4">
      {entries.map((entry) => {
        const seriesProgress = entry.category === "series" ? calculateSeriesProgress(entry) : null;
        const podcastProgress = entry.category === "podcasts" ? calculatePodcastProgress(entry) : null;
        const bookProgress = entry.category === "books" ? calculateBookProgress(entry) : null;
        const progress = seriesProgress || podcastProgress;
        const timeBar = entry.category === "videogames" ? calculateTimeBar(entry) : null;
        
        return (
          <Card key={entry.id}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg mb-4">{entry.title}</CardTitle>
                  
                  {progress && (
                    <div className="mb-4 space-y-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Fortschritt</span>
                        <span>{progress.text} ({Math.round(progress.percentage)}%)</span>
                      </div>
                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                      {seriesProgress && (
                        <div className="text-xs text-muted-foreground pt-1">
                          {seriesProgress.seasonsInfo}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {bookProgress && (
                    <div className="mb-4 space-y-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Lesefortschritt</span>
                        <span>{bookProgress.text} ({Math.round(bookProgress.totalPercentage)}%)</span>
                      </div>
                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden flex">
                        {bookProgress.segments.map((segment, idx) => (
                          <div
                            key={idx}
                            className={`h-full ${segment.color} transition-all duration-300`}
                            style={{ width: `${segment.percentage}%` }}
                            title={segment.info}
                          />
                        ))}
                      </div>
                      <div className="space-y-1 pt-1">
                        {bookProgress.segments.map((segment, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className={`w-3 h-3 rounded-sm ${segment.color}`} />
                            <span>{segment.info}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {timeBar && (
                    <div className="mb-4 space-y-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Spielzeit</span>
                        <span>{timeBar.totalTime} Stunden</span>
                      </div>
                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden flex">
                        {timeBar.segments.map((segment, idx) => (
                          <div
                            key={idx}
                            className={`h-full ${segment.color} transition-all duration-300`}
                            style={{
                              width: `${
                                timeBar.totalTime === 0 ? 0 : (segment.duration / timeBar.totalTime) * 100
                              }%`
                            }}
                            title={segment.info}
                          />
                        ))}
                      </div>
                      <div className="space-y-1 pt-1">
                        {timeBar.segments.map((segment, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className={`w-3 h-3 rounded-sm ${segment.color}`} />
                            <span>{segment.info}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2 text-sm">
                    {Object.entries(entry.categorySpecificFields).map(([key, value]) => {
                      if (!value) return null;
                      
                      if (["Staffeln", "staffeln", "Aktuelle Staffel", "aktuelle staffel", "Aktuelle Folge", "aktuelle folge", "Folgen gesamt", "folgen gesamt", "Seitenanzahl", "seitenanzahl", "Spielzeit", "spielzeit"].includes(key.toLowerCase())) {
                        return null;
                      }
                      
                      if (Array.isArray(value)) {
                        return (
                          <div key={key} className="flex flex-wrap gap-1 items-center">
                            <span className="text-muted-foreground mr-2">{key}:</span>
                            {value.map((item, idx) => (
                              <Badge key={idx} variant="secondary">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        );
                      }
                      
                      return (
                        <p key={key} className="text-muted-foreground">
                          {key}: {value}
                        </p>
                      );
                    })}
                    
                    {entry.customFields.map((field, idx) => (
                      <p key={idx} className="text-muted-foreground">
                        {field.name}: {field.value}
                      </p>
                    ))}
                    
                    <p className="pt-2">
                      Status: <span className={
                        entry.completed ? "text-green-600" :
                        entry.abandoned ? "text-red-600" :
                        "text-blue-600"
                      }>
                        {entry.completed ? "Abgeschlossen" :
                         entry.abandoned ? "Abgebrochen" :
                         "In Bearbeitung"}
                      </span>
                    </p>
                  </div>
                </div>
                
                {entry.image && (
                  <div className="relative w-24 h-36 sm:w-32 sm:h-48 rounded overflow-hidden border flex-shrink-0">
                    <Image
                      src={entry.image}
                      alt={entry.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(entry)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <IconEdit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(entry.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <IconTrash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}
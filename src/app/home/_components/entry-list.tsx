"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { IconTrash, IconEdit } from "@tabler/icons-react"
import type { MediaEntry, Category } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import {
  formatFieldName,
  calculateSeriesProgress,
  calculatePodcastProgress,
  calculateBookProgress,
  calculateMovieProgress,
  calculateTimeBar,
} from "@/lib/media-utils"

interface EntryListProps {
  entries: MediaEntry[]
  onDelete: (id: string, category: Category) => void
  onEdit: (entry: MediaEntry) => void
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
    )
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => {
        const seriesProgress = entry.category === "series" ? calculateSeriesProgress(entry) : null
        const podcastProgress = entry.category === "podcasts" ? calculatePodcastProgress(entry) : null
        const bookProgress = entry.category === "books" ? calculateBookProgress(entry) : null
        const movieProgress = entry.category === "movies" ? calculateMovieProgress(entry) : null
        const progress = seriesProgress || podcastProgress
        const timeBar = entry.category === "videogames" ? calculateTimeBar(entry) : null

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
                        <span>
                          {progress.text} ({Math.round(progress.percentage)}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                      {seriesProgress && (
                        <div className="text-xs text-muted-foreground pt-1">{seriesProgress.seasonsInfo}</div>
                      )}
                    </div>
                  )}

                  {bookProgress && (
                    <div className="mb-4 space-y-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Lesefortschritt</span>
                        <span>
                          {bookProgress.text} ({Math.round(bookProgress.totalPercentage)}%)
                        </span>
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

                  {movieProgress && !entry.completed && !entry.abandoned && (
                    <div className="mb-4 space-y-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Filmfortschritt</span>
                        <span>
                          {movieProgress.text} ({Math.round(movieProgress.percentage)}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${movieProgress.percentage}%` }}
                        />
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
                              width: `${timeBar.totalTime === 0 ? 0 : (segment.duration / timeBar.totalTime) * 100}%`,
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
                    {Object.entries(entry.categorySpecificFields)
                      .filter(([key, value]) => {
                        if (!value || (Array.isArray(value) && value.length === 0)) return false

                        const displayName = formatFieldName(key)
                        const purelyProgressFields = ["Folgen gesamt", "Spielzeit", "Staffeln"]
                        if (purelyProgressFields.includes(displayName)) return false

                        return true
                      })
                      .map(([key, value]) => {
                        const displayName = formatFieldName(key)

                        if (displayName === "Seitenanzahl") {
                          return (
                            <p key={key} className="text-muted-foreground">
                              {displayName}: {value} Seiten
                            </p>
                          )
                        }

                        if (displayName === "Laufzeit") {
                          return (
                            <p key={key} className="text-muted-foreground">
                              {displayName}: {value} Minuten
                            </p>
                          )
                        }

                        if (Array.isArray(value)) {
                          return (
                            <div key={key} className="flex flex-wrap gap-1 items-center">
                              <span className="text-muted-foreground mr-2">{displayName}:</span>
                              {value.map((item, idx) => (
                                <Badge key={idx} variant="secondary">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          )
                        }

                        return (
                          <p key={key} className="text-muted-foreground">
                            {displayName}: {value}
                          </p>
                        )
                      })
                      .filter(Boolean)}

                    {entry.customFields.map((field, idx) => (
                      <p key={idx} className="text-muted-foreground">
                        {formatFieldName(field.name)}: {field.value}
                      </p>
                    ))}

                    <p className="pt-2">
                      Status:{" "}
                      <span
                        className={
                          entry.completed ? "text-green-600" : entry.abandoned ? "text-red-600" : "text-blue-600"
                        }
                      >
                        {entry.completed ? "Abgeschlossen" : entry.abandoned ? "Abgebrochen" : "Aktiv"}
                      </span>
                      {(entry.completionCount ?? 0) > 0 && (
                        <span className="ml-2 text-sm text-gray-500">({entry.completionCount}x abgeschlossen)</span>
                      )}
                    </p>
                  </div>
                </div>

                {entry.image && (
                  <div className="relative w-20 h-32 sm:w-24 sm:h-36 md:w-28 md:h-42 lg:w-32 lg:h-48 rounded overflow-hidden border flex-shrink-0">
                    <Image
                      src={entry.image || "/placeholder.svg"}
                      alt={entry.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 80px, (max-width: 768px) 96px, (max-width: 1024px) 112px, 128px"
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
                    onClick={() => onDelete(entry.id, entry.category)}
                    className="text-destructive hover:text-destructive"
                  >
                    <IconTrash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        )
      })}
    </div>
  )
}
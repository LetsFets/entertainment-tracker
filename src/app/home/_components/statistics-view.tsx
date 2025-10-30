"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MediaEntry } from "@/lib/types";
import { useMemo } from "react";

interface StatisticsViewProps {
  entries: MediaEntry[];
}

interface TimeStats {
  totalMinutes: number;
  completedMinutes: number;
  inProgressMinutes: number;
}

interface GenreStats {
  [genre: string]: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parst Staffel-Daten aus verschiedenen möglichen Formaten
 * Unterstützt: JSON String, Array
 */
function parseSeasons(
  staffelnData: string | string[] | unknown
): { seasonNumber: number; episodes: number }[] {
  if (!staffelnData) return [];

  if (typeof staffelnData === "string") {
    try {
      return JSON.parse(staffelnData);
    } catch {
      return [];
    }
  }

  if (Array.isArray(staffelnData)) {
    return (staffelnData as any[]).map((item, idx) => {
      if (
        typeof item === "object" &&
        item !== null &&
        "seasonNumber" in item &&
        "episodes" in item
      ) {
        return {
          seasonNumber: Number(item.seasonNumber) || idx + 1,
          episodes: Number(item.episodes) || 0,
        };
      }
      return { seasonNumber: idx + 1, episodes: 0 };
    });
  }

  return [];
}

/**
 * Extrahiert Genre-Daten aus Entry und aktualisiert Statistiken
 */
function collectGenres(
  entry: MediaEntry,
  allGenres: GenreStats,
  categoryGenres: GenreStats
): void {
  const genres = entry.categorySpecificFields["Genre"];
  if (Array.isArray(genres)) {
    genres.forEach((genre) => {
      if (genre.trim()) {
        allGenres[genre] = (allGenres[genre] || 0) + 1;
        categoryGenres[genre] = (categoryGenres[genre] || 0) + 1;
      }
    });
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StatisticsView({ entries }: StatisticsViewProps) {
  const stats = useMemo(() => {
    const seriesStats: TimeStats = {
      totalMinutes: 0,
      completedMinutes: 0,
      inProgressMinutes: 0,
    };
    const movieStats: TimeStats = {
      totalMinutes: 0,
      completedMinutes: 0,
      inProgressMinutes: 0,
    };
    const gameStats: TimeStats = {
      totalMinutes: 0,
      completedMinutes: 0,
      inProgressMinutes: 0,
    };
    const podcastStats: TimeStats = {
      totalMinutes: 0,
      completedMinutes: 0,
      inProgressMinutes: 0,
    };

    let totalPages = 0;
    let completedPages = 0;
    let inProgressPages = 0;

    const allGenres: GenreStats = {};
    const genresByCategory: { [key: string]: GenreStats } = {
      books: {},
      series: {},
      movies: {},
      videogames: {},
      podcasts: {},
    };

    // ========================================================================
    // SERIEN
    // ========================================================================
    entries
      .filter((e) => e.category === "series")
      .forEach((entry) => {
        const avgLength = parseInt(
          (entry.categorySpecificFields[
            "Durchschnittliche Folgenlänge"
          ] as string) || "0"
        );
        const staffelnData = entry.categorySpecificFields["Staffeln"];
        const currentSeason = parseInt(
          (entry.categorySpecificFields["Aktuelle Staffel"] as string) || "0"
        );
        const currentEpisode = parseInt(
          (entry.categorySpecificFields["Aktuelle Folge"] as string) || "0"
        );
        const completionCount = Number(entry.completionCount) || 0;

        if (!staffelnData || avgLength <= 0) return;

        const seasons = parseSeasons(staffelnData);
        if (seasons.length === 0) return;

        const totalEpisodes = seasons.reduce(
          (sum, s) => sum + (s.episodes || 0),
          0
        );

        // Berechne geschaute Folgen bis zur aktuellen Position
        let watchedEpisodes = 0;
        for (const season of seasons) {
          if (season.seasonNumber < currentSeason) {
            watchedEpisodes += season.episodes;
          } else if (season.seasonNumber === currentSeason) {
            watchedEpisodes += currentEpisode;
          }
        }

        const totalTime = totalEpisodes * avgLength;
        const watchedTime = watchedEpisodes * avgLength;

        // Frühere Durchgänge (bereits abgeschlossen)
        if (completionCount > 0) {
          seriesStats.completedMinutes += totalTime * completionCount;
          seriesStats.totalMinutes += totalTime * completionCount;
        }

        // Aktueller Durchgang
        if (entry.completed) {
          seriesStats.completedMinutes += totalTime;
          seriesStats.totalMinutes += totalTime;
        } else if (!entry.abandoned && watchedEpisodes > 0) {
          // WICHTIG: Nur geschaute Zeit zählt für laufende Serien
          seriesStats.inProgressMinutes += watchedTime;
          seriesStats.totalMinutes += watchedTime;
        }

        collectGenres(entry, allGenres, genresByCategory.series);
      });

    // ========================================================================
    // FILME
    // ========================================================================
    entries
      .filter((e) => e.category === "movies")
      .forEach((entry) => {
        const runtime = parseInt(
          (entry.categorySpecificFields["Laufzeit"] as string) || "0"
        );
        const currentMinute = parseInt(
          (entry.categorySpecificFields["Aktuelle Minute"] as string) || "0"
        );
        const completionCount = Number(entry.completionCount) || 0;

        if (runtime > 0) {
          // Frühere Durchgänge
          if (completionCount > 0) {
            movieStats.completedMinutes += runtime * completionCount;
            movieStats.totalMinutes += runtime * completionCount;
          }

          // Aktueller Durchgang
          if (!entry.completed && !entry.abandoned && currentMinute > 0) {
            // WICHTIG: Nur aktuelle Minute, nicht gesamte Laufzeit
            movieStats.inProgressMinutes += currentMinute;
            movieStats.totalMinutes += currentMinute;
          } else if (entry.completed) {
            movieStats.completedMinutes += runtime;
            movieStats.totalMinutes += runtime;
          }
        }

        collectGenres(entry, allGenres, genresByCategory.movies);
      });

    // ========================================================================
    // PODCASTS
    // ========================================================================
    entries
      .filter((e) => e.category === "podcasts")
      .forEach((entry) => {
        const totalEpisodes = parseInt(
          (entry.categorySpecificFields["Folgen gesamt"] as string) || "0"
        );
        const currentEpisode = parseInt(
          (entry.categorySpecificFields["Aktuelle Folge"] as string) || "0"
        );
        const currentMinute = parseInt(
          (entry.categorySpecificFields["Minute"] as string) || "0"
        );
        const avgLength = parseInt(
          (entry.categorySpecificFields["Durchschn. Länge"] as string) || "0"
        );
        const completionCount = Number(entry.completionCount) || 0;

        if (avgLength > 0 && totalEpisodes > 0) {
          const totalTime = totalEpisodes * avgLength;

          // Frühere Durchgänge
          if (completionCount > 0) {
            podcastStats.completedMinutes += totalTime * completionCount;
            podcastStats.totalMinutes += totalTime * completionCount;
          }

          // Aktueller Durchgang
          if (!entry.completed && !entry.abandoned && currentEpisode > 0) {
            // Abgeschlossene Folgen (currentEpisode - 1) + aktuelle Minute
            const completedEpisodesTime =
              Math.max(0, currentEpisode - 1) * avgLength;
            const currentProgress = currentMinute;
            const totalListened = completedEpisodesTime + currentProgress;
            podcastStats.inProgressMinutes += totalListened;
            podcastStats.totalMinutes += totalListened;
          } else if (entry.completed) {
            podcastStats.completedMinutes += totalTime;
            podcastStats.totalMinutes += totalTime;
          }
        }

        collectGenres(entry, allGenres, genresByCategory.podcasts);
      });

    // ========================================================================
    // VIDEOSPIELE
    // ========================================================================
    entries
      .filter((e) => e.category === "videogames")
      .forEach((entry) => {
        const basePlaytime = parseInt(
          (entry.categorySpecificFields["Spielzeit"] as string) || "0"
        );
        const sessions = entry.gamingSessions;
        const completionCount = Number(entry.completionCount) || 0;

        const sessionTime =
          sessions && sessions.length > 0
            ? sessions.reduce(
                (sum: number, s: { duration: number }) => sum + s.duration,
                0
              )
            : 0;

        const totalHours = basePlaytime + sessionTime;
        const minutes = totalHours * 60;

        if (minutes > 0) {
          // Frühere Durchgänge
          if (completionCount > 0) {
            gameStats.completedMinutes += minutes * completionCount;
            gameStats.totalMinutes += minutes * completionCount;
          }

          // Aktueller Durchgang
          if (!entry.completed) {
            gameStats.inProgressMinutes += minutes;
            gameStats.totalMinutes += minutes;
          } else {
            gameStats.completedMinutes += minutes;
            gameStats.totalMinutes += minutes;
          }
        }

        collectGenres(entry, allGenres, genresByCategory.videogames);
      });

    // ========================================================================
    // BÜCHER
    // ========================================================================
    entries
      .filter((e) => e.category === "books")
      .forEach((entry) => {
        const pages = parseInt(
          (entry.categorySpecificFields["Seitenanzahl"] as string) || "0"
        );
        const completionCount = Number(entry.completionCount) || 0;

        if (entry.readingSessions && entry.readingSessions.length > 0) {
          const readPages = entry.readingSessions.reduce(
            (sum: number, s: { pages: number }) => sum + s.pages,
            0
          );

          // Frühere Durchgänge
          if (completionCount > 0) {
            completedPages += pages * completionCount;
            totalPages += pages * completionCount;
          }

          // Aktueller Durchgang
          if (!entry.completed && !entry.abandoned) {
            inProgressPages += readPages;
            totalPages += readPages;
          } else if (entry.completed) {
            completedPages += pages;
            totalPages += pages;
          }
        } else if (entry.completed && pages > 0) {
          const multiplier = completionCount > 0 ? completionCount : 1;
          completedPages += pages * multiplier;
          totalPages += pages * multiplier;
        }

        collectGenres(entry, allGenres, genresByCategory.books);
      });

    return {
      seriesStats,
      movieStats,
      gameStats,
      podcastStats,
      totalPages,
      completedPages,
      inProgressPages,
      allGenres,
      genresByCategory,
    };
  }, [entries]);

  // ==========================================================================
  // RENDERING HELPERS
  // ==========================================================================

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h ${mins}m`;
    }
    return `${hours}h ${mins}m`;
  };

  /**
   * Wiederverwendbare Komponente für Zeit-Statistiken
   */
  const TimeStatsCard = ({
    title,
    stats,
  }: {
    title: string;
    stats: TimeStats;
  }) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Gesamt:</span>
          <span className="font-semibold">
            {formatTime(stats.totalMinutes)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Abgeschlossen:</span>
          <span className="font-semibold text-green-600">
            {formatTime(stats.completedMinutes)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Laufend:</span>
          <span className="font-semibold text-blue-600">
            {formatTime(stats.inProgressMinutes)}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  const GenreChart = ({
    genres,
    title,
  }: {
    genres: GenreStats;
    title: string;
  }) => {
    const sortedGenres = Object.entries(genres)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const totalCount = sortedGenres.reduce((sum, [, count]) => sum + count, 0);

    const colors = [
      "bg-blue-500",
      "bg-purple-500",
      "bg-teal-500",
      "bg-amber-500",
      "bg-rose-500",
      "bg-emerald-500",
      "bg-indigo-500",
      "bg-cyan-500",
      "bg-orange-500",
      "bg-fuchsia-500",
    ];

    if (sortedGenres.length === 0) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-8 bg-secondary rounded-full overflow-hidden flex mb-4">
            {sortedGenres.map(([genre, count], index) => {
              const percentage = (count / totalCount) * 100;
              return (
                <div
                  key={genre}
                  className={`h-full ${colors[index % colors.length]} transition-all duration-300`}
                  style={{ width: `${percentage}%` }}
                  title={`${genre}: ${count} (${percentage.toFixed(1)}%)`}
                />
              );
            })}
          </div>

          <div className="space-y-2">
            {sortedGenres.map(([genre, count], index) => {
              const percentage = (count / totalCount) * 100;
              return (
                <div
                  key={genre}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded ${colors[index % colors.length]}`}
                    />
                    <span className="font-medium">{genre}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {count} ({percentage.toFixed(1)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Statistiken</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <TimeStatsCard title="Serien" stats={stats.seriesStats} />
        <TimeStatsCard title="Filme" stats={stats.movieStats} />
        <TimeStatsCard title="Videospiele" stats={stats.gameStats} />
        <TimeStatsCard title="Podcasts" stats={stats.podcastStats} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bücher</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gesamt:</span>
              <span className="font-semibold">
                {stats.totalPages.toLocaleString()} Seiten
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Abgeschlossen:</span>
              <span className="font-semibold text-green-600">
                {stats.completedPages.toLocaleString()} Seiten
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Laufend:</span>
              <span className="font-semibold text-blue-600">
                {stats.inProgressPages.toLocaleString()} Seiten
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GenreChart genres={stats.allGenres} title="Top Genres (Gesamt)" />
        <GenreChart
          genres={stats.genresByCategory.books}
          title="Top Genres (Bücher)"
        />
        <GenreChart
          genres={stats.genresByCategory.series}
          title="Top Genres (Serien)"
        />
        <GenreChart
          genres={stats.genresByCategory.movies}
          title="Top Genres (Filme)"
        />
        <GenreChart
          genres={stats.genresByCategory.videogames}
          title="Top Genres (Videospiele)"
        />
        <GenreChart
          genres={stats.genresByCategory.podcasts}
          title="Top Genres (Podcasts)"
        />
      </div>
    </div>
  );
}

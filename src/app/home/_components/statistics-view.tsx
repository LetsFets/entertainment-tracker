"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export function StatisticsView({ entries }: StatisticsViewProps) {
  const stats = useMemo(() => {

  // 1. SERIEN
  const seriesStats: TimeStats = { totalMinutes: 0, completedMinutes: 0, inProgressMinutes: 0 };

  entries.filter(e => e.category === "series").forEach(entry => {
    const avgLength = parseInt(entry.categorySpecificFields["Durchschnittliche Folgenlänge"] as string || "0");
    const staffelnData = entry.categorySpecificFields["Staffeln"];
    const currentSeason = parseInt(entry.categorySpecificFields["Aktuelle Staffel"] as string || "0");
    const currentEpisode = parseInt(entry.categorySpecificFields["Aktuelle Folge"] as string || "0");
    const completionCount = Number(entry.completionCount) || 0;

    if (staffelnData && typeof staffelnData === "string" && avgLength > 0) {
      try {
        const seasons = JSON.parse(staffelnData);
        const totalEpisodes = seasons.reduce((sum: number, s: any) => sum + s.episodes, 0);
        
        let watchedEpisodes = 0;
        for (let i = 0; i < currentSeason - 1 && i < seasons.length; i++) {
          watchedEpisodes += seasons[i].episodes;
        }
        watchedEpisodes += currentEpisode;
        
        const totalTime = totalEpisodes * avgLength;
        const watchedTime = watchedEpisodes * avgLength;
        
        // Frühere Durchgänge
        if (completionCount > 0) {
          seriesStats.completedMinutes += totalTime * completionCount;
          seriesStats.totalMinutes += totalTime * completionCount;
        }
        
        // Aktueller Durchgang
        if (!entry.completed && !entry.abandoned) {
          seriesStats.inProgressMinutes += watchedTime;
          seriesStats.totalMinutes += watchedTime;
        } else if (entry.completed) {
          seriesStats.completedMinutes += totalTime;
          seriesStats.totalMinutes += totalTime;
        }
      } catch (e) {
        console.error("Parse error", e);
      }
    }
  });

  // 2. FILME
  const movieStats: TimeStats = { totalMinutes: 0, completedMinutes: 0, inProgressMinutes: 0 };

  entries.filter(e => e.category === "movies").forEach(entry => {
    const runtime = parseInt(entry.categorySpecificFields["Laufzeit"] as string || "0");
    const currentMinute = parseInt(entry.categorySpecificFields["Aktuelle Minute"] as string || "0");
    const completionCount = Number(entry.completionCount) || 0;

    if (runtime > 0) {
      // Frühere Durchgänge
      if (completionCount > 0) {
        movieStats.completedMinutes += runtime * completionCount;
        movieStats.totalMinutes += runtime * completionCount;
      }
      
      // Aktueller Durchgang
      if (!entry.completed && !entry.abandoned && currentMinute > 0) {
        movieStats.inProgressMinutes += currentMinute;
        movieStats.totalMinutes += currentMinute;
      } else if (entry.completed) {
        movieStats.completedMinutes += runtime;
        movieStats.totalMinutes += runtime;
      }
    }
  });

  // 3. PODCASTS
  const podcastStats: TimeStats = { totalMinutes: 0, completedMinutes: 0, inProgressMinutes: 0 };

  entries.filter(e => e.category === "podcasts").forEach(entry => {
    const totalEpisodes = parseInt(entry.categorySpecificFields["Folgen gesamt"] as string || "0");
    const currentEpisode = parseInt(entry.categorySpecificFields["Aktuelle Folge"] as string || "0");
    const currentMinute = parseInt(entry.categorySpecificFields["Minute"] as string || "0");
    const avgLength = parseInt(entry.categorySpecificFields["Durchschn. Länge"] as string || "0");
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
        const completedEpisodesTime = Math.max(0, currentEpisode - 1) * avgLength;
        const currentProgress = currentMinute;
        const totalListened = completedEpisodesTime + currentProgress;
        podcastStats.inProgressMinutes += totalListened;
        podcastStats.totalMinutes += totalListened;
      } else if (entry.completed) {
        podcastStats.completedMinutes += totalTime;
        podcastStats.totalMinutes += totalTime;
      }
    }
  });

  // 4. VIDEOSPIELE
  const gameStats: TimeStats = { totalMinutes: 0, completedMinutes: 0, inProgressMinutes: 0 };

  entries.filter(e => e.category === "videogames").forEach(entry => {
    const basePlaytime = parseInt(entry.categorySpecificFields["Spielzeit"] as string || "0");
    const sessions = entry.gamingSessions;
    const completionCount = Number(entry.completionCount) || 0;

    const sessionTime = sessions && sessions.length > 0
      ? sessions.reduce((sum: number, s: { duration: number }) => sum + s.duration, 0)
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
  });

  // 5. BÜCHER
  let totalPages = 0;
  let completedPages = 0;
  let inProgressPages = 0;

  entries.filter(e => e.category === "books").forEach(entry => {
    const pages = parseInt(entry.categorySpecificFields["Seitenanzahl"] as string || "0");
    const completionCount = Number(entry.completionCount) || 0;
    
    if (entry.readingSessions && entry.readingSessions.length > 0) {
      const readPages = entry.readingSessions.reduce((sum: number, s: { pages: number }) => sum + s.pages, 0);

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
  });
    
  // Genre-Statistiken (alle Kategorien)
  const allGenres: GenreStats = {};
  const genresByCategory: { [key: string]: GenreStats } = {
    books: {},
    series: {},
    movies: {},
    videogames: {},
    podcasts: {}
  };
  
  entries.forEach(entry => {
    const genres = entry.categorySpecificFields["Genre"];
    if (Array.isArray(genres)) {
      genres.forEach(genre => {
        if (genre.trim()) {
          allGenres[genre] = (allGenres[genre] || 0) + 1;
          genresByCategory[entry.category][genre] = (genresByCategory[entry.category][genre] || 0) + 1;
        }
      });
    }
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
      genresByCategory
    };
  }, [entries]);
  
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
  
  const GenreChart = ({ genres, title }: { genres: GenreStats; title: string }) => {
    const sortedGenres = Object.entries(genres).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const totalCount = sortedGenres.reduce((sum, [, count]) => sum + count, 0);
    
    const colors = [
      "bg-blue-500", "bg-purple-500", "bg-teal-500", "bg-amber-500", "bg-rose-500",
      "bg-emerald-500", "bg-indigo-500", "bg-cyan-500", "bg-orange-500", "bg-fuchsia-500"
    ];
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Dynamische Bar mit Anteilen */}
          <div className="w-full h-8 bg-secondary rounded-full overflow-hidden flex mb-4">
            {sortedGenres.map(([genre, count], index) => {
              const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
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
          
          {/* Legende */}
          <div className="space-y-2">
            {sortedGenres.map(([genre, count], index) => {
              const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
              return (
                <div key={genre} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded ${colors[index % colors.length]}`} />
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
      
      {/* Gesamtübersicht */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Serien</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gesamt:</span>
              <span className="font-semibold">{formatTime(stats.seriesStats.totalMinutes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Abgeschlossen:</span>
              <span className="font-semibold text-green-600">{formatTime(stats.seriesStats.completedMinutes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Laufend:</span>
              <span className="font-semibold text-blue-600">{formatTime(stats.seriesStats.inProgressMinutes)}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gesamt:</span>
              <span className="font-semibold">{formatTime(stats.movieStats.totalMinutes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Abgeschlossen:</span>
              <span className="font-semibold text-green-600">{formatTime(stats.movieStats.completedMinutes)}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Videospiele</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gesamt:</span>
              <span className="font-semibold">{formatTime(stats.gameStats.totalMinutes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Abgeschlossen:</span>
              <span className="font-semibold text-green-600">{formatTime(stats.gameStats.completedMinutes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Laufend:</span>
              <span className="font-semibold text-blue-600">{formatTime(stats.gameStats.inProgressMinutes)}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Podcasts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gesamt:</span>
              <span className="font-semibold">{formatTime(stats.podcastStats.totalMinutes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Abgeschlossen:</span>
              <span className="font-semibold text-green-600">{formatTime(stats.podcastStats.completedMinutes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Laufend:</span>
              <span className="font-semibold text-blue-600">{formatTime(stats.podcastStats.inProgressMinutes)}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bücher</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gesamt:</span>
              <span className="font-semibold">{stats.totalPages.toLocaleString()} Seiten</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Abgeschlossen:</span>
              <span className="font-semibold text-green-600">{stats.completedPages.toLocaleString()} Seiten</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Laufend:</span>
              <span className="font-semibold text-blue-600">{stats.inProgressPages.toLocaleString()} Seiten</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Genre-Statistiken */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GenreChart genres={stats.allGenres} title="Top Genres (Gesamt)" />
        <GenreChart genres={stats.genresByCategory.books} title="Top Genres (Bücher)" />
        <GenreChart genres={stats.genresByCategory.series} title="Top Genres (Serien)" />
        <GenreChart genres={stats.genresByCategory.movies} title="Top Genres (Filme)" />
        <GenreChart genres={stats.genresByCategory.videogames} title="Top Genres (Videospiele)" />
        <GenreChart genres={stats.genresByCategory.podcasts} title="Top Genres (Podcasts)" />
      </div>
    </div>
  );
}
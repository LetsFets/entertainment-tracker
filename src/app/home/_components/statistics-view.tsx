"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MediaEntry } from "./new-entry-form";
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

interface DateActivity {
  date: string;
  count: number;
  type: 'pages' | 'minutes';
}

export function StatisticsView({ entries }: StatisticsViewProps) {
  const stats = useMemo(() => {
    // Serien-Statistiken
    const seriesStats: TimeStats = { totalMinutes: 0, completedMinutes: 0, inProgressMinutes: 0 };
    
    entries.filter(e => e.category === "series").forEach(entry => {
      const avgLength = parseInt(entry.categorySpecificFields["Durchschnittliche Folgenlänge"] as string || "0");
      const staffelnData = entry.categorySpecificFields["Staffeln"];
      const currentSeason = parseInt(entry.categorySpecificFields["Aktuelle Staffel"] as string || "0");
      const currentEpisode = parseInt(entry.categorySpecificFields["Aktuelle Folge"] as string || "0");
      
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
          
          if (entry.completed) {
            seriesStats.completedMinutes += totalTime;
          } else {
            seriesStats.inProgressMinutes += watchedTime;
          }
          seriesStats.totalMinutes += entry.completed ? totalTime : watchedTime;
        } catch (e) {
          console.error("Parse error", e);
        }
      }
    });
    
    // Film-Statistiken
    const movieStats: TimeStats = { totalMinutes: 0, completedMinutes: 0, inProgressMinutes: 0 };
    
    entries.filter(e => e.category === "movies").forEach(entry => {
      const runtime = parseInt(entry.categorySpecificFields["Laufzeit"] as string || "0");
      
      if (entry.completed && runtime > 0) {
        movieStats.completedMinutes += runtime;
        movieStats.totalMinutes += runtime;
      }
    });
    
    // Videospiel-Statistiken
    const gameStats: TimeStats = { totalMinutes: 0, completedMinutes: 0, inProgressMinutes: 0 };
    
    entries.filter(e => e.category === "videogames").forEach(entry => {
      if (entry.gamingSessions && entry.gamingSessions.length > 0) {
        const totalHours = entry.gamingSessions.reduce((sum, s) => sum + s.duration, 0);
        const minutes = totalHours * 60;
        
        if (entry.completed) {
          gameStats.completedMinutes += minutes;
        } else {
          gameStats.inProgressMinutes += minutes;
        }
        gameStats.totalMinutes += minutes;
      }
    });
    
    // Podcast-Statistiken
    const podcastStats: TimeStats = { totalMinutes: 0, completedMinutes: 0, inProgressMinutes: 0 };
    
    entries.filter(e => e.category === "podcasts").forEach(entry => {
      const totalEpisodes = parseInt(entry.categorySpecificFields["Folgen gesamt"] as string || "0");
      const currentEpisode = parseInt(entry.categorySpecificFields["Aktuelle Folge"] as string || "0");
      const avgLength = parseInt(entry.categorySpecificFields["Durchschn. Länge"] as string || "0");
      
      if (avgLength > 0) {
        const listenedTime = currentEpisode * avgLength;
        const totalTime = totalEpisodes * avgLength;
        
        if (entry.completed) {
          podcastStats.completedMinutes += totalTime;
          podcastStats.totalMinutes += totalTime;
        } else {
          podcastStats.inProgressMinutes += listenedTime;
          podcastStats.totalMinutes += listenedTime;
        }
      }
    });
    
    // Buch-Statistiken
    let totalPages = 0;
    let completedPages = 0;
    let inProgressPages = 0;
    
    entries.filter(e => e.category === "books").forEach(entry => {
      const pages = parseInt(entry.categorySpecificFields["Seitenanzahl"] as string || "0");
      
      if (entry.readingSessions && entry.readingSessions.length > 0) {
        const readPages = entry.readingSessions.reduce((sum, s) => sum + s.pages, 0);
        
        if (entry.completed) {
          completedPages += pages;
          totalPages += pages;
        } else {
          inProgressPages += readPages;
          totalPages += readPages;
        }
      } else if (entry.completed && pages > 0) {
        completedPages += pages;
        totalPages += pages;
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
    
    // Aktivste Tage (Reading/Gaming Sessions mit Datum)
    const dateActivity: { [date: string]: DateActivity } = {};
    
    entries.forEach(entry => {
      if (entry.readingSessions) {
        entry.readingSessions.forEach(session => {
          if (session.year) {
            const dateKey = `${session.year}-${String(session.month || 1).padStart(2, '0')}-${String(session.day || 1).padStart(2, '0')}`;
            if (!dateActivity[dateKey]) {
              dateActivity[dateKey] = { date: dateKey, count: 0, type: 'pages' };
            }
            dateActivity[dateKey].count += session.pages;
          }
        });
      }
      
      if (entry.gamingSessions) {
        entry.gamingSessions.forEach(session => {
          if (session.year) {
            const dateKey = `${session.year}-${String(session.month || 1).padStart(2, '0')}-${String(session.day || 1).padStart(2, '0')}`;
            if (!dateActivity[dateKey]) {
              dateActivity[dateKey] = { date: dateKey, count: 0, type: 'minutes' };
            }
            dateActivity[dateKey].count += session.duration * 60;
          }
        });
      }
    });
    
    const mostActiveDay = Object.values(dateActivity).sort((a, b) => b.count - a.count)[0];
    
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
      mostActiveDay
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
    const maxCount = Math.max(...sortedGenres.map(([, count]) => count), 1);
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedGenres.map(([genre, count]) => (
              <div key={genre} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{genre}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
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
        
        {stats.mostActiveDay && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aktivster Tag</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Datum:</span>
                <span className="font-semibold">{stats.mostActiveDay.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Aktivität:</span>
                <span className="font-semibold">
                  {stats.mostActiveDay.type === 'pages'
                    ? `${stats.mostActiveDay.count} Seiten`
                    : formatTime(stats.mostActiveDay.count)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
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
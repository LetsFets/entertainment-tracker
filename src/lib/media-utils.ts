import type { MediaEntry } from "@/lib/types"

// Formatiert einen DB-Schlüssel (z.B. "aktuelle_folge") in einen Anzeigenamen
export function formatFieldName(key: string): string {
  return key
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

// Helper für case-insensitive Lookup
export function getField(entry: MediaEntry, fieldName: string): string | string[] | undefined {
  const key = Object.keys(entry.categorySpecificFields).find((k) => k.toLowerCase() === fieldName.toLowerCase())
  return key ? entry.categorySpecificFields[key] : undefined
}

// Berechnet Tage im Monat (mit Schaltjahr-Prüfung)
export function getDaysInMonth(year: number, month: number): number {
  if (month === 2) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

// Normalisiert Staffel-Daten aus verschiedenen Formaten
export function normalizeSeasons(input: any): { seasonNumber: number; episodes: number }[] {
  if (!input) return []

  if (Array.isArray(input)) {
    return input.map((item, idx) => {
      if (item && typeof item === "object" && "seasonNumber" in item && "episodes" in item) {
        return {
          seasonNumber: Number(item.seasonNumber) || idx + 1,
          episodes: Number(item.episodes) || 0,
        }
      }
      if (typeof item === "string") {
        try {
          const parsed = JSON.parse(item)
          if (parsed && typeof parsed === "object" && "seasonNumber" in parsed) {
            return {
              seasonNumber: Number(parsed.seasonNumber) || idx + 1,
              episodes: Number(parsed.episodes) || 0,
            }
          }
        } catch {
          const num = Number(item)
          return { seasonNumber: idx + 1, episodes: isNaN(num) ? 0 : num }
        }
      }
      return { seasonNumber: idx + 1, episodes: 0 }
    })
  }

  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input)
      if (Array.isArray(parsed)) return normalizeSeasons(parsed)
    } catch {}
  }

  return []
}

// Progress-Berechnungen
export interface ProgressResult {
  text: string
  percentage: number
  additionalInfo?: string
}

export interface BookProgressResult {
  text: string
  segments: { pages: number; percentage: number; color: string; info: string }[]
  totalPercentage: number
  sessionsInfo: string
}

export interface TimeBarResult {
  totalTime: number
  basePlaytime: number
  segments: { duration: number; color: string; info: string }[]
  sessionsInfo: string
}

const SEGMENT_COLORS = [
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
]

export function calculateSeriesProgress(entry: MediaEntry): (ProgressResult & { seasonsInfo: string }) | null {
  const seasonsData = getField(entry, "Staffeln")
  const currentSeason = getField(entry, "Aktuelle Staffel")
  const currentEpisode = getField(entry, "Aktuelle Folge")

  if (
    !seasonsData ||
    !currentSeason ||
    !currentEpisode ||
    Array.isArray(currentSeason) ||
    Array.isArray(currentEpisode)
  ) {
    return null
  }

  try {
    const seasons = normalizeSeasons(seasonsData)
    const currentS = Number.parseInt(currentSeason as string)
    const currentE = Number.parseInt(currentEpisode as string)

    if (seasons.length === 0 || currentS <= 0 || currentE < 0) {
      return null
    }

    const totalEpisodes = seasons.reduce((sum, s) => sum + s.episodes, 0)

    let watchedEpisodes = 0
    for (let i = 0; i < currentS - 1 && i < seasons.length; i++) {
      watchedEpisodes += seasons[i].episodes
    }
    watchedEpisodes += currentE

    const percentage = totalEpisodes > 0 ? Math.min((watchedEpisodes / totalEpisodes) * 100, 100) : 0
    const seasonsInfo = seasons.map((s) => `S${s.seasonNumber}: ${s.episodes} Folgen`).join(" • ")

    return {
      text: `Staffel ${currentS}, Folge ${currentE}`,
      percentage,
      seasonsInfo,
    }
  } catch (e) {
    console.error("Fehler beim Verarbeiten der Staffel-Daten", e)
    return null
  }
}

export function calculatePodcastProgress(entry: MediaEntry): ProgressResult | null {
  const totalEpisodes = getField(entry, "Folgen gesamt")
  const currentEpisode = getField(entry, "Aktuelle Folge")
  const currentMinute = getField(entry, "Aktuelle Minute")

  if (totalEpisodes && currentEpisode && !Array.isArray(totalEpisodes) && !Array.isArray(currentEpisode)) {
    const total = Number.parseInt(totalEpisodes as string)
    const current = Number.parseInt(currentEpisode as string)

    if (total > 0 && current >= 0) {
      const percentage = Math.min((current / total) * 100, 100)

      let text = `Folge ${current} von ${total}`
      if (currentMinute && !Array.isArray(currentMinute)) {
        const minute = Number.parseInt(currentMinute as string)
        if (minute > 0) {
          text += ` (bei Min. ${minute})`
        }
      }

      return { text, percentage }
    }
  }

  return null
}

export function calculateBookProgress(entry: MediaEntry): BookProgressResult | null {
  const totalPages = getField(entry, "Seitenanzahl")
  const sessions = entry.readingSessions

  if (!totalPages || Array.isArray(totalPages) || !sessions || sessions.length === 0) {
    return null
  }

  const total = Number.parseInt(totalPages as string)

  if (total <= 0) return null

  const readPages = sessions.reduce((sum, s) => sum + s.pages, 0)
  const totalPercentage = Math.min((readPages / total) * 100, 100)

  const segments = sessions.map((s, index) => {
    const percentage = (s.pages / total) * 100
    const color = SEGMENT_COLORS[index % SEGMENT_COLORS.length]

    let dateStr = ""
    if (s.year) {
      dateStr = ` (${s.year}`
      if (s.month) {
        dateStr += `-${String(s.month).padStart(2, "0")}`
        if (s.day) {
          dateStr += `-${String(s.day).padStart(2, "0")}`
        }
      }
      dateStr += ")"
    }

    return {
      pages: s.pages,
      percentage,
      color,
      info: `${s.pages} Seiten${dateStr}`,
    }
  })

  const sessionsInfo = segments.map((s) => s.info).join(" • ")

  return {
    text: `${readPages} von ${total} Seiten`,
    segments,
    totalPercentage,
    sessionsInfo,
  }
}

export function calculateMovieProgress(entry: MediaEntry): ProgressResult | null {
  const totalMinutes = getField(entry, "Laufzeit")
  const currentMinute = getField(entry, "Aktuelle Minute")

  if (!totalMinutes || !currentMinute || Array.isArray(totalMinutes) || Array.isArray(currentMinute)) {
    return null
  }

  const total = Number.parseInt(totalMinutes as string)
  const current = Number.parseInt(currentMinute as string)

  if (total > 0 && current >= 0 && current <= total) {
    const percentage = (current / total) * 100
    return {
      text: `${current} von ${total} Minuten`,
      percentage,
    }
  }

  return null
}

export function calculateTimeBar(entry: MediaEntry): TimeBarResult | null {
  const basePlaytime = getField(entry, "Spielzeit")
  const sessions = entry.gamingSessions

  if (!basePlaytime && (!sessions || sessions.length === 0)) {
    return null
  }

  const base = basePlaytime && !Array.isArray(basePlaytime) ? Number(basePlaytime) : 0
  const sessionTime = sessions ? sessions.reduce((sum, s) => sum + Number(s.duration), 0) : 0
  const totalTime = base + sessionTime

  const segments: { duration: number; color: string; info: string }[] = []

  if (base > 0) {
    segments.push({
      duration: base,
      color: "bg-gray-400",
      info: `${base} h (Basis-Spielzeit)`,
    })
  }

  if (sessions && sessions.length > 0) {
    sessions.forEach((s, idx) => {
      let dateStr = ""
      if (s.year) {
        dateStr = ` (${s.year}`
        if (s.month) {
          dateStr += `-${String(s.month).padStart(2, "0")}`
          if (s.day) {
            dateStr += `-${String(s.day).padStart(2, "0")}`
          }
        }
        dateStr += ")"
      }
      segments.push({
        duration: s.duration,
        color: SEGMENT_COLORS[idx % SEGMENT_COLORS.length],
        info: `${s.duration} h${dateStr}`,
      })
    })
  }

  const sessionsInfo = segments.map((s) => s.info).join(" • ")
  return { totalTime, basePlaytime: base, segments, sessionsInfo }
}
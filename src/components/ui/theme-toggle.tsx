"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Verhindert Hydration-Fehler
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const isDark = theme === "dark"

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative inline-flex h-10 w-20 items-center rounded-full bg-gray-200 dark:bg-gray-700 transition-colors"
      aria-label="Toggle theme"
    >
      {/* Sun Icon - links */}
      <Sun className="absolute left-2 h-5 w-5 text-yellow-500 transition-opacity" 
           style={{ opacity: isDark ? 0.5 : 1 }} />
      
      {/* Moon Icon - rechts */}
      <Moon className="absolute right-2 h-5 w-5 text-blue-400 transition-opacity" 
            style={{ opacity: isDark ? 1 : 0.5 }} />
      
      {/* Sliding Circle */}
      <span
        className={`inline-block h-8 w-8 transform rounded-full bg-white shadow-lg transition-transform ${
          isDark ? "translate-x-11" : "translate-x-1"
        }`}
      />
    </button>
  )
}

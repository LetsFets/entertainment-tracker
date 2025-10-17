"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Optional: API-Call an dein Backend
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      // Lokale Daten löschen
      localStorage.clear();
      // oder spezifisch: localStorage.removeItem("authToken");

      // Zur Login-Seite weiterleiten
      router.push("/login");
    } catch (error) {
      console.error("Logout fehlgeschlagen:", error);
      // Fallback: Trotzdem zur Login-Seite
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 lg:px-6">
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Meine App</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors text-foreground"
              aria-label="Abmelden"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm font-medium">Abmelden</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 lg:p-6">
        {/* Dein Content */}
      </main>
    </div>
  );
}

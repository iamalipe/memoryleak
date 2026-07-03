// theme-store.ts
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export type Theme = "dark" | "light" | "system" | "cyberpunk"

type ThemeState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "app-ui-theme",
      storage: createJSONStorage(() => localStorage),
    }
  )
)

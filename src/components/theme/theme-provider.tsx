// theme-provider.tsx
import { useThemeStore, type Theme } from "@/components/theme/theme-store" // Import from the new file
import { useEffect } from "react"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  // Use the store hook we created in the other file
  const { theme } = useThemeStore()

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark", "cyberpunk")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  return <>{children}</>
}

// Export a wrapper hook for convenience (optional, but keeps your API consistent)
// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const { theme, setTheme } = useThemeStore()
  return { theme, setTheme }
}

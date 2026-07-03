import { useTheme } from "@/components/theme/theme-provider"
import type { Theme } from "@/components/theme/theme-store"
import { cn } from "@/lib/utils"
import { Check, Moon, Sun, Monitor, Sparkles } from "lucide-react"

const THEMES: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: "light", label: "Light", icon: <Sun className="h-4 w-4" /> },
  { value: "dark", label: "Dark", icon: <Moon className="h-4 w-4" /> },
  { value: "system", label: "System", icon: <Monitor className="h-4 w-4" /> },
  { value: "cyberpunk", label: "Cyberpunk", icon: <Sparkles className="h-4 w-4" /> },
]

export const SettingGeneral = () => {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-6">
      {/* Theme Selection */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Appearance</h3>
          <p className="text-xs text-muted-foreground">
            Choose your preferred color theme
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {THEMES.map((t) => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={cn(
                "relative flex flex-col items-center gap-2 rounded-lg border p-3 transition-all",
                "hover:bg-muted/50",
                theme === t.value
                  ? "border-primary bg-primary/5"
                  : "border-border"
              )}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                {t.icon}
              </div>
              <span className="text-xs font-medium">{t.label}</span>
              {theme === t.value && (
                <Check className="absolute top-2 right-2 h-3.5 w-3.5 text-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* About Section */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">About</h3>
        <div className="rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Version</span>
            <span className="text-xs font-mono">0.0.1</span>
          </div>
        </div>
      </div>
    </div>
  )
}

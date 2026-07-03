import { Layers, Palette, Sparkles, Smile, type LucideIcon } from "lucide-react";
import { STYLE_OPTIONS, type SVGStyle } from "../types";
import { cn } from "@/lib/utils";

interface StyleSelectorProps {
  value: SVGStyle;
  onChange: (style: SVGStyle) => void;
}

const iconMap: Record<string, LucideIcon> = {
  Square: Layers,
  Palette: Palette,
  Zap: Sparkles,
  Smile: Smile,
};

export default function StyleSelector({ value, onChange }: StyleSelectorProps) {
  return (
    <div className="space-y-4" data-cy="style-selector-section">
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">2. Select Style</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {STYLE_OPTIONS.map((option) => {
          const IconComponent = iconMap[option.icon] || Sparkles;
          const isSelected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              data-cy={`style-select-${option.value}`}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex flex-col items-start gap-2 rounded-xl border p-3.5 text-left transition-all duration-300 cursor-pointer relative overflow-hidden group select-none",
                isSelected
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                  : "border-border bg-background/30 hover:border-muted-foreground/30 hover:bg-muted/10"
              )}
            >
              {/* Micro-glow background effect on hover/select */}
              <div
                className={cn(
                  "absolute inset-0 -z-10 bg-radial from-primary/10 via-transparent to-transparent opacity-0 transition-opacity duration-300",
                  isSelected ? "opacity-100" : "group-hover:opacity-60"
                )}
              />

              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg border transition-transform duration-300",
                  isSelected
                    ? "border-primary/20 bg-primary/25 text-primary scale-110"
                    : "border-border bg-background/50 text-muted-foreground group-hover:scale-105 group-hover:text-foreground"
                )}
              >
                <IconComponent className="h-4 w-4" />
              </div>

              <div className="space-y-0.5 mt-1">
                <span
                  className={cn(
                    "text-xs font-semibold block transition-colors",
                    isSelected ? "text-foreground font-bold" : "text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  {option.label}
                </span>
                <span className="text-[10px] text-muted-foreground leading-normal line-clamp-2">
                  {option.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

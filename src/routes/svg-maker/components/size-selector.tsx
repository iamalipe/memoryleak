import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Maximize2 } from "lucide-react";
import { SIZE_PRESETS, type SVGSize } from "../types";

interface SizeSelectorProps {
  value: SVGSize;
  onChange: (size: SVGSize) => void;
}

export default function SizeSelector({ value, onChange }: SizeSelectorProps) {
  const [customWidth, setCustomWidth] = useState(String(value.width));
  const [customHeight, setCustomHeight] = useState(String(value.height));

  const [prevWidth, setPrevWidth] = useState(value.width);
  const [prevHeight, setPrevHeight] = useState(value.height);

  if (value.width !== prevWidth || value.height !== prevHeight) {
    setCustomWidth(String(value.width));
    setCustomHeight(String(value.height));
    setPrevWidth(value.width);
    setPrevHeight(value.height);
  }

  const handlePresetClick = (w: number, h: number) => {
    onChange({ width: w, height: h });
  };

  const handleWidthChange = (val: string) => {
    setCustomWidth(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 16 && num <= 2048) {
      onChange({ width: num, height: value.height });
    }
  };

  const handleHeightChange = (val: string) => {
    setCustomHeight(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 16 && num <= 2048) {
      onChange({ width: value.width, height: num });
    }
  };

  const handleBlur = () => {
    // Clamp values on blur
    let w = parseInt(customWidth, 10);
    let h = parseInt(customHeight, 10);
    
    if (isNaN(w) || w < 16) w = 16;
    if (w > 2048) w = 2048;
    if (isNaN(h) || h < 16) h = 16;
    if (h > 2048) h = 2048;

    setCustomWidth(String(w));
    setCustomHeight(String(h));
    onChange({ width: w, height: h });
  };

  return (
    <div className="space-y-4" data-cy="size-selector-section">
      <div className="flex items-center gap-2">
        <Maximize2 className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">1. Select Size (Dimensions)</span>
      </div>

      {/* Preset grid */}
      <div className="grid grid-cols-2 gap-2">
        {SIZE_PRESETS.map((preset) => {
          const isSelected = value.width === preset.width && value.height === preset.height;
          return (
            <Button
              key={preset.label}
              type="button"
              variant={isSelected ? "default" : "outline"}
              onClick={() => handlePresetClick(preset.width, preset.height)}
              className="text-[11px] h-9 justify-center font-medium bg-background/30 hover:bg-muted/50 border-border"
              data-cy={`size-preset-${preset.width}x${preset.height}`}
            >
              <span className="truncate">{preset.label.split(" (")[0]}</span>
              <span className="opacity-60 text-[9px] ml-1">({preset.width}x{preset.height})</span>
            </Button>
          );
        })}
      </div>

      {/* Custom dimensions */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="space-y-1">
          <Label htmlFor="custom-width" className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Width (px)</Label>
          <Input
            id="custom-width"
            data-cy="width-input"
            type="number"
            min={16}
            max={2048}
            value={customWidth}
            onChange={(e) => handleWidthChange(e.target.value)}
            onBlur={handleBlur}
            className="text-xs h-9 bg-background/50"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="custom-height" className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Height (px)</Label>
          <Input
            id="custom-height"
            data-cy="height-input"
            type="number"
            min={16}
            max={2048}
            value={customHeight}
            onChange={(e) => handleHeightChange(e.target.value)}
            onBlur={handleBlur}
            className="text-xs h-9 bg-background/50"
          />
        </div>
      </div>
    </div>
  );
}

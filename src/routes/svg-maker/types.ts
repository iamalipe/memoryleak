export type SVGStyle = "outline" | "color" | "real" | "cartoon";

export interface SVGSize {
  width: number;
  height: number;
}

export interface GeneratedSVG {
  id: string;
  svgCode: string;
  prompt: string;
  style: SVGStyle;
  size: SVGSize;
  timestamp: number;
}

export interface GeminiConfig {
  apiKey: string;
  model: string;
}

export const STYLE_OPTIONS: { value: SVGStyle; label: string; description: string; icon: string }[] = [
  {
    value: "outline",
    label: "Outline",
    description: "Clean transparent stroke and line-art design",
    icon: "Square",
  },
  {
    value: "color",
    label: "Vibrant Color",
    description: "Vivid solid colors and rich gradient vector art",
    icon: "Palette",
  },
  {
    value: "real",
    label: "Detailed Vector",
    description: "Detailed, shaded professional logo graphics",
    icon: "Zap",
  },
  {
    value: "cartoon",
    label: "Cartoon",
    description: "Playful character styles and bold outlines",
    icon: "Smile",
  },
];

export const SIZE_PRESETS: { label: string; width: number; height: number }[] = [
  { label: "Square Logo (512x512)", width: 512, height: 512 },
  { label: "Avatar / Icon (256x256)", width: 256, height: 256 },
  { label: "Small / Button (128x128)", width: 128, height: 128 },
  { label: "Wide Banner (800x400)", width: 800, height: 400 },
];

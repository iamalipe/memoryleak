import { useState, useRef } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Copy, Check, Download, FileJson, ImageIcon, Eye } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SVGSize } from "../types";

interface SvgPreviewProps {
  svgCode: string;
  size: SVGSize;
  prompt: string;
}

type BackgroundTheme = "checkerboard" | "dark" | "light";

export default function SvgPreview({ svgCode, size, prompt }: SvgPreviewProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [bgTheme, setBgTheme] = useState<BackgroundTheme>("checkerboard");
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(svgCode);
      setCopied(true);
      toast.success("SVG Code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy SVG Code.");
    }
  };

  const handleDownloadSvg = () => {
    const blob = new Blob([svgCode], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const fileName = prompt.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30) || "logo";
    link.download = `${fileName}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("SVG downloaded!");
  };

  const handleDownloadPng = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    canvas.width = size.width;
    canvas.height = size.height;

    const svgBlob = new Blob([svgCode], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0, size.width, size.height);
      URL.revokeObjectURL(url);
      
      try {
        const pngUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = pngUrl;
        const fileName = prompt.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30) || "logo";
        link.download = `${fileName}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("PNG downloaded!");
      } catch {
        toast.error("Failed to generate PNG from canvas.");
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error("Error loading SVG for PNG conversion.");
    };

    img.src = url;
  };

  return (
    <div className="border border-border rounded-xl bg-card/40 backdrop-blur-md overflow-hidden flex flex-col h-full" data-cy="svg-preview-panel">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/20">
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-[180px]">
          <TabsList className="grid w-full grid-cols-2 h-7 p-0.5 bg-background/50">
            <TabsTrigger value="preview" className="text-[11px] h-6 flex items-center gap-1 data-[state=active]:bg-card">
              <Eye className="h-3 w-3" /> Preview
            </TabsTrigger>
            <TabsTrigger value="code" className="text-[11px] h-6 flex items-center gap-1 data-[state=active]:bg-card">
              <FileJson className="h-3 w-3" /> Code
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === "preview" && (
          <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-background/50">
            {(["checkerboard", "light", "dark"] as BackgroundTheme[]).map((theme) => (
              <button
                key={theme}
                onClick={() => setBgTheme(theme)}
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] capitalize transition-colors font-medium cursor-pointer",
                  bgTheme === theme ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                )}
                title={`Set background to ${theme}`}
              >
                {theme}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main preview/code area */}
      <div className="flex-1 overflow-auto p-6 flex items-center justify-center min-h-[300px]">
        {activeTab === "preview" ? (
          <div
            ref={containerRef}
            data-cy="svg-preview-container"
            className={cn(
              "relative rounded-lg border shadow-inner flex items-center justify-center p-4 transition-all duration-300 overflow-hidden",
              bgTheme === "checkerboard" && "bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] bg-background/40",
              bgTheme === "dark" && "bg-neutral-900 border-neutral-800",
              bgTheme === "light" && "bg-white border-neutral-200"
            )}
            style={{
              width: "100%",
              maxWidth: `${Math.min(size.width, 420)}px`,
              aspectRatio: `${size.width} / ${size.height}`,
            }}
          >
            <div
              className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full"
              dangerouslySetInnerHTML={{ __html: svgCode }}
              data-cy="svg-rendered-image"
            />
          </div>
        ) : (
          <div className="w-full h-full min-h-[300px] relative font-mono text-xs border rounded-lg bg-neutral-950 text-neutral-200 p-4 overflow-auto max-w-[500px]">
            <pre className="whitespace-pre-wrap select-all font-mono leading-relaxed break-all">
              {svgCode}
            </pre>
          </div>
        )}
      </div>

      {/* Actions footer */}
      <div className="border-t px-4 py-3 bg-muted/10 flex flex-wrap gap-2 items-center justify-between">
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopy}
          className="text-xs h-8 flex items-center gap-1 bg-background/30 hover:bg-muted/50 border-border"
          data-cy="copy-code-btn"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy Code"}
        </Button>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadPng}
            className="text-xs h-8 flex items-center gap-1 bg-background/30 hover:bg-muted/50 border-border"
            data-cy="download-png-btn"
          >
            <ImageIcon className="h-3.5 w-3.5" /> Download PNG
          </Button>
          <Button
            size="sm"
            onClick={handleDownloadSvg}
            className="text-xs h-8 flex items-center gap-1 font-semibold"
            data-cy="download-svg-btn"
          >
            <Download className="h-3.5 w-3.5" /> Download SVG
          </Button>
        </div>
      </div>
    </div>
  );
}

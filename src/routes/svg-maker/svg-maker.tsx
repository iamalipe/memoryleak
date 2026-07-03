import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Wand2, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import ApiKeyConfig from "./components/api-key-config";
import SizeSelector from "./components/size-selector";
import StyleSelector from "./components/style-selector";
import SvgPreview from "./components/svg-preview";
import { generateSVG } from "./svg-generator";
import type { SVGSize, SVGStyle, GeminiConfig } from "./types";

export default function SVGLogoMaker() {
  const [size, setSize] = useState<SVGSize>({ width: 512, height: 512 });
  const [style, setStyle] = useState<SVGStyle>("color");
  const [prompt, setPrompt] = useState("");
  const [config, setConfig] = useState<GeminiConfig>(() => ({
    apiKey: localStorage.getItem("memoryleak-gemini-api-key") || "",
    model: localStorage.getItem("memoryleak-gemini-model") || "gemini-2.5-flash",
  }));
  const [generating, setGenerating] = useState(false);
  const [generatedSvg, setGeneratedSvg] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!config.apiKey) {
      toast.error("Please configure your Gemini API Key in the settings first.");
      return;
    }
    if (!prompt.trim()) {
      toast.error("Please describe your logo idea in the prompt input.");
      return;
    }

    setGenerating(true);
    setGeneratedSvg(null);

    try {
      const svgCode = await generateSVG(prompt.trim(), style, size, config);
      setGeneratedSvg(svgCode);
      toast.success("SVG Logo generated successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to generate SVG logo.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" data-cy="svg-maker-page">
      {/* Top Header Navigation */}
      <header className="border-b bg-background/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="h-9 w-9">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex flex-col">
              <h1 className="text-sm font-semibold tracking-tight flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                AI SVG Logo Maker
              </h1>
              <p className="text-[10px] text-muted-foreground hidden sm:block">
                Generate high-quality scalable vector graphics locally using Gemini
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-full">
          {/* Left Column: Control Panel (5 Cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* API Key Panel */}
            <ApiKeyConfig onConfigChange={setConfig} />

            {/* Canvas configurations */}
            <Card className="border-border bg-card/60 backdrop-blur-md">
              <CardContent className="p-5 space-y-6">
                <SizeSelector value={size} onChange={setSize} />
                <StyleSelector value={style} onChange={setStyle} />

                {/* Prompt Section */}
                <div className="space-y-2">
                  <label htmlFor="prompt" className="text-sm font-semibold flex items-center gap-2">
                    <Wand2 className="h-4 w-4 text-primary" />
                    3. Describe Your Logo Prompt
                  </label>
                  <Textarea
                    id="prompt"
                    data-cy="prompt-textarea"
                    placeholder="e.g. A sleek, minimal geometric owl face logo, corporate, dark blue and gold colors, professional brand emblem..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[100px] text-xs resize-none bg-background/50 focus-visible:ring-primary"
                  />
                </div>

                <Button
                  data-cy="generate-btn"
                  onClick={handleGenerate}
                  disabled={generating || !prompt.trim() || !config.apiKey}
                  className="w-full h-10 font-bold transition-all"
                >
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating SVG Logo...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate Logo
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Preview Panel (7 Cols) */}
          <div className="lg:col-span-7 h-full min-h-[400px] lg:sticky lg:top-20">
            {generating ? (
              <div className="border border-border rounded-xl bg-card/40 backdrop-blur-md h-full min-h-[350px] flex flex-col items-center justify-center p-8 text-center" data-cy="generation-loading-state">
                <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                <h3 className="text-sm font-semibold mb-1">Synthesizing Vector Paths</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Gemini is assembling paths, tags, and coloring nodes to build your custom SVG...
                </p>
              </div>
            ) : generatedSvg ? (
              <SvgPreview svgCode={generatedSvg} size={size} prompt={prompt} />
            ) : (
              <div className="border border-dashed border-border rounded-xl bg-card/10 h-full min-h-[350px] flex flex-col items-center justify-center p-8 text-center" data-cy="empty-preview-state">
                <Sparkles className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <h3 className="text-sm font-semibold mb-1 text-muted-foreground">No Logo Generated Yet</h3>
                <p className="text-xs text-muted-foreground/80 max-w-xs leading-normal">
                  Configure your Gemini API key, select your dimensions and style, describe your prompt, and click Generate!
                </p>
                {!config.apiKey && (
                  <span className="mt-4 flex items-center gap-1 text-[10px] text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                    <AlertCircle className="h-3 w-3" /> API Key configuration required above
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

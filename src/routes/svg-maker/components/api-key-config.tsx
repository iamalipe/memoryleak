import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Key, Save, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { GeminiConfig } from "../types";

interface ApiKeyConfigProps {
  onConfigChange: (config: GeminiConfig) => void;
}

export default function ApiKeyConfig({ onConfigChange }: ApiKeyConfigProps) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("memoryleak-gemini-api-key") || "");
  const [model, setModel] = useState(() => localStorage.getItem("memoryleak-gemini-model") || "gemini-2.5-flash");
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(() => !!localStorage.getItem("memoryleak-gemini-api-key"));

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast.error("Please enter a valid API Key");
      return;
    }
    localStorage.setItem("memoryleak-gemini-api-key", apiKey.trim());
    localStorage.setItem("memoryleak-gemini-model", model);
    setIsSaved(true);
    onConfigChange({ apiKey: apiKey.trim(), model });
    toast.success("Gemini API Configuration Saved!");
  };

  const handleClear = () => {
    localStorage.removeItem("memoryleak-gemini-api-key");
    setApiKey("");
    setIsSaved(false);
    onConfigChange({ apiKey: "", model });
    toast.info("Gemini API Key removed.");
  };

  return (
    <Card className="border-border bg-card/60 backdrop-blur-md" data-cy="api-key-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Key className="h-4 w-4 text-primary" />
            Gemini API Settings
          </CardTitle>
          {isSaved ? (
            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full" data-cy="api-key-status-configured">
              <CheckCircle2 className="h-3 w-3" /> Configured
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full" data-cy="api-key-status-missing">
              <AlertCircle className="h-3 w-3" /> Missing Key
            </span>
          )}
        </div>
        <CardDescription className="text-xs">
          Your key is stored locally in your browser and used only to run generation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="api-key" className="text-xs font-medium">Gemini API Key</Label>
          <div className="relative flex items-center">
            <Input
              id="api-key"
              data-cy="api-key-input"
              type={showKey ? "text" : "password"}
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setIsSaved(false);
              }}
              className="pr-10 text-xs h-9 bg-background/50"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="model-select" className="text-xs font-medium">Model</Label>
          <Select
            value={model}
            onValueChange={(val) => {
              setModel(val);
              setIsSaved(false);
            }}
          >
            <SelectTrigger id="model-select" data-cy="api-model-select" className="text-xs h-9 bg-background/50">
              <SelectValue placeholder="Select Gemini Model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gemini-2.5-flash" className="text-xs">Gemini 2.5 Flash (Recommended - Fast)</SelectItem>
              <SelectItem value="gemini-2.5-pro" className="text-xs">Gemini 2.5 Pro (High Quality)</SelectItem>
              <SelectItem value="gemini-1.5-flash" className="text-xs">Gemini 1.5 Flash (Legacy)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            data-cy="save-api-key-btn"
            onClick={handleSave}
            className="flex-1 text-xs h-8"
            disabled={isSaved && !!apiKey}
          >
            <Save className="mr-1 h-3.5 w-3.5" /> Save Config
          </Button>
          {isSaved && (
            <Button
              size="sm"
              variant="outline"
              data-cy="clear-api-key-btn"
              onClick={handleClear}
              className="text-xs h-8 border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

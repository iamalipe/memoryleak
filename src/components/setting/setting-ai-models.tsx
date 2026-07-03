import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { useAiModel } from "@/hooks/use-ai-model"
import { isWebGPUSupport } from "@/lib/general"
import { cn } from "@/lib/utils"
import {
  Check,
  Cpu,
  Download,
  Loader2,
  Trash2,
  AlertTriangle,
} from "lucide-react"
import { MODEL_OPTIONS } from "@/components/llm-model/model-options"

export const SettingAiModels = () => {
  const {
    selectedAiModelId,
    loadedModelIds,
    onChangeSelectedAiModelId,
    loadingStates,
    initLocalEngine,
    unloadModel,
    deviceInfo,
  } = useAiModel()

  const webGPUSupported = isWebGPUSupport()

  return (
    <div className="space-y-6">
      {/* WebGPU Status */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Local AI Models</h3>
          <p className="text-xs text-muted-foreground">
            Run language models locally in your browser via WebGPU
          </p>
        </div>

        {!webGPUSupported && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="text-xs text-destructive">
              <p className="font-medium">WebGPU not available</p>
              <p className="mt-0.5 text-destructive/80">
                Your browser doesn't support WebGPU. Try Chrome 113+ or Edge 113+.
              </p>
            </div>
          </div>
        )}

        {/* Device Info */}
        {deviceInfo && (
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border p-2 text-center min-w-0">
              <p className="text-[10px] text-muted-foreground truncate">CPU</p>
              <p className="text-xs font-mono font-medium truncate">
                {deviceInfo.cpuCores} cores
              </p>
            </div>
            <div className="rounded-lg border p-2 text-center min-w-0">
              <p className="text-[10px] text-muted-foreground truncate">RAM</p>
              <p className="text-xs font-mono font-medium truncate">
                {deviceInfo.ramGB === "Unknown"
                  ? "N/A"
                  : `${deviceInfo.ramGB} GB`}
              </p>
            </div>
            <div className="rounded-lg border p-2 text-center min-w-0">
              <p className="text-[10px] text-muted-foreground truncate">GPU</p>
              <p className="truncate text-xs font-mono font-medium" title={deviceInfo.gpu}>
                {deviceInfo.gpu}
              </p>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Model Cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Available Models</h3>

        <div className="flex flex-col gap-2">
          {MODEL_OPTIONS.map((model) => {
            const isLoaded = loadedModelIds.includes(model.modelId)
            const isActive = selectedAiModelId === model.modelId
            const loadingState = loadingStates[model.modelId]
            const isLoading = !!loadingState

            return (
              <div
                key={model.id}
                className={cn(
                  "relative flex flex-col gap-2 rounded-lg border p-3 transition-colors",
                  isActive
                    ? "border-primary/50 bg-accent"
                    : "hover:bg-muted/50"
                )}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-semibold leading-none">
                        {model.name}
                      </span>
                      {isActive && (
                        <Badge
                          variant="default"
                          className="h-5 text-[10px] uppercase"
                        >
                          Active
                        </Badge>
                      )}
                      {isLoaded && !isActive && (
                        <Badge
                          variant="secondary"
                          className="h-5 text-[10px] uppercase"
                        >
                          Ready
                        </Badge>
                      )}
                    </div>
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {model.desc}
                    </span>
                  </div>
                </div>

                {/* Loading Progress */}
                {isLoading && (
                  <div className="mt-1 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="truncate pr-2">
                        {loadingState.text}
                      </span>
                      <span className="shrink-0">
                        {loadingState.progress}%
                      </span>
                    </div>
                    <Progress
                      value={loadingState.progress}
                      className="h-1.5"
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-1 flex items-center justify-end gap-2">
                  {!isLoaded && !isLoading && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-full text-xs"
                      disabled={!webGPUSupported}
                      onClick={() => initLocalEngine(model.modelId)}
                    >
                      <Download className="mr-1.5 h-3 w-3" />
                      Download & Load
                    </Button>
                  )}

                  {isLoading && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-full text-xs"
                      disabled
                    >
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                      Loading...
                    </Button>
                  )}

                  {isLoaded && (
                    <>
                      <Button
                        variant={isActive ? "default" : "secondary"}
                        size="sm"
                        className="h-7 flex-1 text-xs"
                        onClick={() =>
                          onChangeSelectedAiModelId(model.modelId)
                        }
                      >
                        {isActive ? (
                          <>
                            <Check className="mr-1.5 h-3 w-3" /> Selected
                          </>
                        ) : (
                          "Set Active"
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                        onClick={() => unloadModel(model.modelId)}
                        title="Unload from Memory"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import { useAiModel } from "@/hooks/use-ai-model"
import { cn } from "@/lib/utils"
import {
  Check,
  ChevronsUpDown,
  Cpu,
  Download,
  Loader2,
  Trash2,
} from "lucide-react"
import * as React from "react"
import { MODEL_OPTIONS } from "./model-options"

function AIModelSelect() {
  const {
    selectedAiModelId,
    loadedModelIds,
    onChangeSelectedAiModelId,
    loadingStates,
    initLocalEngine,
    unloadModel,
  } = useAiModel()

  const [open, setOpen] = React.useState(false)

  const activeModel = MODEL_OPTIONS.find((m) => m.modelId === selectedAiModelId)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[280px] justify-between"
        >
          <div className="flex items-center gap-2 truncate">
            <Cpu className="h-4 w-4 shrink-0 opacity-50" />
            {activeModel ? activeModel.name : "Select a local model..."}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[340px] p-2" align="start">
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
                  isActive ? "border-primary/50 bg-accent" : "hover:bg-muted/50"
                )}
              >
                {/* Header Row: Name & Status Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm leading-none font-semibold">
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

                {/* Loading Progress Bar */}
                {isLoading && (
                  <div className="mt-1 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="truncate pr-2">{loadingState.text}</span>
                      <span className="shrink-0">{loadingState.progress}%</span>
                    </div>
                    <Progress value={loadingState.progress} className="h-1.5" />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-1 flex items-center justify-end gap-2">
                  {!isLoaded && !isLoading && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-full text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        initLocalEngine(model.modelId)
                      }}
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
                        onClick={(e) => {
                          e.stopPropagation()
                          onChangeSelectedAiModelId(model.modelId)
                          setOpen(false) // Close popover on selection
                        }}
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
                        onClick={(e) => {
                          e.stopPropagation()
                          unloadModel(model.modelId)
                        }}
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
      </PopoverContent>
    </Popover>
  )
}

export default AIModelSelect

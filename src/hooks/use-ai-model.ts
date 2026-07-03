import type { MLCEngineInterface } from "@mlc-ai/web-llm"
import { useCallback, useEffect, useRef, useState } from "react"
import { useAiModelStore } from "./use-ai-model-store"

export interface DeviceInfo {
  os: string
  cpuCores: number | "Unknown"
  ramGB: number | "Unknown"
  gpu: string
}

export const useAiModel = (
  genConfig: { logLevel?: string; contextWindowSize?: number } = {}
) => {
  // Global Store State
  const {
    selectedAiModelId,
    loadedModelIds,
    onChangeSelectedAiModelId,
    addLoadedModelId,
    removeLoadedModelId,
    clearLoadedModels,
  } = useAiModelStore()

  // Local State
  const enginesRef = useRef<Map<string, MLCEngineInterface>>(new Map())
  const [loadingStates, setLoadingStates] = useState<
    Record<string, { progress: number; text: string }>
  >({})
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)

  // --- Hardware Profiler ---
  const fetchDeviceInfo = useCallback(async () => {
    const info: DeviceInfo = {
      os: navigator.userAgent,
      cpuCores: navigator.hardwareConcurrency || "Unknown",
      // @ts-ignore - deviceMemory is a non-standard feature in some browsers
      ramGB: navigator.deviceMemory || "Unknown",
      gpu: "Checking...",
    }

    // Check WebGPU for graphics card info
    // @ts-ignore - WebGPU API types might not be present in your tsconfig
    if (navigator.gpu) {
      try {
        // @ts-ignore
        const adapter: any = await navigator.gpu.requestAdapter()
        console.log("adapter", adapter)

        info.gpu = adapter
          ? adapter?.info?.device ||
            adapter?.name ||
            `${adapter?.info?.vendor} ${adapter?.info?.architecture}` ||
            "WebGPU Supported (Name Hidden)"
          : "No WebGPU Adapter"
      } catch {
        info.gpu = "WebGPU Request Failed"
      }
    } else {
      info.gpu = "WebGPU Not Supported"
    }

    setDeviceInfo(info)
  }, [])

  // Fetch device info on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDeviceInfo()
  }, [fetchDeviceInfo])

  // --- Initialize & Load Model ---
  const initLocalEngine = useCallback(
    async (modelId: string) => {
      if (enginesRef.current.has(modelId)) {
        onChangeSelectedAiModelId(modelId)
        return enginesRef.current.get(modelId)!
      }

      setLoadingStates((prev) => ({
        ...prev,
        [modelId]: { progress: 0, text: "Loading compiler modules..." },
      }))

      try {
        const { CreateMLCEngine } = await import("@mlc-ai/web-llm")
        const engine = await CreateMLCEngine(
          modelId,
          {
            initProgressCallback: (report) => {
              setLoadingStates((prev) => ({
                ...prev,
                [modelId]: {
                  progress: Math.round(report.progress * 100),
                  text: report.text,
                },
              }))
            },
            // @ts-ignore
            logLevel: genConfig.logLevel || "info",
          },
          {
            context_window_size: genConfig.contextWindowSize || 2048,
          }
        )

        enginesRef.current.set(modelId, engine)
        addLoadedModelId(modelId)
        onChangeSelectedAiModelId(modelId)

        return engine
      } catch (err: any) {
        console.error(`Failed to load model ${modelId}:`, err)
        setLoadingStates((prev) => {
          const newState = { ...prev }
          delete newState[modelId]
          return newState
        })
        throw new Error(err.message || String(err), { cause: err })
      }
    },
    [genConfig, addLoadedModelId, onChangeSelectedAiModelId]
  )

  // --- Unload Specific Model ---
  const unloadModel = useCallback(
    async (modelId: string) => {
      const engine = enginesRef.current.get(modelId)
      if (engine) {
        await engine.unload()
        enginesRef.current.delete(modelId)
        removeLoadedModelId(modelId)
        setLoadingStates((prev) => {
          const newState = { ...prev }
          delete newState[modelId]
          return newState
        })
      }
    },
    [removeLoadedModelId]
  )

  // --- Unload All Models & Free Memory ---
  const unloadAllModels = useCallback(async () => {
    const unloadPromises = Array.from(enginesRef.current.values()).map(
      (engine) => engine.unload()
    )
    await Promise.all(unloadPromises)
    enginesRef.current.clear()
    clearLoadedModels()
    setLoadingStates({})
  }, [clearLoadedModels])

  // --- Get Token Usage & Stats ---
  const getModelStats = useCallback(async (modelId: string) => {
    const engine = enginesRef.current.get(modelId)
    if (!engine) return "Model not loaded."

    // Web-LLM provides a built-in runtime stats text generator
    // which includes token generation speed (prefill/decode) and usage
    return await engine.runtimeStatsText()
  }, [])

  return {
    // Global State
    selectedAiModelId,
    loadedModelIds,
    onChangeSelectedAiModelId,

    // Local State
    loadingStates,
    deviceInfo,

    // Engine Management
    enginesRef,
    initLocalEngine,
    unloadModel,
    unloadAllModels,

    // Utilities
    getModelStats,
    fetchDeviceInfo,
  }
}

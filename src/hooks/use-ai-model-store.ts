import { create } from "zustand"

interface AiModelStoreType {
  selectedAiModelId: string | null
  loadedModelIds: string[]
  onChangeSelectedAiModelId: (newAiModelId: string | null) => void
  addLoadedModelId: (modelId: string) => void
  removeLoadedModelId: (modelId: string) => void
  clearLoadedModels: () => void
}

export const useAiModelStore = create<AiModelStoreType>((set) => ({
  selectedAiModelId: null,
  loadedModelIds: [],
  onChangeSelectedAiModelId: (newAiModelId) =>
    set({ selectedAiModelId: newAiModelId }),
  addLoadedModelId: (modelId) =>
    set((state) => ({
      loadedModelIds: state.loadedModelIds.includes(modelId)
        ? state.loadedModelIds
        : [...state.loadedModelIds, modelId],
    })),
  removeLoadedModelId: (modelId) =>
    set((state) => ({
      loadedModelIds: state.loadedModelIds.filter((id) => id !== modelId),
      // If the removed model was the selected one, deselect it
      selectedAiModelId:
        state.selectedAiModelId === modelId ? null : state.selectedAiModelId,
    })),
  clearLoadedModels: () => set({ loadedModelIds: [], selectedAiModelId: null }),
}))

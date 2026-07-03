import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { idbStateStorage } from "./db"
import SpellcheckWorker from "@/lib/spellcheck.worker?worker"

interface DictionaryStoreType {
  customWords: string[]
  isLoading: boolean
  isLoaded: boolean
  addWord: (word: string) => void
  removeWord: (word: string) => void
  loadStandardDictionary: () => Promise<void>
}

let worker: Worker | null = null
const suggestionCallbacks: Record<string, (suggestions: string[]) => void> = {}
export const spellingCache: Record<string, boolean> = {}

function getWorker() {
  if (typeof window === "undefined") return null
  if (!worker) {
    worker = new SpellcheckWorker()
    worker.onmessage = (e) => {
      const { type, payload } = e.data

      if (type === "ready") {
        console.log("Spellcheck Store: Worker ready!")
        useDictionaryStore.setState({ isLoaded: true, isLoading: false })
      } else if (type === "check-words-results") {
        Object.assign(spellingCache, payload)
        window.dispatchEvent(new CustomEvent("spelling-cache-updated"))
      } else if (type === "suggestions-results") {
        const { word, suggestions } = payload
        if (suggestionCallbacks[word]) {
          suggestionCallbacks[word](suggestions)
          delete suggestionCallbacks[word]
        }
      }
    }

    const customWords = useDictionaryStore.getState().customWords
    worker.postMessage({ type: "init", payload: { customWords } })
  }
  return worker
}

export const useDictionaryStore = create<DictionaryStoreType>()(
  persist(
    (zSet, zGet) => ({
      customWords: [],
      isLoading: false,
      isLoaded: false,

      addWord: (word) => {
        const cleaned = word.trim().toLowerCase()
        if (!cleaned) return
        const current = zGet().customWords
        if (!current.includes(cleaned)) {
          const next = [...current, cleaned]
          zSet({ customWords: next })

          const w = getWorker()
          if (w) {
            w.postMessage({ type: "add-custom-word", payload: cleaned })
          }

          delete spellingCache[cleaned]
          window.dispatchEvent(new CustomEvent("spelling-cache-updated"))
        }
      },

      removeWord: (word) => {
        const cleaned = word.trim().toLowerCase()
        const current = zGet().customWords
        const next = current.filter((w) => w !== cleaned)
        zSet({ customWords: next })

        const w = getWorker()
        if (w) {
          w.postMessage({ type: "set-custom-words", payload: next })
        }

        delete spellingCache[cleaned]
        window.dispatchEvent(new CustomEvent("spelling-cache-updated"))
      },

      loadStandardDictionary: async () => {
        // Initialize worker to trigger dictionary download & instantiation
        zSet({ isLoading: true })
        getWorker()
      },
    }),
    {
      name: "custom-dictionary-storage",
      storage: createJSONStorage(() => idbStateStorage),
    }
  )
)

export function isWordSpelledCorrectly(word: string): boolean {
  const cleaned = word.trim().toLowerCase()
  if (!cleaned) return true

  // Ignore numbers, single characters, formatting characters, and tech elements
  if (
    /^\d+$/.test(cleaned) ||
    cleaned.length <= 1 ||
    cleaned.startsWith("http") ||
    cleaned.includes("/") ||
    cleaned.includes("@") ||
    cleaned.includes("_") ||
    cleaned.includes("*")
  ) {
    return true
  }

  // Check custom dictionary
  const customWords = useDictionaryStore.getState().customWords
  if (customWords.includes(cleaned)) {
    return true
  }

  // Check the background worker spelling cache
  if (spellingCache[cleaned] !== undefined) {
    return spellingCache[cleaned]
  }

  // Trigger spelling check in background
  const w = getWorker()
  if (w) {
    w.postMessage({ type: "check-words", payload: [cleaned] })
  }

  return true
}

export function getSpellingSuggestions(word: string): Promise<string[]> {
  return new Promise((resolve) => {
    const cleaned = word.trim().toLowerCase()
    if (!cleaned) {
      resolve([])
      return
    }

    const w = getWorker()
    if (!w) {
      resolve([])
      return
    }

    suggestionCallbacks[cleaned] = resolve
    w.postMessage({ type: "get-suggestions", payload: cleaned })
  })
}

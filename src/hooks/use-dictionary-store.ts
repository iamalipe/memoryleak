import { get, set } from "idb-keyval"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { idbStateStorage } from "./db"

interface DictionaryStoreType {
  customWords: string[]
  isLoading: boolean
  isLoaded: boolean
  addWord: (word: string) => void
  removeWord: (word: string) => void
  loadStandardDictionary: () => Promise<void>
}

let standardWordsSet = new Set<string>()

// Load any previously cached dictionary on startup
get("standard-dictionary")
  .then((cached) => {
    if (cached && typeof cached === "string") {
      const list = cached.split("\n")
      standardWordsSet = new Set(list.map((w) => w.trim().toLowerCase()))
    }
  })
  .catch((err) =>
    console.error("Failed to load cached standard dictionary:", err)
  )

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
          zSet({ customWords: [...current, cleaned] })
        }
      },

      removeWord: (word) => {
        const cleaned = word.trim().toLowerCase()
        const current = zGet().customWords
        zSet({ customWords: current.filter((w) => w !== cleaned) })
      },

      loadStandardDictionary: async () => {
        if (standardWordsSet.size > 0) {
          zSet({ isLoaded: true })
          return
        }

        zSet({ isLoading: true })
        try {
          let dictionaryText = (await get("standard-dictionary")) as
            | string
            | undefined

          if (!dictionaryText) {
            console.log("Downloading standard dictionary list...")
            const response = await fetch(
              "https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-usa-no-swears-medium.txt"
            )
            dictionaryText = await response.text()
            await set("standard-dictionary", dictionaryText)
          }

          const words = dictionaryText
            .split("\n")
            .map((w) => w.trim().toLowerCase())
            .filter(Boolean)
          standardWordsSet = new Set(words)
          zSet({ isLoaded: true })
        } catch (err) {
          console.error("Failed to load standard dictionary:", err)
        } finally {
          zSet({ isLoading: false })
        }
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

  console.log("cleaned", cleaned)

  // Ignore numbers, single characters, punctuation, and URLs/emails/formatting marks
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
  console.log("cleaned 2", cleaned)

  // Check custom dictionary
  const customWords = useDictionaryStore.getState().customWords
  if (customWords.includes(cleaned)) {
    return true
  }
  console.log("cleaned 3", cleaned)
  console.log("standardWordsSet", standardWordsSet)

  // Check standard dictionary if loaded
  if (standardWordsSet.size > 0) {
    return standardWordsSet.has(cleaned)
  }

  return true
}

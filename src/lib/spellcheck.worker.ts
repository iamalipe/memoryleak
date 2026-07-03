import Typo from "typo-js"
import { get, set } from "idb-keyval"

let typoInstance: Typo | null = null
let customWords: Set<string> = new Set()

const AFF_URL = "https://cdn.jsdelivr.net/gh/titoBouzout/Dictionaries@master/English%20(United%20States)/en_US.aff"
const DIC_URL = "https://cdn.jsdelivr.net/gh/titoBouzout/Dictionaries@master/English%20(United%20States)/en_US.dic"

async function initTypo() {
  try {
    let affData = await get("hunspell-aff-en_US") as string | undefined
    let dicData = await get("hunspell-dic-en_US") as string | undefined

    if (!affData || !dicData) {
      console.log("SpellcheckWorker: Downloading Hunspell dictionaries...")
      const [affRes, dicRes] = await Promise.all([
        fetch(AFF_URL),
        fetch(DIC_URL)
      ])
      affData = await affRes.text()
      dicData = await dicRes.text()

      await set("hunspell-aff-en_US", affData)
      await set("hunspell-dic-en_US", dicData)
    }

    typoInstance = new Typo("en_US", affData, dicData)
    console.log("SpellcheckWorker: Typo.js loaded successfully!")
    postMessage({ type: "ready" })
  } catch (err) {
    console.error("SpellcheckWorker: Failed to initialize Typo.js:", err)
    postMessage({ type: "error", error: String(err) })
  }
}

// Split camelCase, snake_case, ignoring numbers, formatting, single letters
function splitAndCleanWords(text: string): string[] {
  const rawWords = text.match(/[a-zA-Z]+/g) || []
  const result: string[] = []

  for (const raw of rawWords) {
    const split = raw.replace(/([a-z])([A-Z])/g, "$1 $2").split(" ")
    for (const w of split) {
      const clean = w.trim().toLowerCase()
      if (clean.length > 1) {
        result.push(clean)
      }
    }
  }
  return result
}

function checkWord(word: string): boolean {
  const cleaned = word.trim().toLowerCase()
  if (!cleaned) return true

  if (/^\d+$/.test(cleaned) || cleaned.length <= 1) {
    return true
  }

  if (customWords.has(cleaned)) {
    return true
  }

  if (typoInstance) {
    return typoInstance.check(cleaned)
  }

  return true
}

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data

  if (type === "init") {
    if (payload?.customWords) {
      customWords = new Set(payload.customWords.map((w: string) => w.toLowerCase()))
    }
    await initTypo()
  } else if (type === "set-custom-words") {
    customWords = new Set(payload.map((w: string) => w.toLowerCase()))
  } else if (type === "add-custom-word") {
    customWords.add(payload.toLowerCase())
  } else if (type === "check-words") {
    const results: Record<string, boolean> = {}
    const wordsToCheck: string[] = payload

    for (const rawWord of wordsToCheck) {
      const subWords = splitAndCleanWords(rawWord)
      if (subWords.length === 0) {
        results[rawWord] = true
        continue
      }

      let allCorrect = true
      for (const w of subWords) {
        if (!checkWord(w)) {
          allCorrect = false
          break
        }
      }
      results[rawWord] = allCorrect
    }

    postMessage({ type: "check-words-results", payload: results })
  } else if (type === "get-suggestions") {
    const word: string = payload
    if (!typoInstance) {
      postMessage({ type: "suggestions-results", payload: { word, suggestions: [] } })
      return
    }

    const cleaned = word.trim().toLowerCase()
    const suggestions = typoInstance.suggest(cleaned) || []
    postMessage({ type: "suggestions-results", payload: { word, suggestions } })
  }
}

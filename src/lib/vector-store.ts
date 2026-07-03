import { pipeline } from "@huggingface/transformers"
import { get, set } from "idb-keyval"
import { db } from "@/hooks/db"
import type { NoteType } from "@/hooks/use-note-store"

let extractorPromise: any = null

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
      device: "webgpu",
    }).catch((err) => {
      console.warn("Failed to load embedding pipeline with WebGPU, falling back to WASM:", err)
      return pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")
    })
  }
  return extractorPromise
}

export async function getEmbedding(text: string): Promise<number[]> {
  const extractor = await getExtractor()
  const output = await extractor(text, { pooling: "mean", normalize: true })
  return Array.from(output.data)
}

export async function indexNote(noteId: string, text: string): Promise<void> {
  try {
    const vector = await getEmbedding(text)
    await set(`embedding-${noteId}`, vector)
    await set(`embedding-timestamp-${noteId}`, Date.now())
    console.log(`Successfully vector-indexed note: ${noteId}`)
  } catch (err) {
    console.error(`Failed to index note ${noteId}:`, err)
  }
}

export async function indexMissingNotes(notes: NoteType[]): Promise<void> {
  try {
    for (const note of notes) {
      const vector = await get(`embedding-${note.id}`)
      const ts = await get(`embedding-timestamp-${note.id}`) as number | undefined
      const noteTime = new Date(note.updatedAt).getTime()

      if (!vector || !ts || ts < noteTime) {
        console.log(`Note ${note.id} has missing or stale embedding. Indexing...`)
        const content = note.content || await db.getContent(note.id)
        await indexNote(note.id, content)
      }
    }
  } catch (err) {
    console.error("Failed to run missing notes indexing:", err)
  }
}

export async function searchSemantic(
  query: string,
  notes: NoteType[]
): Promise<{ id: string; score: number }[]> {
  if (!query.trim()) return []

  try {
    const queryVector = await getEmbedding(query)
    const results: { id: string; score: number }[] = []

    for (const note of notes) {
      const vector = await get(`embedding-${note.id}`) as number[] | undefined
      if (vector) {
        const score = cosineSimilarity(queryVector, vector)
        results.push({ id: note.id, score })
      }
    }

    // Sort descending by score
    return results.sort((a, b) => b.score - a.score)
  } catch (err) {
    console.error("Semantic search failed:", err)
    return []
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

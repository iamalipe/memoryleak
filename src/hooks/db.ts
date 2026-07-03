import { del, get, set } from "idb-keyval"

// 1. Storage adapter for Zustand's persist middleware (Metadata & Folders)
export const idbStateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value)
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name)
  },
}

// 2. Dedicated helpers for the heavy note content
export const db = {
  saveContent: async (id: string, content: string): Promise<void> => {
    await set(`content-${id}`, content)
  },
  getContent: async (id: string): Promise<string> => {
    return (await get(`content-${id}`)) || ""
  },
  deleteContent: async (id: string): Promise<void> => {
    await del(`content-${id}`)
  },
}

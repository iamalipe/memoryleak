import { useMemo } from "react"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { db, idbStateStorage } from "./db"

export interface NoteType {
  id: string
  title: string
  content: string // Kept as "" when not in activeNoteIds to save memory
  path: string
  folderId: string | null
  createdAt: string
  updatedAt: string
}

export interface FolderType {
  id: string
  name: string
  parentId: string | null
}

interface NoteStoreType {
  // --- State ---
  notes: NoteType[]
  folders: FolderType[]
  activeNoteIds: string[] // Left panel tabs
  activeNoteId: string | null // Left active tab
  rightActiveNoteIds: string[] // Right panel tabs
  rightActiveNoteId: string | null // Right active tab
  isSplit: boolean
  activePanel: "left" | "right"
  searchQuery: string

  reorderActiveNotes: (newOrderIds: string[]) => void
  reorderRightActiveNotes: (newOrderIds: string[]) => void

  // --- Note Actions ---
  addNote: (
    note: Omit<NoteType, "id" | "createdAt" | "updatedAt" | "content">
  ) => Promise<void>
  updateNote: (id: string, updates: Partial<NoteType>) => Promise<void>
  deleteNote: (id: string) => Promise<void>
  duplicateNote: (id: string, newTitle: string) => Promise<void>

  // --- Memory & Content Actions ---
  openNote: (id: string) => Promise<void>
  openNoteToRight: (id: string) => Promise<void>
  openNoteInCurrentTab: (id: string) => Promise<void>
  closeNote: (id: string, panel: "left" | "right") => void
  closeOthers: (id: string, panel: "left" | "right") => void
  closeLeft: (id: string, panel: "left" | "right") => void
  closeRight: (id: string, panel: "left" | "right") => void
  closeAll: (panel: "left" | "right") => void

  // --- Folder Actions ---
  addFolder: (folder: Omit<FolderType, "id">) => void
  updateFolder: (id: string, updates: Partial<FolderType>) => void
  deleteFolder: (id: string) => void

  // --- Session state actions ---
  setActiveNoteId: (id: string | null) => void
  setRightActiveNoteId: (id: string | null) => void
  setIsSplit: (isSplit: boolean) => void
  setActivePanel: (panel: "left" | "right") => void
  setSearchQuery: (query: string) => void
}

const generateId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).substring(2)

export const useNoteStore = create<NoteStoreType>()(
  persist(
    (set, get) => ({
      notes: [],
      folders: [],
      activeNoteIds: [],
      activeNoteId: null,
      rightActiveNoteIds: [],
      rightActiveNoteId: null,
      isSplit: false,
      activePanel: "left",
      searchQuery: "",

      reorderActiveNotes: (newOrderIds) => {
        set({ activeNoteIds: newOrderIds })
        broadcastSync()
      },
      reorderRightActiveNotes: (newOrderIds) => {
        set({ rightActiveNoteIds: newOrderIds })
        broadcastSync()
      },

      // =====================
      // NOTE ACTIONS
      // =====================
      addNote: async (noteData) => {
        const now = new Date().toISOString()
        const newId = generateId()

        // 1. Initialize empty content in IndexedDB
        await db.saveContent(newId, "")

        // 2. Update Zustand state
        const state = get()
        const activePanel = state.activePanel
        const newNote: NoteType = {
          ...noteData,
          id: newId,
          createdAt: now,
          updatedAt: now,
          content: "",
        }

        if (activePanel === "left") {
          set((state) => ({
            notes: [...state.notes, newNote],
            activeNoteIds: [...state.activeNoteIds, newId],
            activeNoteId: newId,
          }))
        } else {
          set((state) => ({
            notes: [...state.notes, newNote],
            rightActiveNoteIds: [...state.rightActiveNoteIds, newId],
            rightActiveNoteId: newId,
            isSplit: true,
          }))
        }
        broadcastSync()
      },

      updateNote: async (id, updates) => {
        // If the update includes heavy content, save it immediately to IndexedDB
        if (updates.content !== undefined) {
          await db.saveContent(id, updates.content)
          // Run embedding generation in the background asynchronously
          import("@/lib/vector-store").then(({ indexNote }) => {
            indexNote(id, updates.content!)
          }).catch(err => console.error("Failed to run background embedding:", err))
        }

        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id
              ? { ...note, ...updates, updatedAt: new Date().toISOString() }
              : note
          ),
        }))
        broadcastSync()
      },

      deleteNote: async (id) => {
        // 1. Clean up heavy content from IndexedDB
        await db.deleteContent(id)

        // 2. Remove from Zustand state and active memory
        set((state) => {
          const nextActiveNoteIds = state.activeNoteIds.filter((noteId) => noteId !== id)
          let nextActiveNoteId = state.activeNoteId
          const nextRightActiveNoteIds = state.rightActiveNoteIds.filter((noteId) => noteId !== id)
          let nextRightActiveNoteId = state.rightActiveNoteId
          let nextIsSplit = state.isSplit
          let nextActivePanel = state.activePanel

          if (id === state.activeNoteId) {
            if (nextActiveNoteIds.length > 0) {
              const closedIndex = state.activeNoteIds.indexOf(id)
              const newIndex = Math.max(0, closedIndex - 1)
              nextActiveNoteId = nextActiveNoteIds[newIndex]
            } else {
              nextActiveNoteId = null
            }
          }

          if (id === state.rightActiveNoteId) {
            if (nextRightActiveNoteIds.length > 0) {
              const closedIndex = state.rightActiveNoteIds.indexOf(id)
              const newIndex = Math.max(0, closedIndex - 1)
              nextRightActiveNoteId = nextRightActiveNoteIds[newIndex]
            } else {
              nextRightActiveNoteId = null
            }
          }

          if (nextRightActiveNoteIds.length === 0) {
            nextIsSplit = false
            nextActivePanel = "left"
          }

          return {
            notes: state.notes.filter((note) => note.id !== id),
            activeNoteIds: nextActiveNoteIds,
            activeNoteId: nextActiveNoteId,
            rightActiveNoteIds: nextRightActiveNoteIds,
            rightActiveNoteId: nextRightActiveNoteId,
            isSplit: nextIsSplit,
            activePanel: nextActivePanel,
          }
        })
        broadcastSync()
      },

      duplicateNote: async (id, newTitle) => {
        const state = get()
        const sourceNote = state.notes.find((n) => n.id === id)
        if (!sourceNote) return

        const content = await db.getContent(id)
        const now = new Date().toISOString()
        const newId = generateId()

        // 1. Initialize content in IndexedDB
        await db.saveContent(newId, content)

        // 2. Update Zustand state
        const activePanel = state.activePanel
        const newNote: NoteType = {
          title: newTitle,
          folderId: sourceNote.folderId,
          path: sourceNote.path,
          id: newId,
          createdAt: now,
          updatedAt: now,
          content: content,
        }

        if (activePanel === "left") {
          set((state) => ({
            notes: [...state.notes, newNote],
            activeNoteIds: [...state.activeNoteIds, newId],
            activeNoteId: newId,
          }))
        } else {
          set((state) => ({
            notes: [...state.notes, newNote],
            rightActiveNoteIds: [...state.rightActiveNoteIds, newId],
            rightActiveNoteId: newId,
            isSplit: true,
          }))
        }
        broadcastSync()
      },

      // =====================
      // MEMORY MANAGEMENT
      // =====================
      openNote: async (id) => {
        const state = get()
        const panel = state.activePanel

        // 1. Fetch heavy content from IndexedDB
        const fullContent = await db.getContent(id)

        // 2. Inject into memory
        const updatedNotes = state.notes.map((note) =>
          note.id === id ? { ...note, content: fullContent } : note
        )

        if (panel === "left") {
          const nextActiveNoteIds = state.activeNoteIds.includes(id)
            ? state.activeNoteIds
            : [...state.activeNoteIds, id]
          set({
            notes: updatedNotes,
            activeNoteIds: nextActiveNoteIds,
            activeNoteId: id,
          })
        } else {
          const nextRightActiveNoteIds = state.rightActiveNoteIds.includes(id)
            ? state.rightActiveNoteIds
            : [...state.rightActiveNoteIds, id]
          set({
            notes: updatedNotes,
            rightActiveNoteIds: nextRightActiveNoteIds,
            rightActiveNoteId: id,
            isSplit: true,
          })
        }
      },

      openNoteToRight: async (id) => {
        const state = get()

        // 1. Fetch heavy content from IndexedDB
        const fullContent = await db.getContent(id)

        // 2. Inject into memory
        const updatedNotes = state.notes.map((note) =>
          note.id === id ? { ...note, content: fullContent } : note
        )

        const nextRightActiveNoteIds = state.rightActiveNoteIds.includes(id)
          ? state.rightActiveNoteIds
          : [...state.rightActiveNoteIds, id]

        set({
          notes: updatedNotes,
          rightActiveNoteIds: nextRightActiveNoteIds,
          rightActiveNoteId: id,
          isSplit: true,
          activePanel: "right",
        })
      },

      openNoteInCurrentTab: async (id) => {
        const state = get()
        const panel = state.activePanel

        // 1. Fetch heavy content from IndexedDB
        const fullContent = await db.getContent(id)

        // 2. Inject into memory
        const updatedNotes = state.notes.map((note) =>
          note.id === id ? { ...note, content: fullContent } : note
        )

        if (panel === "left") {
          const currentActiveId = state.activeNoteId
          let nextActiveNoteIds = [...state.activeNoteIds]

          if (currentActiveId && nextActiveNoteIds.includes(currentActiveId)) {
            const index = nextActiveNoteIds.indexOf(currentActiveId)
            nextActiveNoteIds[index] = id
            nextActiveNoteIds = Array.from(new Set(nextActiveNoteIds))
          } else {
            nextActiveNoteIds = [...nextActiveNoteIds, id]
          }

          set({
            notes: updatedNotes,
            activeNoteIds: nextActiveNoteIds,
            activeNoteId: id,
          })
        } else {
          const currentRightActiveId = state.rightActiveNoteId
          let nextRightActiveNoteIds = [...state.rightActiveNoteIds]

          if (currentRightActiveId && nextRightActiveNoteIds.includes(currentRightActiveId)) {
            const index = nextRightActiveNoteIds.indexOf(currentRightActiveId)
            nextRightActiveNoteIds[index] = id
            nextRightActiveNoteIds = Array.from(new Set(nextRightActiveNoteIds))
          } else {
            nextRightActiveNoteIds = [...nextRightActiveNoteIds, id]
          }

          set({
            notes: updatedNotes,
            rightActiveNoteIds: nextRightActiveNoteIds,
            rightActiveNoteId: id,
            isSplit: true,
          })
        }
      },

      closeNote: (id, panel) => {
        set((state) => {
          let nextActiveNoteIds = state.activeNoteIds
          let nextActiveNoteId = state.activeNoteId
          let nextRightActiveNoteIds = state.rightActiveNoteIds
          let nextRightActiveNoteId = state.rightActiveNoteId
          let nextIsSplit = state.isSplit
          let nextActivePanel = state.activePanel

          if (panel === "left") {
            nextActiveNoteIds = state.activeNoteIds.filter((noteId) => noteId !== id)
            if (id === state.activeNoteId) {
              const closedIndex = state.activeNoteIds.indexOf(id)
              if (nextActiveNoteIds.length > 0) {
                const newIndex = Math.max(0, closedIndex - 1)
                nextActiveNoteId = nextActiveNoteIds[newIndex]
              } else {
                nextActiveNoteId = null
              }
            }
          } else {
            nextRightActiveNoteIds = state.rightActiveNoteIds.filter((noteId) => noteId !== id)
            if (id === state.rightActiveNoteId) {
              const closedIndex = state.rightActiveNoteIds.indexOf(id)
              if (nextRightActiveNoteIds.length > 0) {
                const newIndex = Math.max(0, closedIndex - 1)
                nextRightActiveNoteId = nextRightActiveNoteIds[newIndex]
              } else {
                nextRightActiveNoteId = null
              }
            }
            if (nextRightActiveNoteIds.length === 0) {
              nextIsSplit = false
              nextActivePanel = "left"
            }
          }

          // If the note is no longer open in either panel, purge content from memory
          const isOpenElsewhere = nextActiveNoteIds.includes(id) || nextRightActiveNoteIds.includes(id)
          const nextNotes = isOpenElsewhere
            ? state.notes
            : state.notes.map((n) => (n.id === id ? { ...n, content: "" } : n))

          return {
            notes: nextNotes,
            activeNoteIds: nextActiveNoteIds,
            activeNoteId: nextActiveNoteId,
            rightActiveNoteIds: nextRightActiveNoteIds,
            rightActiveNoteId: nextRightActiveNoteId,
            isSplit: nextIsSplit,
            activePanel: nextActivePanel,
          }
        })
      },

      closeOthers: (id, panel) => {
        set((state) => {
          let nextActiveNoteIds = state.activeNoteIds
          let nextActiveNoteId = state.activeNoteId
          let nextRightActiveNoteIds = state.rightActiveNoteIds
          let nextRightActiveNoteId = state.rightActiveNoteId
          const nextIsSplit = state.isSplit
          const nextActivePanel = state.activePanel

          if (panel === "left") {
            nextActiveNoteIds = [id]
            nextActiveNoteId = id
          } else {
            nextRightActiveNoteIds = [id]
            nextRightActiveNoteId = id
          }

          const nextNotes = state.notes.map((n) => {
            const isOpen = nextActiveNoteIds.includes(n.id) || nextRightActiveNoteIds.includes(n.id)
            return isOpen ? n : { ...n, content: "" }
          })

          return {
            notes: nextNotes,
            activeNoteIds: nextActiveNoteIds,
            activeNoteId: nextActiveNoteId,
            rightActiveNoteIds: nextRightActiveNoteIds,
            rightActiveNoteId: nextRightActiveNoteId,
            isSplit: nextIsSplit,
            activePanel: nextActivePanel,
          }
        })
      },

      closeLeft: (id, panel) => {
        set((state) => {
          let nextActiveNoteIds = state.activeNoteIds
          let nextActiveNoteId = state.activeNoteId
          let nextRightActiveNoteIds = state.rightActiveNoteIds
          let nextRightActiveNoteId = state.rightActiveNoteId

          if (panel === "left") {
            const index = state.activeNoteIds.indexOf(id)
            if (index > 0) {
              const closed = state.activeNoteIds.slice(0, index)
              nextActiveNoteIds = state.activeNoteIds.slice(index)
              if (closed.includes(state.activeNoteId as string)) {
                nextActiveNoteId = id
              }
            }
          } else {
            const index = state.rightActiveNoteIds.indexOf(id)
            if (index > 0) {
              const closed = state.rightActiveNoteIds.slice(0, index)
              nextRightActiveNoteIds = state.rightActiveNoteIds.slice(index)
              if (closed.includes(state.rightActiveNoteId as string)) {
                nextRightActiveNoteId = id
              }
            }
          }

          const nextNotes = state.notes.map((n) => {
            const isOpen = nextActiveNoteIds.includes(n.id) || nextRightActiveNoteIds.includes(n.id)
            return isOpen ? n : { ...n, content: "" }
          })

          return {
            notes: nextNotes,
            activeNoteIds: nextActiveNoteIds,
            activeNoteId: nextActiveNoteId,
            rightActiveNoteIds: nextRightActiveNoteIds,
            rightActiveNoteId: nextRightActiveNoteId,
          }
        })
      },

      closeRight: (id, panel) => {
        set((state) => {
          let nextActiveNoteIds = state.activeNoteIds
          let nextActiveNoteId = state.activeNoteId
          let nextRightActiveNoteIds = state.rightActiveNoteIds
          let nextRightActiveNoteId = state.rightActiveNoteId

          if (panel === "left") {
            const index = state.activeNoteIds.indexOf(id)
            if (index >= 0 && index < state.activeNoteIds.length - 1) {
              const closed = state.activeNoteIds.slice(index + 1)
              nextActiveNoteIds = state.activeNoteIds.slice(0, index + 1)
              if (closed.includes(state.activeNoteId as string)) {
                nextActiveNoteId = id
              }
            }
          } else {
            const index = state.rightActiveNoteIds.indexOf(id)
            if (index >= 0 && index < state.rightActiveNoteIds.length - 1) {
              const closed = state.rightActiveNoteIds.slice(index + 1)
              nextRightActiveNoteIds = state.rightActiveNoteIds.slice(0, index + 1)
              if (closed.includes(state.rightActiveNoteId as string)) {
                nextRightActiveNoteId = id
              }
            }
          }

          const nextNotes = state.notes.map((n) => {
            const isOpen = nextActiveNoteIds.includes(n.id) || nextRightActiveNoteIds.includes(n.id)
            return isOpen ? n : { ...n, content: "" }
          })

          return {
            notes: nextNotes,
            activeNoteIds: nextActiveNoteIds,
            activeNoteId: nextActiveNoteId,
            rightActiveNoteIds: nextRightActiveNoteIds,
            rightActiveNoteId: nextRightActiveNoteId,
          }
        })
      },

      closeAll: (panel) => {
        set((state) => {
          let nextActiveNoteIds = state.activeNoteIds
          let nextActiveNoteId = state.activeNoteId
          let nextRightActiveNoteIds = state.rightActiveNoteIds
          let nextRightActiveNoteId = state.rightActiveNoteId
          let nextIsSplit = state.isSplit
          let nextActivePanel = state.activePanel

          if (panel === "left") {
            nextActiveNoteIds = []
            nextActiveNoteId = null
          } else {
            nextRightActiveNoteIds = []
            nextRightActiveNoteId = null
            nextIsSplit = false
            nextActivePanel = "left"
          }

          const nextNotes = state.notes.map((n) => {
            const isOpen = nextActiveNoteIds.includes(n.id) || nextRightActiveNoteIds.includes(n.id)
            return isOpen ? n : { ...n, content: "" }
          })

          return {
            notes: nextNotes,
            activeNoteIds: nextActiveNoteIds,
            activeNoteId: nextActiveNoteId,
            rightActiveNoteIds: nextRightActiveNoteIds,
            rightActiveNoteId: nextRightActiveNoteId,
            isSplit: nextIsSplit,
            activePanel: nextActivePanel,
          }
        })
      },

      // =====================
      // FOLDER ACTIONS
      // =====================
      addFolder: (folderData) => {
        set((state) => {
          const newFolder: FolderType = {
            ...folderData,
            id: generateId(),
          }
          return { folders: [...state.folders, newFolder] }
        })
        broadcastSync()
      },

      updateFolder: (id, updates) => {
        set(
          (state) => ({
            folders: state.folders.map((folder) =>
              folder.id === id ? { ...folder, ...updates } : folder
            ),
          }),
          false
        )
        broadcastSync()
      },

      deleteFolder: (id) => {
        set((state) => {
          const getDescendants = (folderId: string): { folderIds: string[]; noteIds: string[] } => {
            const folderIds = [folderId]
            const noteIds: string[] = []

            state.notes.forEach((n) => {
              if (n.folderId === folderId) noteIds.push(n.id)
            })

            const children = state.folders.filter((f) => f.parentId === folderId)
            children.forEach((child) => {
              const sub = getDescendants(child.id)
              folderIds.push(...sub.folderIds)
              noteIds.push(...sub.noteIds)
            })

            return { folderIds, noteIds }
          }

          const { folderIds, noteIds } = getDescendants(id)

          // Delete IndexedDB content for all deleted notes
          noteIds.forEach((nid) => db.deleteContent(nid))

          const nextActiveNoteIds = state.activeNoteIds.filter((nid) => !noteIds.includes(nid))
          let nextActiveNoteId = state.activeNoteId
          const nextRightActiveNoteIds = state.rightActiveNoteIds.filter((nid) => !noteIds.includes(nid))
          let nextRightActiveNoteId = state.rightActiveNoteId
          let nextIsSplit = state.isSplit
          let nextActivePanel = state.activePanel

          if (state.activeNoteId && noteIds.includes(state.activeNoteId)) {
            if (nextActiveNoteIds.length > 0) {
              nextActiveNoteId = nextActiveNoteIds[nextActiveNoteIds.length - 1]
            } else {
              nextActiveNoteId = null
            }
          }

          if (state.rightActiveNoteId && noteIds.includes(state.rightActiveNoteId)) {
            if (nextRightActiveNoteIds.length > 0) {
              nextRightActiveNoteId = nextRightActiveNoteIds[nextRightActiveNoteIds.length - 1]
            } else {
              nextRightActiveNoteId = null
            }
          }

          if (nextRightActiveNoteIds.length === 0) {
            nextIsSplit = false
            nextActivePanel = "left"
          }

          return {
            folders: state.folders.filter((f) => !folderIds.includes(f.id)),
            notes: state.notes.filter((n) => !noteIds.includes(n.id)),
            activeNoteIds: nextActiveNoteIds,
            activeNoteId: nextActiveNoteId,
            rightActiveNoteIds: nextRightActiveNoteIds,
            rightActiveNoteId: nextRightActiveNoteId,
            isSplit: nextIsSplit,
            activePanel: nextActivePanel,
          }
        })
        broadcastSync()
      },

      // =====================
      // SESSION ACTIONS
      // =====================
      setActiveNoteId: (id) => set({ activeNoteId: id }),
      setRightActiveNoteId: (id) => set({ rightActiveNoteId: id }),
      setIsSplit: (isSplit) => set({ isSplit }),
      setActivePanel: (panel) => set({ activePanel: panel }),
      setSearchQuery: (query) => set({ searchQuery: query }),
    }),
    {
      name: "notes-app-storage",
      storage: createJSONStorage(() => idbStateStorage),

      // CRITICAL: Prevent heavy content from being saved in the main state payload
      // to keep initial load times instant. Active session states (open tab IDs and active panels)
      // are persisted here to maintain user state across refreshes/reopens.
      partialize: (state) => ({
        notes: state.notes.map((note) => ({ ...note, content: "" })),
        folders: state.folders,
        activeNoteIds: state.activeNoteIds,
        activeNoteId: state.activeNoteId,
        rightActiveNoteIds: state.rightActiveNoteIds,
        rightActiveNoteId: state.rightActiveNoteId,
        isSplit: state.isSplit,
        activePanel: state.activePanel,
      }),

      onRehydrateStorage: () => {
        return async (rehydratedState, error) => {
          if (error || !rehydratedState) return

          try {
            const notesToReload = Array.from(
              new Set(
                [
                  ...(rehydratedState.activeNoteIds || []),
                  ...(rehydratedState.rightActiveNoteIds || []),
                  rehydratedState.activeNoteId,
                  rehydratedState.rightActiveNoteId,
                ].filter(Boolean) as string[]
              )
            )

            if (notesToReload.length > 0) {
              const updatedNotes = [...rehydratedState.notes]
              for (const id of notesToReload) {
                const fullContent = await db.getContent(id)
                const index = updatedNotes.findIndex((n) => n.id === id)
                if (index !== -1) {
                  updatedNotes[index] = { ...updatedNotes[index], content: fullContent }
                }
              }
              useNoteStore.setState({ notes: updatedNotes })
            }
          } catch (err) {
            console.error("Failed to load active note contents on rehydration:", err)
          }
        }
      },
    }
  )
)

export const useActiveNotes = () => {
  const notes = useNoteStore((state) => state.notes)
  const activeIds = useNoteStore((state) => state.activeNoteIds)

  return useMemo(() => {
    return notes.filter((note) => activeIds.includes(note.id))
  }, [notes, activeIds])
}

// =====================
// BROADCAST CHANNEL FOR MULTI-TAB SYNC
// =====================
let isSyncingFromChannel = false
const channel = typeof window !== "undefined" && typeof BroadcastChannel !== "undefined"
  ? new BroadcastChannel("notebook-sync")
  : null

if (channel) {
  channel.onmessage = async (event) => {
    if (event.data === "sync" && !isSyncingFromChannel) {
      isSyncingFromChannel = true
      try {
        // Rehydrate the store metadata
        await useNoteStore.persist.rehydrate()

        // Reload contents of active notes
        const state = useNoteStore.getState()
        const notesToReload = [
          ...new Set(
            [state.activeNoteId, state.rightActiveNoteId].filter(Boolean) as string[]
          ),
        ]

        const updatedNotes = [...state.notes]
        for (const id of notesToReload) {
          const fullContent = await db.getContent(id)
          const index = updatedNotes.findIndex((n) => n.id === id)
          if (index !== -1) {
            updatedNotes[index] = { ...updatedNotes[index], content: fullContent }
          }
        }

        useNoteStore.setState({ notes: updatedNotes })
      } catch (err) {
        console.error("Failed to sync from broadcast channel:", err)
      } finally {
        isSyncingFromChannel = false
      }
    }
  }
}

export const broadcastSync = () => {
  if (channel && !isSyncingFromChannel) {
    channel.postMessage("sync")
  }
}

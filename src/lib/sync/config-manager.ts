// Config & manifest manager for Google Drive sync
// Builds config.json and db.json from current app state

import { getAllNodes, type FileNode } from "@/lib/idb-fs";
import { useNoteStore, type NoteType, type FolderType } from "@/hooks/use-note-store";
import { db } from "@/hooks/db";
import { useDictionaryStore } from "@/hooks/use-dictionary-store";

// --- Types ---

export interface SyncConfig {
  version: 1;
  theme: string;
  updatedAt: number;
  customDictionary?: string[];
}

export interface ManifestEntry {
  driveId: string;
  updatedAt: number;
}

export interface SyncManifest {
  version: 1;
  lastSyncedAt: number;
  /** Mapping from notebookPath → Drive file metadata */
  files: Record<string, ManifestEntry>;
}

// --- Config ---

export function buildConfig(): SyncConfig {
  // Read theme from localStorage (next-themes stores it there)
  const theme = localStorage.getItem("theme") ?? "system";
  const customDictionary = useDictionaryStore.getState().customWords;

  return {
    version: 1,
    theme,
    customDictionary,
    updatedAt: Date.now(),
  };
}

export function applyConfig(config: SyncConfig): void {
  if (config.theme) {
    localStorage.setItem("theme", config.theme);
  }
  if (config.customDictionary && Array.isArray(config.customDictionary)) {
    const current = useDictionaryStore.getState().customWords;
    const merged = Array.from(new Set([...current, ...config.customDictionary]));
    useDictionaryStore.setState({ customWords: merged });
  }
}

// --- Manifest ---

export function createEmptyManifest(): SyncManifest {
  return {
    version: 1,
    lastSyncedAt: 0,
    files: {},
  };
}

// --- Notes → files mapping ---

/**
 * Build a path for a note based on its folder hierarchy.
 * e.g. "folder1/subfolder/My Note.md"
 */
function buildNotePath(
  note: NoteType,
  folders: FolderType[]
): string {
  const segments: string[] = [];
  let currentFolderId = note.folderId;

  while (currentFolderId) {
    const folder = folders.find((f) => f.id === currentFolderId);
    if (!folder) break;
    segments.unshift(folder.name);
    currentFolderId = folder.parentId;
  }

  // Sanitize title for filesystem
  const safeName = note.title.replace(/[/\\:*?"<>|]/g, "_");
  segments.push(`${safeName}.md`);
  return segments.join("/");
}

export interface LocalFileEntry {
  /** Path relative to the data category root (e.g. "folder/note.md") */
  path: string;
  /** Full notebook path including category prefix (e.g. "data/notes/folder/note.md") */
  notebookPath: string;
  /** Blob content to upload */
  getBlob: () => Promise<Blob>;
  /** Local timestamp for diffing */
  updatedAt: number;
}

/**
 * Gather all local files (notes + file-store) that need syncing.
 */
export async function gatherLocalFiles(): Promise<LocalFileEntry[]> {
  const entries: LocalFileEntry[] = [];

  // 1. Notes from Zustand store
  const { notes, folders } = useNoteStore.getState();
  for (const note of notes) {
    const relativePath = buildNotePath(note, folders);
    const notebookPath = `data/notes/${relativePath}`;
    entries.push({
      path: relativePath,
      notebookPath,
      getBlob: async () => {
        const content = await db.getContent(note.id);
        return new Blob([content], { type: "text/markdown" });
      },
      updatedAt: new Date(note.updatedAt).getTime(),
    });
  }

  // 2. Files from idb-fs file store
  const fileNodes: FileNode[] = await getAllNodes();
  for (const node of fileNodes) {
    if (node.type === "folder") continue;
    const notebookPath = `data/files/${node.path}`;
    entries.push({
      path: node.path,
      notebookPath,
      getBlob: async () => {
        const { getBlob } = await import("@/lib/idb-fs");
        const blob = await getBlob(node.path);
        return blob ?? new Blob([]);
      },
      updatedAt: node.updatedAt,
    });
  }

  return entries;
}

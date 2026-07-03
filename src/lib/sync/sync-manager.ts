// Sync engine — manifest-based diffing, manual-only (no auto-sync)

import { putNode, putBlob, type FileNode } from "@/lib/idb-fs";
import { db } from "@/hooks/db";
import { useNoteStore } from "@/hooks/use-note-store";
import {
  ensureRootFolder,
  ensureNestedPath,
  findFile,
  uploadFile,
  uploadJSON,
  downloadFile,
  downloadJSON,
} from "./google-drive-adapter";
import {
  buildConfig,
  applyConfig,
  gatherLocalFiles,
  createEmptyManifest,
  type SyncConfig,
  type SyncManifest,
} from "./config-manager";

// --- Types ---

type SyncStatus = "idle" | "syncing" | "error" | "connected" | "disconnected";

export type SyncProgress = {
  phase: string;
  current: number;
  total: number;
};

type SyncListener = (
  status: SyncStatus,
  lastSyncedAt: number | null,
  progress: SyncProgress | null
) => void;

// --- Persistence Keys ---

const STATUS_KEY = "memoryleak-sync-status";
const LAST_SYNCED_KEY = "memoryleak-last-synced";

function restorePersistedState(): {
  status: SyncStatus;
  lastSyncedAt: number | null;
} {
  if (typeof localStorage === "undefined") {
    return { status: "disconnected", lastSyncedAt: null };
  }
  // Only restore "connected" if a token still exists in sessionStorage
  const hasToken = !!sessionStorage.getItem("memoryleak-drive-token");
  const savedStatus = localStorage.getItem(STATUS_KEY) as SyncStatus | null;
  const savedTs = localStorage.getItem(LAST_SYNCED_KEY);

  return {
    status: hasToken && savedStatus === "connected" ? "connected" : "disconnected",
    lastSyncedAt: savedTs ? Number(savedTs) : null,
  };
}

function persistState(status: SyncStatus, ts: number | null) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STATUS_KEY, status);
  if (ts) localStorage.setItem(LAST_SYNCED_KEY, String(ts));
  else localStorage.removeItem(LAST_SYNCED_KEY);
}

// --- State ---

const listeners = new Set<SyncListener>();
const _restored = restorePersistedState();
let currentStatus: SyncStatus = _restored.status;
let lastSyncedAt: number | null = _restored.lastSyncedAt;
let currentProgress: SyncProgress | null = null;

function emit(
  status: SyncStatus,
  progress: SyncProgress | null = null
) {
  currentStatus = status;
  currentProgress = progress;
  persistState(status, lastSyncedAt);
  listeners.forEach((fn) => fn(status, lastSyncedAt, progress));
}

export function getStatus() {
  return { status: currentStatus, lastSyncedAt, progress: currentProgress };
}

export function subscribe(fn: SyncListener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function markConnected() {
  emit("connected");
}

// --- Main sync ---

export async function syncAll(): Promise<void> {
  emit("syncing", { phase: "Preparing...", current: 0, total: 0 });

  try {
    // 1. Ensure root folder
    emit("syncing", { phase: "Finding Drive folder...", current: 0, total: 0 });
    const rootId = await ensureRootFolder();

    // 2. Download or create manifest
    emit("syncing", { phase: "Reading sync index...", current: 0, total: 0 });
    const dbJsonId = await findFile("db.json", rootId);
    const manifest: SyncManifest = dbJsonId
      ? await downloadJSON<SyncManifest>(dbJsonId)
      : createEmptyManifest();

    // 3. Download and apply remote config (if exists)
    const configJsonId = await findFile("config.json", rootId);
    if (configJsonId) {
      const remoteConfig = await downloadJSON<SyncConfig>(configJsonId);
      applyConfig(remoteConfig);
    }

    // 4. Gather local files
    emit("syncing", { phase: "Scanning local files...", current: 0, total: 0 });
    const localFiles = await gatherLocalFiles();

    // 5. Build sets for diffing
    const localPaths = new Set(localFiles.map((f) => f.notebookPath));

    // Calculate totals for progress
    const toUpload: typeof localFiles = [];
    const toDownload: string[] = [];

    // Files to upload: local newer or not in remote
    for (const local of localFiles) {
      const remote = manifest.files[local.notebookPath];
      if (!remote || local.updatedAt > remote.updatedAt) {
        toUpload.push(local);
      }
    }

    // Files to download: remote newer and not deleted locally
    for (const [remotePath, entry] of Object.entries(manifest.files)) {
      if (!localPaths.has(remotePath)) {
        // File exists in manifest but not locally — could be deleted locally or new from another device
        // For first iteration, we download (treat remote as source of truth for new files)
        toDownload.push(remotePath);
      } else {
        const local = localFiles.find((f) => f.notebookPath === remotePath);
        if (local && entry.updatedAt > local.updatedAt) {
          toDownload.push(remotePath);
        }
      }
    }

    // Files to delete from remote: in manifest but not locally (deleted locally)
    // Skip for now — only sync additions/updates to avoid accidental data loss
    // Users can clean up Drive manually

    const totalOps = toUpload.length + toDownload.length;
    let currentOp = 0;

    // 6. Upload local files that are newer
    for (const file of toUpload) {
      currentOp++;
      const fileName = file.notebookPath.split("/").pop() ?? "file";
      emit("syncing", {
        phase: `Uploading: ${fileName}`,
        current: currentOp,
        total: totalOps,
      });

      // Ensure the folder path exists in Drive
      const pathParts = file.notebookPath.split("/");
      const folderPath = pathParts.slice(0, -1).join("/");
      const parentId = folderPath
        ? await ensureNestedPath(folderPath, rootId)
        : rootId;

      const blob = await file.getBlob();
      const existingId = manifest.files[file.notebookPath]?.driveId;
      const driveId = await uploadFile(
        fileName,
        blob,
        parentId,
        file.notebookPath,
        file.updatedAt,
        existingId
      );

      // Update manifest
      manifest.files[file.notebookPath] = {
        driveId,
        updatedAt: file.updatedAt,
      };
    }

    // 7. Download remote files that are newer
    for (const remotePath of toDownload) {
      currentOp++;
      const fileName = remotePath.split("/").pop() ?? "file";
      emit("syncing", {
        phase: `Downloading: ${fileName}`,
        current: currentOp,
        total: totalOps,
      });

      const entry = manifest.files[remotePath];
      if (!entry) continue;

      const blob = await downloadFile(entry.driveId);

      // Determine where to save based on path prefix
      if (remotePath.startsWith("data/notes/")) {
        await importNoteFromDrive(remotePath, blob);
      } else if (remotePath.startsWith("data/files/")) {
        await importFileFromDrive(remotePath, blob);
      }
    }

    // 8. Upload updated manifest
    emit("syncing", {
      phase: "Saving sync index...",
      current: totalOps,
      total: totalOps,
    });
    manifest.lastSyncedAt = Date.now();
    await uploadJSON("db.json", manifest, rootId, dbJsonId ?? undefined);

    // 9. Upload config
    const config = buildConfig();
    await uploadJSON("config.json", config, rootId, configJsonId ?? undefined);

    lastSyncedAt = Date.now();
    emit("connected");
  } catch (err) {
    console.error("[sync]", err);
    emit("error");
    throw err;
  }
}

// --- Import helpers ---

async function importNoteFromDrive(
  notebookPath: string,
  blob: Blob
): Promise<void> {
  // Extract path: "data/notes/folder/My Note.md" → "folder/My Note.md"
  const relativePath = notebookPath.replace(/^data\/notes\//, "");
  const content = await blob.text();

  const segments = relativePath.split("/");
  const fileName = segments.pop() ?? "";
  const title = fileName.replace(/\.md$/, "");

  // Check if note already exists by matching the path structure
  const store = useNoteStore.getState();
  const existingNote = store.notes.find((n) => {
    const folders = store.folders;
    const builtPath = buildNoteRelativePath(n, folders);
    return builtPath === relativePath;
  });

  if (existingNote) {
    // Update existing note content
    await db.saveContent(existingNote.id, content);
    useNoteStore.setState((state) => ({
      notes: state.notes.map((n) =>
        n.id === existingNote.id
          ? { ...n, updatedAt: new Date().toISOString() }
          : n
      ),
    }));
  } else {
    // Create new note — ensure folders exist
    let folderId: string | null = null;
    const folderSegments = segments; // remaining segments are folder names

    for (const folderName of folderSegments) {
      const existing = store.folders.find(
        (f) => f.name === folderName && f.parentId === folderId
      );
      if (existing) {
        folderId = existing.id;
      } else {
        const newId = crypto.randomUUID();
        useNoteStore.setState((state) => ({
          folders: [
            ...state.folders,
            { id: newId, name: folderName, parentId: folderId },
          ],
        }));
        folderId = newId;
      }
    }

    // Add the note
    await store.addNote({
      title,
      path: `/${relativePath}`,
      folderId,
    });

    // Save content for the newly created note
    const updatedState = useNoteStore.getState();
    const newNote = updatedState.notes.find((n) => n.title === title && n.folderId === folderId);
    if (newNote) {
      await db.saveContent(newNote.id, content);
    }
  }
}

function buildNoteRelativePath(
  note: { title: string; folderId: string | null },
  folders: { id: string; name: string; parentId: string | null }[]
): string {
  const segments: string[] = [];
  let currentFolderId = note.folderId;
  while (currentFolderId) {
    const folder = folders.find((f) => f.id === currentFolderId);
    if (!folder) break;
    segments.unshift(folder.name);
    currentFolderId = folder.parentId;
  }
  const safeName = note.title.replace(/[/\\:*?"<>|]/g, "_");
  segments.push(`${safeName}.md`);
  return segments.join("/");
}

async function importFileFromDrive(
  notebookPath: string,
  blob: Blob
): Promise<void> {
  // Extract path: "data/files/docs/intro.md" → "docs/intro.md"
  const relativePath = notebookPath.replace(/^data\/files\//, "");
  const name = relativePath.split("/").pop() ?? relativePath;

  const node: FileNode = {
    path: relativePath,
    name,
    type: "file",
    mimeType: blob.type || "application/octet-stream",
    size: blob.size,
    updatedAt: Date.now(),
  };

  await putNode(node);
  await putBlob(relativePath, blob);
}

// --- Disconnect ---

export function disconnect() {
  lastSyncedAt = null;
  emit("disconnected");
}

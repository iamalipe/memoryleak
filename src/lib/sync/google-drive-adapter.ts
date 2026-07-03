// Google Drive adapter — visible folder tree using Drive REST API v3
// Uses drive.file scope so files appear in the user's Drive

declare const google: {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: { access_token?: string; error?: string }) => void;
      }) => { requestAccessToken: () => void };
    };
  };
};

const SCOPE = "https://www.googleapis.com/auth/drive.file";
const API_BASE = "https://www.googleapis.com/drive/v3";
const UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";
const TOKEN_STORAGE_KEY = "memoryleak-drive-token";
const DRIVE_FOLDER_KEY = "memoryleak-drive-folder-name";

export function getRootFolderName(): string {
  if (typeof localStorage !== "undefined") {
    return localStorage.getItem(DRIVE_FOLDER_KEY) || "MemoryLeak";
  }
  return "MemoryLeak";
}

export function setRootFolderName(name: string): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(DRIVE_FOLDER_KEY, name);
  }
}

// Restore token from sessionStorage on module load
let accessToken: string | null =
  typeof sessionStorage !== "undefined"
    ? sessionStorage.getItem(TOKEN_STORAGE_KEY)
    : null;

// --- Types ---

export type DriveFileMeta = {
  id: string;
  name: string;
  mimeType: string;
  parentId: string;
  notebookPath?: string; // appProperty for mapping
  updatedAt?: number; // appProperty timestamp
};

// --- Auth ---

export function isGISLoaded(): boolean {
  return typeof google !== "undefined";
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  // Persist to sessionStorage so it survives page refresh
  if (typeof sessionStorage !== "undefined") {
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }
}

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

export function createTokenClient(
  clientId: string,
  onSuccess: (token: string) => void,
  onError: (err: string) => void
) {
  if (!isGISLoaded()) {
    onError("Google Identity Services not loaded");
    return null;
  }
  return google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPE,
    callback: (response) => {
      if (response.access_token) {
        onSuccess(response.access_token);
      } else {
        onError(response.error ?? "Unknown error");
      }
    },
  });
}

// --- Folder Operations ---

const FOLDER_MIME = "application/vnd.google-apps.folder";

/**
 * Find a folder by name under a parent (or root if no parentId).
 * Returns the Drive file ID or null.
 */
export async function findFolder(
  name: string,
  parentId?: string
): Promise<string | null> {
  const parentQ = parentId ? `'${parentId}' in parents` : "'root' in parents";
  const q = `${parentQ} and name='${name}' and mimeType='${FOLDER_MIME}' and trashed=false`;
  const res = await fetch(
    `${API_BASE}/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`,
    { headers: authHeaders() }
  );
  if (!res.ok) throw new Error(`Drive findFolder failed: ${res.status}`);
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

/**
 * Create a folder under a parent.
 */
export async function createFolder(
  name: string,
  parentId?: string
): Promise<string> {
  const metadata: Record<string, unknown> = {
    name,
    mimeType: FOLDER_MIME,
  };
  if (parentId) metadata.parents = [parentId];

  const res = await fetch(`${API_BASE}/files`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });
  if (!res.ok) throw new Error(`Drive createFolder failed: ${res.status}`);
  const data = await res.json();
  return data.id;
}

/**
 * Find or create a folder by name under a parent.
 */
export async function findOrCreateFolder(
  name: string,
  parentId?: string
): Promise<string> {
  const existing = await findFolder(name, parentId);
  if (existing) return existing;
  return createFolder(name, parentId);
}

/**
 * Rename a folder in Google Drive.
 */
export async function renameFolder(
  folderId: string,
  newName: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/files/${folderId}`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ name: newName }),
  });
  if (!res.ok) throw new Error(`Drive renameFolder failed: ${res.status}`);
}

/**
 * Ensure the root folder exists in Drive.
 */
export async function ensureRootFolder(): Promise<string> {
  return findOrCreateFolder(getRootFolderName());
}

/**
 * Ensure a nested path of folders exists under a parent.
 * e.g. ensureNestedPath("data/notes/projects", rootId) creates data/, data/notes/, data/notes/projects/
 * Returns the ID of the deepest folder.
 */
export async function ensureNestedPath(
  path: string,
  parentId: string
): Promise<string> {
  const segments = path.split("/").filter(Boolean);
  let currentParent = parentId;
  for (const segment of segments) {
    currentParent = await findOrCreateFolder(segment, currentParent);
  }
  return currentParent;
}

// --- File Operations ---

/**
 * List all files (non-folder) under a specific folder, recursively.
 * Returns flat list with appProperties for mapping.
 */
export async function listAllFiles(
  folderId: string
): Promise<DriveFileMeta[]> {
  const result: DriveFileMeta[] = [];
  let pageToken: string | undefined;

  do {
    const q = `'${folderId}' in parents and trashed=false`;
    let url = `${API_BASE}/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,parents,appProperties)&pageSize=1000`;
    if (pageToken) url += `&pageToken=${pageToken}`;

    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Drive listAllFiles failed: ${res.status}`);
    const data = await res.json();

    for (const f of data.files ?? []) {
      const meta: DriveFileMeta = {
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        parentId: folderId,
        notebookPath: f.appProperties?.notebookPath,
        updatedAt: f.appProperties?.updatedAt
          ? Number(f.appProperties.updatedAt)
          : undefined,
      };

      if (f.mimeType === FOLDER_MIME) {
        // Recurse into subfolders
        const children = await listAllFiles(f.id);
        result.push(...children);
      } else {
        result.push(meta);
      }
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return result;
}

/**
 * Upload a file to a specific folder. If existingId is provided, updates the file.
 */
export async function uploadFile(
  name: string,
  blob: Blob,
  parentId: string,
  notebookPath: string,
  updatedAt: number,
  existingId?: string
): Promise<string> {
  const metadata: Record<string, unknown> = {
    name,
    appProperties: { notebookPath, updatedAt: String(updatedAt) },
  };
  if (!existingId) {
    metadata.parents = [parentId];
  }

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append("file", blob);

  const url = existingId
    ? `${UPLOAD_BASE}/files/${existingId}?uploadType=multipart`
    : `${UPLOAD_BASE}/files?uploadType=multipart`;

  const res = await fetch(url, {
    method: existingId ? "PATCH" : "POST",
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error(`Drive upload failed: ${res.status}`);
  const data = await res.json();
  return data.id;
}

/**
 * Download a file's content as a Blob.
 */
export async function downloadFile(driveFileId: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}/files/${driveFileId}?alt=media`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Drive download failed: ${res.status}`);
  return res.blob();
}

/**
 * Delete a file from Drive.
 */
export async function deleteDriveFile(driveFileId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/files/${driveFileId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 404)
    throw new Error(`Drive delete failed: ${res.status}`);
}

// --- JSON Helpers (for config.json & db.json) ---

/**
 * Find a JSON file by name directly under a parent folder.
 */
export async function findFile(
  name: string,
  parentId: string
): Promise<string | null> {
  const q = `'${parentId}' in parents and name='${name}' and trashed=false`;
  const res = await fetch(
    `${API_BASE}/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`,
    { headers: authHeaders() }
  );
  if (!res.ok) throw new Error(`Drive findFile failed: ${res.status}`);
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

/**
 * Upload a JSON object as a file. Creates or updates.
 */
export async function uploadJSON(
  name: string,
  obj: unknown,
  parentId: string,
  existingId?: string
): Promise<string> {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json",
  });
  return uploadFile(name, blob, parentId, name, Date.now(), existingId);
}

/**
 * Download and parse a JSON file from Drive.
 */
export async function downloadJSON<T = unknown>(
  driveFileId: string
): Promise<T> {
  const blob = await downloadFile(driveFileId);
  const text = await blob.text();
  return JSON.parse(text) as T;
}

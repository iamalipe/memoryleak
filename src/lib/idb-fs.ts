import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type FileNode = {
  path: string; // e.g. "docs/intro.md" — also the primary key
  name: string;
  type: "file" | "folder";
  mimeType?: string;
  size?: number;
  updatedAt: number;
};

interface NotebookDB extends DBSchema {
  nodes: {
    key: string;
    value: FileNode;
  };
  blobs: {
    key: string;
    value: Blob;
  };
}

let dbPromise: Promise<IDBPDatabase<NotebookDB>> | null = null;

export function initDB() {
  if (!dbPromise) {
    dbPromise = openDB<NotebookDB>("memoryleak-fs", 1, {
      upgrade(db) {
        db.createObjectStore("nodes", { keyPath: "path" });
        db.createObjectStore("blobs");
      },
    });
  }
  return dbPromise;
}

export async function getAllNodes(): Promise<FileNode[]> {
  const db = await initDB();
  return db.getAll("nodes");
}

export async function putNode(node: FileNode): Promise<void> {
  const db = await initDB();
  await db.put("nodes", node);
}

export async function deleteNode(path: string): Promise<void> {
  const db = await initDB();
  await db.delete("nodes", path);
}

export async function getBlob(path: string): Promise<Blob | undefined> {
  const db = await initDB();
  return db.get("blobs", path);
}

export async function putBlob(path: string, blob: Blob): Promise<void> {
  const db = await initDB();
  await db.put("blobs", blob, path);
}

export async function deleteBlob(path: string): Promise<void> {
  const db = await initDB();
  await db.delete("blobs", path);
}

export async function moveNode(
  oldPath: string,
  newParentPath: string
): Promise<void> {
  const db = await initDB();
  const node = await db.get("nodes", oldPath);
  if (!node) return;

  const newPath = newParentPath
    ? `${newParentPath}/${node.name}`
    : node.name;

  // Move all children if it's a folder
  if (node.type === "folder") {
    const allNodes = await db.getAll("nodes");
    const children = allNodes.filter((n) => n.path.startsWith(`${oldPath}/`));
    for (const child of children) {
      const childNewPath = newPath + child.path.slice(oldPath.length);
      await db.delete("nodes", child.path);
      await db.put("nodes", { ...child, path: childNewPath });
      const blob = await db.get("blobs", child.path);
      if (blob) {
        await db.delete("blobs", child.path);
        await db.put("blobs", blob, childNewPath);
      }
    }
  }

  // Move the node itself
  await db.delete("nodes", oldPath);
  await db.put("nodes", { ...node, path: newPath });

  const blob = await db.get("blobs", oldPath);
  if (blob) {
    await db.delete("blobs", oldPath);
    await db.put("blobs", blob, newPath);
  }

  // Update [[wikilinks]] in all markdown files that reference the old path
  const oldName = node.name.replace(/\.md$/, "");
  const newName = node.name.replace(/\.md$/, "");
  if (oldName !== newName) {
    const allNodes = await db.getAll("nodes");
    for (const n of allNodes) {
      if (n.type === "file" && n.mimeType === "text/markdown") {
        const content = await db.get("blobs", n.path);
        if (content) {
          const text = await content.text();
          const updated = text.replaceAll(`[[${oldName}]]`, `[[${newName}]]`);
          if (updated !== text) {
            await db.put("blobs", new Blob([updated], { type: "text/markdown" }), n.path);
          }
        }
      }
    }
  }
}

export async function deleteNodeRecursive(path: string): Promise<void> {
  const db = await initDB();
  const node = await db.get("nodes", path);
  if (!node) return;

  if (node.type === "folder") {
    const allNodes = await db.getAll("nodes");
    const children = allNodes.filter((n) => n.path.startsWith(`${path}/`));
    for (const child of children) {
      await db.delete("nodes", child.path);
      await db.delete("blobs", child.path);
    }
  }

  await db.delete("nodes", path);
  await db.delete("blobs", path);
}

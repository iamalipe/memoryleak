import { create } from "zustand";
import {
  type FileNode,
  getAllNodes,
  putNode,
  putBlob,
  getBlob,
  deleteNodeRecursive,
  moveNode,
} from "@/lib/idb-fs";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

interface FileStore {
  nodes: FileNode[];
  activeFileId: string | null;
  activeContent: string;
  isLoading: boolean;

  loadFromDB: () => Promise<void>;
  createFile: (parentPath: string | null, name: string, blob: Blob) => Promise<string | null>;
  createFolder: (parentPath: string | null, name: string) => Promise<void>;
  updateContent: (path: string, text: string) => Promise<void>;
  renameNode: (oldPath: string, newName: string) => Promise<string>;
  deleteNode: (path: string) => Promise<void>;
  moveNode: (oldPath: string, newParentPath: string) => Promise<void>;
  setActiveFile: (path: string) => Promise<void>;
  setActiveFileId: (path: string | null) => void;
}

export const useFileStore = create<FileStore>((set, get) => ({
  nodes: [],
  activeFileId: null,
  activeContent: "",
  isLoading: false,

  loadFromDB: async () => {
    set({ isLoading: true });
    const nodes = await getAllNodes();
    set({ nodes, isLoading: false });
  },

  createFile: async (parentPath, name, blob) => {
    if (blob.size > MAX_FILE_SIZE) return null;
    const path = parentPath ? `${parentPath}/${name}` : name;
    const node: FileNode = {
      path,
      name,
      type: "file",
      mimeType: blob.type || "text/markdown",
      size: blob.size,
      updatedAt: Date.now(),
    };
    await putNode(node);
    await putBlob(path, blob);
    set((s) => ({ nodes: [...s.nodes.filter((n) => n.path !== path), node] }));
    return path;
  },

  createFolder: async (parentPath, name) => {
    const path = parentPath ? `${parentPath}/${name}` : name;
    const node: FileNode = {
      path,
      name,
      type: "folder",
      updatedAt: Date.now(),
    };
    await putNode(node);
    set((s) => ({ nodes: [...s.nodes.filter((n) => n.path !== path), node] }));
  },

  updateContent: async (path, text) => {
    const blob = new Blob([text], { type: "text/markdown" });
    await putBlob(path, blob);
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.path === path ? { ...n, size: blob.size, updatedAt: Date.now() } : n
      ),
      activeContent: s.activeFileId === path ? text : s.activeContent,
    }));
    // Persist updated metadata
    const node = get().nodes.find((n) => n.path === path);
    if (node) await putNode({ ...node, size: blob.size, updatedAt: Date.now() });
  },

  renameNode: async (oldPath, newName) => {
    const node = get().nodes.find((n) => n.path === oldPath);
    if (!node) return oldPath;
    const parent = oldPath.includes("/")
      ? oldPath.slice(0, oldPath.lastIndexOf("/"))
      : null;
    const newPath = parent ? `${parent}/${newName}` : newName;
    await moveNode(oldPath, parent ?? "");
    // moveNode preserves the name; we need to explicitly set newName
    const updatedNode: FileNode = { ...node, path: newPath, name: newName, updatedAt: Date.now() };
    await putNode(updatedNode);
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.path === oldPath ? updatedNode : n
      ),
      activeFileId: s.activeFileId === oldPath ? newPath : s.activeFileId,
    }));
    return newPath;
  },

  deleteNode: async (path) => {
    await deleteNodeRecursive(path);
    set((s) => ({
      nodes: s.nodes.filter(
        (n) => n.path !== path && !n.path.startsWith(`${path}/`)
      ),
      activeFileId: s.activeFileId === path ? null : s.activeFileId,
      activeContent: s.activeFileId === path ? "" : s.activeContent,
    }));
  },

  moveNode: async (oldPath, newParentPath) => {
    const node = get().nodes.find((n) => n.path === oldPath);
    if (!node) return;
    await moveNode(oldPath, newParentPath);
    const newPath = newParentPath
      ? `${newParentPath}/${node.name}`
      : node.name;
    const updatedNode: FileNode = { ...node, path: newPath, updatedAt: Date.now() };
    set((s) => ({
      nodes: [
        ...s.nodes.filter((n) => n.path !== oldPath && !n.path.startsWith(`${oldPath}/`)),
        updatedNode,
      ],
      activeFileId: s.activeFileId === oldPath ? newPath : s.activeFileId,
    }));
  },

  setActiveFile: async (path) => {
    const blob = await getBlob(path);
    let content = "";
    if (blob) {
      const node = get().nodes.find((n) => n.path === path);
      if (node?.mimeType?.startsWith("text/")) {
        content = await blob.text();
      }
    }
    set({ activeFileId: path, activeContent: content });
  },

  setActiveFileId: (path) => {
    set({ activeFileId: path, activeContent: "" });
  },
}));

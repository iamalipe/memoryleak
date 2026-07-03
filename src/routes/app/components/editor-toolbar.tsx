import { useRef } from "react";
import { FilePlus, FolderPlus, Upload, Bold, Italic, Heading, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useFileStore } from "@/hooks/use-file-store";
import { cn } from "@/lib/utils";

const MAX_SIZE = 100 * 1024 * 1024;

type Props = {
  activeFileId: string | null;
  onInsert?: (text: string) => void;
};

export default function EditorToolbar({ activeFileId, onInsert }: Props) {
  const { createFile, createFolder, nodes } = useFileStore();
  const uploadRef = useRef<HTMLInputElement>(null);

  const activeNode = nodes.find((n) => n.path === activeFileId);
  const parentPath = activeFileId
    ? activeFileId.includes("/")
      ? activeFileId.slice(0, activeFileId.lastIndexOf("/"))
      : null
    : null;

  async function handleNewFile() {
    const name = prompt("File name (include .md for markdown):");
    if (!name?.trim()) return;
    const blob = new Blob([""], { type: "text/markdown" });
    await createFile(parentPath, name.trim(), blob);
  }

  async function handleNewFolder() {
    const name = prompt("Folder name:");
    if (!name?.trim()) return;
    await createFolder(parentPath, name.trim());
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      if (file.size > MAX_SIZE) {
        toast.error(`${file.name} exceeds 100 MB limit`);
        continue;
      }
      const blob = new Blob([await file.arrayBuffer()], { type: file.type });
      await createFile(parentPath, file.name, blob);
    }
    e.target.value = "";
  }

  function insert(wrap: string) {
    onInsert?.(wrap);
  }

  const isMarkdown = activeNode?.mimeType?.startsWith("text/") || !activeNode;

  return (
    <div
      className={cn(
        "flex items-center gap-1 border-b px-2 py-1",
        "bg-background/80 backdrop-blur"
      )}
      data-cy="editor-toolbar"
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        title="New file"
        onClick={handleNewFile}
        data-cy="new-file-btn"
      >
        <FilePlus className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        title="New folder"
        onClick={handleNewFolder}
        data-cy="new-folder-btn"
      >
        <FolderPlus className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        title="Upload file"
        onClick={() => uploadRef.current?.click()}
        data-cy="upload-btn"
      >
        <Upload className="h-4 w-4" />
      </Button>
      <input
        ref={uploadRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleUpload}
        data-cy="upload-input"
      />

      {isMarkdown && activeFileId && (
        <>
          <div className="mx-1 h-4 w-px bg-border" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Bold"
            onClick={() => insert("**")}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Italic"
            onClick={() => insert("_")}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Heading"
            onClick={() => insert("## ")}
          >
            <Heading className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Inline code"
            onClick={() => insert("`")}
          >
            <Code className="h-4 w-4" />
          </Button>
        </>
      )}

      <div className="flex-1" />
      {activeNode && (
        <span className="truncate text-xs text-muted-foreground max-w-[200px]">
          {activeNode.path}
        </span>
      )}
    </div>
  );
}

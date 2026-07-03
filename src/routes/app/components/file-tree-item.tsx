import { useState, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  File,
  Folder,
  FolderOpen,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useFileStore } from "@/hooks/use-file-store";
import type { FileNode } from "@/lib/idb-fs";

type Props = {
  node: FileNode;
  depth: number;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
};

export default function FileTreeItem({
  node,
  depth,
  isActive,
  isExpanded,
  onToggle,
}: Props) {
  const navigate = useNavigate();
  const { setActiveFile, deleteNode, renameNode } = useFileStore();
  const [isRenaming, setIsRenaming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } =
    useDraggable({ id: node.path, data: node });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop:${node.path}`,
    data: node,
    disabled: node.type !== "folder",
  });

  function setRef(el: HTMLElement | null) {
    setDragRef(el);
    if (node.type === "folder") setDropRef(el);
  }

  async function handleClick() {
    if (node.type === "folder") {
      onToggle();
    } else {
      await setActiveFile(node.path);
      navigate({ to: `/app/${node.path}` });
    }
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    const newName = inputRef.current?.value.trim();
    if (newName && newName !== node.name) {
      const newPath = await renameNode(node.path, newName);
      if (node.type === "file") navigate({ to: `/app/${newPath}` });
    }
    setIsRenaming(false);
  }

  const Icon =
    node.type === "folder"
      ? isExpanded
        ? FolderOpen
        : Folder
      : File;

  return (
    <div
      ref={setRef}
      data-cy="file-tree-item"
      style={{ paddingLeft: `${depth * 12 + 4}px` }}
      className={cn(
        "group flex items-center gap-1 rounded-md py-0.5 pr-1 text-sm",
        "hover:bg-accent cursor-pointer select-none",
        isActive && "bg-accent text-accent-foreground font-medium",
        isOver && "ring-2 ring-primary ring-inset",
        isDragging && "opacity-40"
      )}
      onClick={handleClick}
      {...attributes}
      {...listeners}
    >
      {node.type === "folder" && (
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
            isExpanded && "rotate-90"
          )}
        />
      )}
      {node.type === "file" && <span className="w-3.5" />}

      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          node.type === "folder" ? "text-yellow-500" : "text-blue-400"
        )}
      />

      {isRenaming ? (
        <form
          onSubmit={handleRename}
          onClick={(e) => e.stopPropagation()}
          className="flex-1"
        >
          <Input
            ref={inputRef}
            defaultValue={node.name}
            autoFocus
            className="h-5 px-1 py-0 text-sm"
            onBlur={handleRename}
            onKeyDown={(e) => e.key === "Escape" && setIsRenaming(false)}
          />
        </form>
      ) : (
        <span className="flex-1 truncate" data-cy="file-name">{node.name}</span>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
            data-cy="file-tree-item-menu"
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem
            onClick={() => setIsRenaming(true)}
            data-cy="rename-item"
          >
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Rename
          </DropdownMenuItem>
          {node.type === "file" && (
            <DropdownMenuItem
              onClick={() => {
                const name = node.name.replace(/\.md$/, "");
                navigator.clipboard.writeText(`[[${name}]]`);
              }}
              data-cy="copy-link-item"
            >
              <Copy className="mr-2 h-3.5 w-3.5" />
              Copy link
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => deleteNode(node.path)}
            className="text-destructive"
            data-cy="delete-item"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

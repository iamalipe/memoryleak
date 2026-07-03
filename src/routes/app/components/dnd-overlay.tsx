import { DragOverlay } from "@dnd-kit/core";
import { File, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileNode } from "@/lib/idb-fs";

type Props = { activeNode: FileNode | null };

export default function DndOverlay({ activeNode }: Props) {
  if (!activeNode) return null;

  return (
    <DragOverlay>
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm shadow-lg",
          "opacity-90"
        )}
      >
        {activeNode.type === "folder" ? (
          <Folder className="h-4 w-4 text-yellow-500" />
        ) : (
          <File className="h-4 w-4 text-blue-400" />
        )}
        <span className="max-w-[160px] truncate">{activeNode.name}</span>
      </div>
    </DragOverlay>
  );
}

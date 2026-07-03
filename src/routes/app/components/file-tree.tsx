import { useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFileStore } from "@/hooks/use-file-store";
import type { FileNode } from "@/lib/idb-fs";
import FileTreeItem from "./file-tree-item";
import DndOverlay from "./dnd-overlay";

type Props = { activeFileId: string | null };

function buildTree(nodes: FileNode[], parentPath: string | null = null) {
  return nodes
    .filter((n) => {
      const parent = n.path.includes("/")
        ? n.path.slice(0, n.path.lastIndexOf("/"))
        : null;
      return parent === parentPath;
    })
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

type TreeNodeProps = {
  node: FileNode;
  nodes: FileNode[];
  depth: number;
  activeFileId: string | null;
  expanded: Record<string, boolean>;
  onToggle: (path: string) => void;
};

function TreeNode({ node, nodes, depth, activeFileId, expanded, onToggle }: TreeNodeProps) {
  const children = node.type === "folder" ? buildTree(nodes, node.path) : [];
  const isExpanded = !!expanded[node.path];

  return (
    <>
      <FileTreeItem
        node={node}
        depth={depth}
        isActive={activeFileId === node.path}
        isExpanded={isExpanded}
        onToggle={() => onToggle(node.path)}
      />
      {node.type === "folder" && isExpanded &&
        children.map((child) => (
          <TreeNode
            key={child.path}
            node={child}
            nodes={nodes}
            depth={depth + 1}
            activeFileId={activeFileId}
            expanded={expanded}
            onToggle={onToggle}
          />
        ))}
    </>
  );
}

export default function FileTree({ activeFileId }: Props) {
  const { nodes, moveNode } = useFileStore();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [draggingNode, setDraggingNode] = useState<FileNode | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const toggleFolder = useCallback((path: string) => {
    setExpanded((prev) => ({ ...prev, [path]: !prev[path] }));
  }, []);

  function handleDragStart(event: DragStartEvent) {
    const node = nodes.find((n) => n.path === event.active.id);
    setDraggingNode(node ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setDraggingNode(null);
    const { active, over } = event;
    if (!over) return;
    const dropId = String(over.id).replace("drop:", "");
    const sourceId = String(active.id);
    if (dropId === sourceId) return;
    const targetNode = nodes.find((n) => n.path === dropId);
    if (!targetNode || targetNode.type !== "folder") return;
    const sourceNode = nodes.find((n) => n.path === sourceId);
    if (!sourceNode) return;

    await moveNode(sourceId, dropId);
    const newPath = `${dropId}/${sourceNode.name}`;
    if (sourceNode.type === "file") navigate({ to: `/app/${newPath}` });
    setExpanded((prev) => ({ ...prev, [dropId]: true }));
  }

  const rootNodes = buildTree(nodes, null);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="h-full" data-cy="file-tree">
        <div className="p-1">
          {rootNodes.length === 0 && (
            <p className="px-3 py-4 text-xs text-muted-foreground">
              No files yet. Create one above.
            </p>
          )}
          {rootNodes.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              nodes={nodes}
              depth={0}
              activeFileId={activeFileId}
              expanded={expanded}
              onToggle={toggleFolder}
            />
          ))}
        </div>
      </ScrollArea>
      <DndOverlay activeNode={draggingNode} />
    </DndContext>
  );
}

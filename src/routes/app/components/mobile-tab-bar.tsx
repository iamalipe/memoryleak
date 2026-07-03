import { FolderTree, FileText, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export type MobileTab = "tree" | "editor" | "preview";

type Props = {
  active: MobileTab;
  onChange: (tab: MobileTab) => void;
};

const tabs = [
  { id: "tree" as MobileTab, label: "Files", Icon: FolderTree },
  { id: "editor" as MobileTab, label: "Edit", Icon: FileText },
  { id: "preview" as MobileTab, label: "Preview", Icon: Eye },
];

export default function MobileTabBar({ active, onChange }: Props) {
  return (
    <nav
      className="flex border-t bg-background"
      data-cy="mobile-tab-bar"
    >
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs",
            active === id
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
          data-cy={`mobile-tab-${id}`}
        >
          <Icon className="h-5 w-5" />
          {label}
        </button>
      ))}
    </nav>
  );
}

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useFileStore } from "@/hooks/use-file-store";
import type { Components } from "react-markdown";

// Matches [[filename]] or [[path/filename]]
const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;

function preprocessWikilinks(text: string): string {
  return text.replace(WIKILINK_RE, (_, target: string) => {
    const slug = target.trim();
    return `[${slug}](wikilink:${encodeURIComponent(slug)})`;
  });
}

type Props = { content: string; className?: string };

export default function MarkdownPreview({ content, className }: Props) {
  const navigate = useNavigate();
  const nodes = useFileStore((s) => s.nodes);

  const components: Components = {
    a({ href, children }) {
      if (href?.startsWith("wikilink:")) {
        const target = decodeURIComponent(href.slice("wikilink:".length));
        const match = nodes.find(
          (n) =>
            n.type === "file" &&
            (n.path === target ||
              n.path === `${target}.md` ||
              n.name === target ||
              n.name === `${target}.md`)
        );
        const resolved = match?.path;
        return (
          <span
            data-cy="wikilink"
            onClick={() => {
              if (resolved) navigate({ to: `/app/${resolved}` });
            }}
            className={cn(
              "cursor-pointer underline decoration-dotted",
              resolved
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            {children}
          </span>
        );
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    },
  };

  return (
    <div
      data-cy="markdown-preview"
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none h-full overflow-y-auto p-4",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {preprocessWikilinks(content)}
      </ReactMarkdown>
    </div>
  );
}

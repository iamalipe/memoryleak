import { useFileStore } from "@/hooks/use-file-store"
import { cn } from "@/lib/utils"
import { useNavigate } from "@tanstack/react-router"
import "katex/dist/katex.min.css"
import { useCallback, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import rehypeKatex from "rehype-katex"
import rehypeRaw from "rehype-raw"
import remarkEmoji from "remark-emoji"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"

// Matches [[filename]] or [[path/filename]]
const WIKILINK_RE = /\[\[([^\]]+)\]\]/g

function preprocessWikilinks(text: string): string {
  return text.replace(WIKILINK_RE, (_, target: string) => {
    const slug = target.trim()
    return `[${slug}](wikilink:${encodeURIComponent(slug)})`
  })
}

interface ObsidianPreviewProps {
  content: string
  onChange: (content: string) => void
  onEdit: () => void
}

export const ObsidianPreview = ({
  content,
  onChange,
  onEdit,
}: ObsidianPreviewProps) => {
  const navigate = useNavigate()
  const nodes = useFileStore((s) => s.nodes)

  // Interactive Checklist toggle helper
  const handleToggleCheckbox = useCallback(
    (indexToToggle: number) => {
      let count = 0
      const lines = content.split(/\r?\n/)
      const newLines = lines.map((line) => {
        // Matches checklist syntax: optional whitespace, bullet indicator, then [ ] or [x]
        const match = line.match(/^(\s*[-*+]\s+\[)([ xX])(\].*)$/)
        if (match) {
          if (count === indexToToggle) {
            const currentStatus = match[2]
            const newStatus = currentStatus === " " ? "x" : " "
            line = `${match[1]}${newStatus}${match[3]}`
          }
          count++
        }
        return line
      })
      onChange(newLines.join("\n"))
    },
    [content, onChange]
  )

  // Define custom component overrides to style and handle actions natively
  const components = useMemo(() => {
    let checklistIndex = 0

    return {
      li({ children, checked, ...props }: any) {
        if (checked !== undefined) {
          const currentIndex = checklistIndex
          checklistIndex++

          return (
            <li className="my-1 flex list-none items-start gap-2.5 align-middle">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => handleToggleCheckbox(currentIndex)}
                className="mt-1 h-4.5 w-4.5 shrink-0 cursor-pointer rounded-md border-border bg-background text-primary accent-primary select-none"
              />
              <span
                className={cn(
                  "transition-all select-text",
                  checked
                    ? "text-muted-foreground line-through opacity-75"
                    : "text-foreground"
                )}
              >
                {children}
              </span>
            </li>
          )
        }
        return (
          <li {...props} className="my-1.5 text-foreground select-text">
            {children}
          </li>
        )
      },
      a({ href, children }: any) {
        if (href?.startsWith("wikilink:")) {
          const target = decodeURIComponent(href.slice("wikilink:".length))
          const match = nodes.find(
            (n) =>
              n.type === "file" &&
              (n.path === target ||
                n.path === `${target}.md` ||
                n.name === target ||
                n.name === `${target}.md`)
          )
          const resolved = match?.path
          return (
            <span
              onClick={(e) => {
                e.stopPropagation() // prevent double-click edit toggle
                if (resolved) navigate({ to: `/app/${resolved}` })
              }}
              className={cn(
                "cursor-pointer font-semibold underline decoration-dotted transition-colors",
                resolved
                  ? "text-primary hover:text-primary/80"
                  : "text-muted-foreground/70 hover:text-muted-foreground"
              )}
            >
              {children}
            </span>
          )
        }
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline transition-colors hover:text-primary/80"
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </a>
        )
      },
      h1({ children }: any) {
        return (
          <h1 className="mt-8 mb-4 border-b border-border pb-2.5 text-3xl font-extrabold text-foreground select-text">
            {children}
          </h1>
        )
      },
      h2({ children }: any) {
        return (
          <h2 className="mt-6 mb-3 border-b border-border pb-2 text-2xl font-bold text-foreground select-text">
            {children}
          </h2>
        )
      },
      h3({ children }: any) {
        return (
          <h3 className="mt-5 mb-2 text-xl font-semibold text-foreground select-text">
            {children}
          </h3>
        )
      },
      blockquote({ children }: any) {
        return (
          <blockquote className="my-4 rounded-r-md border-l-4 border-primary bg-muted/20 px-4 py-1.5 text-muted-foreground italic select-text">
            {children}
          </blockquote>
        )
      },
      table({ children }: any) {
        return (
          <div className="my-6 overflow-x-auto rounded-xl border border-border shadow-xs select-text">
            <table className="min-w-full border-collapse divide-y divide-border">
              {children}
            </table>
          </div>
        )
      },
      thead({ children }: any) {
        return <thead className="bg-muted/40 font-semibold">{children}</thead>
      },
      tr({ children }: any) {
        return (
          <tr className="divide-x divide-border transition-colors odd:bg-muted/5 hover:bg-muted/10">
            {children}
          </tr>
        )
      },
      th({ children }: any) {
        return (
          <th className="px-4 py-2.5 text-left text-sm font-semibold text-foreground select-text">
            {children}
          </th>
        )
      },
      td({ children }: any) {
        return (
          <td className="px-4 py-2.5 text-sm text-foreground select-text">
            {children}
          </td>
        )
      },
      code({ inline, className, children, ...props }: any) {
        const match = /language-(\w+)/.exec(className || "")
        if (!inline && match) {
          return (
            <pre className="my-4 overflow-x-auto rounded-xl border border-border bg-muted/20 p-4 font-mono text-sm select-text">
              <code className={className} {...props}>
                {children}
              </code>
            </pre>
          )
        }
        return (
          <code
            className="rounded-md border border-border bg-muted/65 px-1.5 py-0.5 font-mono text-xs text-primary select-text"
            {...props}
          >
            {children}
          </code>
        )
      },
    }
  }, [nodes, navigate, handleToggleCheckbox])

  return (
    <div
      onDoubleClick={onEdit}
      className="obsidian-preview prose prose-neutral dark:prose-invert scrollbar-thin h-full cursor-default overflow-y-auto px-4 py-6 select-text sm:px-10 sm:py-8"
      title="Double click to edit note"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkEmoji]}
        rehypePlugins={[rehypeHighlight, rehypeKatex, rehypeRaw]}
        components={components}
      >
        {preprocessWikilinks(content)}
      </ReactMarkdown>
    </div>
  )
}

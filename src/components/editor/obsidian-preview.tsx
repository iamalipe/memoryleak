import { useCallback, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import rehypeRaw from "rehype-raw"
import remarkEmoji from "remark-emoji"
import { useNavigate } from "@tanstack/react-router"
import { useFileStore } from "@/hooks/use-file-store"
import { cn } from "@/lib/utils"
import "katex/dist/katex.min.css"

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

export const ObsidianPreview = ({ content, onChange, onEdit }: ObsidianPreviewProps) => {
  const navigate = useNavigate()
  const nodes = useFileStore((s) => s.nodes)

  // Interactive Checklist toggle helper
  const handleToggleCheckbox = useCallback((indexToToggle: number) => {
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
  }, [content, onChange])

  // Define custom component overrides to style and handle actions natively
  const components = useMemo(() => {
    let checklistIndex = 0

    return {
      li({ children, checked, ...props }: any) {
        if (checked !== undefined) {
          const currentIndex = checklistIndex
          checklistIndex++

          return (
            <li className="list-none flex items-start gap-2.5 my-1 align-middle">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => handleToggleCheckbox(currentIndex)}
                className="mt-1 h-4.5 w-4.5 shrink-0 rounded-md border-border bg-background text-primary accent-primary cursor-pointer select-none"
              />
              <span className={cn(
                "select-text transition-all",
                checked ? "line-through text-muted-foreground opacity-75" : "text-foreground"
              )}>
                {children}
              </span>
            </li>
          )
        }
        return <li {...props} className="my-1.5 text-foreground select-text">{children}</li>
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
                "cursor-pointer underline decoration-dotted font-semibold transition-colors",
                resolved ? "text-primary hover:text-primary/80" : "text-muted-foreground/70 hover:text-muted-foreground"
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
            className="text-primary underline hover:text-primary/80 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </a>
        )
      },
      h1({ children }: any) {
        return <h1 className="text-3xl font-extrabold border-b border-border pb-2.5 mt-8 mb-4 text-foreground select-text">{children}</h1>
      },
      h2({ children }: any) {
        return <h2 className="text-2xl font-bold border-b border-border pb-2 mt-6 mb-3 text-foreground select-text">{children}</h2>
      },
      h3({ children }: any) {
        return <h3 className="text-xl font-semibold mt-5 mb-2 text-foreground select-text">{children}</h3>
      },
      blockquote({ children }: any) {
        return (
          <blockquote className="border-l-4 border-primary bg-muted/20 px-4 py-1.5 my-4 italic text-muted-foreground select-text rounded-r-md">
            {children}
          </blockquote>
        )
      },
      table({ children }: any) {
        return (
          <div className="overflow-x-auto my-6 border border-border rounded-xl select-text shadow-xs">
            <table className="min-w-full divide-y divide-border border-collapse">
              {children}
            </table>
          </div>
        )
      },
      thead({ children }: any) {
        return <thead className="bg-muted/40 font-semibold">{children}</thead>
      },
      tr({ children }: any) {
        return <tr className="divide-x divide-border hover:bg-muted/10 transition-colors odd:bg-muted/5">{children}</tr>
      },
      th({ children }: any) {
        return <th className="px-4 py-2.5 text-left text-sm font-semibold text-foreground select-text">{children}</th>
      },
      td({ children }: any) {
        return <td className="px-4 py-2.5 text-sm text-foreground select-text">{children}</td>
      },
      code({ inline, className, children, ...props }: any) {
        const match = /language-(\w+)/.exec(className || "")
        if (!inline && match) {
          return (
            <pre className="p-4 rounded-xl border border-border bg-muted/20 overflow-x-auto font-mono text-sm my-4 select-text">
              <code className={className} {...props}>
                {children}
              </code>
            </pre>
          )
        }
        return (
          <code className="bg-muted/65 px-1.5 py-0.5 rounded-md font-mono text-xs border border-border select-text text-primary" {...props}>
            {children}
          </code>
        )
      }
    }
  }, [nodes, navigate, handleToggleCheckbox])

  return (
    <div 
      onDoubleClick={onEdit} 
      className="obsidian-preview h-full overflow-y-auto px-10 py-8 select-text cursor-default max-w-3xl mx-auto prose prose-neutral dark:prose-invert"
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

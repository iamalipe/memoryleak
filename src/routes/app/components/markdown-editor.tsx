import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type Props = {
  content: string;
  onChange: (value: string) => void;
  className?: string;
};

export default function MarkdownEditor({ content, onChange, className }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Keep cursor position stable when content changes externally
  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    el.value = content;
  }, [content]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  // Insert tab as spaces instead of losing focus
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const el = e.currentTarget;
        const { selectionStart, selectionEnd } = el;
        const val = el.value;
        el.value = val.slice(0, selectionStart) + "  " + val.slice(selectionEnd);
        el.selectionStart = el.selectionEnd = selectionStart + 2;
        onChange(el.value);
      }
    },
    [onChange]
  );

  return (
    <textarea
      ref={ref}
      data-cy="markdown-editor"
      defaultValue={content}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      spellCheck={false}
      className={cn(
        "h-full w-full resize-none bg-transparent p-4 font-mono text-sm leading-relaxed outline-none",
        "text-foreground placeholder:text-muted-foreground",
        className
      )}
      placeholder="Start writing…"
    />
  );
}

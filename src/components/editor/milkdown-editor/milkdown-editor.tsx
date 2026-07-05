import { Crepe } from "@milkdown/crepe"
import "@milkdown/crepe/theme/common/style.css"
import "@milkdown/crepe/theme/frame.css"
import { useEffect, useRef } from "react"

interface MilkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

const MilkdownEditor = ({
  value,
  onChange,
  placeholder = "Start writing markdown...",
}: MilkdownEditorProps) => {
  console.log(value, onChange, placeholder)

  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const editor = new Crepe({
      root: editorRef.current!,
      defaultValue: value,
    })

    editor.create()
    return () => {
      editor.destroy()
    }
  }, [value])

  return (
    <div
      id="milkdown-editor-root"
      ref={editorRef}
      className="h-full w-full flex-1 overflow-auto"
    />
  )
}

export default MilkdownEditor

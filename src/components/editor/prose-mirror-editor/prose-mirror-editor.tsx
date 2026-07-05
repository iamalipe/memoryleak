interface ProseMirrorEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

const ProseMirrorEditor = ({
  value,
  onChange,
  placeholder = "Start writing markdown...",
}: ProseMirrorEditorProps) => {
  console.log(value, onChange, placeholder)

  return <></>
}

export default ProseMirrorEditor

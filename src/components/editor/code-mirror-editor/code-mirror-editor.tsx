interface CodeMirrorEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

const CodeMirrorEditor = ({
  value,
  onChange,
  placeholder = "Start writing markdown...",
}: CodeMirrorEditorProps) => {
  console.log(value, onChange, placeholder)

  return <></>
}

export default CodeMirrorEditor

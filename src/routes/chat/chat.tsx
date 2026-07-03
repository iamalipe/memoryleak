import { useTheme } from "@/components/theme/theme-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { MLCEngineInterface } from "@mlc-ai/web-llm"
import {
  Bot,
  Check,
  Copy,
  Laptop,
  Loader2,
  Menu,
  MessageSquare,
  Moon,
  Plus,
  Send,
  Settings,
  Sparkles,
  Sun,
  Trash2,
  User,
  X,
} from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

// --- Types ---
interface Message {
  id: string
  role: "user" | "model"
  content: string
  timestamp: string
  stats?: {
    speed: string // tokens/sec
    tokens: number // token count
    prefillSpeed?: string // prefill tokens/sec
  }
}

interface ChatSession {
  id: string
  title: string
  model: string
  messages: Message[]
  updatedAt: string
}

interface GenerationConfig {
  systemPrompt: string
  temperature: number
  topP: number
  maxTokens: number
  repetitionPenalty: number
  frequencyPenalty: number
  presencePenalty: number
  contextWindowSize: number
  logLevel: "TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR"
}

const DEFAULT_CONFIG: GenerationConfig = {
  systemPrompt: "You are a helpful, respectful, and honest local AI assistant.",
  temperature: 0.7,
  topP: 0.95,
  maxTokens: 1024,
  repetitionPenalty: 1.0,
  frequencyPenalty: 0.0,
  presencePenalty: 0.0,
  contextWindowSize: 2048,
  logLevel: "INFO",
}

const MODEL_OPTIONS = [
  {
    id: "qwen-0.5b-local",
    name: "Qwen 2.5 0.5B",
    modelId: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    desc: "Ultra-fast & lightweight (~380MB). Perfect for rapid responses.",
  },
  {
    id: "llama-1b-local",
    name: "Llama 3.2 1B",
    modelId: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    desc: "Highly capable local SLM (~750MB). Great analytical depth.",
  },
  {
    id: "qwen-1.5b-local",
    name: "Qwen 2.5 1.5B",
    modelId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    desc: "Advanced developer assistant (~1.1GB). Smart coding helper.",
  },
]

const SUGGESTIONS = [
  {
    title: "Write TypeScript function",
    subtitle: "Draft a recursive helper with strict typings",
    prompt:
      "Can you help me write a TypeScript function to recursively flatten a deeply nested object, maintaining type safety?",
    icon: Sparkles,
    color:
      "from-violet-500/20 to-purple-500/20 text-violet-600 dark:text-violet-400 border-violet-500/20",
  },
  {
    title: "Tailwind Glassmorphism CSS",
    subtitle: "Modern frosted-glass overlay style",
    prompt:
      "Provide the Tailwind CSS v4 class combinations and raw CSS for a premium glassmorphic modal with glowing blurred backdrops.",
    icon: Bot,
    color:
      "from-cyan-500/20 to-blue-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  },
  {
    title: "Explain React 19 updates",
    subtitle: "Key additions: use hook, transitions, actions",
    prompt:
      "What are the most important updates in React 19? Can you explain the 'use' hook, startTransition changes, and form Actions?",
    icon: Bot,
    color:
      "from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  {
    title: "Code review and optimization",
    subtitle: "Analyze bottlenecks and patterns",
    prompt:
      "Explain how to identify and debug memory leaks and rendering bottlenecks in a modern client-side React application.",
    icon: Sparkles,
    color:
      "from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
]

export default function ChatPage() {
  const { theme, setTheme } = useTheme()
  const initialData = React.useMemo(() => {
    let savedSessions: ChatSession[] = []
    let activeId: string | null = null
    let model = "qwen-0.5b-local"
    let config = DEFAULT_CONFIG

    if (typeof window !== "undefined") {
      const sessionsStr = localStorage.getItem("memoryleak-chat-sessions")
      if (sessionsStr) {
        try {
          const parsed = JSON.parse(sessionsStr) as ChatSession[]
          savedSessions = parsed
          if (parsed.length > 0) {
            activeId = parsed[0].id
            model = parsed[0].model
          }
        } catch (e) {
          console.error("Failed to parse chat sessions", e)
        }
      }

      const configStr = localStorage.getItem("memoryleak-local-llm-config")
      if (configStr) {
        try {
          config = { ...DEFAULT_CONFIG, ...JSON.parse(configStr) }
        } catch (e) {
          console.error("Failed to parse configs", e)
        }
      }
    }

    return { savedSessions, activeId, model, config }
  }, [])

  const [sessions, setSessions] = React.useState<ChatSession[]>(initialData.savedSessions)
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(
    initialData.activeId
  )
  const [selectedModel, setSelectedModel] =
    React.useState<string>(initialData.model)
  const [input, setInput] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [streamingContent, setStreamingContent] = React.useState("")
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [webGpuSupported] = React.useState<boolean | null>(() => {
    if (typeof navigator !== "undefined") {
      return !!navigator.gpu
    }
    return null
  })

  // Parameter Configurations
  const [genConfig, setGenConfig] =
    React.useState<GenerationConfig>(initialData.config)
  const [tempConfig, setTempConfig] =
    React.useState<GenerationConfig>(initialData.config)
  const [isConfigOpen, setIsConfigOpen] = React.useState(false)

  // Local model loading & execution state
  const [localLoadingText, setLocalLoadingText] = React.useState("")
  const [localLoadingProgress, setLocalLoadingProgress] = React.useState(0)
  const [isLocalLoading, setIsLocalLoading] = React.useState(false)
  const [isLocalModelLoaded, setIsLocalModelLoaded] = React.useState(false)
  const [loadedModelName, setLoadedModelName] = React.useState("")
  const localEngineRef = React.useRef<MLCEngineInterface | null>(null)

  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Unload local engine on unmount to free GPU memory
  React.useEffect(() => {
    return () => {
      if (localEngineRef.current) {
        localEngineRef.current.unload().catch(console.error)
      }
    }
  }, [])

  // Save Sessions to localStorage
  const saveSessions = (updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions)
    localStorage.setItem(
      "memoryleak-chat-sessions",
      JSON.stringify(updatedSessions)
    )
  }

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [sessions, streamingContent, isLoading])

  // Adjust Textarea Height automatically
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`
    }
  }, [input])

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null

  // Create New Session
  const createNewSession = (initialModel = selectedModel) => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: "New Chat",
      model: initialModel,
      messages: [],
      updatedAt: new Date().toISOString(),
    }
    const updated = [newSession, ...sessions]
    saveSessions(updated)
    setActiveSessionId(newSession.id)
    setSelectedModel(initialModel)
    setSidebarOpen(false)
    return newSession
  }

  // Delete Session
  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = sessions.filter((s) => s.id !== id)
    saveSessions(updated)
    toast.success("Chat deleted")

    if (activeSessionId === id) {
      if (updated.length > 0) {
        setActiveSessionId(updated[0].id)
        setSelectedModel(updated[0].model)
      } else {
        setActiveSessionId(null)
      }
    }
  }

  // Clear active chat logs
  const clearActiveChat = () => {
    if (!activeSessionId) return
    const updated = sessions.map((s) => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          messages: [],
          title: "New Chat",
          updatedAt: new Date().toISOString(),
        }
      }
      return s
    })
    saveSessions(updated)
    toast.success("Conversation cleared")
  }

  // Save Settings configurations
  const handleSaveConfig = () => {
    localStorage.setItem(
      "memoryleak-local-llm-config",
      JSON.stringify(tempConfig)
    )
    setGenConfig(tempConfig)

    // If context window or logs change, trigger unload to force a GPU reload next run
    if (
      tempConfig.contextWindowSize !== genConfig.contextWindowSize ||
      tempConfig.logLevel !== genConfig.logLevel
    ) {
      handleUnloadLocalEngine()
    }

    setIsConfigOpen(false)
    toast.success("Configurations saved successfully!")
  }

  // Reset configurations to default
  const handleResetConfig = () => {
    setTempConfig(DEFAULT_CONFIG)
    toast.info("Configurations reset to default values")
  }

  // Initialize selected Local LLM Engine
  const initLocalEngine = async (modelId: string, modelDisplayName: string) => {
    if (localEngineRef.current && loadedModelName === modelDisplayName) {
      return localEngineRef.current
    }

    // Unload existing model if loading a different one
    if (localEngineRef.current) {
      setLocalLoadingText(`Unloading previous model from GPU...`)
      setIsLocalLoading(true)
      await localEngineRef.current.unload()
      localEngineRef.current = null
      setIsLocalModelLoaded(false)
      setLoadedModelName("")
    }

    setIsLocalLoading(true)
    setLocalLoadingProgress(0)
    setLocalLoadingText("Loading compiler modules...")

    try {
      const { CreateMLCEngine } = await import("@mlc-ai/web-llm")
      const engine = await CreateMLCEngine(
        modelId,
        {
          initProgressCallback: (report) => {
            setLocalLoadingText(report.text)
            setLocalLoadingProgress(Math.round(report.progress * 100))
          },
          logLevel: genConfig.logLevel,
        },
        {
          context_window_size: genConfig.contextWindowSize,
        }
      )

      localEngineRef.current = engine
      setIsLocalModelLoaded(true)
      setLoadedModelName(modelDisplayName)
      setIsLocalLoading(false)
      toast.success(`${modelDisplayName} loaded successfully!`)
      return engine
    } catch (err: any) {
      console.error(err)
      setIsLocalLoading(false)
      const errMsg = err.message || err
      toast.error(`Model load failed: ${errMsg}`)
      throw new Error(errMsg, { cause: err })
    }
  }

  // Free VRAM from local GPU
  const handleUnloadLocalEngine = async () => {
    if (localEngineRef.current) {
      const loadingToast = toast.loading(
        `Unloading ${loadedModelName} from GPU...`
      )
      try {
        await localEngineRef.current.unload()
        localEngineRef.current = null
        setIsLocalModelLoaded(false)
        setLoadedModelName("")
        toast.dismiss(loadingToast)
        toast.success("GPU memory freed successfully!")
      } catch (err: any) {
        console.error(err)
        toast.dismiss(loadingToast)
        toast.error(`Failed to unload model: ${err.message}`)
      }
    }
  }

  // Inference handler
  const handleLocalStream = async (
    query: string,
    sessionToUpdate: ChatSession
  ) => {
    setIsLoading(true)
    setStreamingContent("")

    // Identify targets
    const selectedOption =
      MODEL_OPTIONS.find((m) => m.id === sessionToUpdate.model) ||
      MODEL_OPTIONS[0]

    try {
      const engine = await initLocalEngine(
        selectedOption.modelId,
        selectedOption.name
      )

      const apiMessages: any[] = []
      // Prepend System instructions
      if (genConfig.systemPrompt.trim()) {
        apiMessages.push({
          role: "system",
          content: genConfig.systemPrompt,
        })
      }

      apiMessages.push(
        ...sessionToUpdate.messages.map((m) => ({
          role: m.role === "user" ? ("user" as const) : ("assistant" as const),
          content: m.content,
        }))
      )

      apiMessages.push({
        role: "user" as const,
        content: query,
      })

      const responseStream = await engine.chat.completions.create({
        messages: apiMessages,
        stream: true,
        temperature: genConfig.temperature,
        top_p: genConfig.topP,
        max_tokens: genConfig.maxTokens,
        repetition_penalty: genConfig.repetitionPenalty,
        frequency_penalty: genConfig.frequencyPenalty,
        presence_penalty: genConfig.presencePenalty,
      })

      let accumulatedText = ""
      for await (const chunk of responseStream) {
        const text = chunk.choices[0]?.delta?.content || ""
        accumulatedText += text
        setStreamingContent(accumulatedText)
      }

      // Collect execution metrics
      let speed = "0.0"
      let prefillSpeed = "0.0"
      try {
        const statsText = await engine.runtimeStatsText()
        const decodeMatch = statsText.match(/decoding:\s*([\d.]+)\s*tok\/s/)
        if (decodeMatch) speed = decodeMatch[1]

        const prefillMatch = statsText.match(/prefill:\s*([\d.]+)\s*tok\/s/)
        if (prefillMatch) prefillSpeed = prefillMatch[1]
      } catch (e) {
        console.error("Error reading engine stats", e)
      }

      // Token estimation (1 token ~ 3.8 characters)
      const tokenCount = Math.max(1, Math.round(accumulatedText.length / 3.8))

      const newMsg: Message = {
        id: Date.now().toString(),
        role: "model",
        content: accumulatedText,
        timestamp: new Date().toISOString(),
        stats: {
          speed,
          tokens: tokenCount,
          prefillSpeed: prefillSpeed !== "0.0" ? prefillSpeed : undefined,
        },
      }

      const updatedSessions = sessions.map((s) => {
        if (s.id === sessionToUpdate.id) {
          return {
            ...s,
            messages: [...s.messages, newMsg],
            updatedAt: new Date().toISOString(),
          }
        }
        return s
      })

      saveSessions(updatedSessions)
      setStreamingContent("")
      setIsLoading(false)
    } catch (error: any) {
      console.error(error)
      setIsLoading(false)
      setStreamingContent("")
    }
  }

  // Submit trigger
  const handleSendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim()
    if (!trimmed || isLoading) return

    if (webGpuSupported === false) {
      toast.error(
        "Offline execution requires WebGPU support. Local generation disabled."
      )
      return
    }

    setInput("")

    let targetSession = activeSession
    if (!targetSession) {
      targetSession = createNewSession()
    }

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    }

    const updatedMessages = [...targetSession.messages, newUserMsg]

    let newTitle = targetSession.title
    if (targetSession.title === "New Chat") {
      newTitle =
        trimmed.length > 28 ? trimmed.substring(0, 25) + "..." : trimmed
    }

    const updatedSession = {
      ...targetSession,
      title: newTitle,
      messages: updatedMessages,
      updatedAt: new Date().toISOString(),
    }

    const updatedSessions = sessions.map((s) =>
      s.id === targetSession!.id ? updatedSession : s
    )
    saveSessions(updatedSessions)

    await handleLocalStream(trimmed, updatedSession)
  }

  // Keyboard shortcuts in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(input)
    }
  }

  // Markdown renderer helper
  const renderMessageContent = (content: string) => {
    const parts = content.split("```")
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        const lines = part.split("\n")
        const firstLine = lines[0].trim()
        const language = [
          "tsx",
          "ts",
          "typescript",
          "javascript",
          "js",
          "css",
          "html",
          "json",
          "python",
          "bash",
          "go",
        ].includes(firstLine)
          ? firstLine
          : "code"
        const code =
          firstLine === language ? lines.slice(1).join("\n") : lines.join("\n")
        return <CodeBlockBlock key={index} language={language} code={code} />
      }

      return (
        <div key={index} className="space-y-2.5 break-words">
          {part.split("\n\n").map((para, pIdx) => {
            const lines = para.split("\n")
            const isList = lines.every(
              (line) =>
                line.trim().startsWith("* ") ||
                line.trim().startsWith("- ") ||
                /^\d+\.\s/.test(line.trim())
            )

            if (isList) {
              const isOrdered = /^\d+\.\s/.test(lines[0].trim())
              const ListTag = isOrdered ? "ol" : "ul"
              return (
                <ListTag
                  key={pIdx}
                  className={cn(
                    "my-2 list-outside space-y-1.5 pl-6",
                    isOrdered ? "list-decimal" : "list-disc"
                  )}
                >
                  {lines.map((line, lIdx) => {
                    const cleaned = line
                      .replace(/^[\s*-]+|^[\s*\d.]+/, "")
                      .trim()
                    return (
                      <li
                        key={lIdx}
                        className="text-sm leading-relaxed text-foreground/95"
                      >
                        {renderInlineStyles(cleaned)}
                      </li>
                    )
                  })}
                </ListTag>
              )
            }

            return (
              <p
                key={pIdx}
                className="text-sm leading-relaxed text-foreground/95"
              >
                {renderInlineStyles(para)}
              </p>
            )
          })}
        </div>
      )
    })
  }

  // Bold and code styling helper
  const renderInlineStyles = (text: string) => {
    const boldParts = text.split("**")
    return boldParts.map((bPart, bIdx) => {
      const isBold = bIdx % 2 === 1
      const codeParts = bPart.split("`")
      const content = codeParts.map((cPart, cIdx) => {
        const isCode = cIdx % 2 === 1
        if (isCode) {
          return (
            <code
              key={cIdx}
              className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-rose-500 dark:text-rose-400"
            >
              {cPart}
            </code>
          )
        }
        return cPart
      })

      if (isBold) {
        return (
          <strong key={bIdx} className="font-semibold text-foreground">
            {content}
          </strong>
        )
      }
      return content
    })
  }

  // Toggle Theme
  const toggleTheme = () => {
    if (theme === "light") setTheme("dark")
    else if (theme === "dark") setTheme("system")
    else setTheme("light")
  }

  // Fallback view for unsupported environments
  if (webGpuSupported === false) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-6 font-sans text-foreground">
        <div className="relative w-full max-w-md space-y-6 overflow-hidden rounded-3xl border border-destructive/20 bg-card/65 p-8 text-center shadow-2xl">
          <div className="absolute -top-12 -left-12 -z-10 h-32 w-32 rounded-full bg-destructive/15 blur-3xl" />

          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <X className="size-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h1 className="text-lg font-bold tracking-tight">
              WebGPU Not Supported
            </h1>
            <p className="text-xs leading-relaxed text-muted-foreground">
              This offline chat platform runs Small Language Models (SLMs)
              locally inside your browser, requiring WebGPU acceleration.
            </p>
          </div>

          <div className="space-y-2.5 rounded-2xl bg-muted/40 p-4 text-left text-xs leading-relaxed text-muted-foreground">
            <p>
              Please launch the page using one of the following
              WebGPU-compatible browsers:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Google Chrome</strong> (v113+)
              </li>
              <li>
                <strong>Microsoft Edge</strong> (v113+)
              </li>
              <li>
                <strong>Opera</strong> (v100+)
              </li>
              <li>
                <strong>Safari</strong> (v18+ on macOS Sequoia)
              </li>
            </ul>
            <p className="mt-2 text-[10px]">
              Verify that <strong>Hardware Acceleration</strong> is enabled in
              your browser's system configurations.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background font-sans text-foreground antialiased">
      {/* --- Sidebar --- */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-80 transform flex-col border-r border-border/70 bg-card/40 backdrop-blur-xl transition-all duration-300 md:relative md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border/55 px-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20">
              <MessageSquare className="size-4" />
            </div>
            <span className="text-sm font-semibold tracking-tight">
              MemoryLeak Chat
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="p-4">
          <Button
            onClick={() => createNewSession()}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/10 transition-all duration-300 hover:translate-y-[-1px] hover:opacity-90"
          >
            <Plus className="size-4" />
            <span className="text-xs font-semibold">New Conversation</span>
          </Button>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
                <MessageSquare className="size-5" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                No conversation logs
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground/75">
                Start a session to capture logs locally
              </p>
            </div>
          ) : (
            sessions.map((s) => {
              const isActive = s.id === activeSessionId
              const option =
                MODEL_OPTIONS.find((m) => m.id === s.model) || MODEL_OPTIONS[0]
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    setActiveSessionId(s.id)
                    setSelectedModel(s.model)
                    setSidebarOpen(false)
                  }}
                  className={cn(
                    "group relative flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-xs transition-all duration-200",
                    isActive
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2.5 pr-4">
                    <MessageSquare
                      className={cn(
                        "size-3.5 shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground/80"
                      )}
                    />
                    <div className="flex flex-col truncate text-left">
                      <span className="truncate font-medium">{s.title}</span>
                      <span className="mt-0.5 text-[9px] tracking-wider text-muted-foreground/75 uppercase">
                        {option.name.replace(" 2.5", "").replace(" 3.2", "")}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => deleteSession(s.id, e)}
                    className="absolute right-2 rounded-lg opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              )
            })
          )}
        </div>

        <div className="border-t border-border/50 bg-muted/30 p-4">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Powered by WebLLM GPU</span>
            <span>v0.2.0</span>
          </div>
        </div>
      </div>

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs md:hidden"
        />
      )}

      {/* --- Main Workspace Pane --- */}
      <div className="relative flex h-full flex-1 flex-col overflow-hidden">
        {/* Header Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 bg-background/60 px-4 backdrop-blur-md md:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden"
            >
              <Menu className="size-4" />
            </Button>

            <div className="flex items-center gap-1.5">
              <Select
                value={selectedModel}
                onValueChange={(val) => {
                  setSelectedModel(val)
                  if (activeSessionId) {
                    const updated = sessions.map((s) => {
                      if (s.id === activeSessionId) {
                        return { ...s, model: val }
                      }
                      return s
                    })
                    saveSessions(updated)
                  }
                }}
              >
                <SelectTrigger className="h-8 cursor-pointer rounded-xl border-transparent bg-input/40 text-xs font-semibold hover:bg-input/70">
                  <SelectValue placeholder="Select Model" />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex flex-col py-0.5 text-left">
                        <span className="text-xs font-semibold">{m.name}</span>
                        <span className="text-[10px] font-normal text-muted-foreground/80">
                          {m.desc}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Unload active model from VRAM */}
            {isLocalModelLoaded && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleUnloadLocalEngine}
                className="h-8 gap-1.5 rounded-xl text-xs transition-all duration-200"
                title={`Free GPU resources allocated for ${loadedModelName}`}
              >
                <X className="size-3.5" />
                <span className="hidden md:inline">
                  Unload {loadedModelName.split(" ")[0]}
                </span>
              </Button>
            )}

            {/* Model Configuration Dashboard Trigger */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTempConfig(genConfig)
                setIsConfigOpen(true)
              }}
              className="h-8 gap-1.5 rounded-xl text-xs hover:bg-muted"
            >
              <Settings className="size-3.5" />
              <span className="hidden md:inline">Model Config</span>
            </Button>

            {/* Mode Capsule */}
            <div className="flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-[10px] font-semibold tracking-wide text-purple-600 dark:text-purple-400">
              <span className="size-1.5 animate-pulse rounded-full bg-purple-500" />
              <span>Local WebGPU</span>
            </div>

            {/* Theme Toggle Button */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleTheme}
              className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
              title={`Theme: ${theme}`}
            >
              {theme === "light" && <Sun className="size-4" />}
              {theme === "dark" && <Moon className="size-4" />}
              {theme === "system" && <Laptop className="size-4" />}
            </Button>

            {/* Clear Chat Trash */}
            {activeSession && activeSession.messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={clearActiveChat}
                className="h-8 w-8 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title="Clear current log"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </header>

        {/* --- Messages Stream Panel --- */}
        <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
          {!activeSession || activeSession.messages.length === 0 ? (
            /* --- Empty State suggestions Grid --- */
            <div className="mx-auto flex max-w-2xl flex-col items-center py-12 md:py-20">
              <div className="mb-6 flex size-14 animate-bounce items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-xl shadow-indigo-500/15 duration-1000">
                <Bot className="size-7" />
              </div>
              <h1 className="bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-center text-xl font-bold tracking-tight text-transparent md:text-2xl">
                Browser Offline SLM Chat
              </h1>
              <p className="mt-2 max-w-md text-center text-xs text-muted-foreground md:text-sm">
                Running lightweight neural networks fully locally on your device
                GPU. Zero data leaves your machine.
              </p>

              {/* Suggestions Cards Grid */}
              <div className="mt-10 grid w-full grid-cols-1 gap-3.5 sm:grid-cols-2">
                {SUGGESTIONS.map((card, idx) => {
                  const CardIcon = card.icon
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSendMessage(card.prompt)}
                      className="group cursor-pointer rounded-2xl border border-border/80 bg-card/50 p-4 text-left shadow-xs transition-all duration-300 hover:scale-[1.015] hover:border-foreground/15 hover:bg-muted/30"
                    >
                      <div
                        className={cn(
                          "mb-3 flex size-7 items-center justify-center rounded-lg border bg-gradient-to-tr",
                          card.color
                        )}
                      >
                        <CardIcon className="size-3.5" />
                      </div>
                      <h3 className="text-xs font-semibold text-foreground transition-colors group-hover:text-primary">
                        {card.title}
                      </h3>
                      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                        {card.subtitle}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* --- Message List Stream --- */
            <div className="mx-auto max-w-3xl space-y-6">
              {activeSession.messages.map((message) => {
                const isUser = message.role === "user"
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "group flex w-full animate-in gap-4 duration-300 fade-in slide-in-from-bottom-2",
                      isUser ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-semibold shadow-xs select-none",
                        isUser
                          ? "bg-primary text-primary-foreground"
                          : "bg-gradient-to-tr from-violet-600 via-indigo-500 to-cyan-400 text-white"
                      )}
                    >
                      {isUser ? (
                        <User className="size-4" />
                      ) : (
                        <Bot className="size-4" />
                      )}
                    </div>

                    <div className="flex max-w-[85%] flex-col">
                      <div
                        className={cn(
                          "relative w-full rounded-3xl px-4 py-3.5 shadow-xs transition-all md:px-5",
                          isUser
                            ? "rounded-tr-none border border-primary/15 bg-primary/10 text-foreground"
                            : "rounded-tl-none border border-border/80 bg-card text-foreground"
                        )}
                      >
                        {renderMessageContent(message.content)}
                      </div>

                      {/* Telemetry metrics row */}
                      {!isUser && message.stats && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 px-1 font-mono text-[9px] text-muted-foreground/75 select-none">
                          <span className="flex items-center gap-1 rounded-md border border-border/30 bg-muted/50 px-1.5 py-0.5">
                            <Sparkles className="size-2.5 text-violet-500" />
                            {message.stats.speed} tok/s
                          </span>
                          <span className="rounded-md border border-border/30 bg-muted/50 px-1.5 py-0.5">
                            {message.stats.tokens} tokens
                          </span>
                          {message.stats.prefillSpeed && (
                            <span className="rounded-md border border-border/30 bg-muted/50 px-1.5 py-0.5">
                              prefill: {message.stats.prefillSpeed} tok/s
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Streaming Content bubble */}
              {isLoading && streamingContent && (
                <div className="flex w-full animate-in flex-row gap-4 duration-200 fade-in">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-cyan-400 text-white shadow-xs select-none">
                    <Bot className="size-4" />
                  </div>
                  <div className="max-w-[85%] rounded-3xl rounded-tl-none border border-border/80 border-l-violet-500/50 bg-card px-4 py-3.5 text-foreground shadow-xs md:px-5">
                    {renderMessageContent(streamingContent)}
                    <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-primary/80 align-middle" />
                  </div>
                </div>
              )}

              {/* Loading thinking indicator */}
              {isLoading && !streamingContent && (
                <div className="flex w-full animate-in flex-row gap-4 duration-200 fade-in">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-cyan-400 text-white shadow-xs select-none">
                    <Bot className="size-4" />
                  </div>
                  <div className="flex items-center gap-2 rounded-3xl rounded-tl-none border border-border/80 bg-card px-5 py-4 shadow-xs">
                    <Loader2 className="size-3.5 animate-spin text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Warmup & prefilling prompt...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* --- Input Command Panel --- */}
        <div className="shrink-0 border-t border-border/50 bg-background/50 p-4 backdrop-blur-md md:p-6">
          <div className="relative mx-auto max-w-3xl">
            <div className="relative flex flex-col rounded-2xl border border-border bg-card p-1.5 shadow-xs transition-all duration-300 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isLoading
                    ? "Generating content..."
                    : `Ask ${MODEL_OPTIONS.find((m) => m.id === selectedModel)?.name} (Offline WebGPU)...`
                }
                rows={1}
                disabled={isLoading}
                className="max-h-40 min-h-[38px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm leading-normal text-foreground outline-none placeholder:text-muted-foreground"
              />
              <div className="mt-1 flex items-center justify-between border-t border-border/40 px-2 pt-1.5">
                <span className="text-[10px] font-medium text-muted-foreground/80">
                  Model processes inside your browser GPU sandbox
                </span>
                <Button
                  onClick={() => handleSendMessage(input)}
                  disabled={!input.trim() || isLoading}
                  size="icon-sm"
                  className={cn(
                    "rounded-xl bg-primary text-primary-foreground transition-all duration-200",
                    input.trim() && !isLoading
                      ? "opacity-100 hover:scale-[1.03]"
                      : "opacity-40"
                  )}
                >
                  <Send className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- Local Model Loading Progress Modal --- */}
      {isLocalLoading && (
        <div className="fixed inset-0 z-55 flex animate-in items-center justify-center bg-black/45 backdrop-blur-md duration-200 fade-in">
          <div className="mx-4 w-full max-w-sm space-y-4 rounded-3xl border border-border/80 bg-card p-6 text-center shadow-2xl">
            <div className="mx-auto flex size-12 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-500 text-white shadow-lg">
              <Bot className="size-6 animate-spin duration-3000" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                Downloading Local Model
              </h3>
              <p className="text-xs text-muted-foreground">
                Fetching weights to local browser storage cache
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 transition-all duration-300 ease-out"
                  style={{ width: `${localLoadingProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-medium text-muted-foreground/80">
                <span className="max-w-[75%] truncate text-left">
                  {localLoadingText || "Fetching assets..."}
                </span>
                <span>{localLoadingProgress}%</span>
              </div>
            </div>

            <p className="text-[10px] leading-normal text-muted-foreground/75">
              Weight models vary from 380MB to 1.1GB. This download happens only
              once per model; subsequent loads start immediately.
            </p>
          </div>
        </div>
      )}

      {/* --- Settings Modal (Local SLM Configuration) --- */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Local Model Configurations</DialogTitle>
            <DialogDescription>
              Configure generation and WebGPU engine options to tune the Small
              Language Model outputs. Settings are preserved in local storage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-3 text-xs leading-normal">
            {/* System Prompt Instructions */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                System Prompt Instructions
              </label>
              <textarea
                value={tempConfig.systemPrompt}
                onChange={(e) =>
                  setTempConfig({ ...tempConfig, systemPrompt: e.target.value })
                }
                placeholder="Instructions guiding the assistant behavior..."
                className="min-h-[70px] w-full resize-y rounded-xl border border-border/80 bg-input/40 px-3 py-2 text-xs text-foreground focus:border-primary/60 focus:outline-none"
              />
              <p className="text-[10px] text-muted-foreground">
                Sets default behaviors and guardrails for the neural model.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Temperature Selector */}
              <div className="space-y-1.5 rounded-2xl border border-border/30 bg-muted/20 p-3">
                <div className="flex justify-between text-xs font-semibold text-foreground">
                  <span>Temperature</span>
                  <span className="font-mono text-primary">
                    {tempConfig.temperature}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="2.0"
                  step="0.05"
                  value={tempConfig.temperature}
                  onChange={(e) =>
                    setTempConfig({
                      ...tempConfig,
                      temperature: parseFloat(e.target.value),
                    })
                  }
                  className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
                />
                <p className="text-[9px] text-muted-foreground">
                  Creativity/Randomness: higher values generate creative
                  completions, lower values increase facts alignment.
                </p>
              </div>

              {/* Top P Nucleus */}
              <div className="space-y-1.5 rounded-2xl border border-border/30 bg-muted/20 p-3">
                <div className="flex justify-between text-xs font-semibold text-foreground">
                  <span>Top P (Nucleus)</span>
                  <span className="font-mono text-primary">
                    {tempConfig.topP}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={tempConfig.topP}
                  onChange={(e) =>
                    setTempConfig({
                      ...tempConfig,
                      topP: parseFloat(e.target.value),
                    })
                  }
                  className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
                />
                <p className="text-[9px] text-muted-foreground">
                  Nucleus sampling filter: limits candidate choices to a
                  cumulative probability percentage.
                </p>
              </div>

              {/* Repetition Penalty */}
              <div className="space-y-1.5 rounded-2xl border border-border/30 bg-muted/20 p-3">
                <div className="flex justify-between text-xs font-semibold text-foreground">
                  <span>Repetition Penalty</span>
                  <span className="font-mono text-primary">
                    {tempConfig.repetitionPenalty}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={tempConfig.repetitionPenalty}
                  onChange={(e) =>
                    setTempConfig({
                      ...tempConfig,
                      repetitionPenalty: parseFloat(e.target.value),
                    })
                  }
                  className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
                />
                <p className="text-[9px] text-muted-foreground">
                  Discourages repeating duplicate tokens in model output. 1.0
                  represents standard penalty.
                </p>
              </div>

              {/* Frequency Penalty */}
              <div className="space-y-1.5 rounded-2xl border border-border/30 bg-muted/20 p-3">
                <div className="flex justify-between text-xs font-semibold text-foreground">
                  <span>Frequency Penalty</span>
                  <span className="font-mono text-primary">
                    {tempConfig.frequencyPenalty}
                  </span>
                </div>
                <input
                  type="range"
                  min="-2.0"
                  max="2.0"
                  step="0.1"
                  value={tempConfig.frequencyPenalty}
                  onChange={(e) =>
                    setTempConfig({
                      ...tempConfig,
                      frequencyPenalty: parseFloat(e.target.value),
                    })
                  }
                  className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
                />
                <p className="text-[9px] text-muted-foreground">
                  Applies dynamic penalty scale based on total frequency of
                  appearance of tokens so far.
                </p>
              </div>

              {/* Presence Penalty */}
              <div className="space-y-1.5 rounded-2xl border border-border/30 bg-muted/20 p-3">
                <div className="flex justify-between text-xs font-semibold text-foreground">
                  <span>Presence Penalty</span>
                  <span className="font-mono text-primary">
                    {tempConfig.presencePenalty}
                  </span>
                </div>
                <input
                  type="range"
                  min="-2.0"
                  max="2.0"
                  step="0.1"
                  value={tempConfig.presencePenalty}
                  onChange={(e) =>
                    setTempConfig({
                      ...tempConfig,
                      presencePenalty: parseFloat(e.target.value),
                    })
                  }
                  className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
                />
                <p className="text-[9px] text-muted-foreground">
                  Applies one-off penalty scale for any token that has already
                  appeared once in generation.
                </p>
              </div>

              {/* Max tokens */}
              <div className="space-y-1.5 rounded-2xl border border-border/30 bg-muted/20 p-3">
                <div className="flex justify-between text-xs font-semibold text-foreground">
                  <span>Max Generated Tokens</span>
                  <span className="font-mono text-primary">
                    {tempConfig.maxTokens}
                  </span>
                </div>
                <input
                  type="range"
                  min="64"
                  max="4096"
                  step="64"
                  value={tempConfig.maxTokens}
                  onChange={(e) =>
                    setTempConfig({
                      ...tempConfig,
                      maxTokens: parseInt(e.target.value),
                    })
                  }
                  className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
                />
                <p className="text-[9px] text-muted-foreground">
                  Controls maximum token generation limits for single chat
                  output chunks.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 border-t border-border/50 pt-4 md:grid-cols-2">
              {/* Context window size */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Context Size (Token Limit)
                </label>
                <Select
                  value={tempConfig.contextWindowSize.toString()}
                  onValueChange={(val) =>
                    setTempConfig({
                      ...tempConfig,
                      contextWindowSize: parseInt(val),
                    })
                  }
                >
                  <SelectTrigger className="h-9 w-full cursor-pointer rounded-xl border-transparent bg-input/40 text-xs hover:bg-input/70">
                    <SelectValue placeholder="Context Size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1024">1024 tokens</SelectItem>
                    <SelectItem value="2048">
                      2048 tokens (Recommended)
                    </SelectItem>
                    <SelectItem value="4096">4096 tokens</SelectItem>
                    <SelectItem value="8192">
                      8192 tokens (Requires more VRAM)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Controls total KV Cache window buffer allocated inside WebGPU.
                </p>
              </div>

              {/* Logging levels */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Inference Log Level
                </label>
                <Select
                  value={tempConfig.logLevel}
                  onValueChange={(val) =>
                    setTempConfig({ ...tempConfig, logLevel: val as any })
                  }
                >
                  <SelectTrigger className="h-9 w-full cursor-pointer rounded-xl border-transparent bg-input/40 text-xs hover:bg-input/70">
                    <SelectValue placeholder="Log Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRACE">TRACE</SelectItem>
                    <SelectItem value="DEBUG">DEBUG</SelectItem>
                    <SelectItem value="INFO">INFO (Default)</SelectItem>
                    <SelectItem value="WARN">WARN</SelectItem>
                    <SelectItem value="ERROR">ERROR</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Configures MLC engine developer logs in browser developer
                  Console.
                </p>
              </div>
            </div>

            {/* Reload Warning alert */}
            {(tempConfig.contextWindowSize !== genConfig.contextWindowSize ||
              tempConfig.logLevel !== genConfig.logLevel) && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-[10px] leading-relaxed text-amber-600 dark:text-amber-400">
                ⚠️ Changing <strong>Context Size</strong> or{" "}
                <strong>Log Level</strong> requires reallocating GPU memory. The
                active model will unload and reload on your next message.
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleResetConfig}
              className="h-9 rounded-xl"
            >
              Reset Defaults
            </Button>
            <Button onClick={handleSaveConfig} className="h-9 rounded-xl">
              Save Configurations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- Clipboard Code Block Component ---
interface CodeBlockBlockProps {
  language: string
  code: string
}

function CodeBlockBlock({ language, code }: CodeBlockBlockProps) {
  const [copied, setCopied] = React.useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    toast.success("Code snippet copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-4 overflow-hidden rounded-2xl border border-border/80 bg-zinc-950 font-mono text-xs leading-normal text-zinc-50 shadow-md">
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-2 text-[10px] text-zinc-400">
        <span className="font-semibold tracking-wider uppercase">
          {language}
        </span>
        <button
          onClick={copyToClipboard}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-zinc-800/40 px-2.5 py-1 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-emerald-400" />
              <span className="font-medium text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <div className="max-h-[450px] overflow-x-auto p-4 text-left">
        <pre className="whitespace-pre">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  )
}

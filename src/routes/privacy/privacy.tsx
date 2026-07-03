import { Link } from "@tanstack/react-router"
import { ArrowLeft, Shield, Eye, Database, Cpu } from "lucide-react"

export default function PrivacyPage() {
  const lastUpdated = "July 3, 2026"

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-sans">
      {/* Decorative gradients */}
      <div className="absolute top-0 left-0 -z-10 h-[500px] w-full bg-[radial-gradient(ellipse_at_top,var(--color-muted)/20,transparent_50%)]" />

      <div className="mx-auto max-w-4xl px-6 py-12 md:py-20">
        {/* Navigation */}
        <Link
          to="/"
          className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground hover:border-accent"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Editor
        </Link>

        {/* Header */}
        <div className="mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b pb-8">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Last updated: {lastUpdated}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 border">
            <Shield className="h-6 w-6 text-primary" />
          </div>
        </div>

        {/* Sub-header Cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card/50 p-4 backdrop-blur-xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Database className="h-4 w-4" />
            </div>
            <h3 className="mt-3 font-semibold text-sm">Local-First Storage</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Your notes never touch our servers. They stay safely in your browser's IndexedDB.
            </p>
          </div>
          <div className="rounded-xl border bg-card/50 p-4 backdrop-blur-xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Eye className="h-4 w-4" />
            </div>
            <h3 className="mt-3 font-semibold text-sm">Zero Data Collection</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              We do not track you, run analytics, or collect telemetry. Your content is yours alone.
            </p>
          </div>
          <div className="rounded-xl border bg-card/50 p-4 backdrop-blur-xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Cpu className="h-4 w-4" />
            </div>
            <h3 className="mt-3 font-semibold text-sm">Direct Google Sync</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Cloud backups communicate directly from your device to your Google Drive account.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="mt-12 space-y-8 text-sm md:text-base leading-relaxed text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">1. Introduction</h2>
            <p>
              Welcome to <span className="font-semibold text-foreground">MemoryLeak</span>. We are committed to protecting your privacy. MemoryLeak is designed as a local-first application, which means that your privacy is preserved by default. We do not host databases, process your files on our servers, or collect any metrics on your notes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">2. Google Drive Integration</h2>
            <p>
              MemoryLeak provides an optional synchronization feature using Google Drive.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-semibold text-foreground">Scope of Access</span>: MemoryLeak requests the <code className="rounded bg-muted px-1 font-mono">https://www.googleapis.com/auth/drive.file</code> scope. This allows MemoryLeak to view, edit, and delete only the specific files and folders that you create or open using this application (by default, a folder named "MemoryLeak"). We cannot access any other files in your Google Drive.
              </li>
              <li>
                <span className="font-semibold text-foreground">Direct Connection</span>: All authentication and file operations happen directly between your web browser and the Google APIs. No tokens, credentials, or file contents are sent to, or routed through, any intermediate servers.
              </li>
              <li>
                <span className="font-semibold text-foreground">Storage of Credentials</span>: Your Google OAuth access tokens are stored strictly in session storage within your browser. Disconnecting or clearing your browser session immediately removes these tokens.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">3. Local & External AI Processing</h2>
            <p>
              MemoryLeak offers intelligent chat and note processing capabilities.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-semibold text-foreground">Local Models</span>: If you choose to run local AI models, execution happens fully client-side on your device's web GPU/CPU using Web-LLM. Your chat sessions and contexts never leave your computer.
              </li>
              <li>
                <span className="font-semibold text-foreground">External Models</span>: If you configure an external API key (such as Google Gemini API), your requests are sent directly to the AI service provider (Google). MemoryLeak does not intercept, log, or store these API requests or keys.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">4. Cookies and Local Browser Storage</h2>
            <p>
              MemoryLeak uses standard browser storage mechanisms to provide a seamless editor experience:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-semibold text-foreground">IndexedDB</span>: Used to store note lists, folders, and text files.
              </li>
              <li>
                <span className="font-semibold text-foreground">LocalStorage</span>: Used to save UI preferences, theme choices, and chat session histories.
              </li>
            </ul>
            <p>
              You can wipe this data at any time by clearing your browser cache or deleting site data in your browser settings.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">5. Children's Privacy</h2>
            <p>
              Since we do not collect any personal data, we do not knowingly solicit or maintain any information from children under 13.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">6. Contact Information</h2>
            <p>
              If you have any questions or feedback about this Privacy Policy or how your data is handled locally, you can create an issue on our GitHub repository or contact us directly.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-16 border-t pt-8 text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} MemoryLeak. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

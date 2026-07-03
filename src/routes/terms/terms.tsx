import { Link } from "@tanstack/react-router"
import { ArrowLeft, FileText, Scale, UserCheck, ShieldAlert } from "lucide-react"

export default function TermsPage() {
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
              Terms of Service
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Last updated: {lastUpdated}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 border">
            <Scale className="h-6 w-6 text-primary" />
          </div>
        </div>

        {/* Sub-header Cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card/50 p-4 backdrop-blur-xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserCheck className="h-4 w-4" />
            </div>
            <h3 className="mt-3 font-semibold text-sm">Full Ownership</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Your notes and files belong completely to you. We claim no intellectual property rights.
            </p>
          </div>
          <div className="rounded-xl border bg-card/50 p-4 backdrop-blur-xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <h3 className="mt-3 font-semibold text-sm">No Liability</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              As a local-first application, you are responsible for backing up your data.
            </p>
          </div>
          <div className="rounded-xl border bg-card/50 p-4 backdrop-blur-xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <h3 className="mt-3 font-semibold text-sm">Fair & Ethical Use</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Use the app responsibly, including integrations with external Google APIs.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="mt-12 space-y-8 text-sm md:text-base leading-relaxed text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">1. Agreement to Terms</h2>
            <p>
              By accessing or using <span className="font-semibold text-foreground">MemoryLeak</span>, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, please do not use the application.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">2. Description of Service</h2>
            <p>
              MemoryLeak is a local-first, privacy-respecting markdown editor with direct Google Drive synchronization and local/external AI processing capabilities. It operates client-side inside your browser.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">3. User Content & Ownership</h2>
            <p>
              You retain all ownership, copyrights, and intellectual property rights to any content, text, code, or media that you create, edit, import, or sync using MemoryLeak.
            </p>
            <p>
              Because MemoryLeak stores all note content locally within your browser's IndexedDB, we do not have access to, inspect, or manage any of your content. You are solely responsible for ensuring you have appropriate backups of your data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">4. Google API & Third Party Services</h2>
            <p>
              By using the Google Drive sync feature, you connect MemoryLeak directly to your Google account:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                You agree to comply with Google’s Terms of Service and Privacy Policy when using Google Drive API features.
              </li>
              <li>
                MemoryLeak interacts directly with Google's endpoints via OAuth. You are responsible for maintaining the security of your own Google account credentials.
              </li>
              <li>
                Any external AI models (like Gemini API) are subject to the terms of the third-party providers.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">5. Disclaimers & Limitation of Liability</h2>
            <p className="italic">
              THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. WE MAKE NO WARRANTIES, EXPRESS OR IMPLIED, REGARDING THE RELIABILITY, SECURITY, OR AVAILABILITY OF THE APPLICATION.
            </p>
            <p>
              Since data is stored client-side on your device, we are not liable for any data loss, corruption, or database failures that might occur due to browser updates, operating system actions, storage clearing, or device failures. We strongly encourage you to configure the Google Drive synchronization feature or export backups regularly.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">6. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms of Service at any time. When we make updates, the "Last updated" date at the top will be updated. Your continued use of MemoryLeak after changes are posted constitutes your acceptance of the updated terms.
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

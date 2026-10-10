import * as React from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/cn"

function getFocusable(container: HTMLElement): HTMLElement[] {
  // Everything a modal renders as its children is visible by
  // construction once it's open -- no further visibility check needed
  // (offsetParent-based checks are unreliable across browsers for
  // fixed-position content, and jsdom has no layout engine to compute
  // them at all).
  return Array.from(container.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((el) => !el.hasAttribute("disabled"))
}

export function Modal({ open, onClose, title, children, className }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; className?: string }) {
  const dialogRef = React.useRef<HTMLDivElement>(null)
  const previouslyFocused = React.useRef<HTMLElement | null>(null)

  // Focus management for a dialog that's portaled outside the normal
  // DOM flow: move focus in when it opens (otherwise it silently stays
  // wherever it was on the page behind the overlay), trap Tab within it
  // while open (otherwise keyboard/screen-reader users can tab straight
  // through the backdrop into background content that's supposed to be
  // inert), and restore focus to whatever triggered it on close.
  React.useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement | null

    // Focuses the dialog container itself (via its tabIndex={-1}) rather
    // than guessing which child is most important -- predictable, and
    // works even for a dialog with no focusable content yet (e.g. a
    // loading state). Tab from here naturally reaches the first real
    // focusable element.
    const raf = requestAnimationFrame(() => {
      dialogRef.current?.focus()
    })

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose()
        return
      }
      if (e.key !== "Tab" || !dialogRef.current) return
      const focusable = getFocusable(dialogRef.current)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener("keydown", onKey)
      previouslyFocused.current?.focus()
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            className={cn("relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-base-400 bg-base-100 p-5 shadow-glow sm:p-6 focus:outline-none", className)}
          >
            {title && (
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-50">{title}</h2>
                <button onClick={onClose} className="focus-ring rounded-md p-1.5 text-zinc-400 hover:bg-base-300 hover:text-white" aria-label="Close dialog">
                  <X className="size-5" />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

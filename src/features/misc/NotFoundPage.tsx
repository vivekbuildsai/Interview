import { LinkButton } from "@/components/ui/Button"

export default function NotFoundPage() {
  return (
    <div className="bg-arena flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <p className="text-5xl font-bold text-accent-violetSoft">404</p>
      <p className="text-zinc-400">This page doesn't exist.</p>
      <LinkButton to="/">Back to Dashboard</LinkButton>
    </div>
  )
}

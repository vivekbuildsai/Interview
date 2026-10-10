// Minimal fenced-code-block renderer for question prompts -- just enough
// to show a YAML/code snippet inline in monospace without pulling in a
// full markdown dependency for a handful of question strings.
export function PromptText({ text }: { text: string }) {
  const parts = text.split(/```/)
  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-zinc-200">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <pre key={i} className="overflow-x-auto rounded-lg bg-base-0 p-3 font-mono text-xs text-accent-cyan">
            {part.trim()}
          </pre>
        ) : (
          <p key={i} className="whitespace-pre-wrap">
            {part.trim()}
          </p>
        ),
      )}
    </div>
  )
}

import { useEffect, useState } from "react"
import { Eye, ThumbsDown, ThumbsUp } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import type { ScenarioQuestion } from "@/lib/types"

export function ScenarioExercise({ question, submitted, onSubmit }: { question: ScenarioQuestion; submitted: boolean; onSubmit: (correct: boolean) => void }) {
  const [notes, setNotes] = useState("")
  const [revealed, setRevealed] = useState(false)

  // Resetting from `question.id` (not deriving the initial state from the
  // `submitted` prop at mount) is deliberate -- confirmed live: when
  // advancing from a just-submitted question to a new scenario question,
  // ChallengePage's own `submitted` state is still `true` during the very
  // render that mounts this new question (it only resets in a *later*
  // effect), so a fresh instance reading `submitted` as its initial
  // `revealed` value showed the model answer immediately, before the
  // user ever clicked "Reveal". This effect is what actually guarantees a
  // clean slate on every new question, independent of that timing.
  useEffect(() => {
    setNotes("")
    setRevealed(false)
  }, [question.id])

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label htmlFor="scenario-notes" className="mb-1.5 block text-xs font-medium text-zinc-500">
          Draft your answer (optional -- never graded automatically, just for your own thinking)
        </label>
        <textarea
          id="scenario-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={revealed}
          rows={5}
          placeholder="Type your reasoning here before revealing the model answer..."
          className="focus-ring w-full resize-none rounded-xl border border-base-400 bg-base-200/60 p-3 text-sm text-zinc-200 placeholder:text-zinc-500 disabled:opacity-70"
        />
      </div>

      {!revealed && (
        <Button variant="secondary" size="sm" className="w-fit" onClick={() => setRevealed(true)}>
          <Eye className="size-4" /> Reveal model answer
        </Button>
      )}

      {revealed && (
        <Card className="bg-base-200/50">
          <CardContent className="flex flex-col gap-3 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">What a strong answer covers</p>
              <ul className="mt-1.5 list-inside list-disc space-y-1 text-sm text-zinc-300">
                {question.rubric.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Model answer</p>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-300">{question.modelAnswer}</p>
            </div>

            {!submitted && (
              <div className="mt-1 flex flex-wrap items-center gap-2 border-t border-base-400 pt-3">
                <span className="text-xs text-zinc-500">Honestly, how did your answer compare?</span>
                <Button size="sm" variant="secondary" onClick={() => onSubmit(true)}>
                  <ThumbsUp className="size-4" /> I nailed it
                </Button>
                <Button size="sm" variant="outline" onClick={() => onSubmit(false)}>
                  <ThumbsDown className="size-4" /> Needs review
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

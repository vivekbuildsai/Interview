import { useState } from "react"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/cn"
import type { MultipleChoiceQuestion } from "@/lib/types"
import { Button } from "@/components/ui/Button"

export function MultipleChoiceExercise({ question, submitted, onSubmit }: { question: MultipleChoiceQuestion; submitted: boolean; onSubmit: (correct: boolean) => void }) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Answer options">
        {question.options.map((opt, i) => {
          const isSelected = selected === opt.id
          const isCorrectOption = opt.id === question.correctOptionId
          const showState = submitted

          return (
            <button
              key={opt.id}
              role="radio"
              aria-checked={isSelected}
              disabled={submitted}
              onClick={() => setSelected(opt.id)}
              className={cn(
                "focus-ring flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                !showState && isSelected && "border-accent-violet bg-accent-violet/10 text-zinc-50",
                !showState && !isSelected && "border-base-400 bg-base-200/60 text-zinc-300 hover:border-base-500 hover:bg-base-300/60",
                showState && isCorrectOption && "border-success bg-success/10 text-zinc-50",
                showState && isSelected && !isCorrectOption && "border-danger bg-danger/10 text-zinc-50",
                showState && !isSelected && !isCorrectOption && "border-base-400 bg-base-200/30 text-zinc-500",
              )}
            >
              <span className="flex items-center gap-3">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-md border border-base-500 text-[11px] font-semibold text-zinc-400">{String.fromCharCode(65 + i)}</span>
                {opt.label}
              </span>
              {showState && isCorrectOption && <Check className="size-4 shrink-0 text-success" />}
              {showState && isSelected && !isCorrectOption && <X className="size-4 shrink-0 text-danger" />}
            </button>
          )
        })}
      </div>

      {!submitted && (
        <Button disabled={!selected} onClick={() => selected && onSubmit(selected === question.correctOptionId)} className="w-fit">
          Submit answer
        </Button>
      )}
    </div>
  )
}

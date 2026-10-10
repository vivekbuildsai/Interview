import { useEffect, useMemo, useRef, useState } from "react"
import { Navigate, useNavigate, useParams } from "react-router-dom"
import { motion } from "framer-motion"
import { ArrowRight, CheckCircle2, Lightbulb, LogOut, Trophy, X, XCircle } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Modal } from "@/components/ui/Modal"
import { ProgressBar } from "@/components/ui/ProgressBar"
import { ExerciseRenderer } from "./ExerciseRenderer"
import { PromptText } from "./PromptText"
import { findQuestion, getGame, questionsForDifficulty, shuffled } from "@/lib/gameRegistry"
import { useArenaStore } from "@/lib/store"
import { DIFFICULTY_META, type Difficulty, type Question } from "@/lib/types"
import { xpForAttempt } from "@/lib/scoring"

function useStopwatch(startedAt: number | null) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!startedAt) return
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 1000)
    return () => clearInterval(id)
  }, [startedAt])
  return elapsed
}

function formatClock(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export default function ChallengePage() {
  const { gameId, difficulty } = useParams<{ gameId: string; difficulty: Difficulty }>()
  const navigate = useNavigate()

  const activeSession = useArenaStore((s) => s.activeSession)
  const startSession = useArenaStore((s) => s.startSession)
  const recordAttempt = useArenaStore((s) => s.recordAttempt)
  const advance = useArenaStore((s) => s.advance)
  const finishSession = useArenaStore((s) => s.finishSession)
  const abandonSession = useArenaStore((s) => s.abandonSession)

  const [submitted, setSubmitted] = useState(false)
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [exitOpen, setExitOpen] = useState(false)
  const questionStartedAt = useRef(Date.now())

  const game = gameId ? getGame(gameId) : undefined
  const matchesActive = activeSession?.gameId === gameId && activeSession?.difficulty === difficulty

  useEffect(() => {
    if (!game || !difficulty) return
    if (matchesActive) return
    const pool = shuffled(questionsForDifficulty(game.id, difficulty))
    if (pool.length === 0) return
    startSession(game.id, difficulty, pool)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.id, difficulty, matchesActive])

  useEffect(() => {
    questionStartedAt.current = Date.now()
    setSubmitted(false)
    setWasCorrect(null)
    setHintsUsed(0)
  }, [activeSession?.currentIndex])

  const elapsed = useStopwatch(activeSession?.startedAt ?? null)

  const questions: Question[] = useMemo(() => {
    if (!activeSession) return []
    return activeSession.questionIds.map((id) => findQuestion(id)).filter((q): q is Question => Boolean(q))
  }, [activeSession])

  if (!game || !difficulty) return <Navigate to="/library" replace />
  if (questionsForDifficulty(game.id, difficulty).length === 0) return <Navigate to={`/play/${game.id}`} replace />
  if (!activeSession || !matchesActive || questions.length === 0) {
    return (
      <div className="bg-arena flex min-h-screen items-center justify-center text-zinc-400">
        <p>Preparing your session...</p>
      </div>
    )
  }

  const diff: Difficulty = difficulty

  const currentQuestion = questions[Math.min(activeSession.currentIndex, questions.length - 1)]
  const isLast = activeSession.currentIndex >= questions.length - 1
  const correctCount = activeSession.attempts.filter((a) => a.correct).length
  const meta = DIFFICULTY_META[diff]
  const earnedThisQuestion = wasCorrect ? xpForAttempt({ correct: true, difficulty: diff, hintsUsed, timeMs: Date.now() - questionStartedAt.current }, currentQuestion.estimatedSeconds) : 0

  function handleSubmit(correct: boolean) {
    recordAttempt({
      questionId: currentQuestion.id,
      difficulty: diff,
      topic: currentQuestion.topic,
      correct,
      skipped: false,
      hintsUsed,
      timeMs: Date.now() - questionStartedAt.current,
    })
    setWasCorrect(correct)
    setSubmitted(true)
  }

  function handleNext() {
    if (isLast) {
      const estimatedSecondsByQuestion = Object.fromEntries(questions.map((q) => [q.id, q.estimatedSeconds]))
      const result = finishSession(estimatedSecondsByQuestion)
      navigate(`/arena/${game!.id}/${diff}/results`, { state: { sessionId: result?.id }, replace: true })
    } else {
      advance()
    }
  }

  function handleExitConfirm() {
    if (activeSession!.attempts.length === 0) {
      abandonSession()
      navigate(`/play/${game!.id}`)
      return
    }
    const estimatedSecondsByQuestion = Object.fromEntries(questions.map((q) => [q.id, q.estimatedSeconds]))
    const result = finishSession(estimatedSecondsByQuestion)
    navigate(`/arena/${game!.id}/${diff}/results`, { state: { sessionId: result?.id }, replace: true })
  }

  const hints = currentQuestion.hints ?? []

  return (
    <div className="bg-arena min-h-screen">
      <header className="sticky top-0 z-20 border-b border-base-400/60 bg-base-0/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => setExitOpen(true)} className="focus-ring flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-zinc-400 hover:text-white" aria-label="Exit challenge">
            <X className="size-4" /> Exit
          </button>
          <div className="flex flex-1 items-center gap-3 px-2">
            <span className="shrink-0 text-xs text-zinc-500">
              {activeSession.currentIndex + 1}/{questions.length}
            </span>
            <ProgressBar value={((activeSession.currentIndex + (submitted ? 1 : 0)) / questions.length) * 100} />
          </div>
          <div className="flex shrink-0 items-center gap-3 text-sm text-zinc-400">
            <span className="hidden sm:inline">{formatClock(elapsed)}</span>
            <span className="flex items-center gap-1 font-semibold text-accent-violetSoft">
              <Trophy className="size-3.5" /> {correctCount}/{activeSession.attempts.length}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <motion.div key={currentQuestion.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="violet">{game.name}</Badge>
            <Badge tone="neutral">{currentQuestion.topic}</Badge>
            <Badge tone="cyan">{meta.label}</Badge>
          </div>

          <div className="rounded-2xl border border-base-400 bg-base-100/80 p-5 shadow-card sm:p-6">
            <PromptText text={currentQuestion.prompt} />
          </div>

          {hints.length > 0 && (
            <div className="flex flex-col gap-2">
              {hintsUsed > 0 && (
                <div className="flex flex-col gap-1.5">
                  {hints.slice(0, hintsUsed).map((h, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-2.5 text-sm text-zinc-300">
                      <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" />
                      {h}
                    </div>
                  ))}
                </div>
              )}
              {hintsUsed < hints.length && !submitted && (
                <Button variant="ghost" size="sm" className="w-fit text-warning" onClick={() => setHintsUsed((n) => n + 1)}>
                  <Lightbulb className="size-4" /> Show a hint ({hintsUsed}/{hints.length} used)
                </Button>
              )}
            </div>
          )}

          <ExerciseRenderer question={currentQuestion} submitted={submitted} onSubmit={handleSubmit} />

          {submitted && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border p-5 ${wasCorrect ? "border-success/40 bg-success/5" : "border-danger/40 bg-danger/5"}`}
            >
              <div className="flex items-center gap-2">
                {wasCorrect ? <CheckCircle2 className="size-5 text-success" /> : <XCircle className="size-5 text-danger" />}
                <span className="font-semibold text-zinc-50">{wasCorrect ? "Correct!" : "Not quite"}</span>
                {wasCorrect && earnedThisQuestion > 0 && <Badge tone="violet">+{earnedThisQuestion} XP</Badge>}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">{currentQuestion.explanation}</p>
              <Button className="mt-4" onClick={handleNext}>
                {isLast ? "See results" : "Next question"} <ArrowRight className="size-4" />
              </Button>
            </motion.div>
          )}
        </motion.div>
      </main>

      <Modal open={exitOpen} onClose={() => setExitOpen(false)} title="Exit this session?">
        <p className="text-sm text-zinc-400">
          {activeSession.attempts.length > 0
            ? `You've answered ${activeSession.attempts.length} question${activeSession.attempts.length === 1 ? "" : "s"} so far -- that progress will be saved and you'll see your results.`
            : "You haven't answered anything yet, so nothing will be saved."}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setExitOpen(false)}>
            Keep playing
          </Button>
          <Button variant="danger" onClick={handleExitConfirm}>
            <LogOut className="size-4" /> Exit
          </Button>
        </div>
      </Modal>
    </div>
  )
}

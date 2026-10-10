import { useState } from "react"
import Editor from "@monaco-editor/react"
import { CheckCircle2, Loader2, Play, XCircle } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/cn"
import type { CodingQuestion } from "@/lib/types"
import { runPythonFunction, type RunResult } from "@/lib/pyRunner"

export function CodingExercise({ question, submitted, onSubmit }: { question: CodingQuestion; submitted: boolean; onSubmit: (correct: boolean) => void }) {
  const [code, setCode] = useState(question.starterCode)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<RunResult | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  async function runTests() {
    setRunning(true)
    setLoadError(null)
    try {
      const r = await runPythonFunction(code, question.functionName, question.testCases)
      setResult(r)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to run your code.")
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="monaco-editor-shell border border-base-400">
        <Editor
          height="260px"
          language="python"
          theme="vs-dark"
          value={code}
          onChange={(v) => setCode(v ?? "")}
          options={{
            readOnly: submitted,
            fontSize: 13,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            wordWrap: "on",
          }}
        />
      </div>

      {loadError && (
        <p className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{loadError}</p>
      )}

      {result && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-base-400 bg-base-200/50 p-3">
          {result.outcomes.map((o, i) => (
            <div key={i} className={cn("flex items-start gap-2 text-sm", o.passed ? "text-success" : "text-danger")}>
              {o.passed ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <XCircle className="mt-0.5 size-4 shrink-0" />}
              <div>
                <p>{o.description}</p>
                {!o.passed && <p className="text-xs text-zinc-500">{o.error ? o.error : `Got ${JSON.stringify(o.actual)}, expected ${JSON.stringify(o.expected)}`}</p>}
              </div>
            </div>
          ))}
          {result.stdout && <pre className="mt-1 max-h-24 overflow-auto rounded-md bg-base-0 p-2 text-xs text-zinc-400">{result.stdout}</pre>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!submitted && (
          <Button variant="secondary" size="sm" disabled={running} onClick={runTests}>
            {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            {running ? "Running (loading Python runtime on first use)..." : "Run tests"}
          </Button>
        )}
        {!submitted && (
          <Button size="sm" disabled={!result || running} onClick={() => result && onSubmit(result.allPassed)}>
            Submit answer
          </Button>
        )}
        {!result && !submitted && <span className="text-xs text-zinc-500">Run your code at least once to enable submit.</span>}
      </div>
    </div>
  )
}

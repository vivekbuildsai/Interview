// Real, in-browser Python execution for coding/debugging exercises --
// via Pyodide (CPython compiled to WebAssembly), run inside a dedicated
// Web Worker (src/workers/pyodideWorker.ts) and loaded lazily from a
// pinned CDN build only the first time a coding exercise is run.
//
// Why a worker, not the main thread: a user's code can contain an
// infinite loop (accidentally or not), and a synchronous WASM call on
// the main thread cannot be interrupted from the outside -- it would
// freeze the entire tab with no way to recover short of closing it. A
// worker can be forcibly terminated from here on a timeout, which is
// the only reliable way to recover. It also means untrusted code never
// runs in the same JS global scope as the app -- no DOM, no
// localStorage, no access to this app's own state, regardless of what
// Pyodide's `js` interop module could otherwise reach into.
//
// Nothing is ever sent to a server: all of this runs entirely inside
// the user's own browser. This is genuine execution, never simulated --
// every failure path (CDN unreachable, execution timed out, the worker
// crashed) surfaces an honest error, never a faked "passed" result.

import type { CodeTestCase } from "./types"
import type { RunRequest, RunResponse } from "../workers/pyodideWorker"

const EXECUTION_TIMEOUT_MS = 10_000

export interface TestOutcome {
  description: string
  passed: boolean
  expected: unknown
  actual: unknown
  error: string | null
}

export interface RunResult {
  outcomes: TestOutcome[]
  allPassed: boolean
  stdout: string
  runtimeError: string | null
}

interface PendingRequest {
  resolve: (result: RunResult) => void
  timeoutHandle: ReturnType<typeof setTimeout>
}

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, PendingRequest>()

function outcomesFor(testCases: CodeTestCase[], message: string): TestOutcome[] {
  return testCases.map((tc) => ({ description: tc.description, passed: false, expected: tc.expected, actual: null, error: message }))
}

function settleAllPending(message: string) {
  for (const [id, req] of pending) {
    clearTimeout(req.timeoutHandle)
    // We no longer know which question's test cases were in flight once
    // the worker itself has failed, so each caller's own promise is
    // resolved with an empty-but-honest outcome list; runtimeError is
    // what callers actually surface to the user.
    req.resolve({ outcomes: [], allPassed: false, stdout: "", runtimeError: message })
    pending.delete(id)
  }
}

function destroyWorker(reason: string) {
  if (worker) {
    worker.terminate()
    worker = null
  }
  settleAllPending(reason)
}

function getWorker(): Worker {
  if (worker) return worker

  const w = new Worker(new URL("../workers/pyodideWorker.ts", import.meta.url))
  w.onmessage = (event: MessageEvent<RunResponse>) => {
    const res = event.data
    const req = pending.get(res.id)
    if (!req) return
    clearTimeout(req.timeoutHandle)
    pending.delete(res.id)

    if (res.fatalError) {
      req.resolve({ outcomes: [], allPassed: false, stdout: "", runtimeError: res.fatalError })
      return
    }
    const outcomes = res.outcomes ?? []
    req.resolve({ outcomes, allPassed: outcomes.length > 0 && outcomes.every((o) => o.passed), stdout: res.stdout ?? "", runtimeError: res.runtimeError ?? null })
  }
  w.onerror = () => {
    // An uncaught exception inside the worker (e.g. the Python runtime
    // itself crashing, or exhausting the worker's memory) -- the worker
    // is in an unknown state at this point, so it's discarded entirely
    // rather than reused; the next run gets a fresh one.
    destroyWorker("The Python runtime crashed unexpectedly. It has been restarted -- please try running your code again.")
  }

  worker = w
  return w
}

export async function runPythonFunction(userCode: string, functionName: string, testCases: CodeTestCase[]): Promise<RunResult> {
  let w: Worker
  try {
    w = getWorker()
  } catch {
    return { outcomes: outcomesFor(testCases, "unavailable"), allPassed: false, stdout: "", runtimeError: "Could not start the Python runtime in this browser." }
  }

  const id = nextId++
  return new Promise<RunResult>((resolve) => {
    const timeoutHandle = setTimeout(() => {
      pending.delete(id)
      destroyWorker("Your code took too long to run (possibly an infinite loop) and was stopped after 10 seconds.")
      resolve({
        outcomes: outcomesFor(testCases, "Execution timed out after 10 seconds -- check for an infinite loop."),
        allPassed: false,
        stdout: "",
        runtimeError: "Execution timed out after 10 seconds -- check for an infinite loop.",
      })
    }, EXECUTION_TIMEOUT_MS)

    pending.set(id, { resolve, timeoutHandle })
    const req: RunRequest = { id, code: userCode, functionName, testCases }
    w.postMessage(req)
  })
}

// Runs entirely off the main thread. This is what makes it possible to
// forcibly stop a user's infinite loop (worker.terminate() from the main
// thread) without freezing the UI, and it keeps the user's Python code
// out of the same JS global scope as the app itself -- this worker never
// has access to window, document, localStorage, or the Zustand store,
// so there is nothing of the app's for untrusted code to reach even if
// it tried to escape through Pyodide's `js` interop module.
//
// Classic (non-module) worker on purpose: Pyodide's own documented
// worker-loading pattern uses `importScripts()`, which only exists in
// classic worker scope. Vite bundles this file to an IIFE and rewrites
// the constructor URL automatically (see src/lib/pyRunner.ts) -- no
// special build configuration needed beyond that.

import type { CodeTestCase } from "@/lib/types"

const PYODIDE_VERSION = "0.26.4"
const CDN_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`

// This file runs in a classic Web Worker scope, not the DOM -- the
// project's shared tsconfig uses the "DOM" lib (for window/document
// elsewhere in the app), which is mutually exclusive with TypeScript's
// "WebWorker" lib (they declare conflicting globals). Rather than split
// this one file into its own tsconfig/project reference, declare just
// the handful of worker-scope globals this file actually touches.
declare function importScripts(...urls: string[]): void
declare const self: {
  loadPyodide?: (config: { indexURL: string }) => Promise<PyodideInterface>
  onmessage: ((event: MessageEvent<RunRequest>) => void) | null
  postMessage: (message: RunResponse) => void
}

interface PyodideInterface {
  runPythonAsync: (code: string) => Promise<unknown>
  setStdout: (opts: { batched: (msg: string) => void }) => void
  setStderr: (opts: { batched: (msg: string) => void }) => void
}

export interface RunRequest {
  id: number
  code: string
  functionName: string
  testCases: CodeTestCase[]
}

export interface RunResponse {
  id: number
  outcomes?: Array<{ description: string; passed: boolean; expected: unknown; actual: unknown; error: string | null }>
  stdout?: string
  runtimeError?: string | null
  fatalError?: string
}

let pyodidePromise: Promise<PyodideInterface> | null = null

async function getPyodide(): Promise<PyodideInterface> {
  if (pyodidePromise) return pyodidePromise
  pyodidePromise = (async () => {
    // importScripts is synchronous and throws on network failure -- that
    // throw propagates out of this async function as a rejection, which
    // the main thread surfaces as an honest "couldn't load" error.
    importScripts(`${CDN_BASE}pyodide.js`)
    if (!self.loadPyodide) throw new Error("Python runtime script loaded but did not expose loadPyodide().")
    return self.loadPyodide({ indexURL: CDN_BASE })
  })()
  return pyodidePromise
}

function pyRepr(value: unknown): string {
  return JSON.stringify(value ?? null)
    .replace(/\btrue\b/g, "True")
    .replace(/\bfalse\b/g, "False")
    .replace(/\bnull\b/g, "None")
}

async function runOne(req: RunRequest): Promise<RunResponse> {
  const pyodide = await getPyodide()

  let stdoutBuf = ""
  pyodide.setStdout({ batched: (msg) => (stdoutBuf += msg + "\n") })
  pyodide.setStderr({ batched: (msg) => (stdoutBuf += msg + "\n") })

  const testsPy = req.testCases
    .map((tc, i) => {
      const argsRepr = tc.args.map((a) => pyRepr(a)).join(", ")
      return `
try:
    __actual_${i} = ${req.functionName}(${argsRepr})
    __results.append({"passed": __actual_${i} == ${pyRepr(tc.expected)}, "actual": __actual_${i}, "error": None})
except Exception as __e:
    __results.append({"passed": False, "actual": None, "error": f"{type(__e).__name__}: {__e}"})
`
    })
    .join("\n")

  const script = `
import json as __json
__results = []

${req.code}

${testsPy}
__json.dumps(__results)
`

  try {
    const raw = await pyodide.runPythonAsync(script)
    const parsed = JSON.parse(raw as string) as Array<{ passed: boolean; actual: unknown; error: string | null }>
    const outcomes = parsed.map((r, i) => ({
      description: req.testCases[i].description,
      passed: r.passed,
      expected: req.testCases[i].expected,
      actual: r.actual,
      error: r.error,
    }))
    return { id: req.id, outcomes, stdout: stdoutBuf.trim(), runtimeError: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      id: req.id,
      outcomes: req.testCases.map((tc) => ({ description: tc.description, passed: false, expected: tc.expected, actual: null, error: message })),
      stdout: stdoutBuf.trim(),
      runtimeError: message,
    }
  }
}

self.onmessage = (event: MessageEvent<RunRequest>) => {
  const req = event.data
  runOne(req)
    .then((res) => self.postMessage(res))
    .catch((err) => {
      const fatalError = err instanceof Error ? err.message : String(err)
      self.postMessage({ id: req.id, fatalError } satisfies RunResponse)
    })
}

// Real, in-browser Python execution for coding/debugging exercises --
// via Pyodide (CPython compiled to WebAssembly), loaded lazily from a
// pinned CDN build only the first time a coding exercise is opened.
// Nothing is ever sent to a server: the user's code runs entirely inside
// their own browser tab, sandboxed by the WASM runtime itself. This is
// genuine execution, never simulated -- if it fails to load, callers get
// an honest error, never a faked "passed" result.

import type { CodeTestCase } from "./types"

const PYODIDE_VERSION = "0.26.4"
const CDN_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`

declare global {
  interface Window {
    loadPyodide?: (config: { indexURL: string }) => Promise<PyodideInterface>
  }
}

interface PyodideInterface {
  runPythonAsync: (code: string) => Promise<unknown>
  setStdout: (opts: { batched: (msg: string) => void }) => void
  setStderr: (opts: { batched: (msg: string) => void }) => void
}

let pyodidePromise: Promise<PyodideInterface> | null = null
let scriptPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    if (window.loadPyodide) {
      resolve()
      return
    }
    const script = document.createElement("script")
    script.src = `${CDN_BASE}pyodide.js`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Could not load the Python runtime from the CDN. Check your network connection and try again."))
    document.head.appendChild(script)
  })
  return scriptPromise
}

export async function getPyodide(): Promise<PyodideInterface> {
  if (pyodidePromise) return pyodidePromise
  pyodidePromise = (async () => {
    await loadScript()
    if (!window.loadPyodide) throw new Error("Python runtime failed to initialize.")
    return window.loadPyodide({ indexURL: CDN_BASE })
  })()
  return pyodidePromise
}

export function isPyodideReady(): boolean {
  return pyodidePromise !== null
}

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

function pyRepr(value: unknown): string {
  // JSON is a safe, deterministic bridge for the plain data these test
  // cases ever carry (numbers, strings, bools, lists, dicts, null).
  return JSON.stringify(value ?? null)
    .replace(/\btrue\b/g, "True")
    .replace(/\bfalse\b/g, "False")
    .replace(/\bnull\b/g, "None")
}

export async function runPythonFunction(userCode: string, functionName: string, testCases: CodeTestCase[]): Promise<RunResult> {
  const pyodide = await getPyodide()

  let stdoutBuf = ""
  pyodide.setStdout({ batched: (msg) => (stdoutBuf += msg + "\n") })
  pyodide.setStderr({ batched: (msg) => (stdoutBuf += msg + "\n") })

  const testsPy = testCases
    .map((tc, i) => {
      const argsRepr = tc.args.map((a) => pyRepr(a)).join(", ")
      return `
try:
    __actual_${i} = ${functionName}(${argsRepr})
    __results.append({"passed": __actual_${i} == ${pyRepr(tc.expected)}, "actual": __actual_${i}, "error": None})
except Exception as __e:
    __results.append({"passed": False, "actual": None, "error": f"{type(__e).__name__}: {__e}"})
`
    })
    .join("\n")

  const script = `
import json as __json
__results = []

${userCode}

${testsPy}
__json.dumps(__results)
`

  try {
    const raw = await pyodide.runPythonAsync(script)
    const parsed = JSON.parse(raw as string) as Array<{ passed: boolean; actual: unknown; error: string | null }>
    const outcomes: TestOutcome[] = parsed.map((r, i) => ({
      description: testCases[i].description,
      passed: r.passed,
      expected: testCases[i].expected,
      actual: r.actual,
      error: r.error,
    }))
    return { outcomes, allPassed: outcomes.every((o) => o.passed), stdout: stdoutBuf.trim(), runtimeError: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      outcomes: testCases.map((tc) => ({ description: tc.description, passed: false, expected: tc.expected, actual: null, error: message })),
      allPassed: false,
      stdout: stdoutBuf.trim(),
      runtimeError: message,
    }
  }
}

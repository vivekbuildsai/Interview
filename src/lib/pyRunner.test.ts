// pyRunner.ts delegates real Python execution to a Web Worker
// (src/workers/pyodideWorker.ts) so that a user's infinite loop can be
// forcibly stopped instead of freezing the tab. jsdom (this test's DOM
// environment) does not implement Worker at all, so Pyodide itself
// cannot run here -- these tests mock the Worker constructor to verify
// pyRunner's own orchestration logic (message handling, the timeout ->
// terminate -> honest-error path, and recovering with a fresh worker
// afterwards). The real end-to-end path (an actual worker actually
// running actual Python) can only be verified in a real browser, which
// was done separately via the Browser pane, not here.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { RunRequest, RunResponse } from "../workers/pyodideWorker"

class FakeWorker {
  onmessage: ((event: MessageEvent<RunResponse>) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()
  lastRequest: RunRequest | null = null

  constructor() {
    instances.push(this)
  }

  reply(res: RunResponse) {
    this.onmessage?.({ data: res } as MessageEvent<RunResponse>)
  }
}

let instances: FakeWorker[] = []

beforeEach(() => {
  instances = []
  vi.stubGlobal("Worker", FakeWorker)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.resetModules()
})

describe("runPythonFunction", () => {
  it("posts a request to the worker and resolves with its response", async () => {
    const { runPythonFunction } = await import("./pyRunner")
    const testCases = [{ description: "add(1, 2) == 3", args: [1, 2], expected: 3 }]

    const promise = runPythonFunction("def add(a, b):\n  return a + b", "add", testCases)
    expect(instances).toHaveLength(1)

    instances[0].reply({
      id: 1,
      outcomes: [{ description: testCases[0].description, passed: true, expected: 3, actual: 3, error: null }],
      stdout: "",
      runtimeError: null,
    })

    const result = await promise
    expect(result.allPassed).toBe(true)
    expect(result.outcomes).toHaveLength(1)
  })

  it("terminates the worker and resolves with an honest message if execution never responds", async () => {
    vi.useFakeTimers()
    const { runPythonFunction } = await import("./pyRunner")
    const testCases = [{ description: "halts", args: [], expected: true }]

    const promise = runPythonFunction("while True:\n  pass", "f", testCases)
    expect(instances).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(10_000)

    const result = await promise
    expect(result.allPassed).toBe(false)
    expect(result.runtimeError).toMatch(/timed out/i)
    expect(instances[0].terminate).toHaveBeenCalledTimes(1)
  })

  it("creates a fresh worker for the next run after a timeout destroyed the old one", async () => {
    vi.useFakeTimers()
    const { runPythonFunction } = await import("./pyRunner")
    const testCases = [{ description: "halts", args: [], expected: true }]

    await (async () => {
      const promise = runPythonFunction("while True: pass", "f", testCases)
      await vi.advanceTimersByTimeAsync(10_000)
      await promise
    })()
    expect(instances).toHaveLength(1)

    runPythonFunction("return 1", "f", testCases)
    expect(instances).toHaveLength(2)
  })

  it("resolves pending work with an honest message if the worker errors out", async () => {
    const { runPythonFunction } = await import("./pyRunner")
    const testCases = [{ description: "test", args: [], expected: 1 }]

    const promise = runPythonFunction("code", "f", testCases)
    instances[0].onerror?.({} as ErrorEvent)

    const result = await promise
    expect(result.allPassed).toBe(false)
    expect(result.runtimeError).toMatch(/crashed/i)
  })

  it("does not fabricate a passing result when outcomes are empty", async () => {
    const { runPythonFunction } = await import("./pyRunner")
    const promise = runPythonFunction("code", "f", [])
    instances[0].reply({ id: 1, outcomes: [], stdout: "", runtimeError: null })
    const result = await promise
    expect(result.allPassed).toBe(false)
  })
})

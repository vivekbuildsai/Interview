import { beforeEach, describe, expect, it } from "vitest"
import { consumeStashedRecoveryFlag, detectAndStashRecoveryLink } from "./recoveryLinkDetector"

beforeEach(() => {
  window.sessionStorage.clear()
  window.history.replaceState(null, "", "/")
})

describe("detectAndStashRecoveryLink / consumeStashedRecoveryFlag", () => {
  it("stashes the flag when the URL hash is a recovery link with a token", () => {
    window.history.replaceState(null, "", "/#access_token=abc123&type=recovery&expires_in=3600")
    detectAndStashRecoveryLink()
    expect(consumeStashedRecoveryFlag()).toBe(true)
  })

  it("does not stash anything for a non-recovery hash (e.g. a plain signed-in session)", () => {
    window.history.replaceState(null, "", "/#access_token=abc123&type=signup")
    detectAndStashRecoveryLink()
    expect(consumeStashedRecoveryFlag()).toBe(false)
  })

  it("does not stash anything when there is no hash at all", () => {
    detectAndStashRecoveryLink()
    expect(consumeStashedRecoveryFlag()).toBe(false)
  })

  it("does not stash a recovery type without an access_token present", () => {
    window.history.replaceState(null, "", "/#type=recovery")
    detectAndStashRecoveryLink()
    expect(consumeStashedRecoveryFlag()).toBe(false)
  })

  it("consuming the flag clears it, so a later unrelated reload doesn't re-trigger recovery mode", () => {
    window.history.replaceState(null, "", "/#access_token=abc123&type=recovery")
    detectAndStashRecoveryLink()
    expect(consumeStashedRecoveryFlag()).toBe(true)
    expect(consumeStashedRecoveryFlag()).toBe(false)
  })
})

import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { Modal } from "./Modal"

function Harness({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div>
      <button>Trigger</button>
      <Modal open={open} onClose={onClose} title="Test dialog">
        <button>First action</button>
        <button>Second action</button>
      </Modal>
    </div>
  )
}

function ControlledHarness() {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button onClick={() => setOpen(true)}>Trigger</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Test dialog">
        <button>Inside</button>
      </Modal>
    </div>
  )
}

describe("Modal", () => {
  it("moves focus into the dialog when it opens", async () => {
    render(<Harness open={true} onClose={() => {}} />)
    await vi.waitFor(() => {
      expect(screen.getByRole("dialog")).toHaveFocus()
    })
  })

  it("restores focus to the element that was focused before opening, on close", async () => {
    const user = userEvent.setup()
    render(<ControlledHarness />)

    const trigger = screen.getByRole("button", { name: "Trigger" })
    trigger.focus()
    await user.click(trigger)

    await vi.waitFor(() => expect(screen.getByRole("dialog")).toHaveFocus())

    await user.keyboard("{Escape}")

    await vi.waitFor(() => expect(trigger).toHaveFocus())
  })

  it("traps Tab within the dialog instead of letting focus escape to the page", async () => {
    const user = userEvent.setup()
    render(<Harness open={true} onClose={() => {}} />)

    await vi.waitFor(() => expect(screen.getByRole("dialog")).toHaveFocus())

    const closeBtn = screen.getByRole("button", { name: "Close dialog" })
    const first = screen.getByRole("button", { name: "First action" })
    const second = screen.getByRole("button", { name: "Second action" })

    closeBtn.focus()
    await user.tab()
    expect(first).toHaveFocus()
    await user.tab()
    expect(second).toHaveFocus()
    // Tabbing past the last focusable element must wrap back to the first.
    await user.tab()
    expect(closeBtn).toHaveFocus()
  })

  it("closes on Escape", async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<Harness open={true} onClose={onClose} />)
    await vi.waitFor(() => expect(screen.getByRole("dialog")).toHaveFocus())

    await user.keyboard("{Escape}")
    expect(onClose).toHaveBeenCalled()
  })
})

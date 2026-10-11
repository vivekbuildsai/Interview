// Mounted globally in AuthRoot (every route, not just /auth/callback) --
// confirmed live that a password-recovery link's hash-based token lands on
// the bare site root, never on a dedicated route, so this can't be route-
// gated the way AuthCallbackPage's own rendering once assumed.

import { NewPasswordForm } from "./NewPasswordForm"
import { Modal } from "@/components/ui/Modal"
import { useAuthStore } from "@/lib/auth/authStore"

export function RecoveryPrompt() {
  const recoveryPending = useAuthStore((s) => s.recoveryPending)
  const clearRecoveryPending = useAuthStore((s) => s.clearRecoveryPending)

  return (
    <Modal open={recoveryPending} onClose={clearRecoveryPending} title="Set a new password">
      <NewPasswordForm onDone={clearRecoveryPending} />
    </Modal>
  )
}

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./styles/globals.css"
import { App } from "./App"
import { detectAndStashRecoveryLink } from "@/lib/auth/recoveryLinkDetector"

// Must run before anything else, synchronously, in this always-eager entry
// module -- see recoveryLinkDetector.ts for why.
detectAndStashRecoveryLink()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

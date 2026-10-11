import * as React from "react"
import { cn } from "@/lib/cn"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input({ label, error, id, className, ...props }, ref) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-xs font-medium text-zinc-400">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        className={cn(
          "focus-ring h-10 rounded-lg border border-base-500 bg-base-200/80 px-3 text-sm text-zinc-100 placeholder:text-zinc-500",
          error && "border-danger/60",
          className,
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
})

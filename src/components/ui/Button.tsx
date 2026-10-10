import * as React from "react"
import { Link, type LinkProps } from "react-router-dom"
import { cn } from "@/lib/cn"

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline"
export type ButtonSize = "sm" | "md" | "lg" | "icon"

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-gradient-to-br from-accent-violet to-accent-blue text-white shadow-glow hover:brightness-110 active:brightness-95",
  secondary: "bg-base-300 text-zinc-100 hover:bg-base-400 border border-base-500/60",
  outline: "bg-transparent border border-base-500 text-zinc-200 hover:bg-base-300/60",
  ghost: "bg-transparent text-zinc-300 hover:bg-base-300/60 hover:text-white",
  danger: "bg-danger/90 text-white hover:bg-danger",
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
  icon: "h-10 w-10 p-0 justify-center",
}

// eslint-disable-next-line react-refresh/only-export-components -- shared styling helper, intentionally co-located with Button/LinkButton.
export function buttonVariants(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "focus-ring inline-flex select-none items-center justify-center rounded-lg font-medium transition-all duration-150",
    "disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:brightness-100",
    variantClasses[variant],
    sizeClasses[size],
    className,
  )
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, variant = "primary", size = "md", disabled, ...props }, ref) {
  return <button ref={ref} disabled={disabled} className={buttonVariants(variant, size, className)} {...props} />
})

export interface LinkButtonProps extends LinkProps {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const LinkButton = React.forwardRef<HTMLAnchorElement, LinkButtonProps>(function LinkButton({ className, variant = "primary", size = "md", ...props }, ref) {
  return <Link ref={ref} className={buttonVariants(variant, size, className)} {...props} />
})

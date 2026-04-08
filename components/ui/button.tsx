import * as React from "react"
import { cn } from "../../lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "secondary"
}

export function Button({
  className,
  variant = "default",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors px-4 py-2",
        variant === "default" && "bg-black text-white hover:bg-zinc-800",
        variant === "outline" && "border border-zinc-300 bg-white text-black hover:bg-zinc-100",
        variant === "secondary" && "bg-zinc-200 text-black hover:bg-zinc-300",
        className
      )}
      {...props}
    />
  )
}
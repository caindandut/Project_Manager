import * as React from "react"
import { Circle } from "lucide-react"

import { cn } from "@/lib/utils"

const RadioGroup = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentProps<"div"> & {
    value?: string
    onValueChange?: (value: string) => void
  }
>(({ className, value, onValueChange, ...props }, ref) => {
  return (
    <div
      ref={ref}
      role="radiogroup"
      className={cn("grid gap-2", className)}
      {...props}
    />
  )
})
RadioGroup.displayName = "RadioGroup"

const RadioGroupItem = React.forwardRef<
  React.ElementRef<"button">,
  React.ComponentProps<"button"> & {
    value?: string
  }
>(({ className, value: itemValue, ...props }, ref) => {
  const parent = React.useContext(RadioGroupContext)
  const isChecked = parent?.value === itemValue

  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={isChecked}
      data-state={isChecked ? "checked" : "unchecked"}
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onClick={() => parent?.onValueChange?.(itemValue!)}
      {...props}
    >
      {isChecked && (
        <Circle className="h-2.5 w-2.5 fill-current text-current" />
      )}
    </button>
  )
})
RadioGroupItem.displayName = "RadioGroupItem"

const RadioGroupContext = React.createContext<{
  value?: string
  onValueChange?: (value: string) => void
}>({})

export { RadioGroup, RadioGroupItem }

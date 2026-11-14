import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { ButtonHTMLAttributes, forwardRef } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-body text-sm tracking-wide transition-colors disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "bg-ink text-bone-100 hover:bg-ink-700 px-6 py-3",
        secondary: "bg-transparent border border-ink text-ink hover:bg-ink hover:text-bone-100 px-6 py-3",
        brass: "bg-brass text-bone-100 hover:bg-brass-600 px-6 py-3",
        ghost: "bg-transparent text-ink hover:text-brass-600 px-2 py-1",
      },
      size: {
        default: "",
        sm: "text-xs px-4 py-2",
        lg: "text-base px-8 py-4",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";

export default Button;

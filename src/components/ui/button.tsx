import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-b from-brand-600 to-brand-700 text-white shadow-soft ring-1 ring-inset ring-white/10 hover:from-brand-700 hover:to-brand-800",
        accent: "bg-gradient-to-b from-accent-500 to-accent-600 text-white shadow-soft ring-1 ring-inset ring-white/15 hover:to-accent-700",
        outline: "border border-slate-200 bg-white text-slate-700 shadow-soft hover:border-brand-200 hover:bg-brand-50/50 hover:text-brand-800",
        ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        destructive: "bg-critico text-white hover:bg-critico/90",
        link: "text-brand-700 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

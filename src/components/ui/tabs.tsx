"use client";

import * as T from "@radix-ui/react-tabs";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Tabs = T.Root;
export const TabsContent = T.Content;

export function TabsList({ className, ...props }: React.ComponentProps<typeof T.List>) {
  return <T.List className={cn("inline-flex items-center gap-1 rounded-xl border border-slate-200/70 bg-white/70 p-1 shadow-soft backdrop-blur", className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof T.Trigger>) {
  return (
    <T.Trigger
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-semibold text-slate-500 transition-all hover:text-brand-800 data-[state=active]:bg-brand-700 data-[state=active]:text-white data-[state=active]:shadow-soft [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}

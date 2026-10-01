"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Sheet = Dialog.Root;
export const SheetTitle = Dialog.Title;
export const SheetDescription = Dialog.Description;

export function SheetContent({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Dialog.Content>) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-brand-950/45 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
      <Dialog.Content
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-[#f5f6f8] shadow-2xl outline-none data-[state=open]:animate-slide-in sm:max-w-[min(1120px,94vw)]",
          className,
        )}
        {...props}
      >
        {children}
        <Dialog.Close className="absolute right-4 top-4 rounded-md p-1.5 text-white/80 hover:bg-white/10 hover:text-white">
          <X className="size-5" />
          <span className="sr-only">Fechar</span>
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  );
}

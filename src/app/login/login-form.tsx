"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { loginAction } from "@/server/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, { error: null as string | null });
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="E-mail">
        <Input name="email" type="email" autoComplete="email" required placeholder="nome@empresa.com" />
      </Field>
      <Field label="Senha">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      {state?.error ? <p className="text-sm text-critico">{state.error}</p> : null}
      <Button type="submit" size="lg" disabled={pending} className="mt-2">
        {pending ? <Loader2 className="animate-spin" /> : null}
        Entrar
      </Button>
    </form>
  );
}

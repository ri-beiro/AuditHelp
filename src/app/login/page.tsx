import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/context";
import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Logo light />
        <div className="max-w-md">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent-500">Somente um já é demais</p>
          <h1 className="text-4xl font-extrabold leading-tight">
            Cultura de segurança medida, evidenciada e em melhoria contínua.
          </h1>
          <p className="mt-4 text-brand-100/80">
            13 Elementos WISE, 12 Básicos de Segurança, evidências e planos de ação em uma única plataforma de
            auditoria e excelência operacional.
          </p>
        </div>
        <p className="text-xs text-brand-100/60">Segurança é valor e escolha.</p>
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-brand-500/20 blur-3xl" />
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Logo className="mb-10 lg:hidden" />
          <h2 className="text-2xl font-bold text-slate-900">Entrar</h2>
          <p className="mb-8 mt-1 text-sm text-slate-500">Acesse com seu e-mail corporativo.</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}

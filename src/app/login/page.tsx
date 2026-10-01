import { redirect } from "next/navigation";
import { ClipboardCheck, ShieldCheck, TrendingUp } from "lucide-react";
import { getCurrentUser } from "@/server/context";
import { Logo, WiseMark } from "@/components/logo";
import { LoginForm } from "./login-form";

const PILLARS = [
  { icon: ShieldCheck, title: "13 Elementos WISE", text: "Cultura medida pela curva de Bradley" },
  { icon: ClipboardCheck, title: "12 Básicos", text: "Compliance com evidências em campo" },
  { icon: TrendingUp, title: "Melhoria contínua", text: "Planos de ação 5W2H e indicadores" },
];

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      <section className="wise-hero hidden p-12 lg:flex lg:flex-col lg:justify-between xl:p-16">
        <Logo light />
        <div className="max-w-lg">
          <WiseMark className="mb-8 size-20 drop-shadow-lg" />
          <p className="eyebrow">Somente um já é demais</p>
          <h1 className="mt-3 text-[44px] font-extrabold leading-[1.08]">
            Cultura de segurança medida, evidenciada e em melhoria contínua.
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-brand-100/75">
            Plataforma de auditoria e excelência operacional do programa WISE² — da matriz de cultura aos 12 Básicos e
            às auditorias de contratadas.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {PILLARS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md">
                <Icon className="size-5 text-accent-400" />
                <div className="mt-3 font-display text-sm font-bold">{title}</div>
                <div className="mt-0.5 text-xs leading-snug text-brand-100/65">{text}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="flex items-center gap-3 text-xs text-brand-100/55">
          <span className="flex gap-1">
            <span className="h-1 w-6 rounded-full bg-accent-500" />
            <span className="h-1 w-3 rounded-full bg-lime-500" />
            <span className="h-1 w-2 rounded-full bg-cream" />
          </span>
          Segurança é valor e escolha · Pare · Pense · Aja
        </p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Logo className="mb-12 lg:hidden" />
          <p className="eyebrow">Acesso restrito</p>
          <h2 className="mt-2 text-3xl font-extrabold text-brand-950">Bem-vindo de volta</h2>
          <p className="mb-8 mt-2 text-sm text-slate-500">Entre com seu e-mail corporativo para continuar.</p>
          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-lift">
            <LoginForm />
          </div>
          <p className="mt-6 text-center text-[11px] text-slate-400">Programa de Saúde e Segurança WISE² · BeWell</p>
        </div>
      </section>
    </main>
  );
}

import { redirect } from "next/navigation";
import { ClipboardCheck, ShieldCheck, TrendingUp } from "lucide-react";
import { getCurrentUser } from "@/server/context";
import { Logo, WiseMark } from "@/components/logo";
import { LoginForm } from "./login-form";

// As três cores WISE, cada uma representando uma frente da plataforma.
const PILLARS = [
  { icon: ShieldCheck, title: "13 Elementos WISE", text: "Cultura medida pela curva de Bradley", color: "#1a9ae0" },
  { icon: ClipboardCheck, title: "12 Básicos", text: "Compliance com evidências em campo", color: "#c3d23f" },
  { icon: TrendingUp, title: "Melhoria contínua", text: "Planos de ação 5W2H e indicadores", color: "#ec9631" },
];

/** Composição das três cores WISE: base azul, onda verde e onda laranja se encontrando como no selo. */
function WiseWaves() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="g-green" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#6f9a22" />
          <stop offset="1" stopColor="#c3d23f" />
        </linearGradient>
        <linearGradient id="g-orange" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ec9631" />
          <stop offset="1" stopColor="#cc6c1e" />
        </linearGradient>
        <radialGradient id="g-sky" cx="0.2" cy="0.1" r="0.6">
          <stop offset="0" stopColor="#1a9ae0" stopOpacity="0.55" />
          <stop offset="1" stopColor="#1a9ae0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="900" fill="url(#g-sky)" />
      {/* onda verde (metade esquerda do selo) */}
      <path d="M800 900 L800 590 C 735 575 675 625 645 700 C 622 760 622 840 640 900 Z" fill="url(#g-green)" opacity="0.95" />
      <path d="M800 615 C 740 605 688 648 662 712" stroke="#fff" strokeOpacity="0.28" strokeWidth="2" fill="none" />
      {/* onda laranja (metade direita do selo) */}
      <path d="M800 -20 L800 360 C 700 400 600 350 545 270 C 500 205 485 110 520 -20 Z" fill="url(#g-orange)" opacity="0.95" />
      <path d="M800 335 C 705 372 612 328 560 255" stroke="#fff" strokeOpacity="0.25" strokeWidth="2" fill="none" />
      {/* anel creme do selo, unindo as duas metades */}
      <circle cx="800" cy="450" r="230" fill="none" stroke="#f3e3d3" strokeOpacity="0.10" strokeWidth="30" />
    </svg>
  );
}

/** Emblema com anel tricolor. */
function TriRing() {
  return (
    <div className="relative grid size-28 place-items-center">
      <div
        className="absolute inset-0 rounded-full p-[5px] shadow-lift"
        style={{ background: "conic-gradient(from 200deg, #1a9ae0, #13508a, #c3d23f, #6f9a22, #ec9631, #cc6c1e, #1a9ae0)" }}
      >
        <div className="size-full rounded-full bg-brand-950/70 backdrop-blur" />
      </div>
      <WiseMark className="relative size-20 drop-shadow-lg" />
    </div>
  );
}

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.15fr_1fr]">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <WiseWaves />
        <div className="relative">
          <Logo light />
        </div>
        <div className="relative max-w-lg">
          <TriRing />
          <p className="mt-8 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em]">
            <span className="text-brand-400">Somente</span>
            <span className="text-wgreen-400">um já</span>
            <span className="text-accent-400">é demais</span>
          </p>
          <h1 className="mt-3 text-[44px] font-extrabold leading-[1.08] drop-shadow-sm">
            Cultura de segurança{" "}
            <span className="bg-gradient-to-r from-brand-400 via-wgreen-400 to-accent-400 bg-clip-text text-transparent">
              medida, evidenciada
            </span>{" "}
            e em melhoria contínua.
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-white/80">
            Plataforma de auditoria e excelência operacional do programa WISE² — da matriz de cultura aos 12 Básicos e
            às auditorias de contratadas.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {PILLARS.map(({ icon: Icon, title, text, color }) => (
              <div
                key={title}
                className="relative overflow-hidden rounded-2xl border border-white/15 bg-brand-950/45 p-4 backdrop-blur-md"
              >
                <span className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
                <span className="grid size-9 place-items-center rounded-xl" style={{ background: `${color}33`, color }}>
                  <Icon className="size-5" />
                </span>
                <div className="mt-3 font-display text-sm font-bold">{title}</div>
                <div className="mt-0.5 text-xs leading-snug text-white/75">{text}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="relative flex items-center gap-3 text-xs text-white/80">
          <span className="flex gap-1">
            <span className="h-1 w-6 rounded-full bg-brand-500" />
            <span className="h-1 w-4 rounded-full bg-wgreen-400" />
            <span className="h-1 w-3 rounded-full bg-accent-500" />
          </span>
          Segurança é valor e escolha · Pare · Pense · Aja
        </p>
      </section>

      <section className="relative flex items-center justify-center overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-wgreen-400/15 blur-3xl" />
        <div className="relative w-full max-w-sm">
          <Logo className="mb-12 lg:hidden" />
          <p className="eyebrow">Acesso restrito</p>
          <h2 className="mt-2 text-3xl font-extrabold text-brand-950">Bem-vindo de volta</h2>
          <p className="mb-8 mt-2 text-sm text-slate-500">Entre com seu e-mail corporativo para continuar.</p>
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-6 pt-7 shadow-lift">
            <div className="wise-stripe absolute inset-x-0 top-0 h-1.5" />
            <LoginForm />
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <span className="size-1.5 rounded-full bg-brand-500" />
            <span className="size-1.5 rounded-full bg-wgreen-500" />
            <span className="size-1.5 rounded-full bg-accent-500" />
            Programa de Saúde e Segurança WISE² · BeWell
          </div>
        </div>
      </section>
    </main>
  );
}

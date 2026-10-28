// Folha 16:9 (1280×720) dos One Pagers, no layout dos modelos corporativos.
// Usada na prévia da etapa e na página de impressão / PDF.
/* eslint-disable @next/next/no-img-element */
import { AlertTriangle, CalendarDays, CheckSquare, HeartPulse, Lightbulb, ListChecks, MapPin, Square, Users, Wrench, Workflow, ShieldCheck } from "lucide-react";
import { APPLICABILITY, HIPO_STATUS, PAGER_EVENT, POPULATION, QUALITY_CHECKS, type OnePagers } from "@/lib/one-pager";
import type { IncidentTypeKey } from "@/lib/incidents";

export type SheetIncident = {
  unitName: string;
  spheraId: string | null;
  occurredAt: string;
  area: string;
  type: IncidentTypeKey;
  hipo: boolean;
  description: string;
  basicRef: string | null;
};

export type SheetKind = "initial" | "final";

const BAND = "#1b5fae";
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
const items = (l: string[]) => l.map((s) => s.trim()).filter(Boolean);

export function OnePagerSheet({ kind, inc, pagers, photos }: { kind: SheetKind; inc: SheetIncident; pagers: OnePagers; photos: string[] }) {
  if (kind === "final") return <FinalSheet inc={inc} pagers={pagers} />;
  return inc.hipo ? <HipoInitialSheet inc={inc} pagers={pagers} photos={photos} /> : <AlertSheet inc={inc} pagers={pagers} photos={photos} />;
}

// ---------------------------------------------------------------------------
// Peças comuns
// ---------------------------------------------------------------------------

function Frame({ band, children }: { band: string; children: React.ReactNode }) {
  return (
    <div className="relative h-[720px] w-[1280px] overflow-hidden bg-white font-sans text-slate-900" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      {children}
      <div className="absolute inset-y-0 right-0 flex w-[58px] flex-col items-center justify-end pb-6" style={{ background: BAND }}>
        <span className="mb-6 whitespace-nowrap text-[15px] font-extrabold uppercase tracking-wide text-white [writing-mode:vertical-rl] rotate-180">{band}</span>
        <span className="text-lg font-bold text-white">{band.includes("FINAL") ? 2 : 1}</span>
      </div>
    </div>
  );
}

export function StopThinkAct({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 64 64" className="size-[62px]" aria-hidden>
        <circle cx="32" cy="32" r="24" fill="none" stroke="#f05a1a" strokeWidth="14" />
        <circle cx="30" cy="30" r="9" fill="#9bcf53" />
        <path d="M32 32 L52 32 A20 20 0 0 1 32 52 Z" fill="#f5a623" />
      </svg>
      <div className="text-[19px] font-black leading-[0.95]">
        <div style={{ color: "#f05a1a" }}>STOP</div>
        <div style={{ color: "#f5a623" }}>THINK</div>
        <div style={{ color: "#9bcf53" }}>ACT</div>
      </div>
    </div>
  );
}

function Dashed({ className = "", color = "#111827", children, style }: { className?: string; color?: string; children?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className={`border-2 border-dashed ${className}`} style={{ borderColor: color, ...style }}>
      {children}
    </div>
  );
}

function NumberedList({ list, className = "", color }: { list: string[]; className?: string; color?: string }) {
  const l = items(list);
  if (!l.length) return null;
  return (
    <ol className={`list-decimal space-y-1.5 pl-7 ${className}`} style={{ color }}>
      {l.map((s, i) => (
        <li key={i} className="pl-1">
          {s}
        </li>
      ))}
    </ol>
  );
}

function Photos({ photos, title }: { photos: string[]; title: string }) {
  return (
    <Dashed className="flex h-full flex-col p-3">
      <p className="text-[17px] text-slate-800">{title}</p>
      <div className={`mt-2 grid min-h-0 flex-1 gap-2 ${photos.length > 1 ? "grid-cols-2" : "grid-cols-1"} ${photos.length > 2 ? "grid-rows-2" : ""}`}>
        {photos.length ? (
          photos.map((src, i) => <img key={i} src={src} alt="" className="size-full min-h-0 object-cover" />)
        ) : (
          <div className="grid place-items-center text-sm text-slate-400">Sem fotos selecionadas</div>
        )}
      </div>
    </Dashed>
  );
}

function Danone({ className = "" }: { className?: string }) {
  return <img src="/brand/danone.png" alt="Danone" className={`h-[30px] w-auto ${className}`} />;
}

function Wise({ className = "" }: { className?: string }) {
  return <img src="/brand/wise-logo.png" alt="WISE" className={`object-contain ${className}`} />;
}

function Head({ icon: Icon, color, word, subtitle }: { icon: "stop" | "think" | "act"; color: string; word: string; subtitle: string }) {
  return (
    <div className="flex items-end gap-3">
      <span className="mb-1.5 inline-block">
        {Icon === "stop" ? (
          <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
            <circle cx="12" cy="12" r="8" fill="none" stroke={color} strokeWidth="5" />
          </svg>
        ) : Icon === "think" ? (
          <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
            <path d="M2 2 H22 V8 A14 14 0 0 1 8 22 H2 Z" fill={color} />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
            <circle cx="12" cy="12" r="11" fill={color} />
          </svg>
        )}
      </span>
      <span className="text-[44px] font-black leading-none tracking-tight" style={{ color }}>
        {word}
      </span>
      <span className="mb-1.5 text-[13px] text-slate-800">{subtitle}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inicial (sem HIPO) — "Alerta de Segurança"
// ---------------------------------------------------------------------------

function AlertSheet({ inc, pagers, photos }: { inc: SheetIncident; pagers: OnePagers; photos: string[] }) {
  const p = pagers.initial;
  const green = "#4d9a1f";
  return (
    <Frame band="INCIDENTE INICIAL UM PAGER">
      <div className="absolute left-[18px] top-[14px] text-[40px] font-black uppercase tracking-tight">Alerta de Segurança</div>
      <div className="absolute right-[90px] top-[14px] flex items-center gap-5">
        <Wise className="h-[72px] w-[72px]" />
        <StopThinkAct />
      </div>
      <div className="absolute left-[12px] top-[74px] w-[320px] text-[13px] leading-[1.35]">
        <p>
          Zona / CBU: <b style={{ color: green }}>{p.zone}</b>
        </p>
        <p>
          Tipo de local: <b style={{ color: green }}>{inc.unitName.toUpperCase()}</b>
        </p>
        <p>SPHERA ID: {inc.spheraId ?? ""}</p>
        <p>Local do evento: {inc.area}</p>
        <p>
          Hora | Data do evento: {fmtDate(inc.occurredAt)} às {fmtTime(inc.occurredAt)}
        </p>
      </div>
      <div className="absolute left-[338px] top-[64px] w-[390px] text-[13px] leading-[1.35]">
        <p>Tipo de evento: {PAGER_EVENT[inc.type]}</p>
        <p>HIPO: {inc.hipo ? "SIM" : "NÃO"}</p>
        <p>Tipo e gravidade da lesão/possível lesão: {p.injury}</p>
        <p>Danos patrimoniais: {p.propertyDamage}</p>
        <p>12 Básicos: {inc.basicRef ?? ""}</p>
      </div>

      <div className="absolute left-[12px] top-[188px] w-[704px]">
        <Head icon="stop" color="#e8231c" word="PARE" subtitle="Descrição do incidente" />
        <Dashed className="mt-1 h-[116px] overflow-hidden px-3 py-3 text-[16px] leading-snug">{p.stop || inc.description}</Dashed>
        <div className="mt-2">
          <Head icon="think" color="#f07f17" word="PENSE" subtitle="(potenciais) consequências / fatores de influência do incidente" />
        </div>
        <Dashed className="mt-1 h-[128px] overflow-hidden px-2 py-2 text-[12.5px] leading-snug">
          <NumberedList list={p.think} className="space-y-2" />
        </Dashed>
        <div className="mt-1">
          <Head icon="act" color="#9bcf53" word="AJA" subtitle="Principais ações para evitar recorrência / aprendizados para compartilhar" />
        </div>
        <Dashed className="mt-1 h-[92px] overflow-hidden px-3 py-2 text-[15px] leading-snug">
          <NumberedList list={p.act} />
        </Dashed>
      </div>
      <div className="absolute left-[730px] top-[110px] h-[586px] w-[476px]">
        <Photos photos={photos} title="Imagem e ilustração:" />
      </div>
      <Danone className="absolute bottom-[4px] left-[60px]" />
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Resumo com ícones (HIPO inicial e final)
// ---------------------------------------------------------------------------

function Summary({ inc, pagers, children }: { inc: SheetIncident; pagers: OnePagers; children?: React.ReactNode }) {
  const cells = [
    { icon: MapPin, label: "SITE / CBU", value: inc.unitName.toUpperCase() },
    { icon: CalendarDays, label: "DATA DO EVENTO", value: fmtDate(inc.occurredAt), big: true },
    { icon: AlertTriangle, label: "TIPO DE EVENTO", value: PAGER_EVENT[inc.type] },
    { icon: ListChecks, label: "HIPO", value: inc.hipo ? "SIM" : "NÃO" },
    { icon: HeartPulse, label: "LESÃO", value: pagers.initial.injury || "—", big: true },
  ];
  return (
    <div className="relative">
      <div className="absolute -top-[13px] left-[2px] z-10 rounded-t-md px-6 py-1 text-[13px] font-semibold text-white" style={{ background: BAND }}>
        1.&nbsp;&nbsp;&nbsp;RESUMO DO INCIDENTE (do one-pager inicial)
      </div>
      <div className="rounded-[22px] border-2 border-dashed border-slate-500 px-3 pb-2 pt-5">
        <div className="grid grid-cols-5 gap-2">
          {cells.map((c) => (
            <div key={c.label} className="flex items-start gap-2.5">
              <c.icon className="mt-0.5 size-9 shrink-0 stroke-[1.4] text-slate-800" />
              <div className="min-w-0">
                <p className="text-[14px] font-bold leading-tight">{c.label}</p>
                <p className={c.big ? "mt-1 text-[16px] leading-tight" : "mt-1 text-[13px] leading-tight"}>{c.value}</p>
              </div>
            </div>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inicial HIPO — "One-Pager Inicial de Incidente"
// ---------------------------------------------------------------------------

function HipoInitialSheet({ inc, pagers, photos }: { inc: SheetIncident; pagers: OnePagers; photos: string[] }) {
  const p = pagers.initial;
  const green = "#4d9a1f";
  const st = HIPO_STATUS;
  return (
    <Frame band="ONE-PAGER DE INCIDENTE INICIAL">
      <Wise className="absolute right-[6px] top-[8px] z-10 h-[46px] w-[46px] rounded-full bg-white p-0.5" />
      <div className="absolute left-[18px] top-[12px] text-[36px] font-black uppercase tracking-tight">One-Pager Inicial de Incidente</div>
      <div className="absolute left-[790px] top-[26px] flex items-start gap-6 text-[14px] font-bold">
        <span className="leading-tight">
          ID DO EVENTO NO
          <br />
          SPHERA:
        </span>
        <span className="font-normal">{inc.spheraId ?? ""}</span>
      </div>
      <StopThinkAct className="absolute right-[86px] top-[14px]" />

      <div className="absolute left-[10px] right-[72px] top-[80px]">
        <Summary inc={inc} pagers={pagers} />
      </div>

      <div className="absolute left-[12px] top-[186px] w-[716px]">
        <div className="flex items-center gap-5">
          <Head icon="stop" color="#f05a1a" word="STOP" subtitle="" />
          <Dashed className="grid h-[38px] w-[150px] place-items-center">
            <AlertTriangle className="size-6 fill-amber-300 text-slate-900" />
          </Dashed>
          <span className="text-[14px] font-bold">RELAÇÃO 12 BÁSICOS</span>
          <span className="-ml-2 text-[16px]">{inc.basicRef ?? ""}</span>
        </div>
        <Dashed className="mt-2 h-[96px] overflow-hidden px-3 py-3 text-[15px] leading-snug" style={{ color: green }}>
          {p.stop || inc.description}
        </Dashed>
        <div className="mt-1">
          <Head icon="think" color="#f5a623" word="THINK" subtitle="(potenciais) consequências / fatores influenciadores do incidente" />
        </div>
        <Dashed className="h-[134px] overflow-hidden px-2 py-1.5 text-[12.5px] leading-snug">
          <NumberedList list={p.think} className="space-y-2" color={green} />
        </Dashed>
        <div className="mt-0.5">
          <Head icon="act" color="#9bcf53" word="ACT" subtitle="Contenção Imediata e Aprendizado Inicial" />
        </div>
        <Dashed className="h-[108px] overflow-hidden px-3 py-2 text-[12.5px] leading-snug">
          <NumberedList list={p.act} color={green} />
        </Dashed>
      </div>

      <div className="absolute left-[746px] top-[236px] h-[300px] w-[460px]">
        <Photos photos={photos} title="Foto e Ilustração:" />
      </div>
      <div className="absolute left-[746px] top-[548px] w-[460px]">
        <p className="text-[16px] font-bold">STATUS ATUAL DA INVESTIGAÇÃO</p>
        <Dashed className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 px-3 py-2 text-[13px]">
          {[st[0], st[3], st[1], st[4], st[2]].map((s) => (
            <span key={s.k} className="flex items-center gap-1.5">
              <Check on={p.status[s.k]} /> {s.label}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <Check on={!!p.reportDue} /> Relatório previsto: {p.reportDue ? fmtDate(`${p.reportDue}T12:00:00`) : "__/__/____"}
          </span>
        </Dashed>
      </div>

      <div className="absolute bottom-[8px] left-[60px] flex w-[670px] items-center gap-4">
        <Danone className="shrink-0" />
        <span className="text-[11px] leading-tight">
          A ser confirmado pela investigação final: causas raiz, aprendizados organizacionais, aplicabilidade em toda a Danone e medidas de prevenção de
          longo prazo.
        </span>
      </div>
    </Frame>
  );
}

function Check({ on }: { on: boolean }) {
  return on ? <CheckSquare className="size-4 shrink-0" /> : <Square className="size-4 shrink-0" />;
}

// ---------------------------------------------------------------------------
// Final (HIPO) — "One-Pager Final de Incidente"
// ---------------------------------------------------------------------------

function Tab({ n, title, color, className = "" }: { n: number; title: string; color: string; className?: string }) {
  return (
    <div className={`relative z-10 flex items-center rounded-md px-4 py-1 text-[13px] font-bold uppercase leading-tight text-white ${className}`} style={{ background: color }}>
      {n}.&nbsp;&nbsp;&nbsp;{title}
    </div>
  );
}

function Bullets({ list, color }: { list: string[]; color: string }) {
  return (
    <ul className="space-y-3 text-[12px]">
      {items(list).map((s, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-[5px] size-1.5 shrink-0 rounded-full" style={{ background: color }} />
          {s}
        </li>
      ))}
    </ul>
  );
}

function FinalSheet({ inc, pagers }: { inc: SheetIncident; pagers: OnePagers }) {
  const f = pagers.final;
  const C = { green: "#4c9a2a", purple: "#7030a0", orange: "#f07f17", red: "#c00000" };
  return (
    <Frame band="ONE-PAGER FINAL DE INCIDENTE">
      <Wise className="absolute right-[6px] top-[8px] z-10 h-[46px] w-[46px] rounded-full bg-white p-0.5" />
      <div className="absolute left-[12px] top-[10px] text-[34px] font-black uppercase tracking-tight">One-Pager Final de Incidente</div>
      <div className="absolute left-[760px] top-[22px] flex items-start gap-8 text-[15px] font-bold">
        <span className="leading-tight">
          SPHERA ID DO
          <br />
          EVENTO:
        </span>
        <span className="font-normal">{inc.spheraId ?? ""}</span>
      </div>
      <StopThinkAct className="absolute right-[80px] top-[12px]" />

      <div className="absolute left-[30px] right-[70px] top-[70px]">
        <Summary inc={inc} pagers={pagers}>
          <div className="mt-2 px-3 text-[13px] leading-snug">
            <p className="text-[14px]" style={{ color: BAND }}>
              Breve descrição do incidente
            </p>
            <p className="text-[11px]">(Máx. 3 linhas)</p>
            <p className="line-clamp-3">{f.summary || inc.description}</p>
          </div>
        </Summary>
      </div>

      {/* 2. Conclusões */}
      <div className="absolute left-[30px] top-[240px] w-[510px]">
        <Tab n={2} title="Conclusões da investigação" color={C.green} />
        <div className="-mt-1 grid h-[168px] grid-cols-2 gap-4 rounded-xl border border-dashed px-4 pt-4" style={{ borderColor: C.green }}>
          <div>
            <p className="text-[13px] font-bold" style={{ color: C.green }}>
              CAUSAS IMEDIATAS
            </p>
            <p className="mb-2 text-[10.5px]">O que causou diretamente o incidente</p>
            <Bullets list={f.immediateCauses} color={C.green} />
          </div>
          <div className="border-l border-slate-800 pl-4">
            <p className="text-[13px] font-bold" style={{ color: C.green }}>
              CAUSAS RAIZ
            </p>
            <p className="mb-2 text-[10.5px]">Quais falhas no sistema permitiram que o incidente ocorresse</p>
            <Bullets list={f.rootCauses} color={C.green} />
          </div>
        </div>
      </div>

      {/* 3. Qualidade */}
      <div className="absolute left-[560px] top-[228px] w-[640px]">
        <Tab n={3} title="Qualidade da investigação e verificação de evidências" color={C.purple} className="w-[372px]" />
        <div className="relative -mt-1 h-[180px] rounded-xl border border-dashed px-4 pt-4" style={{ borderColor: C.purple }}>
          <ul className="space-y-[5px] text-[13.5px]">
            {QUALITY_CHECKS.map((q) => (
              <li key={q.k} className="flex items-center gap-2">
                {f.quality[q.k] ? (
                  <span className="grid size-4 place-items-center rounded-sm border border-green-700 text-[11px] font-bold text-green-700">✓</span>
                ) : (
                  <span className="size-4 rounded-sm border border-slate-400" />
                )}
                {q.label}
              </li>
            ))}
          </ul>
          <ShieldCheck className="absolute right-10 top-8 size-24 stroke-[1.2]" style={{ color: C.purple }} />
        </div>
      </div>

      {/* 4. Aprendizados */}
      <div className="absolute left-[30px] top-[440px] w-[510px]">
        <Tab n={4} title="Aprendizados-chave e aplicabilidade" color={C.orange} className="w-[372px]" />
        <div className="-mt-1 grid h-[220px] grid-cols-[1fr_235px] gap-3 rounded-xl border border-dashed px-3 pt-3" style={{ borderColor: C.orange }}>
          <div>
            <p className="flex items-start gap-1 text-[11.5px] font-bold uppercase" style={{ color: C.orange }}>
              <Lightbulb className="size-4 shrink-0" /> Principais aprendizados para o negócio
            </p>
            <p className="mb-1.5 pl-5 text-[10.5px]">O que aprendemos?</p>
            <ol className="space-y-1.5 text-[11.5px]">
              {items(f.learnings).map((s, i) => (
                <li key={i} className="flex gap-2">
                  <b style={{ color: C.orange }}>{i + 1}.</b> {s}
                </li>
              ))}
            </ol>
          </div>
          <div className="text-[10.5px]">
            <p className="text-[11px] font-bold uppercase" style={{ color: C.orange }}>
              Isso poderia acontecer em outro lugar
            </p>
            <p className="mb-0.5">Selecione a melhor opção</p>
            {APPLICABILITY.map((a) => (
              <p key={a.k} className="flex items-center gap-1.5">
                <Check on={f.applicability === a.k} /> {a.label}
              </p>
            ))}
            <p className="mt-1 text-[11px] font-bold uppercase" style={{ color: C.orange }}>
              População impactada
            </p>
            {POPULATION.map((a) => {
              const Icon = a.k === "equipment" ? Wrench : a.k === "process" ? Workflow : a.k === "thirdParty" ? Users : ListChecks;
              return (
                <p key={a.k} className="flex items-center gap-1.5">
                  <Icon className="size-3.5 text-slate-500" />
                  <Check on={f.population.includes(a.k)} /> {a.label}
                </p>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. Prevenção */}
      <div className="absolute left-[560px] top-[440px] w-[640px]">
        <Tab n={5} title="Principais medidas de prevenção" color={C.red} className="w-[372px]" />
        <div className="-mt-1 h-[220px] rounded-xl border border-dashed px-5 pt-5" style={{ borderColor: C.red }}>
          <p className="mb-3 text-[13px]">Quais são as principais medidas para prevenir a recorrência?</p>
          <ol className="space-y-2.5 text-[13.5px]">
            {items(f.preventions).map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-4 text-[14px] font-bold" style={{ color: C.red }}>
                  {i + 1}.
                </span>
                {s}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="absolute bottom-[8px] left-[48px] flex items-center gap-8">
        <Danone />
        <span className="text-[13px] font-semibold" style={{ color: BAND }}>
          Compartilhar os aprendizados, prevenir a recorrência, proteger nossas pessoas
        </span>
      </div>
    </Frame>
  );
}

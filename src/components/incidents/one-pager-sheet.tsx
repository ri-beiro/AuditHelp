"use client";

// Folha 16:9 (1280×720) dos One Pagers, no layout dos modelos corporativos.
// Com `edit`, os textos, listas e caixas de seleção da própria folha ficam editáveis (como no PowerPoint);
// sem `edit` (página de impressão), a folha é apenas exibida.
/* eslint-disable @next/next/no-img-element */
import { useLayoutEffect, useRef } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckSquare,
  HeartPulse,
  ImagePlus,
  Lightbulb,
  ListChecks,
  MapPin,
  Square,
  Users,
  Wrench,
  Workflow,
  ShieldCheck,
} from "lucide-react";
import {
  APPLICABILITY,
  HIPO_STATUS,
  PAGER_EVENT,
  POPULATION,
  QUALITY_CHECKS,
  usesIncidentPager,
  type FinalPager,
  type InitialPager,
  type OnePagers,
} from "@/lib/one-pager";
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

/** Edição direta na folha. */
export type SheetEdit = {
  setInitial: (patch: Partial<InitialPager>) => void;
  setFinal: (patch: Partial<FinalPager>) => void;
  onPhotos: () => void;
};

const BAND = "#1b5fae";
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
const items = (l: string[]) => l.map((s) => s.trim()).filter(Boolean);
const FROM_REPORT = "Vem do reporte — altere na etapa Reporte";

export function OnePagerSheet({
  kind,
  inc,
  pagers,
  photos,
  edit,
}: {
  kind: SheetKind;
  inc: SheetIncident;
  pagers: OnePagers;
  photos: string[];
  edit?: SheetEdit;
}) {
  if (kind === "final") return <FinalSheet inc={inc} pagers={pagers} edit={edit} />;
  return usesIncidentPager(inc) ? (
    <HipoInitialSheet inc={inc} pagers={pagers} photos={photos} edit={edit} />
  ) : (
    <AlertSheet inc={inc} pagers={pagers} photos={photos} edit={edit} />
  );
}

// ---------------------------------------------------------------------------
// Campos editáveis
// ---------------------------------------------------------------------------

const EDIT_CLS =
  "block w-full resize-none overflow-hidden rounded-[3px] bg-transparent p-0 font-[inherit] text-[length:inherit] leading-[inherit] text-[color:inherit] outline-none transition-colors placeholder:text-slate-300 hover:bg-sky-100/60 focus:bg-sky-50 focus:ring-2 focus:ring-sky-400";

/** Texto editável no lugar (textarea que cresce com o conteúdo). */
function Txt({
  value,
  onChange,
  placeholder,
  className = "",
  inline,
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  className?: string;
  inline?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  if (!onChange) return inline ? <span className={className}>{value}</span> : <div className={`whitespace-pre-line ${className}`}>{value}</div>;
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      placeholder={placeholder ?? "Clique para escrever"}
      onChange={(e) => onChange(e.target.value)}
      className={`${EDIT_CLS} ${inline ? "inline-block w-auto min-w-[80px] align-baseline" : ""} ${className}`}
      style={inline ? { width: `${Math.max(8, value.length + 2)}ch` } : undefined}
    />
  );
}

/**
 * Lista editável: cada item é um campo. Enter cria um item novo abaixo; Backspace num item vazio o remove.
 */
function EditList({
  list,
  onChange,
  marker,
  className = "",
  itemClass = "",
  placeholder,
}: {
  list: string[];
  onChange?: (l: string[]) => void;
  marker: (i: number) => React.ReactNode;
  className?: string;
  itemClass?: string;
  placeholder?: string;
}) {
  const refs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const shown = onChange ? (list.length ? list : [""]) : items(list);
  const focus = (i: number) => requestAnimationFrame(() => refs.current[i]?.focus());
  return (
    <ul className={className}>
      {shown.map((s, i) => (
        <li key={i} className={`flex gap-2 ${itemClass}`}>
          <span className="shrink-0">{marker(i)}</span>
          {onChange ? (
            <AutoArea
              ref={(el) => {
                refs.current[i] = el;
              }}
              value={s}
              placeholder={placeholder}
              onChange={(v) => onChange(shown.map((x, j) => (j === i ? v : x)))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onChange([...shown.slice(0, i + 1), "", ...shown.slice(i + 1)]);
                  focus(i + 1);
                } else if (e.key === "Backspace" && !s && shown.length > 1) {
                  e.preventDefault();
                  onChange(shown.filter((_, j) => j !== i));
                  focus(Math.max(0, i - 1));
                }
              }}
            />
          ) : (
            <span className="min-w-0">{s}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function AutoArea({
  ref,
  value,
  onChange,
  onKeyDown,
  placeholder,
}: {
  ref: (el: HTMLTextAreaElement | null) => void;
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
}) {
  const own = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const el = own.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={(el) => {
        own.current = el;
        ref(el);
      }}
      rows={1}
      value={value}
      placeholder={placeholder ?? "Novo item (Enter para adicionar outro)"}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      className={`${EDIT_CLS} min-w-0 flex-1`}
    />
  );
}

/** Caixa de seleção da folha. */
function Tick({ on, onToggle, children, className = "" }: { on: boolean; onToggle?: () => void; children?: React.ReactNode; className?: string }) {
  const box = on ? <CheckSquare className="size-4 shrink-0" /> : <Square className="size-4 shrink-0" />;
  if (!onToggle)
    return (
      <span className={`flex items-center gap-1.5 ${className}`}>
        {box} {children}
      </span>
    );
  return (
    <button type="button" onClick={onToggle} className={`flex items-center gap-1.5 rounded-[3px] text-left hover:bg-sky-100/60 ${className}`}>
      {box} {children}
    </button>
  );
}

/**
 * Encaixa o conteúdo na caixa fixa da folha: se o texto não couber, reduz o tamanho (até 60%)
 * em vez de cortar — vale para a edição e para a impressão.
 */
function Fit({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const fitAreas = () =>
      i.querySelectorAll("textarea").forEach((t) => {
        t.style.height = "0px";
        t.style.height = `${t.scrollHeight}px`;
      });
    // Reduz com transform (a largura do conteúdo cresce na mesma proporção, então o texto reflui).
    const apply = (z: number) => {
      i.style.width = `${100 / z}%`;
      i.style.transform = `scale(${z})`;
      fitAreas();
    };
    let z = 1;
    apply(z);
    while (i.offsetHeight * z > o.clientHeight + 1 && z > 0.6) {
      z = Math.round((z - 0.04) * 100) / 100;
      apply(z);
    }
  });
  return (
    <div ref={outer} className={`h-full min-h-0 overflow-hidden ${className}`}>
      <div ref={inner} className="origin-top-left">
        {children}
      </div>
    </div>
  );
}

function ReportValue({ children, edit }: { children: React.ReactNode; edit?: SheetEdit }) {
  return edit ? (
    <span title={FROM_REPORT} className="cursor-help">
      {children}
    </span>
  ) : (
    <>{children}</>
  );
}

// ---------------------------------------------------------------------------
// Peças comuns
// ---------------------------------------------------------------------------

function Frame({ band, children }: { band: string; children: React.ReactNode }) {
  return (
    <div
      className="relative h-[720px] w-[1280px] overflow-hidden bg-white font-sans text-slate-900"
      style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
    >
      {children}
      <div className="absolute inset-y-0 right-0 flex w-[58px] flex-col items-center justify-end pb-6" style={{ background: BAND }}>
        <span className="mb-6 rotate-180 whitespace-nowrap text-[15px] font-extrabold uppercase tracking-wide text-white [writing-mode:vertical-rl]">
          {band}
        </span>
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

function Dashed({
  className = "",
  color = "#111827",
  children,
  style,
}: {
  className?: string;
  color?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`border-2 border-dashed ${className}`} style={{ borderColor: color, ...style }}>
      {children}
    </div>
  );
}

const num = (color?: string) => (i: number) => (
  <span className="inline-block w-5 text-right" style={{ color }}>
    {i + 1}.
  </span>
);

function Photos({ photos, title, edit }: { photos: string[]; title: string; edit?: SheetEdit }) {
  return (
    <Dashed className="relative flex h-full flex-col p-3">
      <p className="text-[17px] text-slate-800">{title}</p>
      <div
        className={`mt-2 grid min-h-0 flex-1 gap-2 ${photos.length > 1 ? "grid-cols-2" : "grid-cols-1"} ${photos.length > 2 ? "grid-rows-2" : ""}`}
      >
        {photos.length ? (
          photos.map((src, i) => <img key={i} src={src} alt="" className="size-full min-h-0 object-cover" />)
        ) : (
          <div className="grid place-items-center text-sm text-slate-400">Sem fotos selecionadas</div>
        )}
      </div>
      {edit ? (
        <button
          type="button"
          onClick={edit.onPhotos}
          className="group absolute inset-0 grid place-items-center bg-sky-900/0 transition hover:bg-sky-900/35"
        >
          <span className="flex items-center gap-2 rounded-full bg-sky-600/90 px-4 py-2 text-base font-semibold text-white opacity-0 transition group-hover:opacity-100">
            <ImagePlus className="size-5" /> Escolher fotos
          </span>
        </button>
      ) : null}
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

function AlertSheet({ inc, pagers, photos, edit }: { inc: SheetIncident; pagers: OnePagers; photos: string[]; edit?: SheetEdit }) {
  const p = pagers.initial;
  const set = edit?.setInitial;
  const green = "#4d9a1f";
  return (
    <Frame band="INCIDENTE INICIAL UM PAGER">
      <div className="absolute left-[18px] top-[14px] text-[40px] font-black uppercase tracking-tight">Alerta de Segurança</div>
      <div className="absolute right-[90px] top-[14px] flex items-center gap-5">
        <Wise className="h-[72px] w-[72px]" />
        <StopThinkAct />
      </div>
      <div className="absolute left-[12px] top-[74px] w-[320px] text-[13px] leading-[1.35]">
        <p className="flex items-baseline gap-1">
          Zona / CBU:
          <b className="flex-1" style={{ color: green }}>
            <Txt inline value={p.zone} onChange={set && ((zone) => set({ zone }))} />
          </b>
        </p>
        <ReportValue edit={edit}>
          <p>
            Tipo de local: <b style={{ color: green }}>{inc.unitName.toUpperCase()}</b>
          </p>
          <p>SPHERA ID: {inc.spheraId ?? ""}</p>
          <p>Local do evento: {inc.area}</p>
          <p>
            Hora | Data do evento: {fmtDate(inc.occurredAt)} às {fmtTime(inc.occurredAt)}
          </p>
        </ReportValue>
      </div>
      <div className="absolute left-[338px] top-[64px] w-[390px] text-[13px] leading-[1.35]">
        <ReportValue edit={edit}>
          <p>Tipo de evento: {PAGER_EVENT[inc.type]}</p>
          <p>HIPO: {inc.hipo ? "SIM" : "NÃO"}</p>
        </ReportValue>
        <div className="flex items-baseline gap-1">
          <span className="shrink-0">Tipo e gravidade da lesão/possível lesão:</span>
          <Txt inline value={p.injury} onChange={set && ((injury) => set({ injury }))} placeholder="descreva" />
        </div>
        <p className="flex items-center gap-1">
          Danos patrimoniais:{" "}
          {set ? (
            <span className="inline-flex gap-1">
              {["Sim", "Não"].map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => set({ propertyDamage: p.propertyDamage === o ? "" : o })}
                  className={`rounded-[3px] px-1 ${p.propertyDamage === o ? "bg-sky-600 text-white" : "text-slate-400 hover:bg-sky-100"}`}
                >
                  {o}
                </button>
              ))}
            </span>
          ) : (
            p.propertyDamage
          )}
        </p>
        <ReportValue edit={edit}>
          <p>12 Básicos: {inc.basicRef ?? ""}</p>
        </ReportValue>
      </div>

      <div className="absolute left-[12px] top-[188px] w-[704px]">
        <Head icon="stop" color="#e8231c" word="PARE" subtitle="Descrição do incidente" />
        <Dashed className="mt-1 h-[116px] overflow-hidden px-3 py-3 text-[16px] leading-snug">
          <Fit>
            <Txt value={p.stop || (set ? "" : inc.description)} onChange={set && ((stop) => set({ stop }))} placeholder="Descreva o incidente" />
          </Fit>
        </Dashed>
        <div className="mt-2">
          <Head icon="think" color="#f07f17" word="PENSE" subtitle="(potenciais) consequências / fatores de influência do incidente" />
        </div>
        <Dashed className="mt-1 h-[128px] overflow-hidden px-2 py-2 text-[12.5px] leading-snug">
          <Fit>
            <EditList list={p.think} onChange={set && ((think) => set({ think }))} marker={num()} className="space-y-2" />
          </Fit>
        </Dashed>
        <div className="mt-1">
          <Head icon="act" color="#9bcf53" word="AJA" subtitle="Principais ações para evitar recorrência / aprendizados para compartilhar" />
        </div>
        <Dashed className="mt-1 h-[92px] overflow-hidden px-3 py-2 text-[15px] leading-snug">
          <Fit>
            <EditList list={p.act} onChange={set && ((act) => set({ act }))} marker={num()} className="space-y-0.5" />
          </Fit>
        </Dashed>
      </div>
      <div className="absolute left-[730px] top-[110px] h-[586px] w-[476px]">
        <Photos photos={photos} title="Imagem e ilustração:" edit={edit} />
      </div>
      <Danone className="absolute bottom-[4px] left-[60px]" />
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Resumo com ícones (HIPO inicial e final)
// ---------------------------------------------------------------------------

function Summary({ inc, pagers, edit, children }: { inc: SheetIncident; pagers: OnePagers; edit?: SheetEdit; children?: React.ReactNode }) {
  const cells = [
    { icon: MapPin, label: "SITE / CBU", value: inc.unitName.toUpperCase() },
    {
      icon: CalendarDays,
      label: "DATA DO EVENTO",
      value: fmtDate(inc.occurredAt),
      big: true,
    },
    {
      icon: AlertTriangle,
      label: "TIPO DE EVENTO",
      value: PAGER_EVENT[inc.type],
    },
    { icon: ListChecks, label: "HIPO", value: inc.hipo ? "SIM" : "NÃO" },
  ];
  const setI = edit?.setInitial;
  return (
    <div className="relative">
      <div className="absolute -top-[13px] left-[2px] z-10 rounded-t-md px-6 py-1 text-[13px] font-semibold text-white" style={{ background: BAND }}>
        1.&nbsp;&nbsp;&nbsp;RESUMO DO INCIDENTE (do one-pager inicial)
      </div>
      <div className="rounded-[22px] border-2 border-dashed border-slate-500 px-3 pb-2 pt-5">
        <div className="grid grid-cols-5 gap-2">
          {cells.map((c) => (
            <ReportValue key={c.label} edit={edit}>
              <div className="flex items-start gap-2.5">
                <c.icon className="mt-0.5 size-9 shrink-0 stroke-[1.4] text-slate-800" />
                <div className="min-w-0">
                  <p className="text-[14px] font-bold leading-tight">{c.label}</p>
                  <p className={c.big ? "mt-1 text-[16px] leading-tight" : "mt-1 text-[13px] leading-tight"}>{c.value}</p>
                </div>
              </div>
            </ReportValue>
          ))}
          <div className="flex items-start gap-2.5">
            <HeartPulse className="mt-0.5 size-9 shrink-0 stroke-[1.4] text-slate-800" />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold leading-tight">LESÃO</p>
              <div className="mt-1 text-[16px] leading-tight">
                <Txt
                  value={pagers.initial.injury || (setI ? "" : "—")}
                  onChange={setI && ((injury) => setI({ injury }))}
                  placeholder="Ex.: Não houve lesões"
                />
              </div>
            </div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inicial HIPO — "One-Pager Inicial de Incidente"
// ---------------------------------------------------------------------------

function HipoInitialSheet({ inc, pagers, photos, edit }: { inc: SheetIncident; pagers: OnePagers; photos: string[]; edit?: SheetEdit }) {
  const p = pagers.initial;
  const set = edit?.setInitial;
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
        <ReportValue edit={edit}>
          <span className="font-normal">{inc.spheraId ?? ""}</span>
        </ReportValue>
      </div>
      <StopThinkAct className="absolute right-[86px] top-[14px]" />

      <div className="absolute left-[10px] right-[72px] top-[80px]">
        <Summary inc={inc} pagers={pagers} edit={edit} />
      </div>

      <div className="absolute left-[12px] top-[186px] w-[716px]">
        <div className="flex items-center gap-5">
          <Head icon="stop" color="#f05a1a" word="STOP" subtitle="" />
          <Dashed className="grid h-[38px] w-[150px] place-items-center">
            <AlertTriangle className="size-6 fill-amber-300 text-slate-900" />
          </Dashed>
          <span className="text-[14px] font-bold">RELAÇÃO 12 BÁSICOS</span>
          <ReportValue edit={edit}>
            <span className="-ml-2 text-[16px]">{inc.basicRef ?? ""}</span>
          </ReportValue>
        </div>
        <Dashed className="mt-2 h-[96px] overflow-hidden px-3 py-3 text-[15px] leading-snug" style={{ color: green }}>
          <Fit>
            <Txt value={p.stop || (set ? "" : inc.description)} onChange={set && ((stop) => set({ stop }))} placeholder="Descreva o incidente" />
          </Fit>
        </Dashed>
        <div className="mt-1">
          <Head icon="think" color="#f5a623" word="THINK" subtitle="(potenciais) consequências / fatores influenciadores do incidente" />
        </div>
        <Dashed className="h-[134px] overflow-hidden px-2 py-1.5 text-[12.5px] leading-snug" style={{ color: green }}>
          <Fit>
            <EditList list={p.think} onChange={set && ((think) => set({ think }))} marker={num(green)} className="space-y-2" />
          </Fit>
        </Dashed>
        <div className="mt-0.5">
          <Head icon="act" color="#9bcf53" word="ACT" subtitle="Contenção Imediata e Aprendizado Inicial" />
        </div>
        <Dashed className="h-[108px] overflow-hidden px-3 py-2 text-[12.5px] leading-snug" style={{ color: green }}>
          <Fit>
            <EditList list={p.act} onChange={set && ((act) => set({ act }))} marker={num(green)} className="space-y-1" />
          </Fit>
        </Dashed>
      </div>

      <div className="absolute left-[746px] top-[236px] h-[300px] w-[460px]">
        <Photos photos={photos} title="Foto e Ilustração:" edit={edit} />
      </div>
      <div className="absolute left-[746px] top-[548px] w-[460px]">
        <p className="text-[16px] font-bold">STATUS ATUAL DA INVESTIGAÇÃO</p>
        <Dashed className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 px-3 py-2 text-[13px]">
          {[st[0], st[3], st[1], st[4], st[2]].map((s) => (
            <Tick key={s.k} on={p.status[s.k]} onToggle={set && (() => set({ status: { ...p.status, [s.k]: !p.status[s.k] } }))}>
              {s.label}
            </Tick>
          ))}
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            {p.reportDue ? <CheckSquare className="size-4 shrink-0" /> : <Square className="size-4 shrink-0" />} Relatório previsto:{" "}
            {set ? (
              <input
                type="date"
                value={p.reportDue}
                onChange={(e) => set({ reportDue: e.target.value })}
                className="w-[104px] rounded-[3px] bg-transparent text-[11px] outline-none hover:bg-sky-100/60 focus:ring-2 focus:ring-sky-400"
              />
            ) : p.reportDue ? (
              fmtDate(`${p.reportDue}T12:00:00`)
            ) : (
              "__/__/____"
            )}
          </span>
        </Dashed>
      </div>

      <div className="absolute bottom-[8px] left-[60px] flex w-[670px] items-center gap-4">
        <Danone className="shrink-0" />
        <span className="text-[11px] leading-tight">
          A ser confirmado pela investigação final: causas raiz, aprendizados organizacionais, aplicabilidade em toda a Danone e medidas de prevenção
          de longo prazo.
        </span>
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Final (HIPO) — "One-Pager Final de Incidente"
// ---------------------------------------------------------------------------

function Tab({ n, title, color, className = "" }: { n: number; title: string; color: string; className?: string }) {
  return (
    <div
      className={`relative z-10 flex items-center rounded-md px-4 py-1 text-[13px] font-bold uppercase leading-tight text-white ${className}`}
      style={{ background: color }}
    >
      {n}.&nbsp;&nbsp;&nbsp;{title}
    </div>
  );
}

const dot = (color: string) => () => <span className="mt-[5px] inline-block size-1.5 rounded-full" style={{ background: color }} />;

function FinalSheet({ inc, pagers, edit }: { inc: SheetIncident; pagers: OnePagers; edit?: SheetEdit }) {
  const f = pagers.final;
  const set = edit?.setFinal;
  const C = {
    green: "#4c9a2a",
    purple: "#7030a0",
    orange: "#f07f17",
    red: "#c00000",
  };
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
        <ReportValue edit={edit}>
          <span className="font-normal">{inc.spheraId ?? ""}</span>
        </ReportValue>
      </div>
      <StopThinkAct className="absolute right-[80px] top-[12px]" />

      <div className="absolute left-[30px] right-[70px] top-[70px]">
        <Summary inc={inc} pagers={pagers} edit={edit}>
          <div className="mt-2 px-3 text-[13px] leading-snug">
            <p className="text-[14px]" style={{ color: BAND }}>
              Breve descrição do incidente
            </p>
            <p className="text-[11px]">(Máx. 3 linhas)</p>
            <div className="h-[54px]">
              <Fit>
                <Txt
                  value={f.summary || (set ? "" : inc.description)}
                  onChange={set && ((summary) => set({ summary: summary.slice(0, 600) }))}
                  placeholder="Resumo em até 3 linhas"
                />
              </Fit>
            </div>
          </div>
        </Summary>
      </div>

      {/* 2. Conclusões */}
      <div className="absolute left-[30px] top-[240px] w-[510px]">
        <Tab n={2} title="Conclusões da investigação" color={C.green} />
        <div
          className="-mt-1 grid h-[168px] grid-cols-2 gap-4 overflow-hidden rounded-xl border border-dashed px-4 pt-4"
          style={{ borderColor: C.green }}
        >
          <div className="flex min-h-0 flex-col pb-2">
            <p className="text-[13px] font-bold" style={{ color: C.green }}>
              CAUSAS IMEDIATAS
            </p>
            <p className="mb-2 text-[10.5px]">O que causou diretamente o incidente</p>
            <Fit className="flex-1">
              <EditList
                list={f.immediateCauses}
                onChange={set && ((immediateCauses) => set({ immediateCauses }))}
                marker={dot(C.green)}
                className="space-y-2 text-[12px]"
                placeholder="Causa imediata"
              />
            </Fit>
          </div>
          <div className="flex min-h-0 flex-col border-l border-slate-800 pb-2 pl-4">
            <p className="text-[13px] font-bold" style={{ color: C.green }}>
              CAUSAS RAIZ
            </p>
            <p className="mb-2 text-[10.5px]">Quais falhas no sistema permitiram que o incidente ocorresse</p>
            <Fit className="flex-1">
              <EditList
                list={f.rootCauses}
                onChange={set && ((rootCauses) => set({ rootCauses }))}
                marker={dot(C.green)}
                className="space-y-2 text-[12px]"
                placeholder="Causa raiz"
              />
            </Fit>
          </div>
        </div>
      </div>

      {/* 3. Qualidade */}
      <div className="absolute left-[560px] top-[228px] w-[640px]">
        <Tab n={3} title="Qualidade da investigação e verificação de evidências" color={C.purple} className="w-[372px]" />
        <div className="relative -mt-1 h-[180px] rounded-xl border border-dashed px-4 pt-4" style={{ borderColor: C.purple }}>
          <ul className="space-y-[5px] text-[13.5px]">
            {QUALITY_CHECKS.map((q) => {
              const box = f.quality[q.k] ? (
                <span className="grid size-4 place-items-center rounded-sm border border-green-700 text-[11px] font-bold text-green-700">✓</span>
              ) : (
                <span className="size-4 rounded-sm border border-slate-400" />
              );
              return (
                <li key={q.k}>
                  {set ? (
                    <button
                      type="button"
                      onClick={() =>
                        set({
                          quality: { ...f.quality, [q.k]: !f.quality[q.k] },
                        })
                      }
                      className="flex items-center gap-2 rounded-[3px] hover:bg-sky-100/60"
                    >
                      {box} {q.label}
                    </button>
                  ) : (
                    <span className="flex items-center gap-2">
                      {box} {q.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <ShieldCheck className="absolute right-10 top-8 size-24 stroke-[1.2]" style={{ color: C.purple }} />
        </div>
      </div>

      {/* 4. Aprendizados */}
      <div className="absolute left-[30px] top-[440px] w-[510px]">
        <Tab n={4} title="Aprendizados-chave e aplicabilidade" color={C.orange} className="w-[372px]" />
        <div
          className="-mt-1 grid h-[220px] grid-cols-[1fr_235px] gap-3 overflow-hidden rounded-xl border border-dashed px-3 pt-3"
          style={{ borderColor: C.orange }}
        >
          <div className="flex min-h-0 flex-col pb-2">
            <p className="flex items-start gap-1 text-[11.5px] font-bold uppercase" style={{ color: C.orange }}>
              <Lightbulb className="size-4 shrink-0" /> Principais aprendizados para o negócio
            </p>
            <p className="mb-1.5 pl-5 text-[10.5px]">O que aprendemos?</p>
            <Fit className="flex-1">
              <EditList
                list={f.learnings}
                onChange={set && ((learnings) => set({ learnings }))}
                marker={(i) => <b style={{ color: C.orange }}>{i + 1}.</b>}
                className="space-y-1.5 text-[11.5px]"
                placeholder="Aprendizado"
              />
            </Fit>
          </div>
          <div className="text-[10.5px]">
            <p className="text-[11px] font-bold uppercase" style={{ color: C.orange }}>
              Isso poderia acontecer em outro lugar
            </p>
            <p className="mb-0.5">Selecione a melhor opção</p>
            {APPLICABILITY.map((a) => (
              <Tick key={a.k} on={f.applicability === a.k} onToggle={set && (() => set({ applicability: f.applicability === a.k ? "" : a.k }))}>
                {a.label}
              </Tick>
            ))}
            <p className="mt-1 text-[11px] font-bold uppercase" style={{ color: C.orange }}>
              População impactada
            </p>
            {POPULATION.map((a) => {
              const Icon = a.k === "equipment" ? Wrench : a.k === "process" ? Workflow : a.k === "thirdParty" ? Users : ListChecks;
              const on = f.population.includes(a.k);
              return (
                <span key={a.k} className="flex items-center gap-1.5">
                  <Icon className="size-3.5 text-slate-500" />
                  <Tick
                    on={on}
                    onToggle={
                      set &&
                      (() =>
                        set({
                          population: on ? f.population.filter((x) => x !== a.k) : [...f.population, a.k],
                        }))
                    }
                  >
                    {a.label}
                  </Tick>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. Prevenção */}
      <div className="absolute left-[560px] top-[440px] w-[640px]">
        <Tab n={5} title="Principais medidas de prevenção" color={C.red} className="w-[372px]" />
        <div className="-mt-1 flex h-[220px] flex-col overflow-hidden rounded-xl border border-dashed px-5 pb-2 pt-5" style={{ borderColor: C.red }}>
          <p className="mb-3 text-[13px]">Quais são as principais medidas para prevenir a recorrência?</p>
          <Fit className="flex-1">
            <EditList
              list={f.preventions}
              onChange={set && ((preventions) => set({ preventions }))}
              marker={(i) => (
                <span className="inline-block w-4 text-[14px] font-bold" style={{ color: C.red }}>
                  {i + 1}.
                </span>
              )}
              itemClass="gap-3"
              className="space-y-2.5 text-[13.5px]"
              placeholder="Medida de prevenção"
            />
          </Fit>
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

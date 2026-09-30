import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Tone } from "./scoring";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fmtPct = (v: number | null | undefined, digits = 0) =>
  v === null || v === undefined ? "—" : `${(v * 100).toFixed(digits)}%`;

export const fmtScore = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—";

export const fmtDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

export const fmtMoney = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const TONE_LABEL: Record<Tone, string> = {
  critico: "Crítico",
  atencao: "Atenção",
  conforme: "Conforme",
  neutro: "Não avaliado",
};

export const TONE_CLASSES: Record<Tone, { text: string; bg: string; border: string; bar: string; dot: string }> = {
  critico: { text: "text-critico", bg: "bg-critico-bg", border: "border-critico/40", bar: "bg-critico", dot: "bg-critico" },
  atencao: { text: "text-atencao-ink", bg: "bg-atencao-bg", border: "border-atencao/40", bar: "bg-atencao", dot: "bg-atencao" },
  conforme: { text: "text-conforme", bg: "bg-conforme-bg", border: "border-conforme/40", bar: "bg-conforme", dot: "bg-conforme" },
  neutro: { text: "text-neutro", bg: "bg-neutro-bg", border: "border-slate-200", bar: "bg-slate-300", dot: "bg-slate-300" },
};

export const TONE_HEX: Record<Tone, string> = {
  critico: "#c9281f",
  atencao: "#e8a600",
  conforme: "#1c9a4a",
  neutro: "#94a3b8",
};

export const STATUS_LABEL: Record<string, string> = {
  NAO_INICIADO: "Não iniciado",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluído",
};

export const PRIORITY_LABEL: Record<string, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  CRITICA: "Crítica",
};

export const ACTION_STATUS_LABEL: Record<string, string> = {
  ABERTA: "Aberta",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  AUDITOR: "Auditor",
  RESPONSAVEL: "Responsável",
};

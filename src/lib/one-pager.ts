// One Pagers da investigação, nos modelos corporativos:
// - Inicial (todas as ocorrências): "Alerta de Segurança" (Pare / Pense / Aja) ou, em HIPO e acidentes com lesão,
//   "One-Pager Inicial de Incidente" (Stop / Think / Act + status da investigação).
// - Final (HIPO e acidentes com lesão): "One-Pager Final de Incidente" (conclusões, qualidade, aprendizados e prevenção).

import type { IncidentTypeKey } from "./incidents";

export type PagerFile = { name: string; url: string } | null;

export const HIPO_STATUS = [
  { k: "leaderTeam", label: "Líder e equipe indicados" },
  { k: "siteVisit", label: "Visita ao site concluída" },
  { k: "witnesses", label: "Testemunhas ouvidas" },
  { k: "initialFacts", label: "Fatos iniciais coletados" },
  { k: "inProgress", label: "Investigação em andamento" },
] as const;
export type HipoStatusKey = (typeof HIPO_STATUS)[number]["k"];

export const QUALITY_CHECKS = [
  { k: "siteVisit", label: "Visita ao site concluída e testemunhas entrevistadas" },
  { k: "rcaMethod", label: "Metodologia de causa raiz aplicada" },
  { k: "similar", label: "Incidentes similares revisados" },
  { k: "actions", label: "Ações corretivas validadas e atribuídas" },
  { k: "linked", label: "Medidas de prevenção vinculadas às causas raiz" },
  { k: "review", label: "Revisão da gerência concluída e dados registrados no Sphera" },
] as const;
export type QualityKey = (typeof QUALITY_CHECKS)[number]["k"];

export const APPLICABILITY = [
  { k: "LOCAL", label: "Problema local apenas" },
  { k: "SITES", label: "Risco similar em sites selecionados" },
  { k: "GLOBAL", label: "Risco similar globalmente" },
] as const;

export const POPULATION = [
  { k: "equipment", label: "Equipamento similar" },
  { k: "process", label: "Processo similar" },
  { k: "thirdParty", label: "Atividade similar de terceiros" },
  { k: "tasks", label: "Tarefas similares" },
] as const;

export type InitialPager = {
  zone: string;
  injury: string;
  propertyDamage: string;
  stop: string;
  think: string[];
  act: string[];
  photos: string[]; // ids de anexos (imagens)
  status: Record<HipoStatusKey, boolean>;
  reportDue: string;
  file: PagerFile;
};

export type FinalPager = {
  summary: string;
  immediateCauses: string[];
  rootCauses: string[];
  quality: Record<QualityKey, boolean>;
  learnings: string[];
  applicability: string;
  population: string[];
  preventions: string[];
  file: PagerFile;
};

export type OnePagers = { initial: InitialPager; final: FinalPager };

/** Sigla do tipo de evento usada nos One Pagers. */
export const PAGER_EVENT: Record<IncidentTypeKey, string> = {
  FATALIDADE: "FAT",
  LTA: "LTC",
  NLTA: "NLTC",
  FAC: "FAC",
  INCIDENTE: "Incidente",
  NEAR_MISS: "NM",
  CONDICAO_INSEGURA: "Condição insegura",
  OBSERVACAO: "Observação",
};

const WITH_INJURY: IncidentTypeKey[] = ["FATALIDADE", "LTA", "NLTA", "FAC"];

/**
 * HIPO e acidentes com lesão usam o "One-Pager Inicial de Incidente" e exigem o One Pager final;
 * os demais usam o "Alerta de Segurança" e não têm One Pager final.
 */
export function usesIncidentPager(i: { type: IncidentTypeKey; hipo: boolean }) {
  return i.hipo || WITH_INJURY.includes(i.type);
}

export function emptyPagers(type?: IncidentTypeKey): OnePagers {
  return {
    initial: {
      zone: "LATAM",
      injury: type && !WITH_INJURY.includes(type) ? "Não houve lesões" : "",
      propertyDamage: "",
      stop: "",
      think: [""],
      act: [""],
      photos: [],
      status: Object.fromEntries(HIPO_STATUS.map((s) => [s.k, false])) as Record<HipoStatusKey, boolean>,
      reportDue: "",
      file: null,
    },
    final: {
      summary: "",
      immediateCauses: [""],
      rootCauses: [""],
      quality: Object.fromEntries(QUALITY_CHECKS.map((s) => [s.k, false])) as Record<QualityKey, boolean>,
      learnings: [""],
      applicability: "",
      population: [],
      preventions: [""],
      file: null,
    },
  };
}

const str = (v: unknown, max = 4000) => (typeof v === "string" ? v.slice(0, max) : "");
const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const list = (v: unknown, max = 12) => {
  const l = Array.isArray(v) ? v.slice(0, max).map((x) => str(x, 1000)) : [];
  return l.length ? l : [""];
};
const file = (v: unknown): PagerFile => {
  const o = obj(v);
  const url = str(o.url, 2000);
  return url && /^(https:\/\/|\/api\/files\/)/.test(url) ? { name: str(o.name, 300) || "arquivo", url } : null;
};

export function parsePagers(raw: unknown, type?: IncidentTypeKey): OnePagers {
  const base = emptyPagers(type);
  const r = obj(raw);
  const i = obj(r.initial);
  const f = obj(r.final);
  const st = obj(i.status);
  const q = obj(f.quality);
  return {
    initial: {
      zone: "zone" in i ? str(i.zone, 60) : base.initial.zone,
      injury: "injury" in i ? str(i.injury, 300) : base.initial.injury,
      propertyDamage: str(i.propertyDamage, 10),
      stop: str(i.stop),
      think: list(i.think),
      act: list(i.act),
      photos: Array.isArray(i.photos) ? i.photos.filter((x): x is string => typeof x === "string").slice(0, 4) : [],
      status: Object.fromEntries(HIPO_STATUS.map((s) => [s.k, st[s.k] === true])) as Record<HipoStatusKey, boolean>,
      reportDue: str(i.reportDue, 10),
      file: file(i.file),
    },
    final: {
      summary: str(f.summary, 600),
      immediateCauses: list(f.immediateCauses),
      rootCauses: list(f.rootCauses),
      quality: Object.fromEntries(QUALITY_CHECKS.map((s) => [s.k, q[s.k] === true])) as Record<QualityKey, boolean>,
      learnings: list(f.learnings),
      applicability: APPLICABILITY.some((a) => a.k === f.applicability) ? (f.applicability as string) : "",
      population: Array.isArray(f.population) ? f.population.filter((x): x is string => POPULATION.some((p) => p.k === x)) : [],
      preventions: list(f.preventions),
      file: file(f.file),
    },
  };
}

const filled = (l: string[]) => l.some((s) => s.trim());

/** O que falta para concluir o One Pager (um arquivo oficial anexado também conclui). */
export function initialMissing(p: InitialPager, description: string) {
  if (p.file) return [];
  const m: string[] = [];
  if (!(p.stop || description).trim()) m.push("Descrição (Pare / Stop)");
  if (!filled(p.think)) m.push("Pense / Think");
  if (!filled(p.act)) m.push("Aja / Act");
  return m;
}

export function finalMissing(p: FinalPager) {
  if (p.file) return [];
  const m: string[] = [];
  if (!filled(p.immediateCauses)) m.push("Causas imediatas");
  if (!filled(p.rootCauses)) m.push("Causas raiz");
  if (!filled(p.learnings)) m.push("Aprendizados");
  if (!p.applicability) m.push("Isso poderia acontecer em outro lugar?");
  if (!filled(p.preventions)) m.push("Medidas de prevenção");
  return m;
}

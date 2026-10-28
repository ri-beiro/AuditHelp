// Análise de Causa Raiz (RCA) para Segurança — mesmo roteiro do formulário corporativo:
// condições básicas, 6W2H, espinha de peixe, 5 porquês e ações imediatas.
// As ações corretivas e preventivas ficam no Plano de Ação (Etapa 3).

import type { IncidentTypeKey } from "./incidents";

export type YesNo = "" | "SIM" | "NAO" | "NA";
export const YES_NO_LABEL: Record<Exclude<YesNo, "">, string> = { SIM: "Sim", NAO: "Não", NA: "N/A" };

export type BasicGroup = { title: string; questions: { id: string; text: string; hint?: string }[] };

/** Seção 1 — Restauração das condições básicas (para cada "Não", definir ação ou aprofundar com 5 porquês). */
export const RCA_BASICS: { title: string; groups: BasicGroup[] }[] = [
  {
    title: "Equipamento / Material relacionado",
    groups: [
      {
        title: "1. Center Line (CL) / Equipamento de processo crítico (CPE)",
        questions: [
          { id: "cl_exec", text: "As verificações de CL foram executadas?" },
          { id: "cl_config", text: "Verifique CL/CPE: o equipamento está nas configurações corretas?" },
        ],
      },
      {
        title: "2. Inspeção de limpeza e lubrificação (CIL) / Padrão de linha (RLS)",
        questions: [
          { id: "cil_clean", text: "A área está limpa? O RLS foi executado?" },
          { id: "cil_5d", text: "Tarefas CIL dos últimos 5 dias executadas?" },
          { id: "cil_defects", text: "A área está livre de defeitos?" },
        ],
      },
      {
        title: "3. Manutenção preventiva (PM)",
        questions: [{ id: "pm_done", text: "Todas as tarefas de PM para a área foram concluídas?" }],
      },
      {
        title: "4. Operação",
        questions: [
          { id: "op_proc", text: "A operação é realizada conforme o procedimento?" },
          { id: "op_trained", text: "O operador é treinado e qualificado?" },
        ],
      },
      {
        title: "5. Materiais",
        questions: [{ id: "mat_spec", text: "Os materiais estão dentro das especificações?" }],
      },
      {
        title: "6. Outros padrões",
        questions: [{ id: "std_other", text: "Existem outros padrões existentes e seguidos?" }],
      },
    ],
  },
  {
    title: "Processo de trabalho relacionado",
    groups: [
      {
        title: "1. O processo de trabalho (IT) está definido?",
        questions: [{ id: "it_defined", text: "Existe apenas um padrão?", hint: "Verifique todos os documentos disponíveis." }],
      },
      {
        title: "2. O processo de trabalho (IT) é conhecido?",
        questions: [
          {
            id: "it_known",
            text: "Todos estão treinados de que este é o (único) padrão?",
            hint: "Observe os registros de treinamento e pergunte no chão.",
          },
        ],
      },
      {
        title: "3. O trabalho é executado conforme o padrão?",
        questions: [{ id: "it_followed", text: "O trabalho é executado conforme o padrão?" }],
      },
      {
        title: "4. Visual Work Place (controles visuais)",
        questions: [{ id: "it_visual", text: "Os controles visuais estão disponíveis?" }],
      },
    ],
  },
];

export const RCA_BASIC_QUESTIONS = RCA_BASICS.flatMap((s) => s.groups.flatMap((g) => g.questions));

/** Seção 2 — 6W2H. */
export const SIX_W_TWO_H = [
  { k: "what", label: "O QUE aconteceu?" },
  { k: "where", label: "ONDE isso aconteceu?" },
  { k: "when", label: "QUANDO isso aconteceu / acontece?" },
  { k: "who", label: "QUEM estava envolvido?" },
  { k: "which", label: "QUAL material estava envolvido?" },
  { k: "withWhom", label: "Com QUEM isso aconteceu?" },
  { k: "how", label: "COMO isso aconteceu?" },
  { k: "howOften", label: "Com que frequência / quanto?" },
] as const;
export type SixWKey = (typeof SIX_W_TWO_H)[number]["k"];

/** Seção 3 — Espinha de peixe, com as categorias do formulário (3 em cima, 3 embaixo). */
export const FISHBONE = [
  { k: "material", label: "Materiais" },
  { k: "maquina", label: "Máquina" },
  { k: "gestao", label: "Organização / Gestão" },
  { k: "maoDeObra", label: "Mão de obra" },
  { k: "metodo", label: "Método" },
  { k: "meioAmbiente", label: "Meio ambiente" },
] as const;
export type FishKey = (typeof FISHBONE)[number]["k"];

export const CAUSE_TYPES = [
  "Falha operacional",
  "Falha de gestão",
  "Falha organizacional",
  "Falha de equipamento",
  "Falha comportamental",
] as const;

/** Hierarquia de controle (da mais à menos eficaz). */
export const CONTROL_HIERARCHY = ["Eliminação", "Substituição", "Engenharia", "Administrativa", "EPI"] as const;

export type WhyRow = { category: string; factor: string; whys: string[]; rootCause: string; causeType: string };
export type ImmediateAction = { action: string; date: string; owner: string };

export type RcaData = {
  investigationOwner: string;
  areaOwner: string;
  equipment: string;
  basics: Record<string, YesNo>;
  equipmentNotes: string;
  processNotes: string;
  sixW: Record<SixWKey, string>;
  problemStatement: string;
  solvedByBasics: YesNo;
  /** Cada categoria é uma lista de "quadradinhos" (uma causa por quadro). */
  fishbone: Record<FishKey, string[]>;
  essentialFactors: string;
  whys: WhyRow[];
  rootCauseFound: YesNo;
  summary: string;
  immediate: ImmediateAction[];
  followUps: string[];
};

export const emptyWhy = (): WhyRow => ({ category: "", factor: "", whys: ["", "", "", "", ""], rootCause: "", causeType: "" });

export function emptyRca(): RcaData {
  return {
    investigationOwner: "",
    areaOwner: "",
    equipment: "",
    basics: {},
    equipmentNotes: "",
    processNotes: "",
    sixW: Object.fromEntries(SIX_W_TWO_H.map((x) => [x.k, ""])) as Record<SixWKey, string>,
    problemStatement: "",
    solvedByBasics: "",
    fishbone: Object.fromEntries(FISHBONE.map((x) => [x.k, [""]])) as Record<FishKey, string[]>,
    essentialFactors: "",
    whys: [emptyWhy()],
    rootCauseFound: "",
    summary: "",
    immediate: [{ action: "", date: "", owner: "" }],
    followUps: ["", "", "", ""],
  };
}

const str = (v: unknown, max = 8000) => (typeof v === "string" ? v.slice(0, max) : "");
const yn = (v: unknown): YesNo => (v === "SIM" || v === "NAO" || v === "NA" ? v : "");

/** Normaliza o JSON salvo (ou enviado pelo cliente) para o formato completo. */
export function parseRca(raw: unknown): RcaData {
  const base = emptyRca();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  const obj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
  const basics = obj(r.basics);
  const sixW = obj(r.sixW);
  const fish = obj(r.fishbone);
  const whys = Array.isArray(r.whys) ? r.whys.slice(0, 20) : [];
  const imm = Array.isArray(r.immediate) ? r.immediate.slice(0, 30) : [];
  const fu = Array.isArray(r.followUps) ? r.followUps : [];
  return {
    investigationOwner: str(r.investigationOwner, 300),
    areaOwner: str(r.areaOwner, 300),
    equipment: str(r.equipment, 300),
    basics: Object.fromEntries(RCA_BASIC_QUESTIONS.map((q) => [q.id, yn(basics[q.id])])),
    equipmentNotes: str(r.equipmentNotes),
    processNotes: str(r.processNotes),
    sixW: Object.fromEntries(SIX_W_TWO_H.map((x) => [x.k, str(sixW[x.k], 4000)])) as Record<SixWKey, string>,
    problemStatement: str(r.problemStatement),
    solvedByBasics: yn(r.solvedByBasics),
    fishbone: Object.fromEntries(
      FISHBONE.map((x) => {
        // Versão anterior guardava texto com uma causa por linha (e "medida" no lugar de "gestao").
        const v = fish[x.k] ?? (x.k === "gestao" ? fish.medida : undefined);
        const list = Array.isArray(v) ? v.map((s) => str(s, 1000)) : str(v, 4000).split("\n").filter((s) => s.trim());
        return [x.k, list.length ? list.slice(0, 12) : [""]];
      }),
    ) as Record<FishKey, string[]>,
    essentialFactors: str(r.essentialFactors),
    whys: whys.length
      ? whys.map((w) => {
          const o = obj(w);
          const list = Array.isArray(o.whys) ? o.whys : [];
          return {
            category: str(o.category, 100) === "Material" ? "Materiais" : str(o.category, 100),
            factor: str(o.factor, 2000),
            whys: [0, 1, 2, 3, 4].map((i) => str(list[i], 4000)),
            rootCause: str(o.rootCause, 4000),
            causeType: str(o.causeType, 100),
          };
        })
      : base.whys,
    rootCauseFound: yn(r.rootCauseFound),
    summary: str(r.summary),
    immediate: imm.length
      ? imm.map((a) => {
          const o = obj(a);
          return { action: str(o.action, 2000), date: str(o.date, 10), owner: str(o.owner, 200) };
        })
      : base.immediate,
    followUps: [0, 1, 2, 3].map((i) => str(fu[i], 10)),
  };
}

/** RCA obrigatória: Fatalidade, LTA, NLTA e eventos de alto potencial (HIPO). */
export function rcaRequired(i: { type: IncidentTypeKey; hipo: boolean }) {
  return i.hipo || i.type === "FATALIDADE" || i.type === "LTA" || i.type === "NLTA";
}

/** Causas raiz identificadas nos 5 porquês (para vincular às ações). */
export function rootCauses(r: RcaData) {
  return r.whys
    .filter((w) => w.rootCause.trim())
    .map((w) => ({ label: w.causeType ? `${w.causeType} — ${w.rootCause.trim()}` : w.rootCause.trim(), type: w.causeType }));
}

const fishFilled = (r: RcaData) => FISHBONE.some((f) => r.fishbone[f.k].some((s) => s.trim()));

/** Itens que faltam para a RCA ser considerada completa. */
export function rcaMissing(r: RcaData) {
  const missing: string[] = [];
  const answered = RCA_BASIC_QUESTIONS.filter((q) => r.basics[q.id]).length;
  if (answered < RCA_BASIC_QUESTIONS.length) missing.push(`Condições básicas (${answered}/${RCA_BASIC_QUESTIONS.length} respondidas)`);
  if (!r.sixW.what.trim() || !r.sixW.how.trim()) missing.push("6W2H (pelo menos O quê e Como)");
  if (!r.problemStatement.trim()) missing.push("Declaração do problema refocalizada");
  if (!fishFilled(r)) missing.push("Espinha de peixe");
  if (!r.whys.some((w) => w.rootCause.trim())) missing.push("5 porquês com causa raiz identificada");
  if (!r.immediate.some((a) => a.action.trim())) missing.push("Ações imediatas");
  return missing;
}

/** Progresso das 5 seções (0–100). */
export function rcaSections(r: RcaData) {
  const answered = RCA_BASIC_QUESTIONS.filter((q) => r.basics[q.id]).length;
  return [
    { n: 1, label: "Condições básicas", done: answered === RCA_BASIC_QUESTIONS.length, partial: answered > 0 },
    { n: 2, label: "6W2H", done: !!(r.sixW.what.trim() && r.sixW.how.trim() && r.problemStatement.trim()), partial: Object.values(r.sixW).some((v) => v.trim()) },
    { n: 3, label: "Espinha de peixe", done: fishFilled(r), partial: false },
    { n: 4, label: "5 Porquês", done: r.whys.some((w) => w.rootCause.trim()), partial: r.whys.some((w) => w.factor.trim() || w.whys[0].trim()) },
    { n: 5, label: "Ações imediatas", done: r.immediate.some((a) => a.action.trim()), partial: false },
  ];
}

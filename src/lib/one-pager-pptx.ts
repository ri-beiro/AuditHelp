// One Pagers em PowerPoint (16:9). Cada One Pager gera dois slides:
// um editável (caixas de texto e listas nativas, no mesmo layout da folha) e um com a imagem fiel da folha.
// Os ícones da folha entram no slide editável como imagens (PNG), para manter o mesmo padrão visual.
// Coordenadas em pixels da folha (1280×720) convertidas para polegadas (96 px = 1").
import { createElement, type ComponentType } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import type PptxGenJS from "pptxgenjs";
import {
  AlertTriangle,
  CalendarDays,
  CheckSquare,
  HeartPulse,
  Lightbulb,
  ListChecks,
  MapPin,
  ShieldCheck,
  Square,
  Users,
  Workflow,
  Wrench,
} from "lucide-react";
import { APPLICABILITY, HIPO_STATUS, PAGER_EVENT, POPULATION, QUALITY_CHECKS, type OnePagers } from "./one-pager";
import type { SheetIncident } from "@/components/incidents/one-pager-sheet";

type Slide = PptxGenJS.Slide;
type TextProps = PptxGenJS.TextProps;

const BAND = "1B5FAE";
const FONT = "Arial";
const px = (n: number) => n / 96;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
const items = (l: string[]) => l.map((s) => s.trim()).filter(Boolean);

// ---------------------------------------------------------------------------
// Ícones → PNG
// ---------------------------------------------------------------------------

type IconProps = { size?: number; color?: string; strokeWidth?: number; fill?: string };

/** Desenha o SVG de um componente React (ex.: ícone lucide) e devolve PNG em data URL. */
async function svgPng(markup: string, w: number, h: number): Promise<string> {
  const scale = 4;
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = w * scale;
  canvas.height = h * scale;
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

function renderSvg(Comp: ComponentType<IconProps>, props: IconProps) {
  const div = document.createElement("div");
  const root = createRoot(div);
  flushSync(() => root.render(createElement(Comp, props)));
  const svg = div.querySelector("svg")!;
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("width", String(props.size ?? 24));
  svg.setAttribute("height", String(props.size ?? 24));
  const out = svg.outerHTML;
  root.unmount();
  return out;
}

const icon = (Comp: ComponentType<IconProps>, props: IconProps = {}) => svgPng(renderSvg(Comp, { size: 48, ...props }), 48, 48);

const raw = (inner: string, vb: string, w: number, h: number) =>
  svgPng(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${h}">${inner}</svg>`, w, h);

type Icons = Awaited<ReturnType<typeof loadIcons>>;

async function loadIcons() {
  const ink = "#1e293b";
  const [mapPin, calendar, alert, listChecks, heart, warnFilled, checkBox, emptyBox, qualityOn, qualityOff, shield, bulb, wrench, workflow, users, stopIcon, thinkIcon, actIcon, sta] =
    await Promise.all([
      icon(MapPin, { color: ink, strokeWidth: 1.4 }),
      icon(CalendarDays, { color: ink, strokeWidth: 1.4 }),
      icon(AlertTriangle, { color: ink, strokeWidth: 1.4 }),
      icon(ListChecks, { color: ink, strokeWidth: 1.4 }),
      icon(HeartPulse, { color: ink, strokeWidth: 1.4 }),
      icon(AlertTriangle, { color: "#0f172a", fill: "#fcd34d", strokeWidth: 2 }),
      icon(CheckSquare, { color: "#0f172a", strokeWidth: 2 }),
      icon(Square, { color: "#0f172a", strokeWidth: 2 }),
      raw('<rect x="1.5" y="1.5" width="21" height="21" rx="3" fill="#fff" stroke="#15803d" stroke-width="2"/><path d="M6.5 12.5l3.5 3.5 7.5-8" fill="none" stroke="#15803d" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>', "0 0 24 24", 48, 48),
      raw('<rect x="1.5" y="1.5" width="21" height="21" rx="3" fill="#fff" stroke="#94a3b8" stroke-width="2"/>', "0 0 24 24", 48, 48),
      icon(ShieldCheck, { color: "#7030a0", strokeWidth: 1.2 }),
      icon(Lightbulb, { color: "#f07f17", strokeWidth: 2 }),
      icon(Wrench, { color: "#64748b", strokeWidth: 2 }),
      icon(Workflow, { color: "#64748b", strokeWidth: 2 }),
      icon(Users, { color: "#64748b", strokeWidth: 2 }),
      raw('<circle cx="12" cy="12" r="8" fill="none" stroke="#f05a1a" stroke-width="5"/>', "0 0 24 24", 48, 48),
      raw('<path d="M2 2 H22 V8 A14 14 0 0 1 8 22 H2 Z" fill="#f5a623"/>', "0 0 24 24", 48, 48),
      raw('<circle cx="12" cy="12" r="11" fill="#9bcf53"/>', "0 0 24 24", 48, 48),
      raw(
        '<circle cx="32" cy="32" r="24" fill="none" stroke="#f05a1a" stroke-width="14"/><circle cx="30" cy="30" r="9" fill="#9bcf53"/><path d="M32 32 L52 32 A20 20 0 0 1 32 52 Z" fill="#f5a623"/>',
        "0 0 64 64",
        128,
        128,
      ),
    ]);
  return { mapPin, calendar, alert, listChecks, heart, warnFilled, checkBox, emptyBox, qualityOn, qualityOff, shield, bulb, wrench, workflow, users, stopIcon, thinkIcon, actIcon, sta };
}

// ---------------------------------------------------------------------------
// Peças
// ---------------------------------------------------------------------------

function text(slide: Slide, value: string | TextProps[], x: number, y: number, w: number, h: number, opts: PptxGenJS.TextPropsOptions = {}) {
  slide.addText(value, { x: px(x), y: px(y), w: px(w), h: px(h), fontFace: FONT, fontSize: 10, color: "111827", margin: 2, valign: "top", ...opts });
}

function img(slide: Slide, data: string, x: number, y: number, w: number, h = w) {
  slide.addImage({ data, x: px(x), y: px(y), w: px(w), h: px(h) });
}

function dashed(slide: Slide, x: number, y: number, w: number, h: number, color = "111827", rounded = false) {
  slide.addShape(rounded ? "roundRect" : "rect", {
    x: px(x),
    y: px(y),
    w: px(w),
    h: px(h),
    line: { color, width: 1.25, dashType: "dash" },
    fill: { type: "none" } as never,
    rectRadius: rounded ? 0.12 : undefined,
  });
}

/** Lista numerada como parágrafos (editável no PowerPoint, Enter cria novo item). */
function numbered(list: string[], color: string, fontSize: number): TextProps[] {
  const l = items(list);
  if (!l.length) return [{ text: " ", options: { fontSize } }];
  return l.map((s) => ({ text: s, options: { bullet: { type: "number" }, color, fontSize, paraSpaceAfter: 4, breakLine: true } }));
}

function bullets(list: string[], color: string, fontSize: number): TextProps[] {
  const l = items(list);
  if (!l.length) return [{ text: " ", options: { fontSize } }];
  return l.map((s) => ({ text: s, options: { bullet: { code: "25CF" }, color: "111827", fontSize, paraSpaceAfter: 4, breakLine: true } }));
}

/** Caixa de seleção (ícone) + texto editável ao lado. */
function tick(slide: Slide, icons: Icons, on: boolean, label: string, x: number, y: number, w: number, fontSize: number, size = 14, quality = false) {
  img(slide, quality ? (on ? icons.qualityOn : icons.qualityOff) : on ? icons.checkBox : icons.emptyBox, x, y + 1, size);
  text(slide, label, x + size + 5, y - 2, w - size - 5, size + 6, { fontSize, valign: "middle", margin: 0 });
}

function stopThinkAct(slide: Slide, icons: Icons, x: number, y: number) {
  img(slide, icons.sta, x, y, 62);
  text(
    slide,
    [
      { text: "STOP", options: { color: "F05A1A", breakLine: true } },
      { text: "THINK", options: { color: "F5A623", breakLine: true } },
      { text: "ACT", options: { color: "9BCF53" } },
    ],
    x + 68,
    y,
    80,
    62,
    { bold: true, fontSize: 14, lineSpacingMultiple: 0.8, valign: "middle", margin: 0 },
  );
}

function frame(slide: Slide, band: string, page: number, logos: Logos) {
  slide.background = { color: "FFFFFF" };
  slide.addShape("rect", { x: px(1222), y: 0, w: px(58), h: px(720), fill: { color: BAND }, line: { color: BAND } });
  // Caixa deitada (520×58) girada 270° para ficar centrada na faixa azul.
  text(slide, band, 1251 - 260, 380 - 29, 520, 58, { color: "FFFFFF", bold: true, fontSize: 12, rotate: 270, align: "center", valign: "middle" });
  text(slide, String(page), 1222, 670, 58, 30, { color: "FFFFFF", bold: true, fontSize: 13, align: "center" });
  if (logos.wise) {
    slide.addShape("ellipse", { x: px(1227), y: px(8), w: px(48), h: px(48), fill: { color: "FFFFFF" }, line: { color: "FFFFFF" } });
    slide.addImage({ data: logos.wise, x: px(1230), y: px(11), w: px(42), h: px(42), sizing: { type: "contain", w: px(42), h: px(42) } });
  }
  if (logos.danone) slide.addImage({ data: logos.danone, x: px(60), y: px(684), w: px(90), h: px(26) });
}

function head(slide: Slide, data: string, word: string, color: string, subtitle: string, x: number, y: number) {
  img(slide, data, x, y + 12, 26);
  text(slide, word, x + 32, y, 230, 44, { color, bold: true, fontSize: 32, valign: "middle", margin: 0 });
  if (subtitle) text(slide, subtitle, x + 40 + word.length * 27, y + 16, 520, 22, { fontSize: 9, valign: "bottom" });
}

function summary(slide: Slide, icons: Icons, inc: SheetIncident, p: OnePagers, top: number, left: number, width: number, height: number) {
  dashed(slide, left, top, width, height, "64748B", true);
  slide.addShape("rect", { x: px(left + 4), y: px(top - 12), w: px(360), h: px(24), fill: { color: BAND }, line: { color: BAND } });
  text(slide, "1.   RESUMO DO INCIDENTE (do one-pager inicial)", left + 10, top - 12, 350, 24, { color: "FFFFFF", bold: true, fontSize: 10, valign: "middle" });
  const cells: [string, string, string][] = [
    [icons.mapPin, "SITE / CBU", inc.unitName.toUpperCase()],
    [icons.calendar, "DATA DO EVENTO", fmtDate(inc.occurredAt)],
    [icons.alert, "TIPO DE EVENTO", PAGER_EVENT[inc.type]],
    [icons.listChecks, "HIPO", inc.hipo ? "SIM" : "NÃO"],
    [icons.heart, "LESÃO", p.initial.injury || "—"],
  ];
  const cw = (width - 20) / 5;
  cells.forEach(([ic, label, value], i) => {
    const x = left + 10 + i * cw;
    img(slide, ic, x, top + 18, 34);
    text(
      slide,
      [
        { text: label, options: { bold: true, fontSize: 10.5, breakLine: true } },
        { text: value, options: { fontSize: 11 } },
      ],
      x + 40,
      top + 14,
      cw - 46,
      56,
    );
  });
}

type Logos = { wise?: string; danone?: string };

// ---------------------------------------------------------------------------
// Slides
// ---------------------------------------------------------------------------

function initialSlide(pptx: PptxGenJS, icons: Icons, inc: SheetIncident, p: OnePagers, photos: string[], logos: Logos) {
  const s = pptx.addSlide();
  const i = p.initial;
  const green = "4D9A1F";
  frame(s, "ONE-PAGER DE INCIDENTE INICIAL", 1, logos);
  text(s, "ONE-PAGER INICIAL DE INCIDENTE", 18, 12, 760, 50, { bold: true, fontSize: 26 });
  text(s, [{ text: "ID DO EVENTO NO SPHERA: ", options: { bold: true } }, { text: inc.spheraId ?? "" }], 790, 22, 260, 40, { fontSize: 11 });
  stopThinkAct(s, icons, 1056, 14);
  summary(s, icons, inc, p, 86, 10, 1198, 86);

  head(s, icons.stopIcon, "STOP", "F05A1A", "", 12, 186);
  dashed(s, 190, 192, 150, 38);
  img(s, icons.warnFilled, 252, 199, 24);
  text(s, [{ text: "RELAÇÃO 12 BÁSICOS  ", options: { bold: true } }, { text: inc.basicRef ?? "" }], 356, 196, 372, 28, { fontSize: 11, valign: "middle" });
  dashed(s, 12, 236, 716, 92);
  text(s, i.stop || inc.description, 22, 240, 696, 84, { color: green, fontSize: 12, fit: "shrink" });

  head(s, icons.thinkIcon, "THINK", "F5A623", "(potenciais) consequências / fatores influenciadores do incidente", 12, 330);
  dashed(s, 12, 376, 716, 134);
  text(s, numbered(i.think, green, 10), 20, 380, 700, 126, { fit: "shrink" });

  head(s, icons.actIcon, "ACT", "9BCF53", "Contenção Imediata e Aprendizado Inicial", 12, 512);
  dashed(s, 12, 556, 716, 108);
  text(s, numbered(i.act, green, 10), 20, 560, 700, 100, { fit: "shrink" });

  // Fotos
  dashed(s, 746, 236, 460, 300);
  text(s, "Foto e Ilustração:", 756, 242, 300, 22, { fontSize: 12 });
  const ph = photos.slice(0, 4);
  if (ph.length) {
    const cols = ph.length > 1 ? 2 : 1;
    const rows = ph.length > 2 ? 2 : 1;
    const gw = (440 - (cols - 1) * 8) / cols;
    const gh = (256 - (rows - 1) * 8) / rows;
    ph.forEach((data, k) =>
      s.addImage({ data, x: px(756 + (k % cols) * (gw + 8)), y: px(270 + Math.floor(k / cols) * (gh + 8)), w: px(gw), h: px(gh), sizing: { type: "cover", w: px(gw), h: px(gh) } }),
    );
  }

  // Status da investigação (ícones de caixa + texto)
  text(s, "STATUS ATUAL DA INVESTIGAÇÃO", 746, 546, 460, 22, { bold: true, fontSize: 12 });
  dashed(s, 746, 572, 460, 92);
  const st = [HIPO_STATUS[0], HIPO_STATUS[3], HIPO_STATUS[1], HIPO_STATUS[4], HIPO_STATUS[2]];
  const entries: { on: boolean; label: string }[] = st.map((x) => ({ on: !!i.status[x.k], label: x.label }));
  entries.push({ on: !!i.reportDue, label: `Relatório previsto: ${i.reportDue ? fmtDate(`${i.reportDue}T12:00:00`) : "__/__/____"}` });
  entries.forEach((e, k) => tick(s, icons, e.on, e.label, k % 2 === 0 ? 758 : 982, 582 + Math.floor(k / 2) * 26, 220, 10));

  text(
    s,
    "A ser confirmado pela investigação final: causas raiz, aprendizados organizacionais, aplicabilidade em toda a Danone e medidas de prevenção de longo prazo.",
    160,
    680,
    570,
    34,
    { fontSize: 8 },
  );
}

function finalSlide(pptx: PptxGenJS, icons: Icons, inc: SheetIncident, p: OnePagers, logos: Logos) {
  const s = pptx.addSlide();
  const f = p.final;
  const C = { green: "4C9A2A", purple: "7030A0", orange: "F07F17", red: "C00000" };
  frame(s, "ONE-PAGER FINAL DE INCIDENTE", 2, logos);
  text(s, "ONE-PAGER FINAL DE INCIDENTE", 12, 10, 740, 50, { bold: true, fontSize: 25 });
  text(s, [{ text: "SPHERA ID DO EVENTO: ", options: { bold: true } }, { text: inc.spheraId ?? "" }], 760, 22, 290, 40, { fontSize: 11 });
  stopThinkAct(s, icons, 1056, 10);
  summary(s, icons, inc, p, 76, 30, 1180, 150);
  text(
    s,
    [
      { text: "Breve descrição do incidente ", options: { color: BAND, fontSize: 11 } },
      { text: "(Máx. 3 linhas)", options: { fontSize: 8, breakLine: true } },
      { text: f.summary || inc.description, options: { fontSize: 10 } },
    ],
    44,
    150,
    1150,
    72,
    { fit: "shrink" },
  );

  const tab = (n: number, title: string, color: string, x: number, y: number, w: number) => {
    s.addShape("roundRect", { x: px(x), y: px(y), w: px(w), h: px(24), fill: { color }, line: { color }, rectRadius: 0.05 });
    text(s, `${n}.   ${title}`, x + 8, y, w - 10, 24, { color: "FFFFFF", bold: true, fontSize: 10, valign: "middle" });
  };

  // 2. Conclusões
  tab(2, "CONCLUSÕES DA INVESTIGAÇÃO", C.green, 30, 240, 300);
  dashed(s, 30, 262, 510, 168, C.green, true);
  text(s, [{ text: "CAUSAS IMEDIATAS", options: { bold: true, color: C.green, breakLine: true } }, { text: "O que causou diretamente o incidente", options: { fontSize: 8 } }], 42, 270, 235, 44, { fontSize: 10 });
  text(s, bullets(f.immediateCauses, C.green, 10), 42, 318, 235, 106, { fit: "shrink" });
  s.addShape("line", { x: px(285), y: px(272), w: 0, h: px(150), line: { color: "111827", width: 0.75 } });
  text(s, [{ text: "CAUSAS RAIZ", options: { bold: true, color: C.green, breakLine: true } }, { text: "Quais falhas no sistema permitiram que o incidente ocorresse", options: { fontSize: 8 } }], 295, 270, 235, 44, { fontSize: 10 });
  text(s, bullets(f.rootCauses, C.green, 10), 295, 318, 235, 106, { fit: "shrink" });

  // 3. Qualidade
  tab(3, "QUALIDADE DA INVESTIGAÇÃO E VERIFICAÇÃO DE EVIDÊNCIAS", C.purple, 560, 228, 520);
  dashed(s, 560, 250, 640, 180, C.purple, true);
  QUALITY_CHECKS.forEach((q, k) => tick(s, icons, f.quality[q.k], q.label, 574, 266 + k * 25, 500, 11, 15, true));
  img(s, icons.shield, 1086, 280, 96);

  // 4. Aprendizados
  tab(4, "APRENDIZADOS-CHAVE E APLICABILIDADE", C.orange, 30, 440, 372);
  dashed(s, 30, 462, 510, 220, C.orange, true);
  img(s, icons.bulb, 38, 471, 16);
  text(s, [{ text: "PRINCIPAIS APRENDIZADOS PARA O NEGÓCIO", options: { bold: true, color: C.orange, breakLine: true } }, { text: "O que aprendemos?", options: { fontSize: 8 } }], 56, 470, 240, 48, { fontSize: 9 });
  text(s, numbered(f.learnings, "111827", 9.5), 40, 522, 255, 154, { fit: "shrink" });
  text(s, [{ text: "ISSO PODERIA ACONTECER EM OUTRO LUGAR", options: { bold: true, color: C.orange, breakLine: true } }, { text: "Selecione a melhor opção", options: {} }], 300, 470, 235, 40, { fontSize: 8.5 });
  APPLICABILITY.forEach((a, k) => tick(s, icons, f.applicability === a.k, a.label, 302, 522 + k * 17, 232, 8.5, 12));
  text(s, "POPULAÇÃO IMPACTADA", 300, 572, 235, 16, { bold: true, color: C.orange, fontSize: 8.5 });
  const popIcon = { equipment: icons.wrench, process: icons.workflow, thirdParty: icons.users, tasks: icons.listChecks } as Record<string, string>;
  POPULATION.forEach((a, k) => {
    const y = 592 + k * 18;
    img(s, popIcon[a.k], 302, y + 1, 12);
    tick(s, icons, f.population.includes(a.k), a.label, 318, y, 216, 8.5, 12);
  });

  // 5. Prevenção
  tab(5, "PRINCIPAIS MEDIDAS DE PREVENÇÃO", C.red, 560, 440, 372);
  dashed(s, 560, 462, 640, 220, C.red, true);
  text(s, "Quais são as principais medidas para prevenir a recorrência?", 576, 474, 600, 22, { fontSize: 10.5 });
  text(s, numbered(f.preventions, "111827", 11), 576, 500, 610, 176, { fit: "shrink" });

  text(s, "Compartilhar os aprendizados, prevenir a recorrência, proteger nossas pessoas", 170, 688, 700, 24, { color: BAND, bold: true, fontSize: 10 });
}

/** Lê uma imagem (mesma origem) como data URL para o PowerPoint. */
export async function toDataUrl(src: string): Promise<string | undefined> {
  try {
    const res = await fetch(src);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => resolve(undefined);
      r.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

export type PptxPage = { kind: "initial" | "final"; image?: string };

/**
 * Monta o .pptx: para cada One Pager, o slide editável seguido do slide-imagem (se a captura existir).
 */
export async function buildOnePagerPptx({
  inc,
  pagers,
  photoUrls,
  pages,
  fileName,
}: {
  inc: SheetIncident;
  pagers: OnePagers;
  photoUrls: string[];
  pages: PptxPage[];
  fileName: string;
}) {
  const { default: Pptx } = await import("pptxgenjs");
  const pptx = new Pptx();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = fileName;
  const [photos, wise, danone, icons] = await Promise.all([
    Promise.all(photoUrls.map(toDataUrl)).then((l) => l.filter((x): x is string => !!x)),
    toDataUrl("/brand/wise-logo.png"),
    toDataUrl("/brand/danone.png"),
    loadIcons(),
  ]);
  const logos = { wise, danone };
  for (const page of pages) {
    if (page.kind === "initial") initialSlide(pptx, icons, inc, pagers, photos, logos);
    else finalSlide(pptx, icons, inc, pagers, logos);
    if (page.image) {
      const s = pptx.addSlide();
      s.addImage({ data: page.image, x: 0, y: 0, w: px(1280), h: px(720) });
      s.addNotes("Imagem fiel da folha do sistema. O slide anterior tem o mesmo conteúdo editável.");
    }
  }
  await pptx.writeFile({ fileName });
}

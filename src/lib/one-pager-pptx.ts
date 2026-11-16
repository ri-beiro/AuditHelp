// One Pagers em PowerPoint (16:9). Cada One Pager gera dois slides:
// um editável (caixas de texto e listas nativas, no mesmo layout da folha) e um com a imagem fiel da folha.
// Coordenadas em pixels da folha (1280×720) convertidas para polegadas (96 px = 1").
import type PptxGenJS from "pptxgenjs";
import { APPLICABILITY, HIPO_STATUS, PAGER_EVENT, POPULATION, QUALITY_CHECKS, type OnePagers } from "./one-pager";
import type { SheetIncident } from "@/components/incidents/one-pager-sheet";

type Slide = PptxGenJS.Slide;
type TextProps = PptxGenJS.TextProps;

const BAND = "1B5FAE";
const FONT = "Arial";
const px = (n: number) => n / 96;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
const items = (l: string[]) => l.map((s) => s.trim()).filter(Boolean);
const box = "☐";
const checked = "☒";

function text(slide: Slide, value: string | TextProps[], x: number, y: number, w: number, h: number, opts: PptxGenJS.TextPropsOptions = {}) {
  slide.addText(value, { x: px(x), y: px(y), w: px(w), h: px(h), fontFace: FONT, fontSize: 10, color: "111827", margin: 2, valign: "top", ...opts });
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
  return l.map((s) => ({ text: s, options: { bullet: true, color: "111827", fontSize, paraSpaceAfter: 4, breakLine: true } }));
}

function frame(slide: Slide, band: string, page: number, logos: Logos) {
  slide.background = { color: "FFFFFF" };
  slide.addShape("rect", { x: px(1222), y: 0, w: px(58), h: px(720), fill: { color: BAND }, line: { color: BAND } });
  // Caixa deitada (520×58) girada 270° para ficar centrada na faixa azul.
  text(slide, band, 1251 - 260, 380 - 29, 520, 58, { color: "FFFFFF", bold: true, fontSize: 12, rotate: 270, align: "center", valign: "middle" });
  text(slide, String(page), 1222, 670, 58, 30, { color: "FFFFFF", bold: true, fontSize: 13, align: "center" });
  if (logos.wise) slide.addImage({ data: logos.wise, x: px(1228), y: px(8), w: px(46), h: px(46), sizing: { type: "contain", w: px(46), h: px(46) } });
  if (logos.danone) slide.addImage({ data: logos.danone, x: px(60), y: px(684), w: px(90), h: px(26) });
  // Selo Stop / Think / Act
  text(
    slide,
    [
      { text: "STOP", options: { color: "F05A1A", breakLine: true } },
      { text: "THINK", options: { color: "F5A623", breakLine: true } },
      { text: "ACT", options: { color: "9BCF53" } },
    ],
    1130,
    10,
    90,
    60,
    { bold: true, fontSize: 13, lineSpacingMultiple: 0.85 },
  );
}

function head(slide: Slide, word: string, color: string, subtitle: string, x: number, y: number) {
  slide.addShape("ellipse", { x: px(x), y: px(y + 12), w: px(22), h: px(22), fill: { color }, line: { color } });
  text(slide, word, x + 30, y, 200, 44, { color, bold: true, fontSize: 30, valign: "middle", margin: 0 });
  if (subtitle) text(slide, subtitle, x + 30 + word.length * 26, y + 16, 520, 22, { fontSize: 9, valign: "bottom" });
}

function summary(slide: Slide, inc: SheetIncident, p: OnePagers, top: number, left: number, width: number, height: number) {
  dashed(slide, left, top, width, height, "64748B", true);
  slide.addShape("rect", { x: px(left + 4), y: px(top - 12), w: px(360), h: px(24), fill: { color: BAND }, line: { color: BAND } });
  text(slide, "1.   RESUMO DO INCIDENTE (do one-pager inicial)", left + 10, top - 12, 350, 24, { color: "FFFFFF", bold: true, fontSize: 10, valign: "middle" });
  const cells: [string, string][] = [
    ["SITE / CBU", inc.unitName.toUpperCase()],
    ["DATA DO EVENTO", fmtDate(inc.occurredAt)],
    ["TIPO DE EVENTO", PAGER_EVENT[inc.type]],
    ["HIPO", inc.hipo ? "SIM" : "NÃO"],
    ["LESÃO", p.initial.injury || "—"],
  ];
  const cw = (width - 20) / 5;
  cells.forEach(([label, value], i) =>
    text(
      slide,
      [
        { text: label, options: { bold: true, fontSize: 10.5, breakLine: true } },
        { text: value, options: { fontSize: 11 } },
      ],
      left + 10 + i * cw,
      top + 16,
      cw - 8,
      52,
    ),
  );
}

type Logos = { wise?: string; danone?: string };

function initialSlide(pptx: PptxGenJS, inc: SheetIncident, p: OnePagers, photos: string[], logos: Logos) {
  const s = pptx.addSlide();
  const i = p.initial;
  const green = "4D9A1F";
  frame(s, "ONE-PAGER DE INCIDENTE INICIAL", 1, logos);
  text(s, "ONE-PAGER INICIAL DE INCIDENTE", 18, 12, 760, 50, { bold: true, fontSize: 26 });
  text(s, [{ text: "ID DO EVENTO NO SPHERA: ", options: { bold: true } }, { text: inc.spheraId ?? "" }], 790, 22, 330, 40, { fontSize: 11 });
  summary(s, inc, p, 86, 10, 1198, 86);

  head(s, "STOP", "F05A1A", "", 12, 186);
  text(s, [{ text: "RELAÇÃO 12 BÁSICOS  ", options: { bold: true } }, { text: inc.basicRef ?? "" }], 330, 196, 400, 28, { fontSize: 11, valign: "middle" });
  dashed(s, 12, 232, 716, 96);
  text(s, i.stop || inc.description, 22, 238, 696, 86, { color: green, fontSize: 12, fit: "shrink" });

  head(s, "THINK", "F5A623", "(potenciais) consequências / fatores influenciadores do incidente", 12, 330);
  dashed(s, 12, 376, 716, 134);
  text(s, numbered(i.think, green, 10), 20, 380, 700, 126, { fit: "shrink" });

  head(s, "ACT", "9BCF53", "Contenção Imediata e Aprendizado Inicial", 12, 512);
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

  // Status da investigação
  text(s, "STATUS ATUAL DA INVESTIGAÇÃO", 746, 546, 460, 22, { bold: true, fontSize: 12 });
  dashed(s, 746, 572, 460, 92);
  const st = [HIPO_STATUS[0], HIPO_STATUS[3], HIPO_STATUS[1], HIPO_STATUS[4], HIPO_STATUS[2]];
  const lines = st.map((x) => `${i.status[x.k] ? checked : box} ${x.label}`);
  lines.push(`${i.reportDue ? checked : box} Relatório previsto: ${i.reportDue ? fmtDate(`${i.reportDue}T12:00:00`) : "__/__/____"}`);
  text(s, lines.filter((_, k) => k % 2 === 0).join("\n"), 756, 578, 220, 82, { fontSize: 10, paraSpaceAfter: 3 });
  text(s, lines.filter((_, k) => k % 2 === 1).join("\n"), 980, 578, 222, 82, { fontSize: 10, paraSpaceAfter: 3 });

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

function finalSlide(pptx: PptxGenJS, inc: SheetIncident, p: OnePagers, logos: Logos) {
  const s = pptx.addSlide();
  const f = p.final;
  const C = { green: "4C9A2A", purple: "7030A0", orange: "F07F17", red: "C00000" };
  frame(s, "ONE-PAGER FINAL DE INCIDENTE", 2, logos);
  text(s, "ONE-PAGER FINAL DE INCIDENTE", 12, 10, 740, 50, { bold: true, fontSize: 25 });
  text(s, [{ text: "SPHERA ID DO EVENTO: ", options: { bold: true } }, { text: inc.spheraId ?? "" }], 760, 22, 340, 40, { fontSize: 11 });
  summary(s, inc, p, 76, 30, 1180, 150);
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
  text(s, QUALITY_CHECKS.map((q) => `${f.quality[q.k] ? checked : box}  ${q.label}`).join("\n"), 574, 262, 600, 160, { fontSize: 11, paraSpaceAfter: 4 });

  // 4. Aprendizados
  tab(4, "APRENDIZADOS-CHAVE E APLICABILIDADE", C.orange, 30, 440, 372);
  dashed(s, 30, 462, 510, 220, C.orange, true);
  text(s, [{ text: "PRINCIPAIS APRENDIZADOS PARA O NEGÓCIO", options: { bold: true, color: C.orange, breakLine: true } }, { text: "O que aprendemos?", options: { fontSize: 8 } }], 40, 470, 255, 48, { fontSize: 9 });
  text(s, numbered(f.learnings, "111827", 9.5), 40, 522, 255, 154, { fit: "shrink" });
  const appl = APPLICABILITY.map((a) => `${f.applicability === a.k ? checked : box} ${a.label}`);
  const pop = POPULATION.map((a) => `${f.population.includes(a.k) ? checked : box} ${a.label}`);
  text(
    s,
    [
      { text: "ISSO PODERIA ACONTECER EM OUTRO LUGAR", options: { bold: true, color: C.orange, breakLine: true } },
      { text: "Selecione a melhor opção", options: { breakLine: true } },
      { text: appl.join("\n"), options: { breakLine: true } },
      { text: "POPULAÇÃO IMPACTADA", options: { bold: true, color: C.orange, breakLine: true } },
      { text: pop.join("\n") },
    ],
    300,
    470,
    235,
    208,
    { fontSize: 8.5, paraSpaceAfter: 2 },
  );

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
  const [photos, wise, danone] = await Promise.all([
    Promise.all(photoUrls.map(toDataUrl)).then((l) => l.filter((x): x is string => !!x)),
    toDataUrl("/brand/wise-logo.png"),
    toDataUrl("/brand/danone.png"),
  ]);
  const logos = { wise, danone };
  for (const page of pages) {
    if (page.kind === "initial") initialSlide(pptx, inc, pagers, photos, logos);
    else finalSlide(pptx, inc, pagers, logos);
    if (page.image) {
      const s = pptx.addSlide();
      s.addImage({ data: page.image, x: 0, y: 0, w: px(1280), h: px(720) });
      s.addNotes("Imagem fiel da folha do sistema. O slide anterior tem o mesmo conteúdo editável.");
    }
  }
  await pptx.writeFile({ fileName });
}

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Film,
  Globe2,
  ImageIcon,
  Link2,
  Loader2,
  Lock,
  Maximize2,
  Megaphone,
  Pencil,
  Plus,
  Presentation,
  Search,
  Trash2,
  Upload,
  Users,
  MonitorPlay as Youtube,
} from "lucide-react";
import { toast } from "sonner";
import type { SafetyContentDTO } from "@/server/safety-content-queries";
import { deleteSafetyContent, saveSafetyContent } from "@/server/safety-contents";
import { CONTENT_CATEGORIES, viewerType, youtubeId } from "@/lib/safety-content";
import { uploadFile } from "@/lib/upload-client";
import { fileHref } from "@/lib/file-url";
import { cn, fmtDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { PdfSlides } from "./pdf-slides";

type Item = SafetyContentDTO["items"][number];
type NewItem = Omit<Item, "id"> & { id?: string };

const CATEGORY_STYLE: Record<string, string> = {
  DDS: "bg-brand-700 text-white",
  "Safety Alert": "bg-critico text-white",
  Campanha: "bg-accent-500 text-white",
  Treinamento: "bg-wgreen-600 text-white",
  Procedimento: "bg-slate-700 text-white",
  Outro: "bg-slate-500 text-white",
};

const CATEGORY_GRADIENT: Record<string, string> = {
  DDS: "from-brand-700 to-brand-900",
  "Safety Alert": "from-critico to-accent-700",
  Campanha: "from-accent-500 to-accent-700",
  Treinamento: "from-wgreen-500 to-wgreen-700",
  Procedimento: "from-slate-600 to-slate-800",
  Outro: "from-slate-500 to-slate-700",
};

const UPLOAD_ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf,.mp4,.ppt,.pptx";

function kindIcon(it: { kind: string; mimeType: string | null; name: string }) {
  const v = viewerType(it);
  return v === "youtube" ? Youtube : v === "video" ? Film : v === "image" ? ImageIcon : v === "pdf" ? FileText : v === "link" ? Link2 : Presentation;
}

function fmtSize(n: number | null) {
  if (!n) return "";
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.round(n / 1024)} KB`;
}

/** Miniatura do card: primeira imagem, capa do YouTube ou quadro do vídeo; senão, um fundo da categoria. */
function Cover({ content }: { content: SafetyContentDTO }) {
  const [failed, setFailed] = useState(false);
  const img = content.items.find((i) => viewerType(i) === "image");
  const yt = content.items.find((i) => i.kind === "YOUTUBE");
  const video = content.items.find((i) => viewerType(i) === "video");
  const Icon = content.items[0] ? kindIcon(content.items[0]) : Megaphone;
  if (failed) return <CoverFallback content={content} Icon={Icon} />;
  if (img)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={fileHref(img.url)} alt="" onError={() => setFailed(true)} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />;
  if (yt)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`https://i.ytimg.com/vi/${youtubeId(yt.url)}/hqdefault.jpg`} alt="" onError={() => setFailed(true)} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />;
  if (video) return <video src={`${fileHref(video.url)}#t=0.5`} preload="metadata" muted onError={() => setFailed(true)} className="size-full object-cover" />;
  return <CoverFallback content={content} Icon={Icon} />;
}

function CoverFallback({ content, Icon }: { content: SafetyContentDTO; Icon: typeof Megaphone }) {
  return (
    <div className={cn("grid size-full place-items-center bg-gradient-to-br text-white/90", CATEGORY_GRADIENT[content.category] ?? CATEGORY_GRADIENT.Outro)}>
      <Icon className="size-12 opacity-80" />
    </div>
  );
}

export function SafetyContentsView({
  unit,
  units,
  contents,
  canManage,
  blobEnabled,
}: {
  unit: { id: string; name: string };
  units: { id: string; name: string }[];
  contents: SafetyContentDTO[];
  canManage: boolean;
  blobEnabled: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [open, setOpen] = useState<SafetyContentDTO | null>(null);
  const [form, setForm] = useState<SafetyContentDTO | "new" | null>(null);
  const [, start] = useTransition();

  const rows = contents.filter((c) => {
    const t = q.trim().toLowerCase();
    return (!cat || c.category === cat) && (!t || `${c.title} ${c.description} ${c.items.map((i) => i.name).join(" ")}`.toLowerCase().includes(t));
  });
  const cats = CONTENT_CATEGORIES.filter((c) => contents.some((x) => x.category === c));

  const remove = (c: SafetyContentDTO) =>
    confirm(`Excluir "${c.title}" e todos os seus arquivos?`) &&
    start(async () => {
      const res = await deleteSafetyContent(c.id);
      if (res.ok) {
        toast.success("Conteúdo excluído");
        setOpen(null);
        router.refresh();
      } else toast.error(res.error);
    });

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Segurança · Contatos de Segurança</p>
          <h1 className="mt-1.5 text-[26px] font-extrabold leading-tight text-brand-950">Contatos de Segurança</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            DDS, Safety Alerts, campanhas e treinamentos para apresentar às equipes — apresentações, vídeos, fotos e links em um só lugar.
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => setForm("new")}>
            <Plus /> Adicionar
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" placeholder="Buscar conteúdo…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["", ...cats].map((c) => (
            <button
              key={c || "todos"}
              type="button"
              onClick={() => setCat(c)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                cat === c ? "bg-brand-700 text-white shadow-soft" : "bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-800",
              )}
            >
              {c || "Todos"}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 sm:ml-auto">
          {rows.length} conteúdo(s) · {unit.name}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <Megaphone className="mx-auto size-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-700">Nenhum conteúdo por aqui ainda</p>
          <p className="mt-1 text-sm text-slate-500">
            {canManage ? "Clique em Adicionar para publicar o primeiro DDS, Safety Alert ou campanha." : "Os conteúdos publicados para este CD aparecem aqui."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {rows.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setOpen(c)}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-soft transition-all hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift"
            >
              <div className="relative aspect-video overflow-hidden bg-slate-100">
                <Cover content={c} />
                <span className={cn("absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[11px] font-bold shadow", CATEGORY_STYLE[c.category] ?? CATEGORY_STYLE.Outro)}>
                  {c.category}
                </span>
                {c.visibility === "PRIVATE" ? (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-slate-900/75 px-2 py-0.5 text-[10px] font-semibold text-white">
                    <Lock className="size-3" /> Só eu
                  </span>
                ) : null}
                <span className="absolute inset-0 grid place-items-center bg-brand-950/0 opacity-0 transition-all group-hover:bg-brand-950/35 group-hover:opacity-100">
                  <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-brand-800 shadow">Abrir</span>
                </span>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="line-clamp-2 font-display text-[15px] font-bold leading-snug text-brand-950">{c.title}</h3>
                {c.description ? <p className="mt-1 line-clamp-2 text-xs text-slate-500">{c.description}</p> : null}
                <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    {[...new Set(c.items.map((i) => kindIcon(i)))].slice(0, 4).map((I, idx) => (
                      <I key={idx} className="size-3.5 text-brand-600" />
                    ))}
                    {c.items.length} item(ns)
                  </span>
                  <span>{fmtDate(c.createdAt)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {open ? (
        <ContentViewer
          content={open}
          canManage={canManage}
          onClose={() => setOpen(null)}
          onEdit={() => {
            setForm(open);
            setOpen(null);
          }}
          onDelete={() => remove(open)}
        />
      ) : null}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent
          className="max-w-3xl"
          title={form === "new" ? "Adicionar contato de segurança" : "Editar contato de segurança"}
          description="Monte o pacote com apresentações (PDF), vídeos, fotos e links, e escolha quem pode ver."
        >
          {form ? (
            <ContentForm
              initial={form === "new" ? null : form}
              unit={unit}
              units={units}
              blobEnabled={blobEnabled}
              onDone={() => {
                setForm(null);
                router.refresh();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Visualizador
// ---------------------------------------------------------------------------

function ContentViewer({
  content,
  canManage,
  onClose,
  onEdit,
  onDelete,
}: {
  content: SafetyContentDTO;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const item = content.items[idx];
  const go = (d: number) => setIdx((i) => (i + d + content.items.length) % content.items.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      // Em PDF as setas passam os slides (tratado pelo PdfSlides).
      if (item && viewerType(item) === "pdf") return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const fullscreen = () => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl p-4 sm:p-6" title={content.title} description={content.description || undefined}>
        <div className="-mt-2 mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", CATEGORY_STYLE[content.category] ?? CATEGORY_STYLE.Outro)}>{content.category}</span>
          <span>{fmtDate(content.createdAt)}</span>
          {content.createdBy ? <span>· {content.createdBy}</span> : null}
          <span className="inline-flex items-center gap-1">
            · {content.visibility === "PRIVATE" ? <><Lock className="size-3" /> Somente eu</> : <><Users className="size-3" /> {content.units.map((u) => u.name).join(", ")}</>}
          </span>
          {canManage ? (
            <span className="ml-auto flex gap-1">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil /> Editar
              </Button>
              <Button variant="ghost" size="sm" className="text-critico hover:bg-critico-bg hover:text-critico" onClick={onDelete}>
                <Trash2 /> Excluir
              </Button>
            </span>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
          <div>
            <div ref={stageRef} className="group/stage relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-slate-950 [&:fullscreen]:aspect-auto [&:fullscreen]:rounded-none">
              {item ? <Stage key={item.id} item={item} /> : null}
              {content.items.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    className="absolute left-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white opacity-0 backdrop-blur transition-opacity hover:bg-white/30 group-hover/stage:opacity-100"
                    aria-label="Anterior"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white opacity-0 backdrop-blur transition-opacity hover:bg-white/30 group-hover/stage:opacity-100"
                    aria-label="Próximo"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">
                {idx + 1}/{content.items.length} · {item?.name}
              </p>
              {item && item.kind === "FILE" ? (
                <Button variant="outline" size="sm" asChild>
                  <a href={fileHref(item.url)} target="_blank" rel="noreferrer" download={item.name}>
                    <Download /> Baixar
                  </a>
                </Button>
              ) : null}
              <Button size="sm" onClick={fullscreen}>
                <Maximize2 /> Tela cheia
              </Button>
            </div>
          </div>
          <ul className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin lg:max-h-[60vh] lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden">
            {content.items.map((it, i) => {
              const I = kindIcon(it);
              return (
                <li key={it.id} className="shrink-0 lg:shrink">
                  <button
                    type="button"
                    onClick={() => setIdx(i)}
                    className={cn(
                      "flex w-48 items-center gap-2.5 rounded-xl border p-2 text-left transition-colors lg:w-full",
                      i === idx ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500" : "border-slate-200 hover:border-brand-200 hover:bg-slate-50",
                    )}
                  >
                    <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", i === idx ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-500")}>
                      <I className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-slate-800">{it.name}</span>
                      <span className="block text-[10px] text-slate-500">
                        {it.kind === "YOUTUBE" ? "YouTube" : it.kind === "LINK" ? "Link" : fmtSize(it.size) || "Arquivo"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stage({ item }: { item: Item }) {
  const type = viewerType(item);
  const src = item.kind === "FILE" ? fileHref(item.url) : item.url;
  if (type === "image")
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={item.name} className="max-h-full max-w-full object-contain" />;
  if (type === "video") return <video src={src} controls playsInline className="size-full bg-black" />;
  if (type === "youtube")
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${youtubeId(item.url)}?rel=0`}
        title={item.name}
        className="size-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
      />
    );
  if (type === "pdf") return <PdfSlides src={src} />;
  const isPpt = /\.pptx?$/i.test(item.name);
  return (
    <div className="max-w-md p-6 text-center text-white">
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-white/10">
        {type === "link" ? <Globe2 className="size-8" /> : <Presentation className="size-8" />}
      </span>
      <p className="mt-4 font-semibold">{item.name}</p>
      <p className="mt-1 text-sm text-white/60">
        {type === "link"
          ? "Este site abre em uma nova aba."
          : isPpt
            ? "Apresentações do PowerPoint não rodam no navegador. Baixe o arquivo ou suba uma versão em PDF para apresentar aqui."
            : "Este tipo de arquivo não tem visualização no navegador."}
      </p>
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50"
      >
        {type === "link" ? <ExternalLink className="size-4" /> : <Download className="size-4" />} {type === "link" ? "Abrir link" : "Baixar"}
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formulário
// ---------------------------------------------------------------------------

function ContentForm({
  initial,
  unit,
  units,
  blobEnabled,
  onDone,
}: {
  initial: SafetyContentDTO | null;
  unit: { id: string; name: string };
  units: { id: string; name: string }[];
  blobEnabled: boolean;
  onDone: () => void;
}) {
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(0);
  const [f, setF] = useState({
    title: initial?.title ?? "",
    category: initial?.category ?? "DDS",
    description: initial?.description ?? "",
    visibility: initial?.visibility ?? "UNITS",
    unitIds: initial ? initial.units.map((u) => u.id) : [unit.id],
  });
  const [items, setItems] = useState<NewItem[]>(initial?.items ?? []);
  const [yt, setYt] = useState("");
  const [link, setLink] = useState({ url: "", name: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files);
    setUploading((n) => n + list.length);
    for (const file of list) {
      try {
        const url = await uploadFile(file, `contatos/${unit.id}`, blobEnabled);
        setItems((prev) => [...prev, { kind: "FILE", name: file.name, url, mimeType: file.type || null, size: file.size }]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `Falha ao enviar ${file.name}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const addYoutube = () => {
    const id = youtubeId(yt);
    if (!id) return toast.error("Cole um link válido do YouTube.");
    setItems((p) => [...p, { kind: "YOUTUBE", name: `Vídeo do YouTube (${id})`, url: yt.trim(), mimeType: null, size: null }]);
    setYt("");
  };

  const addLink = () => {
    if (!/^https?:\/\//.test(link.url.trim())) return toast.error("O link precisa começar com http:// ou https://");
    setItems((p) => [...p, { kind: "LINK", name: link.name.trim() || link.url.trim(), url: link.url.trim(), mimeType: null, size: null }]);
    setLink({ url: "", name: "" });
  };

  const move = (i: number, d: number) =>
    setItems((p) => {
      const n = [...p];
      const j = i + d;
      if (j < 0 || j >= n.length) return p;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveSafetyContent({
            id: initial?.id,
            ...f,
            items: items.map(({ kind, name, url, mimeType, size }) => ({ kind: kind as "FILE" | "YOUTUBE" | "LINK", name, url, mimeType, size })),
          });
          if (res.ok) {
            toast.success("Contato de segurança salvo");
            onDone();
          } else toast.error(res.error);
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <Field label="Título">
          <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required placeholder="Ex.: DDS — Ver e ser visto nas docas" />
        </Field>
        <Field label="Categoria">
          <Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {CONTENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Descrição (opcional)">
        <Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Mensagem principal, público, duração…" />
      </Field>

      {/* Conteúdo */}
      <div className="rounded-xl border border-slate-200 p-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-800">Conteúdo do card</p>
        <div className="grid gap-2 md:grid-cols-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 p-3 text-center text-xs text-slate-500 hover:border-brand-300 hover:bg-brand-50/40"
          >
            {uploading ? <Loader2 className="size-5 animate-spin text-brand-600" /> : <Upload className="size-5 text-brand-600" />}
            <span className="font-semibold text-slate-700">{uploading ? `Enviando ${uploading}…` : "Enviar arquivos"}</span>
            <span>PDF, fotos, MP4 (até 100 MB) ou PPT</span>
          </button>
          <input ref={fileRef} type="file" multiple accept={UPLOAD_ACCEPT} className="hidden" onChange={(e) => upload(e.target.files)} />
          <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 p-2.5">
            <span className="flex items-center gap-1 text-xs font-semibold text-slate-700">
              <Youtube className="size-4 text-red-600" /> Vídeo do YouTube
            </span>
            <Input value={yt} onChange={(e) => setYt(e.target.value)} placeholder="https://youtu.be/…" className="h-8 text-xs" />
            <Button type="button" size="sm" variant="outline" onClick={addYoutube} disabled={!yt.trim()}>
              <Plus /> Adicionar vídeo
            </Button>
          </div>
          <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 p-2.5">
            <span className="flex items-center gap-1 text-xs font-semibold text-slate-700">
              <Link2 className="size-4 text-brand-600" /> Outro link
            </span>
            <Input value={link.url} onChange={(e) => setLink({ ...link, url: e.target.value })} placeholder="https://…" className="h-8 text-xs" />
            <div className="flex gap-1.5">
              <Input value={link.name} onChange={(e) => setLink({ ...link, name: e.target.value })} placeholder="Nome (opcional)" className="h-8 text-xs" />
              <Button type="button" size="sm" variant="outline" onClick={addLink} disabled={!link.url.trim()}>
                <Plus />
              </Button>
            </div>
          </div>
        </div>
        <ul className="mt-3 space-y-1.5">
          {items.length === 0 ? <li className="text-xs text-slate-400">Nenhum item adicionado.</li> : null}
          {items.map((it, i) => {
            const I = kindIcon(it);
            const ppt = /\.pptx?$/i.test(it.name);
            return (
              <li key={`${it.url}-${i}`} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-2 py-1.5">
                <I className="size-4 shrink-0 text-brand-600" />
                <Input
                  value={it.name}
                  onChange={(e) => setItems((p) => p.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                  className="h-7 flex-1 border-transparent bg-transparent px-1 text-xs shadow-none"
                />
                {ppt ? <span className="hidden rounded bg-atencao-bg px-1.5 py-0.5 text-[10px] font-semibold text-atencao-ink sm:inline">só download — prefira PDF</span> : null}
                <span className="hidden text-[10px] text-slate-400 sm:inline">{fmtSize(it.size)}</span>
                <button type="button" className="rounded p-1 text-slate-400 hover:bg-white" onClick={() => move(i, -1)} title="Subir">
                  <ArrowUp className="size-3.5" />
                </button>
                <button type="button" className="rounded p-1 text-slate-400 hover:bg-white" onClick={() => move(i, 1)} title="Descer">
                  <ArrowDown className="size-3.5" />
                </button>
                <button type="button" className="rounded p-1 text-slate-400 hover:bg-critico-bg hover:text-critico" onClick={() => setItems((p) => p.filter((_, j) => j !== i))} title="Remover">
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Visibilidade */}
      <div className="rounded-xl border border-slate-200 p-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-800">Quem pode ver</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              { v: "UNITS", icon: Users, title: "CDs selecionados", text: "Visível para os usuários dos CDs marcados abaixo." },
              { v: "PRIVATE", icon: Lock, title: "Somente eu", text: "Fica só para você (rascunho ou uso pessoal)." },
            ] as const
          ).map((o) => (
            <label
              key={o.v}
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-xl border p-3",
                f.visibility === o.v ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-500" : "border-slate-200 hover:border-brand-200",
              )}
            >
              <input type="radio" className="mt-1" checked={f.visibility === o.v} onChange={() => setF({ ...f, visibility: o.v })} />
              <span>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                  <o.icon className="size-4 text-brand-600" /> {o.title}
                </span>
                <span className="text-xs text-slate-500">{o.text}</span>
              </span>
            </label>
          ))}
        </div>
        {f.visibility === "UNITS" ? (
          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">CDs que podem ver</span>
              <span className="flex gap-2 text-[11px]">
                <button type="button" className="font-semibold text-brand-700 hover:underline" onClick={() => setF({ ...f, unitIds: units.map((u) => u.id) })}>
                  Todos
                </button>
                <button type="button" className="font-semibold text-slate-500 hover:underline" onClick={() => setF({ ...f, unitIds: [] })}>
                  Nenhum
                </button>
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {units.map((u) => {
                const on = f.unitIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setF({ ...f, unitIds: on ? f.unitIds.filter((x) => x !== u.id) : [...f.unitIds, u.id] })}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                      on ? "border-brand-600 bg-brand-700 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-brand-300",
                    )}
                  >
                    {u.name}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button disabled={pending || uploading > 0}>{pending ? <Loader2 className="animate-spin" /> : null} Salvar</Button>
      </div>
    </form>
  );
}

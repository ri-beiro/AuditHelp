"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";

/**
 * Apresenta um PDF página a página (como slides) com o pdf.js — funciona igual em
 * computador, Android e iPhone, ao contrário do visualizador de PDF nativo do navegador.
 */
export function PdfSlides({ src }: { src: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        const d = await pdfjs.getDocument({ url: src, withCredentials: true }).promise;
        if (!cancelled) setDoc(d);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!doc || !size.w || !canvasRef.current) return;
    let task: { cancel: () => void } | null = null;
    (async () => {
      const p = await doc.getPage(page);
      const base = p.getViewport({ scale: 1 });
      const fit = Math.min(size.w / base.width, size.h / base.height);
      const ratio = window.devicePixelRatio || 1;
      const vp = p.getViewport({ scale: fit * ratio });
      const canvas = canvasRef.current!;
      canvas.width = vp.width;
      canvas.height = vp.height;
      canvas.style.width = `${vp.width / ratio}px`;
      canvas.style.height = `${vp.height / ratio}px`;
      const t = p.render({ canvasContext: canvas.getContext("2d")!, viewport: vp });
      task = t;
      await t.promise.catch(() => undefined);
    })();
    return () => task?.cancel();
  }, [doc, page, size]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!doc) return;
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") setPage((p) => Math.min(doc.numPages, p + 1));
      if (e.key === "ArrowLeft" || e.key === "PageUp") setPage((p) => Math.max(1, p - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doc]);

  const n = doc?.numPages ?? 0;
  return (
    <div className="relative flex size-full flex-col bg-slate-900">
      <div ref={boxRef} className="relative flex min-h-0 flex-1 items-center justify-center p-2">
        {error ? (
          <p className="text-sm text-white/70">Não foi possível abrir o PDF. Use o botão Baixar.</p>
        ) : !doc ? (
          <Loader2 className="size-8 animate-spin text-white/70" />
        ) : null}
        <canvas ref={canvasRef} className={doc ? "rounded shadow-2xl" : "hidden"} />
      </div>
      {n > 1 ? (
        <div className="flex items-center justify-center gap-3 bg-slate-950/80 py-1.5 text-xs font-semibold text-white">
          <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-full p-1 hover:bg-white/15 disabled:opacity-30" aria-label="Página anterior">
            <ChevronLeft className="size-4" />
          </button>
          <span className="tabular-nums">
            Slide {page} de {n}
          </span>
          <button type="button" onClick={() => setPage((p) => Math.min(n, p + 1))} disabled={page === n} className="rounded-full p-1 hover:bg-white/15 disabled:opacity-30" aria-label="Próxima página">
            <ChevronRight className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

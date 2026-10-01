"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Copy, MessageCircleQuestion } from "lucide-react";
import { toast } from "sonner";
import { INTERVIEW_GUIDE } from "@/lib/interview-guide";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Roteiro "O que perguntar?" do treinamento de auditor; o progresso fica salvo só neste navegador. */
export function InterviewPanel({ elementNumber, storageKey }: { elementNumber: number; storageKey: string }) {
  const questions = INTERVIEW_GUIDE[elementNumber] ?? [];
  const [done, setDone] = useState<number[]>([]);
  const [q, setQ] = useState("");
  const key = `wise-roteiro:${storageKey}`;

  useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem(key) ?? "[]"));
    } catch {
      setDone([]);
    }
  }, [key]);

  const toggle = (i: number) => {
    const next = done.includes(i) ? done.filter((x) => x !== i) : [...done, i];
    setDone(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* armazenamento indisponível */
    }
  };

  const list = questions.map((text, i) => ({ text, i })).filter((x) => !q || x.text.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid size-10 place-items-center rounded-lg bg-brand-50 text-brand-700">
          <MessageCircleQuestion className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-slate-800">Roteiro do auditor · O que perguntar?</h4>
          <p className="text-xs text-slate-500">
            Perguntas de suporte do Treinamento de Auditor Júnior WISE². Faça perguntas abertas e fechadas, a todos os
            níveis, e confirme as respostas com evidências em campo. {done.length}/{questions.length} feitas.
          </p>
        </div>
        <Input className="w-56" placeholder="Filtrar perguntas…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            navigator.clipboard?.writeText(questions.map((x, i) => `${i + 1}. ${x}`).join("\n"));
            toast.success("Roteiro copiado");
          }}
        >
          <Copy /> Copiar
        </Button>
      </div>
      <ol className="space-y-1.5">
        {list.map(({ text, i }) => {
          const ok = done.includes(i);
          return (
            <li key={i}>
              <button
                onClick={() => toggle(i)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border bg-white px-3 py-2.5 text-left text-sm transition",
                  ok ? "border-conforme/30 bg-conforme-bg/50 text-slate-500" : "border-slate-200 text-slate-800 hover:border-brand-500/40",
                )}
              >
                {ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-conforme" /> : <Circle className="mt-0.5 size-4 shrink-0 text-slate-300" />}
                <span className="w-6 shrink-0 text-xs font-semibold text-slate-400">{i + 1}.</span>
                <span className={cn(ok && "line-through decoration-slate-300")}>{text}</span>
              </button>
            </li>
          );
        })}
      </ol>
      {questions.length === 0 ? <p className="text-sm text-slate-500">Sem roteiro para este elemento.</p> : null}
    </div>
  );
}

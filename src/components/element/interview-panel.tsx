"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, ChevronDown, Circle, Copy, Loader2, MessageCircleQuestion, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveInterviewAnswer } from "@/server/actions";
import type { ElementDetail } from "@/server/queries";
import { INTERVIEW_GUIDE } from "@/lib/interview-guide";
import { cn, fmtDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

type Answer = ElementDetail["interview"][number];

/**
 * Roteiro "O que perguntar?" do treinamento de auditor. Cada pergunta tem um campo de resposta;
 * o que for escrito fica salvo na avaliação e aparece no Parecer e no Relatório de Fechamento.
 */
export function InterviewPanel({
  detail,
  canEdit,
  onSaved,
}: {
  detail: ElementDetail;
  canEdit: boolean;
  onSaved: (d: ElementDetail) => void;
}) {
  const questions = INTERVIEW_GUIDE[detail.element.number] ?? [];
  const answers = new Map(detail.interview.map((a) => [a.index, a]));
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [onlyPending, setOnlyPending] = useState(false);

  const list = questions
    .map((text, i) => ({ text, i }))
    .filter((x) => (!q || x.text.toLowerCase().includes(q.toLowerCase())) && (!onlyPending || !answers.has(x.i)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid size-10 place-items-center rounded-lg bg-brand-50 text-brand-700">
          <MessageCircleQuestion className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-slate-800">Roteiro do auditor · O que perguntar?</h4>
          <p className="text-xs text-slate-500">
            Clique na pergunta para registrar a resposta. As respostas entram automaticamente no <b>Parecer</b> e no Relatório de
            Fechamento. {answers.size}/{questions.length} respondidas.
          </p>
        </div>
        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} /> Só sem resposta
        </label>
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
        {list.map(({ text, i }) => (
          <QuestionRow
            key={i}
            index={i}
            text={text}
            answer={answers.get(i)}
            open={open === i}
            onToggle={() => setOpen(open === i ? null : i)}
            canEdit={canEdit}
            detail={detail}
            onSaved={(d) => {
              onSaved(d);
              const next = list.find((x) => x.i > i && !d.interview.some((a) => a.index === x.i));
              setOpen(next ? next.i : null);
            }}
          />
        ))}
      </ol>
      {questions.length === 0 ? <p className="text-sm text-slate-500">Sem roteiro para este elemento.</p> : null}
    </div>
  );
}

function QuestionRow({
  index,
  text,
  answer,
  open,
  onToggle,
  canEdit,
  detail,
  onSaved,
}: {
  index: number;
  text: string;
  answer?: Answer;
  open: boolean;
  onToggle: () => void;
  canEdit: boolean;
  detail: ElementDetail;
  onSaved: (d: ElementDetail) => void;
}) {
  const [value, setValue] = useState(answer?.answer ?? "");
  const [who, setWho] = useState(answer?.interviewee ?? "");
  const [pending, start] = useTransition();
  const dirty = value !== (answer?.answer ?? "") || who !== (answer?.interviewee ?? "");

  const save = (clear = false) =>
    start(async () => {
      const res = await saveInterviewAnswer({
        assessmentId: detail.assessmentId,
        elementId: detail.element.id,
        questionIndex: index,
        answer: clear ? "" : value,
        interviewee: clear ? "" : who,
      });
      if (res.ok && res.data) {
        if (clear) {
          setValue("");
          setWho("");
        }
        onSaved(res.data);
        toast.success(clear ? "Resposta removida" : "Resposta salva no parecer");
      } else if (!res.ok) toast.error(res.error);
    });

  return (
    <li className={cn("rounded-lg border bg-white transition", answer ? "border-conforme/30" : "border-slate-200", open && "ring-1 ring-brand-500/40")}>
      <button type="button" onClick={onToggle} className="flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm" aria-expanded={open}>
        {answer ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-conforme" /> : <Circle className="mt-0.5 size-4 shrink-0 text-slate-300" />}
        <span className="w-6 shrink-0 text-xs font-semibold text-slate-400">{index + 1}.</span>
        <span className="min-w-0 flex-1">
          <span className="block text-slate-800">{text}</span>
          {answer && !open ? (
            <span className="mt-1 block border-l-2 border-conforme/40 pl-2 text-[13px] italic text-slate-600">
              “{answer.answer}”{answer.interviewee ? <span className="not-italic text-slate-400"> — {answer.interviewee}</span> : null}
            </span>
          ) : null}
        </span>
        <ChevronDown className={cn("mt-0.5 size-4 shrink-0 text-slate-400 transition-transform", !open && "-rotate-90")} />
      </button>
      {open ? (
        <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 px-3 py-3 sm:pl-12">
          <Textarea
            autoFocus
            rows={3}
            value={value}
            disabled={!canEdit}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && dirty) save();
            }}
            placeholder="Resposta do entrevistado / o que foi observado…"
            className="bg-white"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={who}
              disabled={!canEdit}
              onChange={(e) => setWho(e.target.value)}
              placeholder="Entrevistado (nome / função) — opcional"
              className="h-8 max-w-xs bg-white text-xs"
            />
            {answer ? <span className="text-[11px] text-slate-400">Salvo em {fmtDateTime(answer.updatedAt)}</span> : null}
            {canEdit ? (
              <span className="ml-auto flex gap-1.5">
                {answer ? (
                  <Button type="button" variant="ghost" size="sm" className="text-critico hover:bg-critico-bg hover:text-critico" disabled={pending} onClick={() => save(true)}>
                    <Trash2 /> Limpar
                  </Button>
                ) : null}
                <Button type="button" size="sm" disabled={!dirty || !value.trim() || pending} onClick={() => save()}>
                  {pending ? <Loader2 className="animate-spin" /> : <Save />} Salvar resposta
                </Button>
              </span>
            ) : null}
          </div>
          {canEdit ? <p className="text-[11px] text-slate-400">Ctrl + Enter salva e abre a próxima pergunta sem resposta.</p> : null}
        </div>
      ) : null}
    </li>
  );
}

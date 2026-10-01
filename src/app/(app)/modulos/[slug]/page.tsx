import { notFound } from "next/navigation";
import { Rocket } from "lucide-react";
import { MODULES } from "@/lib/modules";

const ROADMAP: Record<string, string[]> = {
  auditorias: [
    "Programação anual de auditorias WISE e dos 12 Básicos por unidade",
    "Execução em campo pelo celular, reaproveitando as matrizes deste sistema",
    "Relatório de auditoria com destaques, citações coletadas e recomendações",
  ],
  mudancas: [
    "Registro de mudanças (pessoas, equipamentos, processos, layout)",
    "Avaliação de risco e checklist de pré-partida",
    "Vínculo com o elemento 3 (Altos Padrões) e planos de ação",
  ],
  incidentes: [
    "Registro de incidentes e quase acidentes com classificação HIPO",
    "Safety Alert (Stop · Think · Act) e análise de causa raiz",
    "Integração com o elemento 11 e com o Básico relacionado",
  ],
  excelencia: [
    "Painel consolidado de todas as unidades",
    "Benchmark entre CDs e ranking de maturidade",
    "Metas SQCDME e indicadores proativos/reativos",
  ],
};

export default async function ModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mod = MODULES.find((m) => m.slug === slug && m.status === "em-breve");
  if (!mod) notFound();
  return (
    <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-700">
        <Rocket className="size-6" />
      </div>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">{mod.label}</h1>
      <p className="mt-1 text-sm text-slate-500">
        Módulo previsto na arquitetura da plataforma. Ele usará as mesmas unidades, usuários, evidências e planos de
        ação já existentes.
      </p>
      <ul className="mt-6 space-y-2">
        {(ROADMAP[slug] ?? []).map((item) => (
          <li key={item} className="flex gap-2 text-sm text-slate-700">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-500" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

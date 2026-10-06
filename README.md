# WISE² Excelência — Gestão de Segurança

Plataforma web para gestão dos **13 Elementos WISE** (cultura e gestão, curva de Bradley) e dos
**12 Básicos de Segurança dos CDs**, com matrizes interativas, evidências, planos de ação 5W2H e
indicadores. Estrutura pronta para receber os módulos de Auditorias, Gestão de Mudanças,
Investigação de Incidentes e Excelência Operacional.

## Stack

| Camada | Tecnologia |
|---|---|
| Front-end | Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · componentes no padrão shadcn/ui (Radix) · Recharts |
| Back-end | Server Actions + Route Handlers do Next.js |
| Banco | PostgreSQL via Prisma (Neon, Supabase ou Vercel Postgres) |
| Arquivos | Vercel Blob (upload direto do navegador, até 25 MB) |
| Login | Auth.js (e-mail e senha), perfis Administrador / Auditor / Responsável, multiunidade |

## Funcionalidades

- **Dashboard em cards**: status (não iniciado / em andamento / concluído), nota ou %,
  cor por situação (vermelho = crítico, amarelo = atenção, verde = conforme), responsável,
  evidências e ações pendentes. Os filtros são por pilar, status, situação, responsável e texto.
- **Painel lateral do elemento** (sem sair do dashboard): descrição, objetivo, responsável,
  status e última atualização. Tem as abas *Matriz*, *Evidências*, *Planos de ação* e
  *Parecer* (avaliação e recomendações).
- **Matriz WISE**: níveis de 1 a 5 com as afirmações Atividade → Qualidade → Impacto e notas 0/1/2.
  A nota é calculada com a mesma fórmula da planilha (soma dos % dos níveis, arredondada em quartos),
  com alerta da regra dos 75% e o estágio de Bradley. O total WISE vai até 65 pontos.
- **Checklist dos 12 Básicos**: 183 requisitos com nível de risco e os critérios
  Básico/Parcial/Significativo. A conformidade usa B = 0, P = 0,25, S = 0,75, C = 1 e N/A.
  Se algum item de risco 1 estiver em "Básico", o básico fica limitado a 50%. Também há o score dos itens de risco nível 1.
- **Evidências**: fotos, PDFs, planilhas e documentos (upload), além de links, vinculados ao
  elemento ou a um requisito. A biblioteca tem filtros por elemento, tipo e data.
- **Planos de ação 5W2H**: criação direta a partir de um desvio da matriz, com prioridade, status,
  vencimento e controle de atraso. Há filtros por elemento, pilar, status, responsável, prioridade e data, e exportação CSV.
- **Indicadores**: KPIs, radar por elemento, barras de pontuação, evolução mensal
  (fotografia automática a cada avaliação), status por pilar e tabela de dados.
- **Classificação oficial A/B/C/D** (Treinamento Auditor Júnior, slide 129). Cultura (0–65): A ≥ 48,75 · B ≥ 32,5 ·
  C ≥ 16,25 · D. Compliance: A ≥ 80% · B ≥ 65% · C ≥ 40% · D. A classe do site é a pior entre as duas.
- **Roteiro do auditor**: 251 perguntas "O que perguntar?" por elemento (slides 132–148), na aba do card.
- **Relatório de fechamento** imprimível em PDF: formato, destaques, citações, pontos fortes e oportunidades por
  grupo (Liderança 1–4 · Organização 5–8 · Operação 9–13), compliance dos 12 Básicos, classificação, pareceres e
  pós-auditoria.
- **ID Sphera** nos planos de ação.
- **Auditorias de contratadas** com checklists de **Portaria** (39 itens) e **Limpeza** (43 itens), montados a
  partir do Elemento 13, do Básico 11, dos Básicos aplicáveis, das Regras de Ouro e do Safety Alert de Poços.
  Cada item permite foto ou anexo, observação e plano de ação para a não conformidade. Itens críticos não conformes
  limitam a nota a 50%, e o resultado recebe classe A–D. Os checklists ficam em `src/lib/audit-templates.ts`.
- **Investigação de incidentes** (`/incidentes`): reporte manual ou importação/exportação em Excel (modelo em
  `/api/incidentes/excel?modelo=1`), lista por criticidade (HIPO, FAT, LTA, NLTA, FAC, Incidente, Near Miss,
  Condição insegura, Observação), linha do tempo mensal e agenda. Cada ocorrência segue o fluxo
  Reporte → Investigação (agenda, participantes, ata) → Plano de Ação (as ações são as mesmas da aba Planos de Ação)
  → Lições Aprendidas (com aprovação) → Encerramento, com progresso de 0 a 100%.
- **Lições aprendidas** (`/incidentes/licoes`): banco pesquisável com as lições aprovadas.
- **Indicadores de segurança** (Indicadores → Segurança) e faixa no Dashboard: pirâmide de Heinrich/Bird clicável
  com HIPO em destaque, **Dias sem acidentes com afastamento** (só LTA zera o contador; NLTA e FAC não) com recorde e histórico,
  ocorrências por mês e por área. A data inicial da contagem é definida por unidade em Administração.
- **Histórico de auditorias** (`/auditorias/historico`): as auditorias de contratadas entram automaticamente e as
  demais são registradas manualmente (nota e nota máxima, relatório, plano de ação). Mostra médias mensal e anual,
  melhor e pior nota, evolução, comparativo e ranking de áreas, com exportação para Excel e PDF (impressão).
- **Alerta de ações vencidas** no topo (sino), com link para `/acoes?status=atrasadas`.
- **Busca global** (Ctrl + K) em elementos, requisitos, evidências, planos de ação e auditorias.
- **Ciclos** (ano) e **unidades** selecionáveis no topo.

## Rodando localmente

```bash
cp .env.example .env          # ajuste DATABASE_URL / DATABASE_URL_UNPOOLED e AUTH_SECRET
npm install
npx prisma migrate deploy     # cria as tabelas
npm run db:seed               # carrega as matrizes em branco, a unidade CD Guarulhos e o admin
npm run dev
```

Login inicial: `admin@wise.local` / `Wise@2026`. Esses valores podem ser alterados com
`SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` antes do seed. **Troque a senha após o primeiro acesso.**
Sem `BLOB_READ_WRITE_TOKEN`, os uploads ficam em `.uploads/` (somente para desenvolvimento).

Testes do motor de pontuação: `npm test`.

## Deploy na Vercel

1. Importe o repositório na Vercel. O framework Next.js é detectado automaticamente.
2. No projeto, abra **Storage** e conecte:
   - um banco **Neon (Postgres)**, que cria `DATABASE_URL` e `DATABASE_URL_UNPOOLED`;
   - um **Blob Store**, que cria `BLOB_READ_WRITE_TOKEN`.
3. Em **Settings → Environment Variables**, crie:
   - `AUTH_SECRET` (gerado com `openssl rand -base64 32` ou em https://generate-secret.vercel.app/32);
   - `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`, com o login do primeiro administrador.
4. Faça um **Redeploy**. O script `vercel-build` executa `prisma generate`, `prisma migrate deploy`,
   o seed (idempotente: atualiza a matriz e cria o admin só se ele não existir) e `next build`.

## Estrutura

```
prisma/
  schema.prisma            modelo de dados (unidades, usuários, elementos, requisitos,
                           avaliações, evidências, planos de ação, fotografias mensais)
  data/*.json              matrizes extraídas das planilhas oficiais (em branco)
  seed.ts
scripts/extract_matrices.py  regenera prisma/data a partir das planilhas .xlsx
src/
  lib/scoring.ts           motor de pontuação (fórmulas das planilhas) + testes
  lib/catalog.ts           nomes, pilares, descrições e objetivos dos elementos
  lib/modules.ts           registro de módulos da plataforma (menu e roadmap)
  server/                  contexto/permissões, consultas e server actions
  components/              dashboard, painel do elemento, ações, gráficos, UI
  app/(app)/               páginas autenticadas
```

### Como adicionar um novo módulo (ex.: Auditorias)

1. Mude o status do módulo em `src/lib/modules.ts` para `"ativo"` e crie `src/app/(app)/auditorias/page.tsx`.
2. Adicione os modelos no `schema.prisma`, reaproveitando `Unit`, `User`, `Evidence` e `ActionPlan`,
   e rode `npx prisma migrate dev`.
3. Para um novo protocolo de avaliação, inclua um valor no enum `Framework` e uma função de pontuação em `scoring.ts`.

## Premissas adotadas

- Grupos WISE conforme a reunião de fechamento (slide 107): Liderança, Organização e Operação.
  Os 12 Básicos não têm pilares na planilha. Eles foram agrupados em *Road Safety*,
  *Movimentação e Armazenagem*, *Riscos Críticos* e *Pessoas e Emergência*, e esse agrupamento pode ser editado em `src/lib/catalog.ts`.
- Semáforo derivado da classe oficial: A = verde (conforme), B = amarelo (atenção), C/D = vermelho (crítico).
  As faixas ficam em `GRADE_BANDS` (`src/lib/scoring.ts`). LOTO e Road Safety não entram no compliance: o
  sistema considera apenas os 12 Básicos.
- As respostas do site que estavam escritas dentro das afirmações da matriz WISE foram removidas
  para gerar a matriz em branco.

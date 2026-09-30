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
- **Busca global** (Ctrl + K) em elementos, requisitos, evidências e planos de ação.
- **Ciclos** (ano) e **unidades** selecionáveis no topo.

## Rodando localmente

```bash
cp .env.example .env          # ajuste DATABASE_URL / DIRECT_URL e AUTH_SECRET
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

1. Importe o repositório na Vercel (framework Next.js detectado automaticamente).
2. Em **Storage**, conecte um banco **Postgres** (Neon) e um **Blob Store** ao projeto. Isso cria
   `DATABASE_URL` e `BLOB_READ_WRITE_TOKEN`. Defina também `DIRECT_URL` com a URL
   *sem pooling* e crie `AUTH_SECRET` (`openssl rand -base64 32`).
3. O deploy executa `vercel-build`, que roda `prisma generate`, `prisma migrate deploy` e `next build`.
4. Rode o seed uma única vez apontando para o banco de produção:
   `DATABASE_URL=... DIRECT_URL=... npm run db:seed`.

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

- Pilares WISE conforme a aba "Planilha1" da matriz: Gerenciamento, Pessoas, Técnico e Organizacional.
  Os 12 Básicos não têm pilares na planilha. Eles foram agrupados em *Road Safety*,
  *Movimentação e Armazenagem*, *Riscos Críticos* e *Pessoas e Emergência*, e esse agrupamento pode ser editado em `src/lib/catalog.ts`.
- Faixas de cor WISE: < 2,0 crítico · 2,0 a 2,99 atenção · ≥ 3,0 conforme. Básicos: ≤ 50% · 51–79% · ≥ 80%,
  como na aba "Compliance Score". Os limites podem ser ajustados em `THRESHOLDS` (`src/lib/scoring.ts`).
- As respostas do site que estavam escritas dentro das afirmações da matriz WISE foram removidas
  para gerar a matriz em branco.

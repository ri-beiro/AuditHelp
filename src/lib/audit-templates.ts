// Checklists de auditoria de empresas contratadas (terceiros).
// Base: Treinamento de Auditor Júnior WISE² (ago/2026) — Elemento 13 (6 passos da gestão de
// contratadas, slides 74 e 148), etapas e formato da auditoria (slides 97–106); Manual WISE²
// (Regras de Ouro, incidentes, emergência, ergonomia, segurança pessoal); 12 Básicos dos CDs
// (B4 Pedestres, B7 Empilhadeiras, B8 Químicos, B9 Trabalho em Altura, B10 Instalações Gerais,
// B11 Contratados, B12 Incêndio e Evacuação) e Safety Alert CD Poços (17/08/2026).
//
// Pontuação: Conforme = 1, Não conforme = 0, N/A fora do cálculo. Itens críticos (Regras de Ouro
// e requisitos de risco nível 1) em "Não conforme" limitam a nota a 50%, como nos 12 Básicos.

export type AuditItem = { code: string; text: string; ref: string; critical?: boolean; hint?: string };
export type AuditSection = { code: string; title: string; description?: string; items: AuditItem[] };
export type AuditTemplate = {
  code: string;
  name: string;
  shortName: string;
  description: string;
  icon: "DoorOpen" | "SprayCan";
  sections: AuditSection[];
};

const GESTAO: AuditSection = {
  code: "G",
  title: "Gestão da contratada",
  description: "Elemento 13 — Seleção, Treinamento, Contrato, Preparação, Auditoria e Avaliação · Básico 11",
  items: [
    {
      code: "G.1",
      text: "Contrato vigente com cláusulas de saúde e segurança e gestor do contrato Danone designado por escrito como ponto de contato.",
      ref: "E13 passo 3 · B11.9",
      hint: "Solicitar contrato e designação formal do gestor.",
    },
    {
      code: "G.2",
      text: "O processo de seleção da empresa considerou o desempenho de segurança (indicadores, histórico de acidentes, requisitos do padrão Danone para contratadas).",
      ref: "E13 passo 1 · B11.4",
    },
    {
      code: "G.3",
      text: "Documentação legal de SST em dia: seguros, PGR/PCMSO, ASO válido de todos os colaboradores e ficha de entrega de EPI.",
      ref: "B11.3",
      critical: true,
    },
    {
      code: "G.4",
      text: "Todos os colaboradores receberam integração de segurança do site (regras, Regras de Ouro, riscos, emergência e WISE), com registro.",
      ref: "E13 passo 2 · B11.1",
      critical: true,
    },
    {
      code: "G.5",
      text: "Treinamentos obrigatórios da função estão válidos e controlados em matriz de treinamento (reciclagens no prazo).",
      ref: "E10 · B11.1",
    },
    {
      code: "G.6",
      text: "Existe registro/controle atualizado de todos os colaboradores da contratada que trabalham no site (escala, turnos, substitutos).",
      ref: "B11.10",
    },
    {
      code: "G.7",
      text: "Indicadores de segurança da contratada (acidentes, quase acidentes, reportes, treinamentos) são acompanhados pelo gestor do contrato.",
      ref: "E13 · slide 148",
    },
    {
      code: "G.8",
      text: "Acidentes e incidentes com terceiros são comunicados imediatamente, registrados no Sphera e investigados da mesma forma que os de Danoners.",
      ref: "B11.11 · Manual WISE²",
      critical: true,
    },
    {
      code: "G.9",
      text: "Reuniões periódicas (ao menos trimestrais) entre gestor do contrato e contratada para avaliar o programa de segurança e dar feedback.",
      ref: "E13 · slide 148",
    },
    {
      code: "G.10",
      text: "Auditorias periódicas de segurança são realizadas nas atividades da contratada e os achados geram plano de ação acompanhado.",
      ref: "E13 passo 5 · B11.6",
    },
    {
      code: "G.11",
      text: "A avaliação de desempenho em segurança da contratada é registrada e enviada a Compras para o cadastro de fornecedores.",
      ref: "E13 passo 6 · B11.7",
    },
    {
      code: "G.12",
      text: "A contratada aplica política de consequências para desvios às Regras de Ouro e reconhece comportamentos seguros.",
      ref: "E8 · Manual WISE² (Regras de Ouro)",
    },
    {
      code: "G.13",
      text: "Liderança e colaboradores da contratada participam dos programas WISE do site (DDS / contato de segurança, campanhas, Momento WISE).",
      ref: "E9 · E13",
    },
  ],
};

const CULTURA: AuditSection = {
  code: "C",
  title: "Cultura e comportamento (entrevistas em campo)",
  description: "Entrevistar colaboradores de diferentes turnos: nome, função e tempo de empresa; perguntas abertas e fechadas",
  items: [
    {
      code: "C.1",
      text: "Os colaboradores conhecem as Regras de Ouro do site e sabem que o descumprimento leva à política de consequências.",
      ref: "Manual WISE² · Regras de Ouro",
      critical: true,
    },
    {
      code: "C.2",
      text: "Os colaboradores sabem citar os principais riscos da sua atividade e como se protegem (APR / análise de risco da tarefa).",
      ref: "E3 · B11.8",
      hint: "Atenção a respostas como “não vejo risco na minha atividade”.",
    },
    {
      code: "C.3",
      text: "Os colaboradores sabem como reportar condições e atos inseguros (Sphera ou liderança) e dão exemplos de reportes feitos.",
      ref: "Manual WISE² · Sphera",
    },
    {
      code: "C.4",
      text: "Sabem o que fazer em caso de incidente ou acidente: comunicar imediatamente o gestor, acionar brigadista e entregar a documentação.",
      ref: "Manual WISE² · Incidentes",
    },
    {
      code: "C.5",
      text: "Conhecem o plano de emergência: alarme contínuo (> 5 s) significa abandono, rotas de fuga e ponto de encontro.",
      ref: "B12.12 · Manual WISE² · Emergência",
      critical: true,
    },
    {
      code: "C.6",
      text: "Participam regularmente do DDS / contato de segurança e lembram o tema mais recente.",
      ref: "E9",
    },
    {
      code: "C.7",
      text: "Sentem-se autorizados a parar uma atividade insegura (Parar · Pensar · Agir) e sabem a quem recorrer.",
      ref: "Manual WISE² · Pare Pense Aja",
    },
  ],
};

export const AUDIT_TEMPLATES: AuditTemplate[] = [
  {
    code: "CONTRATADA_PORTARIA",
    name: "Auditoria de Contratada — Portaria",
    shortName: "Portaria",
    description:
      "Controle de acesso de pessoas e veículos, segregação pedestre × veículo, posto de trabalho da guarita, emergência e segurança pessoal.",
    icon: "DoorOpen",
    sections: [
      GESTAO,
      {
        code: "P1",
        title: "Controle de acesso de pessoas e veículos",
        items: [
          {
            code: "P1.1",
            text: "Há registro de visitantes e motoristas, emissão de crachá e entrega de informações de segurança (regras do site e procedimentos de emergência).",
            ref: "B12.13",
          },
          {
            code: "P1.2",
            text: "Motoristas e visitantes recebem orientação de segurança antes do acesso (rotas, áreas proibidas, regra da chave e do calço na doca).",
            ref: "B5 · Regra de Ouro 1",
          },
          {
            code: "P1.3",
            text: "O acesso à área operacional só é liberado com o EPI mínimo exigido (calçado de segurança, colete refletivo).",
            ref: "B4.1",
            critical: true,
          },
          {
            code: "P1.4",
            text: "Prestadores de serviço só entram após conferência de liberação (integração válida, documentação e permissão de trabalho quando aplicável).",
            ref: "B11.5 · B11.10",
          },
          {
            code: "P1.5",
            text: "Placa de limite de velocidade (≤ 20 km/h) na entrada, orientação aos motoristas e registro de violações.",
            ref: "B10.7",
            critical: true,
          },
          {
            code: "P1.6",
            text: "Existe conduta definida para suspeita de motorista sob efeito de álcool ou drogas e para caronas/passageiros não autorizados.",
            ref: "B1 · Direção (Motorista)",
          },
        ],
      },
      {
        code: "P2",
        title: "Pedestres e tráfego no pátio",
        items: [
          {
            code: "P2.1",
            text: "A portaria e o pátio têm segregação pedestre × veículo: faixas, passarelas e travessias sinalizadas e respeitadas.",
            ref: "B4.4",
            critical: true,
          },
          {
            code: "P2.2",
            text: "Porteiros e vigilantes circulam apenas pelas rotas de pedestres e usam colete refletivo quando expostos ao tráfego (inclusive à noite).",
            ref: "B4.1 · B4.2",
          },
          {
            code: "P2.3",
            text: "Não há uso de celular, fones ou documentos ao caminhar em áreas com tráfego de veículos.",
            ref: "B4.5",
            critical: true,
          },
          {
            code: "P2.4",
            text: "Guarita, acessos, cancelas e pátio têm iluminação adequada no período noturno.",
            ref: "B10 · Manual WISE²",
          },
        ],
      },
      {
        code: "P3",
        title: "Posto de trabalho e equipamentos",
        items: [
          {
            code: "P3.1",
            text: "Guarita em boas condições: cadeira ajustável, monitor na altura dos olhos, conforto térmico e iluminação adequada.",
            ref: "Manual WISE² · Ergonomia",
          },
          {
            code: "P3.2",
            text: "Portões, cancelas e portas automáticas com dispositivos de segurança (sensores, parada de emergência) e inspeção periódica registrada.",
            ref: "B10.1",
            critical: true,
          },
          {
            code: "P3.3",
            text: "Rondas com roteiro definido, comunicação por rádio e proibição de acesso a telhados, plataformas e áreas restritas.",
            ref: "B9.1 · B9.2",
          },
          {
            code: "P3.4",
            text: "Instalações elétricas da guarita sem improvisos (extensões, fiação exposta, quadros abertos).",
            ref: "B10.5",
          },
        ],
      },
      {
        code: "P4",
        title: "Emergência e segurança pessoal",
        items: [
          {
            code: "P4.1",
            text: "Lista de contatos de emergência atualizada e visível: SAMU 192, Bombeiros 193, Defesa Civil 199, PM 190, brigada e liderança.",
            ref: "B12.16 · Manual WISE²",
          },
          {
            code: "P4.2",
            text: "Porteiros treinados no plano de emergência: acionamento, liberação do acesso para socorro, controle de evacuação e contagem no ponto de encontro.",
            ref: "B12.12",
            critical: true,
          },
          {
            code: "P4.3",
            text: "Extintor acessível, sinalizado e dentro da validade na guarita, com porteiros treinados no uso.",
            ref: "B12.4",
          },
          {
            code: "P4.4",
            text: "Kit de primeiros socorros disponível e inspecionado.",
            ref: "B12.20",
          },
          {
            code: "P4.5",
            text: "Procedimento de segurança pessoal em caso de assalto conhecido: manter a calma, não reagir, entregar os pertences e comunicar.",
            ref: "Manual WISE² · Segurança pessoal",
          },
        ],
      },
      CULTURA,
    ],
  },
  {
    code: "CONTRATADA_LIMPEZA",
    name: "Auditoria de Contratada — Limpeza",
    shortName: "Limpeza",
    description:
      "Produtos químicos, interação com empilhadeiras nas ruas, piso molhado, equipamentos, trabalho em altura, ergonomia e câmara fria.",
    icon: "SprayCan",
    sections: [
      GESTAO,
      {
        code: "L1",
        title: "Produtos químicos de limpeza",
        description: "Básico 8 · Regra de Ouro 4",
        items: [
          {
            code: "L1.1",
            text: "Todos os produtos têm FISPQ disponível no local de uso e constam do inventário de químicos do site.",
            ref: "B8.12 · B8.13",
          },
          {
            code: "L1.2",
            text: "Produtos na embalagem original ou em recipiente identificado; nunca em embalagens de alimentos ou garrafas reaproveitadas.",
            ref: "B8.6 · B8.8",
            critical: true,
          },
          {
            code: "L1.3",
            text: "Armazenamento segregado por compatibilidade, ventilado, com acesso restrito e contenção para derramamento.",
            ref: "B8.4 · B8.7",
            critical: true,
          },
          {
            code: "L1.4",
            text: "Colaboradores treinados nos riscos dos produtos, diluição correta, incompatibilidades (ex.: cloro + amônia) e resposta a derramamento.",
            ref: "B8.3 · Regra de Ouro 4",
            critical: true,
          },
          {
            code: "L1.5",
            text: "EPI para químicos disponível e em uso (luvas, óculos, botas e avental conforme a FISPQ).",
            ref: "Regra de Ouro 4",
            critical: true,
          },
          {
            code: "L1.6",
            text: "Kit de derramamento e lava-olhos acessíveis, inspecionados e com pessoal treinado no uso.",
            ref: "B8.2 · B8.9",
          },
          {
            code: "L1.7",
            text: "Embalagens vazias e resíduos químicos segregados, identificados e destinados corretamente.",
            ref: "B8.11",
          },
        ],
      },
      {
        code: "L2",
        title: "Interação com empilhadeiras e veículos",
        description: "Básicos 4 e 7 · aprendizado do Safety Alert CD Poços (conferente × empilhadeira, Rua 2)",
        items: [
          {
            code: "L2.1",
            text: "Limpeza em ruas de armazenagem, corredores e docas só é feita com a área isolada e sinalizada (cones, correntes, cavaletes).",
            ref: "Safety Alert 17/08/2026 · B4.3",
            critical: true,
          },
          {
            code: "L2.2",
            text: "Antes de entrar em ruas com tráfego de empilhadeiras, a equipe comunica o líder de turno/operação e aplica a regra “ver e ser visto”.",
            ref: "B4.3 · B7",
            critical: true,
          },
          {
            code: "L2.3",
            text: "Colaboradores usam colete refletivo e circulam somente pelas rotas de pedestres.",
            ref: "B4.1 · B4.4",
            critical: true,
          },
          {
            code: "L2.4",
            text: "Não há uso de celular ou fones durante a circulação nas áreas operacionais.",
            ref: "B4.5",
          },
        ],
      },
      {
        code: "L3",
        title: "Piso, equipamentos e instalações",
        items: [
          {
            code: "L3.1",
            text: "Piso molhado é sinalizado durante e após a limpeza, com rota alternativa para pedestres.",
            ref: "B10.4",
          },
          {
            code: "L3.2",
            text: "Equipamentos elétricos de limpeza (lavadora, enceradeira, aspirador) inspecionados: cabos e plugues íntegros, sem improvisos, desligados da tomada para manutenção.",
            ref: "B10.5 · B10.16",
          },
          {
            code: "L3.3",
            text: "Lavadora ou varredeira motorizada é operada apenas por pessoa treinada e autorizada, com dispositivos de segurança ativos e velocidade compatível.",
            ref: "B7 · Regra de Ouro 3",
            critical: true,
          },
          {
            code: "L3.4",
            text: "Inspeções de limpeza e organização (housekeeping) são realizadas e as condições inseguras encontradas geram ação corretiva.",
            ref: "B10.2",
          },
        ],
      },
      {
        code: "L4",
        title: "Trabalho em altura e espaços confinados",
        description: "Básico 9 · Regras de Ouro 5 e 6",
        items: [
          {
            code: "L4.1",
            text: "Limpeza acima de 2 m (vidros, luminárias, estruturas) só com permissão de trabalho, treinamento NR 35 e EPI contra quedas.",
            ref: "B9.5 · B9.13 · Regra de Ouro 5",
            critical: true,
          },
          {
            code: "L4.2",
            text: "Escadas em bom estado e com pés antiderrapantes; uso com 3 pontos de contato e nunca nos dois últimos degraus.",
            ref: "B9.9 · B9.10 · B9.12",
            critical: true,
          },
          {
            code: "L4.3",
            text: "Proibido escalar racks ou acessar telhados e plataformas sem autorização.",
            ref: "B9.1 · B9.2",
            critical: true,
          },
          {
            code: "L4.4",
            text: "Caixas d’água, fossas e outros espaços confinados nunca são acessados sem treinamento NR 33, avaliação prévia e PET.",
            ref: "Regra de Ouro 6",
            critical: true,
          },
        ],
      },
      {
        code: "L5",
        title: "Ergonomia, ambiente refrigerado e resíduos",
        items: [
          {
            code: "L5.1",
            text: "Manuseio de baldes e sacos de lixo respeita os limites (20 kg mulheres / 25 kg homens), com carrinhos disponíveis e em bom estado.",
            ref: "Manual WISE² · Ergonomia",
          },
          {
            code: "L5.2",
            text: "Quem limpa câmaras frias usa EPI térmico completo (jaqueta, calça, luvas, touca e calçado) e faz pausas de recuperação.",
            ref: "Manual WISE² · Atividade segura em ambiente refrigerado",
          },
          {
            code: "L5.3",
            text: "Calçado de segurança adequado, fechado e antiderrapante, em bom estado.",
            ref: "Manual WISE² · Uso de calçados",
          },
          {
            code: "L5.4",
            text: "Resíduos segregados, contentores em bom estado e rota segura até a central de resíduos.",
            ref: "B10 · B8.11",
          },
        ],
      },
      CULTURA,
    ],
  },
];

export function getTemplate(code: string) {
  return AUDIT_TEMPLATES.find((t) => t.code === code) ?? null;
}

export const AUDIT_VALUES = ["C", "NC", "NA"] as const;
export const AUDIT_LABELS: Record<string, string> = { C: "Conforme", NC: "Não conforme", NA: "N/A" };

export type AuditScore = {
  pct: number | null;
  rawPct: number | null;
  capped: boolean;
  answered: number;
  total: number;
  conformes: number;
  naoConformes: number;
  criticalNc: number;
  sections: { code: string; title: string; pct: number | null; answered: number; total: number; nc: number }[];
};

export function scoreAudit(template: AuditTemplate, answers: Record<string, string | null | undefined>): AuditScore {
  const all = template.sections.flatMap((s) => s.items);
  const val = (i: AuditItem) => answers[i.code] ?? null;
  const pctOf = (items: AuditItem[]) => {
    const applicable = items.filter((i) => val(i) === "C" || val(i) === "NC");
    return applicable.length ? applicable.filter((i) => val(i) === "C").length / applicable.length : null;
  };
  const rawPct = pctOf(all);
  const criticalNc = all.filter((i) => i.critical && val(i) === "NC").length;
  const capped = rawPct !== null && criticalNc > 0 && rawPct > 0.5;
  return {
    pct: capped ? 0.5 : rawPct,
    rawPct,
    capped,
    answered: all.filter((i) => val(i)).length,
    total: all.length,
    conformes: all.filter((i) => val(i) === "C").length,
    naoConformes: all.filter((i) => val(i) === "NC").length,
    criticalNc,
    sections: template.sections.map((s) => ({
      code: s.code,
      title: s.title,
      pct: pctOf(s.items),
      answered: s.items.filter((i) => val(i)).length,
      total: s.items.length,
      nc: s.items.filter((i) => val(i) === "NC").length,
    })),
  };
}

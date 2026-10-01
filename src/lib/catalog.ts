// Catálogo dos elementos avaliados. Usado pelo seed para popular o banco.
// Nomes conforme o Manual WISE² e a Matriz de Auditoria WISE (Danone / DuPont v8).

export type PillarDef = { name: string; order: number; color: string };

export type ElementDef = {
  number: number;
  name: string;
  shortName: string;
  pillar: string;
  icon: string; // nome do ícone lucide-react
  description: string;
  objective: string;
};

// Grupos WISE usados na reunião de fechamento da auditoria
// (Treinamento Auditor Júnior WISE², slide 107): Liderança 1–4, Organização 5–8, Operação 9–13.
export const WISE_PILLARS: PillarDef[] = [
  { name: "Liderança", order: 1, color: "#1d4ed8" },
  { name: "Organização", order: 2, color: "#0891b2" },
  { name: "Operação", order: 3, color: "#7c3aed" },
];

export const WISE_ELEMENTS: ElementDef[] = [
  {
    number: 1,
    name: "Forte Compromisso Demonstrado pela Gestão",
    shortName: "Compromisso Visível da Liderança",
    pillar: "Liderança",
    icon: "Handshake",
    description:
      "Avalia como a liderança demonstra, por atitudes e recursos, que saúde e segurança são valores inegociáveis e impulsionadores da excelência operacional.",
    objective:
      "Garantir que todos os níveis de gestão liderem pelo exemplo, priorizem a segurança nas decisões e sustentem um plano sistemático com recursos adequados.",
  },
  {
    number: 2,
    name: "Políticas e Princípios de Saúde e Segurança",
    shortName: "Política",
    pillar: "Liderança",
    icon: "ScrollText",
    description:
      "Avalia a existência, comunicação, compreensão e aplicação da política e dos princípios de saúde e segurança do site.",
    objective:
      "Assegurar que a política seja conhecida, compreendida e usada como guia para as decisões diárias em toda a organização.",
  },
  {
    number: 3,
    name: "Altos Padrões de Desempenho",
    shortName: "Normas",
    pillar: "Liderança",
    icon: "Gauge",
    description:
      "Avalia regras, normas e procedimentos de segurança: definição, comunicação, acessibilidade, revisão e cumprimento.",
    objective:
      "Manter padrões claros, atualizados e aplicados de forma consistente, usados como instrumento de melhoria contínua (PDCA/SDCA).",
  },
  {
    number: 4,
    name: "Metas, Objetivos e Planos Desafiadores",
    shortName: "Metas Desafiadoras",
    pillar: "Liderança",
    icon: "Target",
    description:
      "Avalia a definição de metas e objetivos de segurança baseados em indicadores reativos e proativos, e seu desdobramento em planos.",
    objective:
      "Desdobrar metas SMART rumo ao acidente zero, acompanhadas por indicadores e planos em todos os setores.",
  },
  {
    number: 5,
    name: "Pessoal de Segurança de Apoio",
    shortName: "Equipe de Segurança",
    pillar: "Organização",
    icon: "ShieldCheck",
    description:
      "Avalia o papel, a capacitação e a atuação da equipe de segurança como apoio técnico à linha de gestão.",
    objective:
      "Contar com uma equipe de segurança capacitada que atue como consultora e facilitadora, e não como única responsável pela segurança.",
  },
  {
    number: 6,
    name: "Responsabilidade da Gestão de Linha",
    shortName: "Resp. Gerência de Linha",
    pillar: "Organização",
    icon: "Users",
    description:
      "Avalia se a gestão de linha assume, de forma clara e documentada, a responsabilidade pela segurança de suas áreas e equipes.",
    objective:
      "Fazer com que cada gestor lidere as atividades de segurança da sua área, com responsabilidades definidas (RACI) e cobrança efetiva.",
  },
  {
    number: 7,
    name: "Organização Integrada de Saúde e Segurança",
    shortName: "Organização",
    pillar: "Organização",
    icon: "Network",
    description:
      "Avalia a estrutura de comitês, subcomitês e grupos de trabalho que integram saúde e segurança à organização do site.",
    objective:
      "Ter uma estrutura organizacional em que as decisões de segurança sejam tomadas no nível adequado, com participação representativa.",
  },
  {
    number: 8,
    name: "Motivação Progressiva",
    shortName: "Motivação",
    pillar: "Organização",
    icon: "Sparkles",
    description:
      "Avalia reconhecimento, consequências e programas que motivam comportamentos seguros e a participação dos colaboradores.",
    objective:
      "Promover engajamento genuíno, em que as pessoas se sintam donas da segurança e motivadas a identificar riscos e propor melhorias.",
  },
  {
    number: 9,
    name: "Comunicação Eficaz",
    shortName: "Comunicação",
    pillar: "Operação",
    icon: "MessagesSquare",
    description:
      "Avalia canais, frequência, conteúdo e bilateralidade da comunicação sobre saúde e segurança.",
    objective:
      "Garantir comunicação regular, bilateral e relevante, que compartilhe aprendizados, resultados e boas práticas.",
  },
  {
    number: 10,
    name: "Treinamento e Desenvolvimento Contínuo em Segurança",
    shortName: "Treinamento",
    pillar: "Operação",
    icon: "GraduationCap",
    description:
      "Avalia a matriz de treinamentos, a qualidade, a verificação da eficácia e o desenvolvimento de competências em segurança.",
    objective:
      "Assegurar que todos sejam treinados e competentes para suas funções, com eficácia verificada e reciclagem planejada.",
  },
  {
    number: 11,
    name: "Investigações e Relatórios de Lesões e Incidentes",
    shortName: "Invest. de Acidentes",
    pillar: "Operação",
    icon: "Search",
    description:
      "Avalia o reporte, a investigação de causa raiz e o compartilhamento de aprendizados de acidentes e incidentes.",
    objective:
      "Investigar todos os eventos até a causa raiz, implementar ações eficazes e disseminar as lições aprendidas.",
  },
  {
    number: 12,
    name: "Auditorias e Reavaliações Eficazes",
    shortName: "Auditorias",
    pillar: "Operação",
    icon: "ClipboardCheck",
    description:
      "Avalia o sistema de auditorias, inspeções e diálogos de segurança e o acompanhamento das ações corretivas.",
    objective:
      "Manter um sistema de auditorias planejado e eficaz, que identifique desvios e garanta o fechamento das ações.",
  },
  {
    number: 13,
    name: "Gestão de Segurança do Contratado",
    shortName: "Contratadas",
    pillar: "Operação",
    icon: "HardHat",
    description:
      "Avalia seleção, integração, acompanhamento e avaliação de desempenho em segurança das empresas contratadas.",
    objective:
      "Garantir que contratadas trabalhem com o mesmo padrão de segurança dos colaboradores próprios.",
  },
];

// Agrupamento dos 12 Básicos (a matriz original não define pilares para os Básicos).
export const BASICS_PILLARS: PillarDef[] = [
  { name: "Road Safety", order: 1, color: "#1d4ed8" },
  { name: "Movimentação e Armazenagem", order: 2, color: "#0891b2" },
  { name: "Riscos Críticos", order: 3, color: "#7c3aed" },
  { name: "Pessoas e Emergência", order: 4, color: "#dc2626" },
];

export const BASICS_ELEMENTS: ElementDef[] = [
  {
    number: 1,
    name: "Direção (Motorista)",
    shortName: "Condução (Motorista)",
    pillar: "Road Safety",
    icon: "UserRound",
    description: "Aplicável aos condutores da frota própria Danone: habilitação, saúde, regras de ouro e direção defensiva.",
    objective: "Garantir motoristas aptos, treinados e que cumpram as regras de condução segura.",
  },
  {
    number: 2,
    name: "Direção (Veículo)",
    shortName: "Condução (Veículo)",
    pillar: "Road Safety",
    icon: "Truck",
    description: "Aplicável à frota própria Danone: equipamentos mínimos de segurança, inspeção e limites de carga.",
    objective: "Garantir veículos seguros, inspecionados e equipados conforme o padrão corporativo.",
  },
  {
    number: 3,
    name: "Manutenção de Veículos",
    shortName: "Manutenção de Veículos",
    pillar: "Road Safety",
    icon: "Wrench",
    description: "Manutenção preventiva e corretiva de veículos e oficinas.",
    objective: "Assegurar manutenção formal, segura e rastreável de toda a frota.",
  },
  {
    number: 4,
    name: "Segurança de Pedestres",
    shortName: "Pedestres",
    pillar: "Movimentação e Armazenagem",
    icon: "Footprints",
    description: "Segregação homem x máquina, rotas de pedestres, sinalização e comportamento seguro.",
    objective: "Eliminar a interação perigosa entre pedestres e veículos/equipamentos.",
  },
  {
    number: 5,
    name: "Carregamento / Descarga / Manuseio e Levantamento de Carga",
    shortName: "Carga e Descarga",
    pillar: "Movimentação e Armazenagem",
    icon: "PackageOpen",
    description: "Docas, calço e regra da chave, manuseio manual e ergonomia no levantamento de cargas.",
    objective: "Executar carga, descarga e manuseio com controles que evitem esmagamentos, quedas e lesões.",
  },
  {
    number: 6,
    name: "Armazenagem, Racks e Pallets",
    shortName: "Armazém, Racks e Paletes",
    pillar: "Movimentação e Armazenagem",
    icon: "Warehouse",
    description: "Estruturas porta-paletes, inspeção de racks, reporte de batidas e condições dos paletes.",
    objective: "Manter estruturas íntegras, inspecionadas e com capacidade respeitada.",
  },
  {
    number: 7,
    name: "Empilhadeiras",
    shortName: "Empilhadeiras (PIV)",
    pillar: "Movimentação e Armazenagem",
    icon: "Forklift",
    description: "Veículos industriais motorizados: habilitação, checklist, dispositivos de segurança e manutenção.",
    objective: "Operar equipamentos móveis apenas com pessoas capacitadas e dispositivos de segurança ativos.",
  },
  {
    number: 8,
    name: "Químicos",
    shortName: "Produtos Químicos",
    pillar: "Riscos Críticos",
    icon: "FlaskConical",
    description: "Armazenamento, FISPQ, EPI e treinamento para manuseio de produtos químicos.",
    objective: "Controlar a exposição e os riscos de produtos químicos em todas as etapas.",
  },
  {
    number: 9,
    name: "Trabalho em Altura",
    shortName: "Trabalho em Altura",
    pillar: "Riscos Críticos",
    icon: "Construction",
    description: "Permissão de trabalho, NR 35, equipamentos de proteção contra quedas e resgate.",
    objective: "Eliminar quedas de altura com planejamento, capacitação e EPIs adequados.",
  },
  {
    number: 10,
    name: "Instalações Gerais",
    shortName: "Instalações Gerais",
    pillar: "Riscos Críticos",
    icon: "Building2",
    description: "Elétrica, LOTO, máquinas, espaços confinados, iluminação e condições gerais do site.",
    objective: "Manter instalações seguras e intervenções controladas por bloqueio de energias.",
  },
  {
    number: 11,
    name: "Contratados (Terceiros)",
    shortName: "Empreiteiros",
    pillar: "Pessoas e Emergência",
    icon: "HardHat",
    description: "Seleção, integração, permissão de trabalho e acompanhamento de terceiros.",
    objective: "Garantir que terceiros trabalhem sob os mesmos padrões de segurança do site.",
  },
  {
    number: 12,
    name: "Incêndio e Evacuação",
    shortName: "Incêndio e Evacuação",
    pillar: "Pessoas e Emergência",
    icon: "FlameKindling",
    description: "Prevenção e combate a incêndio, brigada, simulados, rotas de fuga e ponto de encontro.",
    objective: "Estar preparado para emergências, com sistemas inspecionados e pessoas treinadas.",
  },
];

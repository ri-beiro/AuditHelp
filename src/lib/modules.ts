// Registro de módulos da plataforma. Novos módulos (auditorias, gestão de mudanças,
// investigação de incidentes...) são adicionados aqui e ganham rota em src/app/(app)/<slug>.
export type ModuleDef = {
  slug: string;
  href: string;
  label: string;
  icon: string;
  group: "Gestão WISE" | "Segurança" | "Auditorias" | "Próximos módulos" | "Administração";
  status: "ativo" | "em-breve";
  adminOnly?: boolean;
};

export const MODULES: ModuleDef[] = [
  { slug: "dashboard", href: "/", label: "Dashboard", icon: "LayoutDashboard", group: "Gestão WISE", status: "ativo" },
  { slug: "indicadores", href: "/indicadores", label: "Indicadores", icon: "BarChart3", group: "Gestão WISE", status: "ativo" },
  { slug: "acoes", href: "/acoes", label: "Planos de Ação", icon: "ListChecks", group: "Gestão WISE", status: "ativo" },
  { slug: "evidencias", href: "/evidencias", label: "Evidências", icon: "FolderOpen", group: "Gestão WISE", status: "ativo" },
  { slug: "relatorio", href: "/relatorio", label: "Relatório de Fechamento", icon: "FileBarChart", group: "Gestão WISE", status: "ativo" },
  { slug: "incidentes", href: "/incidentes", label: "Investigação de Incidentes", icon: "Siren", group: "Segurança", status: "ativo" },
  { slug: "licoes", href: "/incidentes/licoes", label: "Lições Aprendidas", icon: "Lightbulb", group: "Segurança", status: "ativo" },
  { slug: "auditorias", href: "/auditorias", label: "Auditorias de Contratadas", icon: "ClipboardList", group: "Auditorias", status: "ativo" },
  { slug: "historico", href: "/auditorias/historico", label: "Histórico de Auditorias", icon: "History", group: "Auditorias", status: "ativo" },
  { slug: "mudancas", href: "/modulos/mudancas", label: "Gestão de Mudanças", icon: "GitBranch", group: "Próximos módulos", status: "em-breve" },
  { slug: "excelencia", href: "/modulos/excelencia", label: "Excelência Operacional", icon: "Trophy", group: "Próximos módulos", status: "em-breve" },
  { slug: "admin", href: "/admin", label: "Unidades e Usuários", icon: "Settings", group: "Administração", status: "ativo", adminOnly: true },
];

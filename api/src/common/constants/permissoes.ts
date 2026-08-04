export const PERMISSOES = [
  'LEADS_READ',
  'LEADS_WRITE',
  'EMPRESAS_READ',
  'EMPRESAS_WRITE',
  'PROJETOS_READ',
  'PROJETOS_WRITE',
  'INTERACOES_READ',
  'INTERACOES_WRITE',
  'TICKETS_READ',
  'TICKETS_WRITE',
  'CONSULTORES_READ',
  'CONSULTORES_WRITE',
  'VISITAS_READ',
  'VISITAS_WRITE',
  'NOTIFICACOES_READ',
  'DASHBOARD_READ',
  'CARGOS_MANAGE',
  // Membros: READ é só ver a lista; MANAGE é criar, editar, excluir e resetar
  // senha. Quem tem MANAGE precisa ter READ também (as listagens exigem READ) —
  // por isso os cargos que gerenciam recebem os dois.
  'USUARIOS_READ',
  'USUARIOS_MANAGE',
  'COMPETENCIAS_READ',
  'COMPETENCIAS_WRITE',
  'TAREFAS_READ',
  'TAREFAS_WRITE',
] as const;

export type Permissao = (typeof PERMISSOES)[number];

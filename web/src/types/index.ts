export type Segmento = 'FARMA' | 'COSMETICOS' | 'HOSPITALAR' | 'LOGISTICA' | 'LABORATORIO' | 'OUTRO';

export type EstagioLead = 'NOVO' | 'CONTATO_FEITO' | 'QUALIFICADO' | 'PROPOSTA' | 'GANHO' | 'PERDIDO';

export type EstagioProjeto = 'DIAGNOSTICO' | 'PROPOSTA' | 'EXECUCAO' | 'CONCLUIDO';

export type TipoInteracao = 'LIGACAO' | 'EMAIL' | 'REUNIAO' | 'WHATSAPP' | 'VISITA' | 'OUTRO';

export type StatusTicket = 'ABERTO' | 'EM_ANDAMENTO' | 'AGUARDANDO_CLIENTE' | 'RESOLVIDO';

export type StatusVisita = 'AGENDADA' | 'CONFIRMADA' | 'REALIZADA' | 'CANCELADA';

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
  'USUARIOS_MANAGE',
] as const;

export type Permissao = (typeof PERMISSOES)[number];

export interface Cargo {
  id: string;
  nome: string;
  nivel: number;
  permissoes: Permissao[];
  criadoEm: string;
  atualizadoEm: string;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  cargoId: string;
  cargo: Cargo;
  criadoEm: string;
}

export interface Lead {
  id: string;
  nome: string;
  empresaNome: string | null;
  email: string | null;
  telefone: string | null;
  segmento: Segmento | null;
  origem: string | null;
  estagio: EstagioLead;
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
  interacoes?: Interacao[];
}

export interface EmpresaCliente {
  id: string;
  nome: string;
  cnpj: string | null;
  segmento: Segmento;
  contatoNome: string | null;
  email: string | null;
  telefone: string | null;
  leadOrigemId: string | null;
  criadoEm: string;
  atualizadoEm: string;
  _count?: { projetos: number; ticketsAbertos: number };
  proximaVisita?: Visita | null;
}

export interface Projeto {
  id: string;
  titulo: string;
  descricao: string | null;
  estagio: EstagioProjeto;
  dataLimiteCompliance: string | null;
  valor: string | null;
  empresaId: string;
  empresa?: EmpresaCliente;
  criadoEm: string;
  atualizadoEm: string;
  interacoes?: Interacao[];
}

export interface Interacao {
  id: string;
  tipo: TipoInteracao;
  resumo: string;
  data: string;
  leadId: string | null;
  empresaId: string | null;
  projetoId: string | null;
  criadoEm: string;
}

export interface Ticket {
  id: string;
  titulo: string;
  descricao: string | null;
  status: StatusTicket;
  prioridade: number;
  empresaId: string;
  empresa?: EmpresaCliente;
  criadoEm: string;
  resolvidoEm: string | null;
}

export interface Consultor {
  id: string;
  nome: string;
  especialidade: string;
  ativo: boolean;
  criadoEm: string;
}

export interface Visita {
  id: string;
  consultorId: string;
  consultor?: Consultor;
  empresaId: string;
  empresa?: EmpresaCliente;
  inicio: string;
  fim: string;
  tipoServico: string;
  status: StatusVisita;
  documentoUrl: string | null;
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Notificacao {
  id: string;
  tipo: string;
  mensagem: string;
  lida: boolean;
  projetoId: string | null;
  dataReferencia: string | null;
  criadoEm: string;
}

export interface DashboardResumo {
  leadsAtivos: number;
  projetosPorEstagio: { estagio: EstagioProjeto; total: number }[];
  projetosEmExecucao: number;
  taxaConversao: number;
  ticketsAbertos: number;
  visitasProximos7Dias: number;
  alertasNaoLidos: number;
}

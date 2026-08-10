export interface ResultadoPaginado<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

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
  'VISITAS_READ',
  'VISITAS_WRITE',
  'NOTIFICACOES_READ',
  'DASHBOARD_READ',
  'CARGOS_MANAGE',
  'USUARIOS_READ',
  'USUARIOS_MANAGE',
  'COMPETENCIAS_READ',
  'COMPETENCIAS_WRITE',
  'TAREFAS_READ',
  'TAREFAS_WRITE',
  // Ver valor de contrato. A API não devolve o número para quem não tem, então
  // esconder aqui é só o acabamento, não a trava.
  'FINANCEIRO_READ',
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

// O que GET /cargos/atribuiveis devolve: o suficiente para o seletor de cargo
// do cadastro de membro, e nada mais. A rota completa exige CARGOS_MANAGE, e
// quem cadastra membro nem sempre gerencia cargo.
//
// O nível vem junto porque é com ele que a tela desabilita o cargo fora do
// alcance de quem está cadastrando.
export type CargoAtribuivel = Pick<Cargo, 'id' | 'nome' | 'nivel'>;

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  senhaDefinidaEm: string | null;
  // True enquanto houver código de acesso pendente de resgate. A API nunca
  // devolve o código em si nas listagens, só este sinal.
  acessoPendente: boolean;
  ativo: boolean;
  // Só relevante para quem atua como consultor (visita cliente em campo).
  especialidade: string | null;
  competencias?: Competencia[];
  cargoId: string;
  cargo: Cargo;
  criadoEm: string;
}

export interface Competencia {
  id: string;
  nome: string;
  descricao: string | null;
  criadoEm: string;
  atualizadoEm: string;
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

export type StatusEtapa = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA';

export interface EtapaProjeto {
  id: string;
  projetoId: string;
  nome: string;
  ordem: number;
  responsavelId: string | null;
  responsavel?: Usuario;
  prazo: string | null;
  status: StatusEtapa;
  concluidaEm: string | null;
  criadoEm: string;
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
  etapas?: EtapaProjeto[];
  // Quem toca o projeto. A partir de duas pessoas, a interface chama de equipe.
  equipe?: { id: string; nome: string; email: string; especialidade: string | null }[];
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
  // Quem registrou o contato no CRM, resolvido a partir do criadoPorId da
  // auditoria. Mesmo desenho do Ticket.
  registradoPor: { id: string; nome: string } | null;
}

export interface Ticket {
  id: string;
  titulo: string;
  descricao: string | null;
  status: StatusTicket;
  prioridade: number;
  empresaId: string;
  empresa?: EmpresaCliente;
  abertoEm: string;
  primeiraRespostaEm: string | null;
  criadoEm: string;
  resolvidoEm: string | null;
  // Quem digitou o chamado no CRM, resolvido a partir do criadoPorId da
  // auditoria. Não é quem abriu o chamado do lado do cliente: esse não tem
  // campo no modelo.
  registradoPor: { id: string; nome: string } | null;
  // Calculados no backend (tickets.utils).
  prazoLimite: string;
  emAtraso: boolean;
}

// Versão enxuta do User devolvida dentro de Visita (GET /visitas) e usada na
// lista de opções do formulário (GET /visitas/consultores). Consultor não é
// mais uma entidade própria: é qualquer User com permissão de agenda.
export interface ConsultorDaVisita {
  id: string;
  nome: string;
  email: string;
  especialidade: string | null;
}

// O que a API devolve dentro da visita: só o suficiente para o bloco da agenda
// dizer a que projeto a visita pertence.
export interface ProjetoDaVisita {
  id: string;
  titulo: string;
  estagio: EstagioProjeto;
  dataLimiteCompliance: string | null;
}

export interface Visita {
  id: string;
  consultorId: string;
  consultor?: ConsultorDaVisita;
  empresaId: string;
  empresa?: EmpresaCliente;
  projetoId: string | null;
  projeto?: ProjetoDaVisita | null;
  inicio: string;
  fim: string;
  tipoServico: string;
  status: StatusVisita;
  documentoUrl: string | null;
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

// `mensagem` guarda só o fato ("Etapa X do projeto Y"). A contagem de dias NÃO
// vem da API: ela é calculada na tela a partir de dataReferencia, porque o
// texto é gravado uma vez no banco e nunca mais muda. Ver textoPrazoDoAlerta.
//
// `lida` e `lidaEm` são desta pessoa, não da empresa: vêm da linha em
// notificacao_destinatarios, e não do campo antigo da notificação.
export interface Notificacao {
  id: string;
  tipo: string;
  mensagem: string;
  lida: boolean;
  lidaEm: string | null;
  projetoId: string | null;
  etapaId: string | null;
  dataReferencia: string | null;
  criadoEm: string;
}

export interface DashboardResumo {
  projetosPorEstagio: { estagio: EstagioProjeto; total: number }[];
  projetosEmExecucao: number;
  projetosConcluidos: number;
  concluidosNoMes: number;
  projetosSemPrazo: number;
  ticketsAbertos: number;
  visitasProximos7Dias: number;
  alertasNaoLidos: number;
  ticketsEmAtraso: number;
  etapasVencendo7Dias: number;
  // null quando o cargo não tem FINANCEIRO_READ. Nulo e zero são coisas
  // diferentes: zero afirma que não há contrato ativo, null diz que a pessoa
  // não recebe afirmação nenhuma sobre dinheiro.
  valorEmExecucao: number | null;
  concentracao: {
    empresaId: string;
    empresa: string;
    projetos: number;
    valor: number | null;
  }[];
  cargaConsultores: { usuarioId: string; nome: string; marcosAbertos: number }[];
  marcosDaSemana: {
    id: string;
    nome: string;
    prazo: string | null;
    projetoId: string;
    projeto: string;
  }[];
}

export interface Tarefa {
  id: string;
  titulo: string;
  descricao: string | null;
  status: StatusTarefa;
  prazo: string | null;
  responsavelId: string;
  responsavel?: { id: string; nome: string; email: string };
  projetoId: string | null;
  projeto?: { id: string; titulo: string };
  concluidaEm: string | null;
  criadoEm: string;
}

export type StatusTarefa = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA';

import { Permissao } from '../types';

// As 22 permissões da API agrupadas por assunto. A lista crua é ilegível para
// quem não escreveu o backend: "COMPETENCIAS_WRITE" não diz a ninguém o que
// libera. Aqui cada módulo vira uma linha com o que ele permite, em português.
//
// A ordem é a de uso no dia a dia, não a alfabética: o que a equipe mexe toda
// hora vem primeiro, e o que é administração fica no fim.

export interface GrupoPermissao {
  titulo: string;
  descricao: string;
  itens: Array<{ permissao: Permissao; label: string }>;
}

export const GRUPOS_PERMISSAO: GrupoPermissao[] = [
  {
    titulo: 'Empresas',
    descricao: 'Clientes cadastrados',
    itens: [
      { permissao: 'EMPRESAS_READ', label: 'Ver' },
      { permissao: 'EMPRESAS_WRITE', label: 'Criar e editar' },
    ],
  },
  {
    titulo: 'Projetos',
    descricao: 'Projetos e marcos de compliance',
    itens: [
      { permissao: 'PROJETOS_READ', label: 'Ver' },
      { permissao: 'PROJETOS_WRITE', label: 'Criar e editar' },
    ],
  },
  {
    titulo: 'Tickets',
    descricao: 'Chamados abertos pelas empresas',
    itens: [
      { permissao: 'TICKETS_READ', label: 'Ver' },
      { permissao: 'TICKETS_WRITE', label: 'Criar, responder e mudar status' },
    ],
  },
  {
    titulo: 'Tarefas',
    descricao: 'Tarefas atribuídas aos membros',
    itens: [
      { permissao: 'TAREFAS_READ', label: 'Ver' },
      { permissao: 'TAREFAS_WRITE', label: 'Criar e concluir' },
    ],
  },
  {
    titulo: 'Agenda',
    descricao: 'Visitas agendadas',
    itens: [
      { permissao: 'VISITAS_READ', label: 'Ver' },
      { permissao: 'VISITAS_WRITE', label: 'Agendar e editar' },
    ],
  },
  {
    titulo: 'Leads',
    descricao: 'Funil comercial',
    itens: [
      { permissao: 'LEADS_READ', label: 'Ver' },
      { permissao: 'LEADS_WRITE', label: 'Criar e editar' },
    ],
  },
  {
    titulo: 'Interações',
    descricao: 'Histórico de contato com lead, empresa e projeto',
    itens: [
      { permissao: 'INTERACOES_READ', label: 'Ver' },
      { permissao: 'INTERACOES_WRITE', label: 'Registrar' },
    ],
  },
  {
    titulo: 'Consultores',
    descricao: 'Equipe técnica que atende as visitas',
    itens: [
      { permissao: 'CONSULTORES_READ', label: 'Ver' },
      { permissao: 'CONSULTORES_WRITE', label: 'Criar e editar' },
    ],
  },
  {
    titulo: 'Competências',
    descricao: 'Especialidades associadas aos consultores',
    itens: [
      { permissao: 'COMPETENCIAS_READ', label: 'Ver' },
      { permissao: 'COMPETENCIAS_WRITE', label: 'Criar e editar' },
    ],
  },
  {
    titulo: 'Painel e alertas',
    descricao: 'Visão geral e avisos de prazo',
    itens: [
      { permissao: 'DASHBOARD_READ', label: 'Ver o dashboard' },
      { permissao: 'NOTIFICACOES_READ', label: 'Ver notificações' },
    ],
  },
  {
    titulo: 'Administração',
    descricao: 'Quem entra no sistema e o que cada um pode fazer',
    itens: [
      { permissao: 'USUARIOS_READ', label: 'Ver membros' },
      { permissao: 'USUARIOS_MANAGE', label: 'Gerenciar membros' },
      { permissao: 'CARGOS_MANAGE', label: 'Gerenciar cargos' },
    ],
  },
];

// Quem pode escrever precisa poder ler: as rotas de listagem exigem READ, então
// um cargo só com WRITE conseguiria criar um registro e não conseguiria vê-lo
// depois. A tela marca o par automaticamente em vez de deixar montar um cargo
// quebrado e descobrir na prática.
export const LEITURA_IMPLICADA: Partial<Record<Permissao, Permissao>> = {
  EMPRESAS_WRITE: 'EMPRESAS_READ',
  PROJETOS_WRITE: 'PROJETOS_READ',
  TICKETS_WRITE: 'TICKETS_READ',
  TAREFAS_WRITE: 'TAREFAS_READ',
  VISITAS_WRITE: 'VISITAS_READ',
  LEADS_WRITE: 'LEADS_READ',
  INTERACOES_WRITE: 'INTERACOES_READ',
  CONSULTORES_WRITE: 'CONSULTORES_READ',
  COMPETENCIAS_WRITE: 'COMPETENCIAS_READ',
  // Gerenciar membros pressupõe vê-los: a listagem exige READ.
  USUARIOS_MANAGE: 'USUARIOS_READ',
};

// Cria os cargos da operação. Roda por fora da API pelo mesmo motivo do
// criar-usuario-inicial: o script não tem sessão, e a API exige um usuário
// autenticado com CARGOS_MANAGE para criar cargo.
//
// Uso, dentro do container:
//   node dist/prisma/criar-cargos-iniciais.js
//
// É idempotente: rodar duas vezes não duplica nem quebra, só regrava nível e
// permissões dos três cargos abaixo. Editar depois pela tela de Cargos é o
// caminho normal — este script existe só para não deixar você preenchendo três
// formulários na mão no primeiro dia.

import { PrismaClient } from '@prisma/client';
import { Permissao } from '../src/common/constants/permissoes';

const prisma = new PrismaClient();

// Níveis com buraco entre eles de propósito: cabe cargo novo no meio depois
// sem ter que renumerar a hierarquia inteira. O Desenvolvedor (110) fica acima
// de todos, e o Administrador do seed (100) segue existindo por enquanto.
const CARGOS: Array<{ nome: string; nivel: number; permissoes: Permissao[] }> = [
  {
    nome: 'CEO',
    // 100, não 90: é o nível que o CEO já tem em produção. Como o upsert abaixo
    // regrava o nível, deixar 90 aqui rebaixaria o CEO a cada execução.
    nivel: 100,
    // Tudo. Quem responde pela empresa precisa enxergar tudo e definir quem
    // faz o quê, inclusive mexer nos cargos abaixo do dele.
    permissoes: [
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
      'COMPETENCIAS_READ',
      'COMPETENCIAS_WRITE',
      'TAREFAS_READ',
      'TAREFAS_WRITE',
      'NOTIFICACOES_READ',
      'DASHBOARD_READ',
      'USUARIOS_READ',
      'USUARIOS_MANAGE',
      'CARGOS_MANAGE',
    ],
  },
  {
    nome: 'Coordenador',
    nivel: 60,
    // Opera tudo e gerencia a equipe abaixo, mas não redesenha a estrutura de
    // permissões: CARGOS_MANAGE fica de fora.
    permissoes: [
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
      'COMPETENCIAS_READ',
      'COMPETENCIAS_WRITE',
      'TAREFAS_READ',
      'TAREFAS_WRITE',
      'NOTIFICACOES_READ',
      'DASHBOARD_READ',
      // Coordenador vê a equipe, mas não contrata/edita/reseta: só READ.
      'USUARIOS_READ',
    ],
  },
  {
    nome: 'Analista de validação/qualificação',
    nivel: 30,
    // Executa: toca projeto, ticket, tarefa, visita e registra interação.
    // Empresas, leads e competências só de leitura — consulta o cadastro
    // para trabalhar, não é quem mantém o cadastro.
    permissoes: [
      'PROJETOS_READ',
      'PROJETOS_WRITE',
      'TICKETS_READ',
      'TICKETS_WRITE',
      'TAREFAS_READ',
      'TAREFAS_WRITE',
      'VISITAS_READ',
      'VISITAS_WRITE',
      'INTERACOES_READ',
      'INTERACOES_WRITE',
      'EMPRESAS_READ',
      'LEADS_READ',
      'COMPETENCIAS_READ',
      'NOTIFICACOES_READ',
      'DASHBOARD_READ',
    ],
  },
  {
    nome: 'Consultor',
    nivel: 20,
    // Quem faz a visita em campo. Só o que sustenta a própria agenda: ver a
    // empresa onde vai visitar e cuidar das próprias visitas. Não mexe em
    // projeto, ticket, lead nem vê a lista de membros — ajuste fino depois
    // pela tela de Cargos, se o dia a dia pedir mais.
    permissoes: [
      'VISITAS_READ',
      'VISITAS_WRITE',
      'EMPRESAS_READ',
      'COMPETENCIAS_READ',
      'NOTIFICACOES_READ',
      'DASHBOARD_READ',
    ],
  },
];

async function main() {
  for (const cargo of CARGOS) {
    const salvo = await prisma.cargo.upsert({
      where: { nome: cargo.nome },
      update: { nivel: cargo.nivel, permissoes: cargo.permissoes },
      create: cargo,
    });
    console.log(
      `  ${salvo.nome} — nível ${salvo.nivel}, ${salvo.permissoes.length} permissões`,
    );
  }

  console.log('');
  console.log('Cargos prontos. A hierarquia ficou assim:');
  const todos = await prisma.cargo.findMany({ orderBy: { nivel: 'desc' } });
  for (const c of todos) {
    const quantos = await prisma.user.count({ where: { cargoId: c.id } });
    console.log(`  ${String(c.nivel).padStart(3)}  ${c.nome} (${quantos} pessoa(s))`);
  }
  console.log('');
  console.log('Ajustes finos agora são pela tela de Cargos.');
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

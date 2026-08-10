import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { getUsuarioAtualId } from '../common/context/request-context';

// Soft delete e auditoria são duas coisas diferentes, e até 09/08/2026 elas
// compartilhavam o mesmo gatilho: só entrava na trilha quem tivesse
// `excluidoEm`. O efeito não era teórico. No retrato da produção de 07/08, dos
// 163 registros de auditoria, ZERO eram de User ou Cargo: criar conta, trocar o
// cargo de alguém, conceder acesso ao valor de contrato e desativar membro não
// deixavam rastro nenhum. As duas entidades mais sensíveis do sistema eram
// justamente as únicas sem trilha.
//
// Agora são dois conjuntos independentes.

// Quem tem `excluidoEm`. Decide o soft delete e o filtro de leitura, nada mais.
const MODELOS_COM_SOFT_DELETE = new Set(
  Prisma.dmmf.datamodel.models
    .filter((modelo) =>
      modelo.fields.some((campo) => campo.name === 'excluidoEm'),
    )
    .map((modelo) => modelo.name),
);

// Quem tem as colunas de autoria. Sem esta checagem, escrever `criadoPorId` num
// model que não tem a coluna (User, Cargo) estoura na hora do insert.
const MODELOS_COM_AUTORIA = new Set(
  Prisma.dmmf.datamodel.models
    .filter((modelo) =>
      modelo.fields.some((campo) => campo.name === 'criadoPorId'),
    )
    .map((modelo) => modelo.name),
);

// O que NÃO entra na trilha, e o motivo de cada um.
//
// É uma lista de exceções, e não uma lista de incluídos, de propósito: com
// allowlist, todo model novo nasce fora da auditoria e ninguém percebe, que é
// exatamente como User e Cargo ficaram de fora por dois meses. Com denylist, o
// padrão é auditar, e deixar algo de fora exige escrever o motivo aqui.
const FORA_DA_TRILHA = new Set([
  // Auditar o próprio log é laço infinito.
  'AuditLog',
  // Carimbo do heartbeat, reescrito uma vez por dia. Auditar produziria uma
  // linha diária que não responde pergunta nenhuma.
  'CronExecucao',
  // Criadas em lote pelo cron de compliance, todo dia. O log do cron já
  // registra quantas nasceram, e a trilha ficaria ilegível.
  'Notificacao',
  // Idem, e ainda muda a cada "marcar como lida". Quem leu e quando já está
  // gravado na própria linha, em lidaEm.
  'NotificacaoDestinatario',
]);

// Campos que NUNCA podem ser copiados para dentro do audit_log.
//
// A trilha guarda um retrato completo da linha em dadosAntes/dadosDepois.
// Passar User a auditar sem isto significaria escrever hash de senha e código
// de convite em texto puro dentro de audit_logs, numa tabela que ninguém pensa
// como sensível e que vai inteira para o arquivo de backup. Esta base já teve
// o código de convite vazando por `/users` e o senhaHash quase vazando pela
// agenda: é a mesma porta, abrindo pela terceira vez.
const CAMPOS_QUE_NUNCA_ENTRAM = new Set([
  'senhaHash',
  'codigoConvite',
  'codigoConviteHash',
]);

const OCULTO = '[oculto]';

// Exportada para ter teste próprio: é a linha de defesa entre a trilha de
// auditoria e o vazamento de credencial.
export function semSegredosParaAuditoria(valor: unknown): unknown {
  if (Array.isArray(valor)) {
    return valor.map(semSegredosParaAuditoria);
  }
  if (valor === null || typeof valor !== 'object') {
    return valor;
  }
  if (valor instanceof Date) {
    return valor;
  }
  const limpo: Record<string, unknown> = {};
  for (const [chave, conteudo] of Object.entries(
    valor as Record<string, unknown>,
  )) {
    // Substitui em vez de omitir: omitir faria "não tinha senha" e "tinha
    // senha e eu escondi" virarem o mesmo retrato, e a trilha existe para
    // dizer o que havia.
    limpo[chave] = CAMPOS_QUE_NUNCA_ENTRAM.has(chave)
      ? conteudo === null || conteudo === undefined
        ? conteudo
        : OCULTO
      : semSegredosParaAuditoria(conteudo);
  }
  return limpo;
}

// Escape hatch explícito p/ telas de auditoria: mesclar isto no `where` faz a
// chave 'excluidoEm' existir no objeto (mesmo com valor undefined), então o
// filtro automático abaixo não é aplicado e a consulta enxerga tudo.
export const INCLUIR_EXCLUIDOS = { excluidoEm: undefined } as const;

type Registro = Record<string, unknown>;

// $allOperations cobre todo model + toda operação numa única função. Como o
// Prisma não consegue discriminar a união de shapes de `args`/`query` por um
// valor de string conhecido só em runtime (`operation`), usamos aqui um shape
// local mínimo (only where/data, e um delegate genérico) com os poucos
// membros que de fato lemos/escrevemos. É a mesma limitação documentada nos
// próprios exemplos de extensão $allModels/$allOperations do Prisma.
interface DelegateGenerico {
  findFirst(args: { where?: Registro }): Promise<Registro | null>;
  findFirstOrThrow(args: { where?: Registro }): Promise<Registro>;
  findMany(args: { where?: Registro }): Promise<Registro[]>;
  update(args: { where?: Registro; data: Registro }): Promise<Registro>;
  updateMany(args: {
    where?: Registro;
    data: Registro;
  }): Promise<{ count: number }>;
}

type Continuacao = (args: unknown) => Promise<unknown>;

function delegateGenerico(db: PrismaClient, model: string): DelegateGenerico {
  const chave = model.charAt(0).toLowerCase() + model.slice(1);
  return (db as unknown as Record<string, DelegateGenerico>)[chave];
}

// Prisma.JsonValue não aceita Date/undefined aninhados; normalizamos via
// JSON.stringify/parse pra guardar um retrato serializável em AuditLog. A
// limpeza de segredo acontece ANTES da serialização, para nenhum caminho de
// escrita conseguir pular esse passo.
function paraJson(valor: unknown): Prisma.InputJsonValue | undefined {
  if (valor === undefined || valor === null) return undefined;
  return JSON.parse(
    JSON.stringify(semSegredosParaAuditoria(valor)),
  ) as Prisma.InputJsonValue;
}

// `args` do $allOperations é a união gigante de tipos do Prisma; aqui lemos
// where/data genericamente. Fazer o cast a partir de `unknown` num helper
// próprio deixa tsc e eslint concordarem (unknown→Registro é mudança de tipo
// legítima), sem precisar de eslint-disable no cast inline.
function comoRegistro(valor: unknown): Registro {
  return valor as Registro;
}

function comFiltroSoftDelete(where: Registro | undefined): Registro {
  if (where && 'excluidoEm' in where) {
    return where;
  }
  return { ...(where ?? {}), excluidoEm: null };
}

export function criarExtensaoAuditoria(db: PrismaClient) {
  return Prisma.defineExtension({
    name: 'auditoria-e-soft-delete',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || FORA_DA_TRILHA.has(model)) {
            return query(args);
          }

          const temSoftDelete = MODELOS_COM_SOFT_DELETE.has(model);
          const temAutoria = MODELOS_COM_AUTORIA.has(model);

          const delegate = delegateGenerico(db, model);
          const proximo = query as unknown as Continuacao;
          const argsObj = comoRegistro(args);
          const where = argsObj.where as Registro | undefined;
          const usuarioId = getUsuarioAtualId();

          const registrar = (
            acao: 'CREATE' | 'UPDATE' | 'DELETE',
            entidadeId: string,
            antes?: unknown,
            depois?: unknown,
          ) =>
            db.auditLog.create({
              data: {
                entidade: model,
                entidadeId,
                acao,
                usuarioId,
                dadosAntes: paraJson(antes),
                dadosDepois: paraJson(depois),
              },
            });

          switch (operation) {
            case 'create': {
              const dados = { ...(argsObj.data as Registro) };
              const id = (dados.id as string | undefined) ?? randomUUID();
              dados.id = id;
              // Só escreve autoria em quem tem a coluna. User e Cargo entram na
              // trilha e NÃO têm criadoPorId: sem esta guarda, cadastrar membro
              // passaria a estourar no insert.
              if (temAutoria) {
                dados.criadoPorId = usuarioId;
              }
              const resultado = await proximo({ ...argsObj, data: dados });
              await registrar('CREATE', id, undefined, resultado);
              return resultado;
            }

            case 'createMany': {
              const listaOriginal = argsObj.data as Registro[];
              const lista = listaOriginal.map((item) => ({
                ...item,
                id: (item.id as string | undefined) ?? randomUUID(),
                ...(temAutoria ? { criadoPorId: usuarioId } : {}),
              }));
              const resultado = await proximo({ ...argsObj, data: lista });
              await db.auditLog.createMany({
                data: lista.map((item) => ({
                  entidade: model,
                  entidadeId: item.id,
                  acao: 'CREATE' as const,
                  usuarioId,
                  dadosDepois: paraJson(item),
                })),
              });
              return resultado;
            }

            case 'update': {
              const antes = await delegate.findFirst({ where });
              const dados = {
                ...(argsObj.data as Registro),
                ...(temAutoria ? { atualizadoPorId: usuarioId } : {}),
              };
              const depois = await proximo({ ...argsObj, data: dados });
              await registrar(
                'UPDATE',
                (depois as Registro).id as string,
                antes,
                depois,
              );
              return depois;
            }

            case 'updateMany': {
              const antesLista = await delegate.findMany({ where });
              const dados = {
                ...(argsObj.data as Registro),
                ...(temAutoria ? { atualizadoPorId: usuarioId } : {}),
              };
              const resultado = await proximo({ ...argsObj, data: dados });

              if (antesLista.length) {
                const depoisLista = await delegate.findMany({
                  where: {
                    id: { in: antesLista.map((registro) => registro.id) },
                  },
                });
                const depoisPorId = new Map(
                  depoisLista.map((registro) => [
                    registro.id as string,
                    registro,
                  ]),
                );
                await db.auditLog.createMany({
                  data: antesLista.map((antes) => ({
                    entidade: model,
                    entidadeId: antes.id as string,
                    acao: 'UPDATE' as const,
                    usuarioId,
                    dadosAntes: paraJson(antes),
                    dadosDepois: paraJson(depoisPorId.get(antes.id as string)),
                  })),
                });
              }
              return resultado;
            }

            case 'delete': {
              const antes = await delegate.findFirst({ where });
              if (!antes) {
                // Deixa o Prisma seguir com a operação original e estourar o
                // erro padrão de "registro não encontrado" (P2025).
                return query(args);
              }

              // Sem excluidoEm não há como esconder: a exclusão é definitiva.
              // Vale para User e Cargo, e é justamente por ser irreversível que
              // registrar o retrato de antes importa mais aqui do que no soft
              // delete, onde a linha continua no banco.
              if (!temSoftDelete) {
                const resultado = await proximo(args);
                await registrar('DELETE', antes.id as string, antes);
                return resultado;
              }

              const excluido = await delegate.update({
                where,
                data: { excluidoEm: new Date() },
              });
              await registrar('DELETE', antes.id as string, antes);
              return excluido;
            }

            case 'deleteMany': {
              const antesLista = await delegate.findMany({ where });
              if (!antesLista.length) {
                return query(args);
              }

              const resultado = temSoftDelete
                ? await delegate.updateMany({
                    where,
                    data: { excluidoEm: new Date() },
                  })
                : await proximo(args);

              await db.auditLog.createMany({
                data: antesLista.map((antes) => ({
                  entidade: model,
                  entidadeId: antes.id as string,
                  acao: 'DELETE' as const,
                  usuarioId,
                  dadosAntes: paraJson(antes),
                })),
              });
              return resultado;
            }

            // Leitura só é tocada em quem tem soft delete. Em User e Cargo a
            // consulta passa intacta: injetar `excluidoEm: null` num model sem
            // a coluna estoura, e converter findUnique em findFirst custaria
            // índice único numa rota que roda a CADA request autenticada
            // (JwtStrategy busca o usuário pelo sub).
            case 'findUnique':
              if (!temSoftDelete) return query(args);
              // findUnique não aceita filtro extra no where (é resolvido via
              // índice único), então convertemos para findFirst/findFirstOrThrow
              // pra conseguir injetar excluidoEm: null.
              return delegate.findFirst({
                ...argsObj,
                where: comFiltroSoftDelete(where),
              });
            case 'findUniqueOrThrow':
              if (!temSoftDelete) return query(args);
              return delegate.findFirstOrThrow({
                ...argsObj,
                where: comFiltroSoftDelete(where),
              });

            case 'findFirst':
            case 'findFirstOrThrow':
            case 'findMany':
            case 'count':
            case 'aggregate':
            case 'groupBy':
              if (!temSoftDelete) return query(args);
              return proximo({ ...argsObj, where: comFiltroSoftDelete(where) });

            default:
              return query(args);
          }
        },
      },
    },
  });
}

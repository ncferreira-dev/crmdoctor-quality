import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { getUsuarioAtualId } from '../common/context/request-context';

// Descobre em runtime (via DMMF) quais models carregam excluidoEm/criadoPorId/
// atualizadoPorId, em vez de manter uma segunda lista hardcoded que poderia
// divergir do schema.prisma. User, Cargo e Notificacao não têm excluidoEm e
// por isso ficam automaticamente de fora do soft delete/auditoria.
const MODELOS_COM_SOFT_DELETE = new Set(
  Prisma.dmmf.datamodel.models
    .filter((modelo) => modelo.fields.some((campo) => campo.name === 'excluidoEm'))
    .map((modelo) => modelo.name),
);

// Escape hatch explícito p/ telas de auditoria: mesclar isto no `where` faz a
// chave 'excluidoEm' existir no objeto (mesmo com valor undefined), então o
// filtro automático abaixo não é aplicado e a consulta enxerga tudo.
export const INCLUIR_EXCLUIDOS = { excluidoEm: undefined } as const;

type Registro = Record<string, unknown>;

// $allOperations cobre todo model + toda operação numa única função. Como o
// Prisma não consegue discriminar a união de shapes de `args`/`query` por um
// valor de string conhecido só em runtime (`operation`), usamos aqui um shape
// local mínimo (only where/data, e um delegate genérico) com os poucos
// membros que de fato lemos/escrevemos — é a mesma limitação documentada nos
// próprios exemplos de extensão $allModels/$allOperations do Prisma.
interface DelegateGenerico {
  findFirst(args: { where?: Registro }): Promise<Registro | null>;
  findFirstOrThrow(args: { where?: Registro }): Promise<Registro>;
  findMany(args: { where?: Registro }): Promise<Registro[]>;
  update(args: { where?: Registro; data: Registro }): Promise<Registro>;
  updateMany(args: { where?: Registro; data: Registro }): Promise<{ count: number }>;
}

type Continuacao = (args: unknown) => Promise<unknown>;

function delegateGenerico(db: PrismaClient, model: string): DelegateGenerico {
  const chave = model.charAt(0).toLowerCase() + model.slice(1);
  return (db as unknown as Record<string, DelegateGenerico>)[chave];
}

// Prisma.JsonValue não aceita Date/undefined aninhados; normalizamos via
// JSON.stringify/parse pra guardar um retrato serializável em AuditLog.
function paraJson(valor: unknown): Prisma.InputJsonValue | undefined {
  if (valor === undefined || valor === null) return undefined;
  return JSON.parse(JSON.stringify(valor)) as Prisma.InputJsonValue;
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
          // AuditLog nunca é auditado (evita loop infinito) e nunca é soft-deletado.
          // Models sem excluidoEm (User, Cargo, Notificacao) também ficam de fora.
          if (!model || model === 'AuditLog' || !MODELOS_COM_SOFT_DELETE.has(model)) {
            return query(args);
          }

          const delegate = delegateGenerico(db, model);
          const proximo = query as unknown as Continuacao;
          const argsObj = args as Registro;
          const where = argsObj.where as Registro | undefined;
          const usuarioId = getUsuarioAtualId();

          switch (operation) {
            case 'create': {
              const dados = { ...(argsObj.data as Registro) };
              const id = (dados.id as string | undefined) ?? randomUUID();
              dados.id = id;
              dados.criadoPorId = usuarioId;
              const resultado = await proximo({ ...argsObj, data: dados });
              await db.auditLog.create({
                data: { entidade: model, entidadeId: id, acao: 'CREATE', usuarioId, dadosDepois: paraJson(resultado) },
              });
              return resultado;
            }

            case 'createMany': {
              const listaOriginal = argsObj.data as Registro[];
              const lista = listaOriginal.map((item) => ({
                ...item,
                id: (item.id as string | undefined) ?? randomUUID(),
                criadoPorId: usuarioId,
              }));
              const resultado = await proximo({ ...argsObj, data: lista });
              await db.auditLog.createMany({
                data: lista.map((item) => ({
                  entidade: model,
                  entidadeId: item.id as string,
                  acao: 'CREATE' as const,
                  usuarioId,
                  dadosDepois: paraJson(item),
                })),
              });
              return resultado;
            }

            case 'update': {
              const antes = await delegate.findFirst({ where });
              const dados = { ...(argsObj.data as Registro), atualizadoPorId: usuarioId };
              const depois = await proximo({ ...argsObj, data: dados });
              await db.auditLog.create({
                data: {
                  entidade: model,
                  entidadeId: (depois as Registro).id as string,
                  acao: 'UPDATE',
                  usuarioId,
                  dadosAntes: paraJson(antes),
                  dadosDepois: paraJson(depois),
                },
              });
              return depois;
            }

            case 'updateMany': {
              const antesLista = await delegate.findMany({ where });
              const dados = { ...(argsObj.data as Registro), atualizadoPorId: usuarioId };
              const resultado = await proximo({ ...argsObj, data: dados });

              if (antesLista.length) {
                const depoisLista = await delegate.findMany({
                  where: { id: { in: antesLista.map((registro) => registro.id) } },
                });
                const depoisPorId = new Map(depoisLista.map((registro) => [registro.id as string, registro]));
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
              const excluido = await delegate.update({ where, data: { excluidoEm: new Date() } });
              await db.auditLog.create({
                data: { entidade: model, entidadeId: antes.id as string, acao: 'DELETE', usuarioId, dadosAntes: paraJson(antes) },
              });
              return excluido;
            }

            case 'deleteMany': {
              const antesLista = await delegate.findMany({ where });
              if (!antesLista.length) {
                return query(args);
              }
              const resultado = await delegate.updateMany({ where, data: { excluidoEm: new Date() } });
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

            // findUnique não aceita filtro extra no where (é resolvido via
            // índice único), então convertemos para findFirst/findFirstOrThrow
            // pra conseguir injetar excluidoEm: null.
            case 'findUnique':
              return delegate.findFirst({ ...argsObj, where: comFiltroSoftDelete(where) });
            case 'findUniqueOrThrow':
              return delegate.findFirstOrThrow({ ...argsObj, where: comFiltroSoftDelete(where) });

            case 'findFirst':
            case 'findFirstOrThrow':
            case 'findMany':
            case 'count':
            case 'aggregate':
            case 'groupBy':
              return proximo({ ...argsObj, where: comFiltroSoftDelete(where) });

            default:
              return query(args);
          }
        },
      },
    },
  });
}

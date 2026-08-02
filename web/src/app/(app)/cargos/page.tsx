'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { usePermissao, useSessaoUsuario } from '../../../hooks/useSessao';
import { GRUPOS_PERMISSAO } from '../../../lib/permissoes';
import { Cargo, Usuario } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { CargoFormModal } from '../../../components/cargos/CargoFormModal';

export default function CargosPage() {
  const [cargos, setCargos] = useState<Cargo[] | null>(null);
  const [membros, setMembros] = useState<Usuario[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<{ aberto: boolean; cargo: Cargo | null }>({
    aberto: false,
    cargo: null,
  });
  const podeGerenciar = usePermissao('CARGOS_MANAGE');
  const eu = useSessaoUsuario();
  const meuNivel = eu?.cargo?.nivel ?? 0;

  function carregar() {
    api
      .get<Cargo[]>('/cargos')
      .then(setCargos)
      .catch((e: Error) => setErro(e.message));
    // Contagem de pessoas por cargo. Serve para dois avisos: mostrar quantos
    // usam cada cargo, e explicar por que a exclusão vai ser recusada.
    api
      .get<Usuario[]>('/users')
      .then(setMembros)
      .catch(() => setMembros([]));
  }

  useEffect(() => {
    carregar();
  }, []);

  async function excluir(cargo: Cargo) {
    if (!window.confirm(`Excluir o cargo ${cargo.nome}?`)) return;
    setErro(null);
    try {
      await api.del(`/cargos/${cargo.id}`);
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir o cargo');
    }
  }

  function quantosUsam(cargoId: string) {
    return membros.filter((m) => m.cargoId === cargoId).length;
  }

  // Rótulo em português de cada permissão, para mostrar no card sem repetir a
  // constante crua da API.
  function rotulos(cargo: Cargo) {
    return GRUPOS_PERMISSAO.flatMap((g) =>
      g.itens
        .filter((i) => cargo.permissoes.includes(i.permissao))
        .map((i) => `${g.titulo}: ${i.label.toLowerCase()}`),
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="titulo-pagina">Cargos</h1>
        {podeGerenciar && (
          <Button onClick={() => setModal({ aberto: true, cargo: null })}>Novo cargo</Button>
        )}
      </div>

      <p className="mb-4 max-w-2xl text-sm leading-relaxed text-ink/55">
        O cargo define duas coisas: o que a pessoa vê no sistema e quem ela pode gerenciar. O nível
        é a hierarquia, e número maior manda em número menor. Ninguém edita cargo nem membro de
        nível igual ou acima do seu.
      </p>

      {erro && (
        <p role="alert" className="mb-3 text-xs text-accent">
          {erro}
        </p>
      )}

      {!cargos ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-card bg-white/60" />
          ))}
        </div>
      ) : cargos.length === 0 ? (
        <div className="rounded-card border border-ink/10 bg-white p-8 text-center shadow-card">
          <p className="text-sm text-ink/50">Nenhum cargo cadastrado.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {cargos.map((cargo) => {
            const emUso = quantosUsam(cargo.id);
            // Espelha a regra do backend (exigirNivelMenor): igual ou acima do
            // seu nível é intocável. Mostrar o botão aqui só produziria 403.
            const podeMexer = podeGerenciar && cargo.nivel < meuNivel;

            return (
              <div
                key={cargo.id}
                className="rounded-card border border-ink/10 bg-white p-4 shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold leading-tight text-ink">{cargo.nome}</p>
                      <Badge tom="destaque">Nível {cargo.nivel}</Badge>
                      {cargo.nivel === meuNivel && <Badge>O seu cargo</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-ink/55">
                      {emUso === 0
                        ? 'Ninguém usa este cargo'
                        : `${emUso} ${emUso === 1 ? 'pessoa usa' : 'pessoas usam'} este cargo`}
                      {' · '}
                      {cargo.permissoes.length}{' '}
                      {cargo.permissoes.length === 1 ? 'permissão' : 'permissões'}
                    </p>
                  </div>

                  {podeMexer && (
                    <div className="flex flex-wrap gap-2">
                      <Button variante="ghost" onClick={() => setModal({ aberto: true, cargo })}>
                        Editar
                      </Button>
                      <Button
                        variante="danger"
                        onClick={() => excluir(cargo)}
                        disabled={emUso > 0}
                        title={
                          emUso > 0
                            ? 'Mova as pessoas para outro cargo antes de excluir'
                            : undefined
                        }
                      >
                        Excluir
                      </Button>
                    </div>
                  )}
                </div>

                {cargo.permissoes.length === 0 ? (
                  <p className="mt-3 border-t border-ink/10 pt-3 text-xs text-accent">
                    Sem permissão nenhuma. Quem tem este cargo entra e não vê nada.
                  </p>
                ) : (
                  <ul className="mt-3 flex flex-wrap gap-1.5 border-t border-ink/10 pt-3">
                    {rotulos(cargo).map((rotulo) => (
                      <li
                        key={rotulo}
                        className="rounded-md bg-surface px-2 py-0.5 text-[11px] text-ink/60"
                      >
                        {rotulo}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CargoFormModal
        aberto={modal.aberto}
        cargo={modal.cargo}
        meuNivel={meuNivel}
        onFechar={() => setModal({ aberto: false, cargo: null })}
        onMudou={() => {
          setModal({ aberto: false, cargo: null });
          carregar();
        }}
      />
    </div>
  );
}

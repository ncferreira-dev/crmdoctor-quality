'use client';

import { FormEvent, useState } from 'react';
import { api } from '../../lib/api';
import { GRUPOS_PERMISSAO, LEITURA_IMPLICADA } from '../../lib/permissoes';
import { Cargo, Permissao } from '../../types';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface CargoFormModalProps {
  aberto: boolean;
  cargo?: Cargo | null;
  // Nível de quem está usando a tela. O backend recusa criar ou editar cargo de
  // nível igual ou maior; a tela impede antes, no próprio campo.
  meuNivel: number;
  onFechar: () => void;
  onMudou: () => void;
}

export function CargoFormModal({
  aberto,
  cargo,
  meuNivel,
  onFechar,
  onMudou,
}: CargoFormModalProps) {
  return (
    <Modal aberto={aberto} titulo={cargo ? 'Editar cargo' : 'Novo cargo'} onFechar={onFechar}>
      {/* O formulário é um componente à parte, montado do zero a cada abertura
          (o Modal não renderiza os filhos fechado, e a key troca junto com o
          cargo). Assim o estado inicial vem direto das props, sem um effect
          sincronizando estado — que é o que a regra set-state-in-effect barra. */}
      <FormularioCargo
        key={cargo?.id ?? 'novo'}
        cargo={cargo}
        meuNivel={meuNivel}
        onFechar={onFechar}
        onMudou={onMudou}
      />
    </Modal>
  );
}

function FormularioCargo({
  cargo,
  meuNivel,
  onFechar,
  onMudou,
}: Omit<CargoFormModalProps, 'aberto'>) {
  const editando = Boolean(cargo);
  const [selecionadas, setSelecionadas] = useState<Set<Permissao>>(
    () => new Set(cargo?.permissoes ?? []),
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function alternar(permissao: Permissao) {
    setSelecionadas((atual) => {
      const proxima = new Set(atual);
      if (proxima.has(permissao)) {
        proxima.delete(permissao);
      } else {
        proxima.add(permissao);
        // Marcar "criar e editar" traz "ver" junto: sem leitura, o cargo cria
        // registros que não consegue listar depois.
        const leitura = LEITURA_IMPLICADA[permissao];
        if (leitura) proxima.add(leitura);
      }
      return proxima;
    });
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    const corpo = {
      nome: String(form.get('nome')).trim(),
      nivel: Number(form.get('nivel')),
      permissoes: [...selecionadas],
    };

    setSalvando(true);
    setErro(null);
    try {
      if (cargo) {
        await api.patch(`/cargos/${cargo.id}`, corpo);
      } else {
        await api.post('/cargos', corpo);
      }
      onMudou();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar o cargo');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <Input
        id="nome"
        name="nome"
        label="Nome do cargo"
        placeholder="Diretoria, Consultor, Analista"
        defaultValue={cargo?.nome ?? ''}
        required
        autoFocus
      />

      <div className="flex flex-col gap-1">
        <Input
          id="nivel"
          name="nivel"
          label="Nível"
          type="number"
          min={1}
          max={meuNivel - 1}
          defaultValue={cargo?.nivel ?? ''}
          required
        />
        <p className="text-[11px] leading-relaxed text-ink/45">
          Número maior manda em número menor. Quem tem nível mais alto gerencia quem tem nível mais
          baixo, e ninguém mexe em cargo de nível igual ou acima do seu. O seu nível é {meuNivel},
          então o máximo que você pode criar aqui é {meuNivel - 1}.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-light uppercase tracking-wide text-ink/60">Permissões</span>
        <div className="flex flex-col gap-2">
          {GRUPOS_PERMISSAO.map((grupo) => (
            <fieldset key={grupo.titulo} className="rounded-md border border-ink/10 px-3 py-2.5">
              <legend className="px-1 text-xs font-semibold text-ink">{grupo.titulo}</legend>
              <p className="text-[11px] text-ink/45">{grupo.descricao}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                {grupo.itens.map((item) => (
                  <label
                    key={item.permissao}
                    className="flex cursor-pointer items-center gap-2 text-sm text-ink/80"
                  >
                    <input
                      type="checkbox"
                      checked={selecionadas.has(item.permissao)}
                      onChange={() => alternar(item.permissao)}
                      className="size-4 accent-brand"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        <p className="text-[11px] text-ink/45">
          Cargo sem nenhuma permissão marcada entra no sistema e não vê nada.
        </p>
      </div>

      {erro && (
        <p role="alert" className="text-xs text-accent">
          {erro}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variante="ghost" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando}>
          {salvando ? 'Salvando...' : editando ? 'Salvar' : 'Criar cargo'}
        </Button>
      </div>
    </form>
  );
}

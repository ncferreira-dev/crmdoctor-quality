'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useSessaoUsuario } from '../../hooks/useSessao';
import { Cargo, Competencia, Usuario } from '../../types';
import {
  ErrosForm,
  focarPrimeiroErro,
  temErro,
  validarObrigatorios,
} from '../../lib/formulario';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface MembroFormModalProps {
  aberto: boolean;
  membro?: Usuario | null;
  onFechar: () => void;
  onMudou: () => void;
}

export function MembroFormModal({ aberto, membro, onFechar, onMudou }: MembroFormModalProps) {
  const editando = Boolean(membro);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  // Nível de quem está logado, para não oferecer cargo que a API vai recusar.
  const meuNivel = useSessaoUsuario()?.cargo.nivel ?? null;
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [competenciasSelecionadas, setCompetenciasSelecionadas] = useState<Set<string>>(
    () => new Set(membro?.competencias?.map((c) => c.id) ?? []),
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erros, setErros] = useState<ErrosForm>({});
  // O código só existe no instante da criação — é o que se repassa ao membro.
  const [codigoGerado, setCodigoGerado] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    // setState só no callback assíncrono (react-hooks/set-state-in-effect):
    // chamar direto no corpo do effect dispara render em cascata.
    api
      .get<Cargo[]>('/cargos')
      .then((lista) => {
        setCargos(lista);
        setCodigoGerado(null);
        setErro(null);
      })
      .catch(() => setCargos([]));
    api
      .getTodos<Competencia>('/competencias')
      .then(setCompetencias)
      .catch(() => setCompetencias([]));
  }, [aberto]);

  function alternarCompetencia(id: string) {
    setCompetenciasSelecionadas((atual) => {
      const proxima = new Set(atual);
      if (proxima.has(id)) proxima.delete(id);
      else proxima.add(id);
      return proxima;
    });
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);

    const problemas = validarObrigatorios(form, {
      nome: 'Informe o nome do membro.',
      email: 'Informe o e-mail, que é como a pessoa entra no sistema.',
      cargoId: 'Escolha o cargo, que é o que define o acesso.',
    });
    const email = String(form.get('email') ?? '');
    if (!problemas.email && !email.includes('@')) {
      problemas.email = 'Este e-mail não parece válido.';
    }
    if (temErro(problemas)) {
      setErros(problemas);
      focarPrimeiroErro(problemas);
      return;
    }
    setErros({});

    const corpo = {
      nome: String(form.get('nome')),
      email: String(form.get('email')),
      telefone: String(form.get('telefone')) || undefined,
      cargoId: String(form.get('cargoId')),
      especialidade: String(form.get('especialidade')) || undefined,
      competenciaIds: [...competenciasSelecionadas],
    };

    setSalvando(true);
    setErro(null);
    try {
      if (membro) {
        await api.patch(`/users/${membro.id}`, corpo);
        onMudou();
      } else {
        const criado = await api.post<Usuario & { codigoConvite: string }>('/users', corpo);
        // Não fecha o modal: precisa mostrar o código antes de sumir.
        setCodigoGerado(criado.codigoConvite);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar o membro');
    } finally {
      setSalvando(false);
    }
  }

  // Tela de código gerado — o passo mais importante do cadastro.
  if (codigoGerado) {
    return (
      <Modal aberto={aberto} titulo="Membro cadastrado" onFechar={onFechar}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink/70">
            Envie este código de primeiro acesso ao membro. Ele vai usá-lo para definir a própria
            senha.
          </p>
          <div className="rounded-card bg-surface p-5 text-center">
            <p className="dado text-3xl font-semibold tracking-[0.2em] text-brand">
              {codigoGerado}
            </p>
          </div>
          <p className="text-[11px] text-ink/45">
            Guarde agora: por segurança, o código não é exibido de novo. Se ele se perder, é
            possível gerar um novo na lista de membros.
          </p>
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setCodigoGerado(null);
                onMudou();
              }}
            >
              Concluir
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal aberto={aberto} titulo={editando ? 'Editar membro' : 'Novo membro'} onFechar={onFechar}>
      <form onSubmit={enviar} noValidate className="flex flex-col gap-3">
        <Input
          id="nome"
          name="nome"
          label="Nome"
          defaultValue={membro?.nome ?? ''}
          erro={erros.nome}
          autoFocus
        />
        <Input
          id="email"
          name="email"
          label="E-mail"
          type="email"
          defaultValue={membro?.email ?? ''}
          erro={erros.email}
        />
        <Input
          id="telefone"
          name="telefone"
          label="Telefone"
          defaultValue={membro?.telefone ?? ''}
          placeholder="(11) 90000-0000"
        />
        <Select
          id="cargoId"
          name="cargoId"
          label="Cargo"
          defaultValue={membro?.cargoId ?? ''}
          erro={erros.cargoId}
        >
          <option value="">Selecione o cargo</option>
          {cargos.map((c) => {
            // A hierarquia é por nível, e a API recusa criar ou editar alguém
            // com cargo de nível igual ou maior que o de quem está logado. Sem
            // desabilitar aqui, a tela oferece uma opção que só vai falhar
            // depois de preencher o formulário inteiro. A regra é relativa:
            // para o Nícolas (110) só o próprio cargo some, para o Fabrício
            // (100) somem CEO e Desenvolvedor.
            const foraDoAlcance = meuNivel !== null && c.nivel >= meuNivel;
            return (
              <option key={c.id} value={c.id} disabled={foraDoAlcance}>
                {c.nome}
                {foraDoAlcance ? ' (do seu nível para cima)' : ''}
              </option>
            );
          })}
        </Select>

        <div className="flex flex-col gap-2 rounded-md border border-ink/10 px-3 py-2.5">
          <span className="text-xs font-light uppercase tracking-wide text-ink/60">
            Consultor (opcional)
          </span>
          <p className="text-[11px] text-ink/45">
            Só preencha se este membro faz visita técnica em cliente.
          </p>
          <Input
            id="especialidade"
            name="especialidade"
            label="Especialidade"
            defaultValue={membro?.especialidade ?? ''}
            placeholder="Ex: Auditoria de BPF, Segurança de alimentos"
          />
          {competencias.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-light uppercase tracking-wide text-ink/60">
                Competências
              </span>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {competencias.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 text-sm text-ink/80"
                  >
                    <input
                      type="checkbox"
                      checked={competenciasSelecionadas.has(c.id)}
                      onChange={() => alternarCompetencia(c.id)}
                      className="size-4 accent-brand"
                    />
                    {c.nome}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {!editando && (
          <p className="text-[11px] text-ink/45">
            O membro receberá um código de primeiro acesso para definir a própria senha. Ninguém
            além dele escolhe a senha.
          </p>
        )}

        {erro && (
          <p role="alert" className="text-xs text-accent">
            {erro}
          </p>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variante="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando ? 'Salvando...' : editando ? 'Salvar' : 'Cadastrar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

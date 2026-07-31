'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Cargo, Usuario } from '../../types';
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
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
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
  }, [aberto]);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    const corpo = {
      nome: String(form.get('nome')),
      email: String(form.get('email')),
      telefone: String(form.get('telefone')) || undefined,
      cargoId: String(form.get('cargoId')),
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
      <form onSubmit={enviar} className="flex flex-col gap-3">
        <Input id="nome" name="nome" label="Nome" defaultValue={membro?.nome ?? ''} required autoFocus />
        <Input
          id="email"
          name="email"
          label="E-mail"
          type="email"
          defaultValue={membro?.email ?? ''}
          required
        />
        <Input
          id="telefone"
          name="telefone"
          label="Telefone"
          defaultValue={membro?.telefone ?? ''}
          placeholder="(11) 90000-0000"
        />
        <Select id="cargoId" name="cargoId" label="Cargo" defaultValue={membro?.cargoId ?? ''} required>
          <option value="" disabled>
            Selecione o cargo
          </option>
          {cargos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Select>

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

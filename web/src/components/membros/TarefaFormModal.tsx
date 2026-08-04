'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Projeto, ResultadoPaginado, Usuario } from '../../types';
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

interface TarefaFormModalProps {
  aberto: boolean;
  // Membro que vai receber a tarefa.
  membro: Usuario | null;
  // Título alternativo para quando o membro é o próprio usuário logado:
  // "Nova tarefa para Renata Coordenação" soa como atribuição a outra pessoa
  // quando quem lê é a Renata.
  tituloProprio?: string;
  onFechar: () => void;
  onMudou: () => void;
}

export function TarefaFormModal({
  aberto,
  membro,
  tituloProprio,
  onFechar,
  onMudou,
}: TarefaFormModalProps) {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erros, setErros] = useState<ErrosForm>({});

  useEffect(() => {
    if (!aberto) return;
    // setState só dentro do callback assíncrono: chamar direto no corpo do
    // effect dispara render em cascata (react-hooks/set-state-in-effect).
    api
      .get<ResultadoPaginado<Projeto>>('/projetos?limit=100')
      .then((r) => {
        setProjetos(r.data);
        setErro(null);
      })
      .catch(() => setProjetos([]));
  }, [aberto]);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!membro) return;
    const form = new FormData(evento.currentTarget);

    const problemas = validarObrigatorios(form, { titulo: 'Diga o que precisa ser feito.' });
    if (temErro(problemas)) {
      setErros(problemas);
      focarPrimeiroErro(problemas);
      return;
    }
    setErros({});

    const prazo = String(form.get('prazo'));
    const projetoId = String(form.get('projetoId'));

    setSalvando(true);
    setErro(null);
    try {
      await api.post('/tarefas', {
        titulo: String(form.get('titulo')),
        descricao: String(form.get('descricao')) || undefined,
        responsavelId: membro.id,
        projetoId: projetoId || undefined,
        prazo: prazo ? `${prazo}T12:00:00.000Z` : undefined,
      });
      onMudou();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar a tarefa');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      aberto={aberto}
      titulo={tituloProprio ?? (membro ? `Nova tarefa para ${membro.nome}` : 'Nova tarefa')}
      onFechar={onFechar}
    >
      <form onSubmit={enviar} noValidate className="flex flex-col gap-3">
        <Input
          id="titulo"
          name="titulo"
          label="Tarefa"
          placeholder="Ex: Revisar dossiê da Clínica X"
          erro={erros.titulo}
          autoFocus
        />
        <Input id="descricao" name="descricao" label="Detalhes" />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select id="projetoId" name="projetoId" label="Projeto (opcional)" defaultValue="">
            <option value="">Sem projeto</option>
            {projetos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.titulo}
              </option>
            ))}
          </Select>
          <Input id="prazo" name="prazo" label="Prazo" type="date" />
        </div>

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
            {salvando ? 'Enviando...' : 'Enviar tarefa'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

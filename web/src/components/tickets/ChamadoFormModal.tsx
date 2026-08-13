'use client';

import { FormEvent, useState } from 'react';
import { api } from '../../lib/api';
import { EmpresaDoTicket, Ticket } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { ErrosForm, focarPrimeiroErro, temErro, validarObrigatorios } from '../../lib/formulario';

interface ChamadoFormModalProps {
  aberto: boolean;
  // null cria, preenchido edita. Um campo só para os dois casos: dois booleanos
  // separados deixariam existir o estado impossível "criando e editando ao
  // mesmo tempo".
  ticket: Ticket | null;
  // Quando vem preenchido, o chamado nasce nesta empresa e o seletor some. É o
  // caso do bloco dentro da tela da empresa, onde perguntar de qual cliente é o
  // chamado seria perguntar o que a tela inteira já responde.
  empresaFixaId?: string;
  // Opções do seletor quando não há empresa fixa (tela global de Chamados).
  empresas?: EmpresaDoTicket[];
  onFechar: () => void;
  onSalvo: () => void;
}

export function ChamadoFormModal({
  aberto,
  ticket,
  empresaFixaId,
  empresas = [],
  onFechar,
  onSalvo,
}: ChamadoFormModalProps) {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erros, setErros] = useState<ErrosForm>({});

  // A empresa é escolhida só na criação. Mover um chamado de cliente é outra
  // operação, com outras consequências (o histórico do cliente antigo perde a
  // linha), e não é o que alguém quer ao corrigir um título.
  const escolheEmpresa = !empresaFixaId && ticket === null;

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);

    const achados = validarObrigatorios(form, {
      titulo: 'Escreva um título para o chamado',
      ...(escolheEmpresa ? { empresaId: 'Escolha a empresa do chamado' } : {}),
    });
    setErros(achados);
    if (temErro(achados)) {
      focarPrimeiroErro(achados);
      return;
    }

    // O corpo manda só título, descrição e prioridade. Status e primeira
    // resposta têm rotas próprias, e mandá-los aqui seria pedido recusado: o
    // ValidationPipe roda com forbidNonWhitelisted e devolve 400 para campo
    // fora do DTO (item 26 do ENTREGA.md).
    const corpo = {
      titulo: String(form.get('titulo')).trim(),
      descricao: String(form.get('descricao') ?? '').trim() || undefined,
      prioridade: Number(form.get('prioridade')),
    };

    setSalvando(true);
    setErro(null);
    try {
      if (ticket) {
        await api.patch(`/tickets/${ticket.id}`, corpo);
      } else {
        await api.post('/tickets', {
          ...corpo,
          empresaId: empresaFixaId ?? String(form.get('empresaId')),
        });
      }
      setErros({});
      onSalvo();
    } catch (e) {
      const acao = ticket ? 'salvar as mudanças do' : 'abrir o';
      setErro(e instanceof Error ? e.message : `Não foi possível ${acao} chamado`);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      aberto={aberto}
      titulo={ticket ? 'Editar chamado' : 'Novo chamado'}
      onFechar={onFechar}
    >
      {/* key remonta o formulário ao trocar de chamado: sem isso o
          defaultValue do React guarda o valor do chamado anterior, que é a
          mesma armadilha já documentada no formulário da agenda. */}
      <form key={ticket?.id ?? 'novo'} onSubmit={salvar} noValidate className="flex flex-col gap-3">
        {escolheEmpresa && (
          <Select
            id="empresaId"
            name="empresaId"
            label="Empresa"
            erro={erros.empresaId}
            defaultValue=""
          >
            <option value="">Escolha a empresa</option>
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nome}
              </option>
            ))}
          </Select>
        )}

        <Input
          id="titulo"
          name="titulo"
          label="Título"
          erro={erros.titulo}
          defaultValue={ticket?.titulo ?? ''}
          autoFocus
        />
        <Input
          id="descricao"
          name="descricao"
          label="Descrição"
          defaultValue={ticket?.descricao ?? ''}
        />
        <Select
          id="prioridade"
          name="prioridade"
          label="Prioridade"
          defaultValue={String(ticket?.prioridade ?? 2)}
          ajuda="A prioridade define o prazo de resposta do chamado."
        >
          <option value="1">Alta</option>
          <option value="2">Média</option>
          <option value="3">Baixa</option>
        </Select>

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
            {salvando ? 'Salvando...' : ticket ? 'Salvar' : 'Abrir chamado'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { EmpresaCliente, Projeto, Usuario } from '../../types';
import {
  ErrosForm,
  focarPrimeiroErro,
  temErro,
  validarObrigatorios,
} from '../../lib/formulario';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { CampoData } from '../ui/CampoData';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface ProjetoFormModalProps {
  aberto: boolean;
  projeto?: Projeto | null;
  // Quando aberto de dentro de uma empresa, a empresa já vem travada.
  empresaFixaId?: string;
  onFechar: () => void;
  onMudou: () => void;
}

export function ProjetoFormModal({
  aberto,
  projeto,
  empresaFixaId,
  onFechar,
  onMudou,
}: ProjetoFormModalProps) {
  const editando = Boolean(projeto);
  const [empresas, setEmpresas] = useState<EmpresaCliente[]>([]);
  const [pessoas, setPessoas] = useState<Pick<Usuario, 'id' | 'nome'>[]>([]);
  // Set e não array: a marcação é por pertencer ou não, e Set diz isso melhor
  // do que indexOf espalhado pelo componente.
  // Semente vem da prop no primeiro render, e não de um effect: a regra
  // react-hooks/set-state-in-effect proíbe sincronizar estado com prop assim.
  // Quem garante que a semente é a do projeto certo é o `key` no ponto de uso,
  // que remonta o modal ao trocar de projeto. Mesmo desenho do formulário da
  // agenda.
  const [equipe, setEquipe] = useState<Set<string>>(
    () => new Set((projeto?.equipe ?? []).map((p) => p.id)),
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erros, setErros] = useState<ErrosForm>({});

  useEffect(() => {
    if (!aberto || empresaFixaId) return;
    api
      .getTodos<EmpresaCliente>('/empresas')
      .then(setEmpresas)
      .catch(() => setEmpresas([]));
  }, [aberto, empresaFixaId]);

  useEffect(() => {
    if (!aberto) return;
    // A mesma rota que a agenda usa para o seletor de consultor: devolve id e
    // nome de quem está ativo, e o gate dela é VISITAS_READ de propósito, para
    // montar equipe sem precisar enxergar o cadastro de membros inteiro.
    api
      .get<Pick<Usuario, 'id' | 'nome'>[]>('/visitas/consultores')
      .then(setPessoas)
      .catch(() => setPessoas([]));
  }, [aberto]);

  function alternarPessoa(id: string) {
    setEquipe((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  // O texto muda com o tamanho porque a palavra "equipe" só faz sentido a
  // partir de duas pessoas. Uma pessoa sozinha é responsável, não equipe.
  const resumoDaEquipe =
    equipe.size === 0
      ? 'ninguém ainda'
      : equipe.size === 1
        ? 'responsável'
        : `equipe de ${equipe.size}`;

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    const valorBruto = String(form.get('valor'));
    const dataLimite = String(form.get('dataLimiteCompliance'));

    const obrigatorios: Record<string, string> = { titulo: 'Dê um título ao projeto.' };
    // A empresa só é campo do formulário quando o projeto está nascendo fora da
    // tela de uma empresa.
    if (!editando && !empresaFixaId) {
      obrigatorios.empresaId = 'Escolha a empresa do projeto.';
    }
    const problemas = validarObrigatorios(form, obrigatorios);
    if (temErro(problemas)) {
      setErros(problemas);
      focarPrimeiroErro(problemas);
      return;
    }
    setErros({});

    const corpo = {
      titulo: String(form.get('titulo')),
      descricao: String(form.get('descricao')) || undefined,
      // A API espera ISO 8601; o input dá só a data, então fixamos meio-dia UTC
      // para a data não "voltar um dia" ao ser convertida no fuso local.
      dataLimiteCompliance: dataLimite ? `${dataLimite}T12:00:00.000Z` : undefined,
      valor: valorBruto ? Number(valorBruto) : undefined,
      equipeIds: [...equipe],
      ...(editando ? {} : { empresaId: empresaFixaId ?? String(form.get('empresaId')) }),
    };

    setSalvando(true);
    setErro(null);
    try {
      if (projeto) {
        await api.patch(`/projetos/${projeto.id}`, corpo);
      } else {
        await api.post('/projetos', corpo);
      }
      onMudou();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar o projeto');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!projeto) return;
    setSalvando(true);
    try {
      await api.del(`/projetos/${projeto.id}`);
      onMudou();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal aberto={aberto} titulo={editando ? 'Editar projeto' : 'Novo projeto'} onFechar={onFechar}>
      <form onSubmit={enviar} noValidate className="flex flex-col gap-3">
        <Input
          id="titulo"
          name="titulo"
          label="Título"
          defaultValue={projeto?.titulo ?? ''}
          placeholder="Ex: Auditoria RDC 430"
          erro={erros.titulo}
          autoFocus
        />

        {!editando && !empresaFixaId && (
          <Select
            id="empresaId"
            name="empresaId"
            label="Empresa"
            defaultValue=""
            erro={erros.empresaId}
          >
            <option value="">Selecione a empresa</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </Select>
        )}

        <Input id="descricao" name="descricao" label="Descrição" defaultValue={projeto?.descricao ?? ''} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CampoData
            id="dataLimiteCompliance"
            name="dataLimiteCompliance"
            label="Prazo de compliance"
            defaultValue={projeto?.dataLimiteCompliance}
          />
          <Input
            id="valor"
            name="valor"
            label="Valor (R$)"
            type="number"
            step="0.01"
            min="0"
            defaultValue={projeto?.valor ?? ''}
          />
        </div>

        <p className="text-[11px] text-ink/45">
          O prazo alimenta o alerta automático de compliance, disparado quando faltarem 15 dias.
        </p>

        {/* Equipe do projeto. Não existe entidade "Equipe" no sistema: a equipe
            é quem está neste projeto, e muda a cada contrato. Uma pessoa é o
            responsável; da segunda em diante, a tela passa a chamar de equipe. */}
        {pessoas.length > 0 && (
          <div className="flex flex-col gap-1.5 rounded-md border border-ink/10 px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-light uppercase tracking-wide text-ink/60">
                Quem toca este projeto
              </span>
              <span className="dado text-[11px] text-ink/45">{resumoDaEquipe}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {pessoas.map((pessoa) => (
                <label
                  key={pessoa.id}
                  className="flex cursor-pointer items-center gap-2 text-sm text-ink/80"
                >
                  <input
                    type="checkbox"
                    checked={equipe.has(pessoa.id)}
                    onChange={() => alternarPessoa(pessoa.id)}
                    className="size-4 accent-brand"
                  />
                  {pessoa.nome}
                </label>
              ))}
            </div>
          </div>
        )}

        {erro && (
          <p role="alert" className="text-xs text-accent">
            {erro}
          </p>
        )}

        <div className="mt-2 flex items-center justify-between">
          {editando ? (
            <Button type="button" variante="danger" onClick={excluir} disabled={salvando}>
              Excluir
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variante="ghost" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

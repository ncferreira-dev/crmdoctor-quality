'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { usePermissao } from '../../hooks/useSessao';
import {
  ConsultorDaVisita,
  EmpresaCliente,
  Projeto,
  ResultadoPaginado,
  StatusVisita,
  Visita,
} from '../../types';
import { STATUS_VISITA_LABEL } from '../../lib/formato';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

const STATUS = Object.keys(STATUS_VISITA_LABEL) as StatusVisita[];

// Converte um Date para o valor de <input type="datetime-local"> (sem 'Z',
// no fuso local do navegador — que aqui é America/Sao_Paulo).
function paraInputLocal(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const ajustado = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return ajustado.toISOString().slice(0, 16);
}

interface VisitaFormModalProps {
  aberto: boolean;
  visita?: Visita | null;
  // Pré-preenche início/fim quando o usuário clica num dia/hora vazio.
  inicioSugerido?: string;
  // Os projetos já carregados pela agenda. Vêm de fora para o modal não repetir
  // a mesma consulta a cada abertura.
  projetos: Projeto[];
  onFechar: () => void;
  onMudou: () => void;
}

export function VisitaFormModal({
  aberto,
  visita,
  inicioSugerido,
  projetos,
  onFechar,
  onMudou,
}: VisitaFormModalProps) {
  const editando = Boolean(visita);
  const [empresas, setEmpresas] = useState<EmpresaCliente[]>([]);
  const [consultores, setConsultores] = useState<Pick<ConsultorDaVisita, 'id' | 'nome'>[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const podeEditar = usePermissao('VISITAS_WRITE');

  // Empresa e projeto são controlados, e não defaultValue como o resto do
  // formulário, por dois motivos: a lista de projetos depende da empresa
  // escolhida (projeto é sempre de uma empresa só), e as opções chegam da API
  // depois do primeiro render. Com defaultValue, o valor gravado se perdia:
  // no instante da montagem a opção certa ainda não existia no select, e
  // defaultValue não é reaplicado quando ela aparece.
  //
  // O estado nasce direto da prop, sem effect de sincronia: quem garante que
  // ele começa certo a cada abertura é a `key` que a agenda passa neste
  // componente, que o remonta. Sincronizar por effect violaria a regra
  // react-hooks/set-state-in-effect e renderizaria a tela duas vezes.
  const [empresaId, setEmpresaId] = useState(visita?.empresaId ?? '');
  const [projetoId, setProjetoId] = useState(visita?.projetoId ?? '');

  // Trocar a empresa invalida o projeto escolhido: ele é da empresa anterior, e
  // a API recusa essa combinação. Melhor limpar do que deixar a pessoa salvar
  // para descobrir no erro.
  function trocarEmpresa(novaEmpresaId: string) {
    setEmpresaId(novaEmpresaId);
    if (novaEmpresaId !== visita?.empresaId) {
      setProjetoId('');
    } else {
      setProjetoId(visita?.projetoId ?? '');
    }
  }

  const projetosDaEmpresa = projetos.filter(
    (projeto) => projeto.empresaId === empresaId && projeto.estagio !== 'CONCLUIDO',
  );

  useEffect(() => {
    if (!aberto) return;
    api
      .get<ResultadoPaginado<EmpresaCliente>>('/empresas?limit=100')
      .then((r) => setEmpresas(r.data))
      .catch(() => setEmpresas([]));
    api
      .get<Pick<ConsultorDaVisita, 'id' | 'nome'>[]>('/visitas/consultores')
      .then(setConsultores)
      .catch(() => setConsultores([]));
  }, [aberto]);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    const inicio = new Date(String(form.get('inicio'))).toISOString();
    const fim = new Date(String(form.get('fim'))).toISOString();

    const corpo = {
      empresaId: String(form.get('empresaId')),
      consultorId: String(form.get('consultorId')),
      // null (e não undefined) quando ninguém escolheu projeto: é assim que a
      // edição desvincula. undefined significaria "não mexi neste campo".
      projetoId: String(form.get('projetoId')) || null,
      inicio,
      fim,
      tipoServico: String(form.get('tipoServico')),
      status: String(form.get('status')) as StatusVisita,
      observacoes: String(form.get('observacoes')) || undefined,
    };

    setSalvando(true);
    setErro(null);
    try {
      if (visita) {
        await api.patch(`/visitas/${visita.id}`, corpo);
      } else {
        await api.post('/visitas', corpo);
      }
      onMudou();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar a visita');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!visita) return;
    setSalvando(true);
    try {
      await api.del(`/visitas/${visita.id}`);
      onMudou();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal aberto={aberto} titulo={editando ? 'Editar visita' : 'Nova visita'} onFechar={onFechar}>
      <form onSubmit={enviar} className="flex flex-col gap-3">
        <Select
          id="empresaId"
          name="empresaId"
          label="Local (empresa)"
          value={empresaId}
          onChange={(evento) => trocarEmpresa(evento.target.value)}
          required
        >
          <option value="" disabled>
            Selecione a empresa
          </option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </Select>

        <Select
          id="projetoId"
          name="projetoId"
          label="Projeto"
          value={projetoId}
          onChange={(evento) => setProjetoId(evento.target.value)}
          disabled={!empresaId}
          ajuda={
            !empresaId
              ? 'Escolha a empresa primeiro.'
              : projetosDaEmpresa.length === 0
                ? 'Esta empresa não tem projeto em andamento. A visita fica sem vínculo.'
                : 'Opcional. Vincule quando a visita for execução de um projeto.'
          }
        >
          <option value="">Sem projeto</option>
          {projetosDaEmpresa.map((projeto) => (
            <option key={projeto.id} value={projeto.id}>
              {projeto.titulo}
            </option>
          ))}
        </Select>

        <Select id="consultorId" name="consultorId" label="Consultor" defaultValue={visita?.consultorId ?? ''} required>
          <option value="" disabled>
            Selecione o consultor
          </option>
          {consultores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Input
            id="inicio"
            name="inicio"
            label="Início"
            type="datetime-local"
            defaultValue={paraInputLocal(visita?.inicio ?? inicioSugerido)}
            required
          />
          <Input
            id="fim"
            name="fim"
            label="Fim"
            type="datetime-local"
            defaultValue={paraInputLocal(visita?.fim)}
            required
          />
        </div>

        <Input
          id="tipoServico"
          name="tipoServico"
          label="Tipo de serviço"
          defaultValue={visita?.tipoServico ?? ''}
          placeholder="Ex: Auditoria, Treinamento, Diagnóstico"
          required
        />

        <Select id="status" name="status" label="Status" defaultValue={visita?.status ?? 'AGENDADA'}>
          {STATUS.map((s) => (
            <option key={s} value={s}>
              {STATUS_VISITA_LABEL[s]}
            </option>
          ))}
        </Select>

        <Input id="observacoes" name="observacoes" label="Observações" defaultValue={visita?.observacoes ?? ''} />

        {erro && <p className="text-xs text-accent">{erro}</p>}

        <div className="mt-2 flex items-center justify-between">
          {editando && podeEditar ? (
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
            {podeEditar && (
              <Button type="submit" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}

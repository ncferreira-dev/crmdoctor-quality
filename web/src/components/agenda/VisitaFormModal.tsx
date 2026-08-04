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

const STATUS = Object.keys(STATUS_VISITA_LABEL) as StatusVisita[];

// Converte um Date para o valor de <input type="datetime-local"> (sem 'Z',
// no fuso local do navegador — que aqui é America/Sao_Paulo).
function paraInputLocal(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const ajustado = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return ajustado.toISOString().slice(0, 16);
}

// Uma hora depois, no mesmo formato do input. Duração padrão de visita: é o
// palpite que acerta na maioria e que a pessoa corrige em dois cliques quando
// erra.
function umaHoraDepois(valorDoInput: string): string {
  if (!valorDoInput) return '';
  // O valor do input não tem fuso, então o Date já nasce no horário local.
  // paraInputLocal faz a conversão de volta sozinho: compensar o fuso aqui
  // também somava as 3 horas duas vezes e sugeria fim 4 horas depois.
  const data = new Date(valorDoInput);
  if (Number.isNaN(data.getTime())) return '';
  data.setHours(data.getHours() + 1);
  return paraInputLocal(data.toISOString());
}

interface VisitaFormModalProps {
  aberto: boolean;
  visita?: Visita | null;
  // Pré-preenche início/fim quando o usuário clica num dia/hora vazio.
  inicioSugerido?: string;
  // Os projetos já carregados pela agenda. Vêm de fora para o modal não repetir
  // a mesma consulta a cada abertura.
  projetos: Projeto[];
  // Os tipos de serviço já usados em visitas anteriores, para sugerir em vez de
  // deixar cada pessoa inventar a própria grafia.
  tiposDeServico: string[];
  onFechar: () => void;
  onMudou: () => void;
}

export function VisitaFormModal({
  aberto,
  visita,
  inicioSugerido,
  projetos,
  tiposDeServico,
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
  const [inicio, setInicio] = useState(paraInputLocal(visita?.inicio ?? inicioSugerido));
  // Visita nova já abre com o fim uma hora depois. Em visita existente vale o
  // que está gravado.
  const [fim, setFim] = useState(
    visita ? paraInputLocal(visita.fim) : umaHoraDepois(paraInputLocal(inicioSugerido)),
  );
  const [erros, setErros] = useState<ErrosForm>({});

  // Visita nova nasce com o fim uma hora depois do início, e mexer no início
  // arrasta o fim junto enquanto ele ainda não foi editado à mão. Antes o campo
  // vinha vazio e cobrava uma digitação que quase sempre é "uma hora depois".
  // Em visita já existente o fim gravado manda, e nada é arrastado.
  function trocarInicio(novoInicio: string) {
    setInicio(novoInicio);
    // Mexeu no horário, some o erro de horário: manter a mensagem cobrando algo
    // que a pessoa acabou de corrigir é ruído.
    setErros((atuais) => {
      const limpos = { ...atuais };
      delete limpos.inicio;
      delete limpos.fim;
      return limpos;
    });
    if (!novoInicio) return;

    const fimEsperadoAntes = umaHoraDepois(inicio);
    const fimFoiEditadoAMao = fim !== '' && fim !== fimEsperadoAntes;
    if (!fimFoiEditadoAMao) {
      setFim(umaHoraDepois(novoInicio));
    }
  }

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

    // Validação própria, com a mensagem embaixo do campo. O formulário tem
    // noValidate para o navegador não disparar o balão dele por cima.
    const problemas = validarObrigatorios(form, {
      empresaId: 'Escolha a empresa da visita.',
      consultorId: 'Escolha quem vai fazer a visita.',
      inicio: 'Informe quando a visita começa.',
      fim: 'Informe quando a visita termina.',
      tipoServico: 'Diga o que será feito na visita.',
    });
    // Regra que o navegador não tem como conhecer, e que a API recusaria depois.
    if (!problemas.fim && inicio && fim && new Date(fim) <= new Date(inicio)) {
      problemas.fim = 'O fim precisa ser depois do início.';
    }
    if (temErro(problemas)) {
      setErros(problemas);
      focarPrimeiroErro(problemas);
      return;
    }
    setErros({});

    const corpo = {
      empresaId: String(form.get('empresaId')),
      consultorId: String(form.get('consultorId')),
      // null (e não undefined) quando ninguém escolheu projeto: é assim que a
      // edição desvincula. undefined significaria "não mexi neste campo".
      projetoId: String(form.get('projetoId')) || null,
      inicio: new Date(String(form.get('inicio'))).toISOString(),
      fim: new Date(String(form.get('fim'))).toISOString(),
      tipoServico: String(form.get('tipoServico')).trim(),
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
      {/* noValidate: quem valida é o design system, com a mensagem embaixo do
          campo. O balão nativo do navegador aparecia solto num canto da tela,
          longe do campo que estava cobrando. */}
      <form onSubmit={enviar} noValidate className="flex flex-col gap-3">
        <Select
          id="empresaId"
          name="empresaId"
          label="Local (empresa)"
          value={empresaId}
          onChange={(evento) => trocarEmpresa(evento.target.value)}
          erro={erros.empresaId}
        >
          <option value="">Selecione a empresa</option>
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

        <Select
          id="consultorId"
          name="consultorId"
          label="Consultor"
          defaultValue={visita?.consultorId ?? ''}
          erro={erros.consultorId}
        >
          <option value="">Selecione o consultor</option>
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
            value={inicio}
            onChange={(evento) => trocarInicio(evento.target.value)}
            erro={erros.inicio}
          />
          <Input
            id="fim"
            name="fim"
            label="Fim"
            type="datetime-local"
            value={fim}
            onChange={(evento) => setFim(evento.target.value)}
            erro={erros.fim}
          />
        </div>

        {/* Lista das opções já usadas, com o campo livre continuando livre.
            Sem isto, "Auditoria", "auditoria" e "AUDITORIA" viram três coisas
            diferentes no terceiro cadastro. Um <datalist> resolve sem inventar
            uma tabela nova nem tirar de ninguém a chance de escrever um tipo
            que ainda não existe. */}
        <Input
          id="tipoServico"
          name="tipoServico"
          label="Tipo de serviço"
          defaultValue={visita?.tipoServico ?? ''}
          placeholder="Ex: Auditoria, Treinamento, Diagnóstico"
          list="tipos-de-servico"
          erro={erros.tipoServico}
          ajuda={
            tiposDeServico.length > 0
              ? 'Escolha um dos já usados ou escreva um novo.'
              : undefined
          }
        />
        <datalist id="tipos-de-servico">
          {tiposDeServico.map((tipo) => (
            <option key={tipo} value={tipo} />
          ))}
        </datalist>

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

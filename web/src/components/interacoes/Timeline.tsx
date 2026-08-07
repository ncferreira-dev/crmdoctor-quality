'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { usePermissao } from '../../hooks/useSessao';
import { Interacao } from '../../types';
import {
  TIPOS_INTERACAO,
  TIPO_INTERACAO_LABEL,
  formatarData,
  formatarDataHora,
} from '../../lib/formato';
import { ErrosForm, focarPrimeiroErro, temErro, validarObrigatorios } from '../../lib/formulario';
import { Button } from '../ui/Button';
import { CampoData } from '../ui/CampoData';
import { EstadoErro } from '../ui/EstadoErro';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';

// Linha do tempo do relacionamento.
//
// POR QUE ELA EXISTE: sem isto o CRM é um cadastro, não uma memória. A pergunta
// que aparece toda semana numa consultoria é "o que a gente já falou com essa
// empresa?", e a resposta morava na cabeça de quem atendeu, ou no WhatsApp de
// alguém. Quando essa pessoa sai de férias, a empresa perde o histórico.
//
// As duas rotas já existiam na API desde o começo e nunca tiveram tela.
//
// O vínculo é um só por seção: na empresa, mostra o que é da empresa; no
// projeto, o que é do projeto. Misturar os dois faria o histórico da empresa
// engolir o do projeto, e é no projeto que mora a conversa que interessa quando
// o prazo aperta.

interface TimelineProps {
  // Exatamente um dos dois. A seção é a mesma; o vínculo é que muda.
  empresaId?: string;
  projetoId?: string;
  // Texto do estado vazio, que muda conforme o contexto.
  vazio: string;
}

// Data e hora quando o contato foi hoje ou ontem (a hora importa para saber se
// já ligaram de manhã), só a data quando é mais antigo.
function quando(iso: string): string {
  const agora = new Date();
  const data = new Date(iso);
  const diasDeDiferenca = Math.floor(
    (agora.getTime() - data.getTime()) / (24 * 60 * 60 * 1000),
  );
  return diasDeDiferenca <= 1 ? formatarDataHora(iso) : formatarData(iso);
}

export function Timeline({ empresaId, projetoId, vazio }: TimelineProps) {
  const [interacoes, setInteracoes] = useState<Interacao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [erros, setErros] = useState<ErrosForm>({});
  const podeEscrever = usePermissao('INTERACOES_WRITE');
  const podeLer = usePermissao('INTERACOES_READ');

  const query = empresaId ? `empresaId=${empresaId}` : `projetoId=${projetoId}`;

  const carregar = useCallback(() => {
    // Sem permissão nem chega a chamar: a API responderia 403 e a tela exibiria
    // "Permissão necessária: INTERACOES_READ", que é jargão de backend.
    if (!podeLer) return;
    api
      .getTodos<Interacao>(`/interacoes?${query}`)
      .then((lista) => {
        setInteracoes(lista);
        setErro(null);
      })
      .catch((e: Error) => setErro(e.message));
  }, [query, podeLer]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    const resumo = String(form.get('resumo') ?? '').trim();
    const data = String(form.get('data') ?? '');

    const achados = validarObrigatorios(form, {
      resumo: 'Escreva o que aconteceu neste contato',
    });
    setErros(achados);
    if (temErro(achados)) {
      focarPrimeiroErro(achados);
      return;
    }

    setSalvando(true);
    setErroForm(null);
    try {
      await api.post('/interacoes', {
        tipo: String(form.get('tipo')),
        resumo,
        // Meio-dia de propósito, como no resto do sistema: às 00:00 o fuso
        // empurra a data para o dia anterior.
        data: data ? `${data}T12:00:00.000Z` : undefined,
        empresaId,
        projetoId,
      });
      setAberto(false);
      setErros({});
      carregar();
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : 'Não foi possível registrar o contato');
    } finally {
      setSalvando(false);
    }
  }

  if (!podeLer) return null;

  return (
    <div className="rounded-card border border-ink/10 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <p className="text-xs font-light uppercase tracking-wide text-ink/60">Histórico</p>
          {interacoes && interacoes.length > 0 && (
            <span className="dado text-xs text-ink/45">
              {interacoes.length} {interacoes.length === 1 ? 'contato' : 'contatos'}
            </span>
          )}
        </div>
        {podeEscrever && (
          <Button variante="secondary" onClick={() => setAberto(true)}>
            Registrar contato
          </Button>
        )}
      </div>

      {erro ? (
        <EstadoErro
          oQue="o histórico"
          detalhe={erro}
          onTentarDeNovo={() => {
            setErro(null);
            carregar();
          }}
        />
      ) : !interacoes ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-card bg-surface" />
          ))}
        </div>
      ) : interacoes.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-ink/55">{vazio}</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-ink/40">
            Cada ligação, e-mail ou reunião registrada aqui fica no sistema, e não na memória de
            quem atendeu.
          </p>
          {podeEscrever && (
            <Button className="mt-4" onClick={() => setAberto(true)}>
              Registrar o primeiro
            </Button>
          )}
        </div>
      ) : (
        // Fio vertical à esquerda: a lista é cronológica e o fio é o que faz
        // ela ser lida como história, e não como mais uma tabela.
        <ol className="relative flex flex-col gap-4 border-l border-ink/10 pl-5">
          {interacoes.map((interacao) => (
            <li key={interacao.id} className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-[23px] top-1.5 h-2 w-2 rounded-full bg-brand"
              />
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-brand">
                  {TIPO_INTERACAO_LABEL[interacao.tipo]}
                </span>
                <span className="dado text-xs text-ink/45">{quando(interacao.data)}</span>
                {interacao.registradoPor && (
                  <span className="text-xs text-ink/40">por {interacao.registradoPor.nome}</span>
                )}
              </div>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink/80">
                {interacao.resumo}
              </p>
            </li>
          ))}
        </ol>
      )}

      <Modal aberto={aberto} titulo="Registrar contato" onFechar={() => setAberto(false)}>
        <form onSubmit={salvar} noValidate className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select id="tipo" name="tipo" label="Tipo" defaultValue="LIGACAO">
              {TIPOS_INTERACAO.map((t) => (
                <option key={t} value={t}>
                  {TIPO_INTERACAO_LABEL[t]}
                </option>
              ))}
            </Select>
            <CampoData
              id="data"
              name="data"
              label="Quando"
              ajuda="Deixe vazio para hoje"
            />
          </div>

          <Input
            id="resumo"
            name="resumo"
            label="O que aconteceu"
            erro={erros.resumo}
            placeholder="Ex: ligamos e ficou de mandar o dossiê até sexta"
            autoFocus
          />

          {erroForm && (
            <p role="alert" className="text-xs text-accent">
              {erroForm}
            </p>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variante="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Registrar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

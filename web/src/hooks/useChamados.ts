'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, statusDoErro } from '../lib/api';
import { StatusTicket, Ticket } from '../types';

// Carregar e mexer em chamado, num lugar só.
//
// As duas telas que mostram chamado (a lista global e o bloco dentro da
// empresa) fazem exatamente as mesmas três coisas: buscar, carimbar a primeira
// resposta e mudar o status, as duas últimas de forma otimista. Escrever isso
// duas vezes é como as regras se separam: uma tela ganharia o desfazer em caso
// de erro e a outra não, e a diferença só apareceria no dia em que a API
// recusasse.

interface UseChamados {
  chamados: Ticket[] | null;
  erro: string | null;
  // Separa "seu cargo não tem acesso" de "deu erro, tente de novo". Ver
  // EstadoErro.
  statusErro: number | undefined;
  // Qual chamado está com a resposta sendo carimbada agora, para o botão não
  // aceitar dois cliques e gerar o 409 de "já teve a primeira resposta".
  respondendoId: string | null;
  recarregar: () => void;
  limparErro: () => void;
  registrarResposta: (ticket: Ticket) => Promise<void>;
  mudarStatus: (ticket: Ticket, status: StatusTicket) => Promise<void>;
}

// `caminho` vazio significa "não busque nada", e é como a tela evita chamar uma
// rota que ela já sabe que vai responder 403: sem a permissão, a API recusaria
// e a tela mostraria "Permissão necessária: TICKETS_READ", que é jargão de
// backend na cara de quem só queria trabalhar. Hook não roda dentro de
// condição, então a condição entra pelo argumento.
export function useChamados(caminho: string, aoMudar?: () => void): UseChamados {
  const [chamados, setChamados] = useState<Ticket[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [statusErro, setStatusErro] = useState<number | undefined>(undefined);
  const [respondendoId, setRespondendoId] = useState<string | null>(null);

  const recarregar = useCallback(() => {
    if (!caminho) return;
    // Percorre a paginação até o fim. Antes eram os 20 primeiros da rota
    // paginada, e uma empresa com 21 chamados perdia o vigésimo primeiro sem
    // aviso nenhum na tela.
    api
      .getTodos<Ticket>(caminho)
      .then((lista) => {
        setChamados(lista);
        setErro(null);
        setStatusErro(undefined);
      })
      .catch((e: Error) => {
        setErro(e.message);
        setStatusErro(statusDoErro(e));
      });
  }, [caminho]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  // Troca o chamado pela versão que a API devolveu. Toda rota de ticket devolve
  // a empresa junto, então a linha não perde o nome do cliente no clique.
  const substituir = useCallback((atualizado: Ticket) => {
    setChamados(
      (atual) => atual?.map((c) => (c.id === atualizado.id ? atualizado : c)) ?? null,
    );
  }, []);

  // Carimba a primeira resposta. Não é uma caixa de mensagem: o endpoint não
  // recebe texto, só marca a hora. É desse carimbo que depende o "Em atraso" —
  // o chamado fica atrasado enquanto passa do prazo da prioridade sem primeira
  // resposta registrada. Sem esta ação, todo chamado vencido ficava marcado
  // como atrasado para sempre, mesmo já atendido.
  const registrarResposta = useCallback(
    async (ticket: Ticket) => {
      setErro(null);
      setRespondendoId(ticket.id);
      try {
        substituir(await api.patch<Ticket>(`/tickets/${ticket.id}/responder`));
        aoMudar?.();
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Não foi possível registrar a resposta');
        setStatusErro(statusDoErro(e));
      } finally {
        setRespondendoId(null);
      }
    },
    [aoMudar, substituir],
  );

  const mudarStatus = useCallback(
    async (ticket: Ticket, status: StatusTicket) => {
      // Otimista: reflete na hora, reverte se a API recusar. O status é um
      // <select> na linha, e esperar a rede para mostrar a escolha faz o campo
      // parecer travado.
      const anterior = chamados;
      setChamados((atual) => atual?.map((c) => (c.id === ticket.id ? { ...c, status } : c)) ?? null);
      setErro(null);
      try {
        substituir(await api.patch<Ticket>(`/tickets/${ticket.id}/status`, { status }));
        aoMudar?.();
      } catch (e) {
        setChamados(anterior);
        setErro(e instanceof Error ? e.message : 'Não foi possível mudar o status');
        setStatusErro(statusDoErro(e));
      }
    },
    [aoMudar, chamados, substituir],
  );

  const limparErro = useCallback(() => {
    setErro(null);
    setStatusErro(undefined);
  }, []);

  return {
    chamados,
    erro,
    statusErro,
    respondendoId,
    recarregar,
    limparErro,
    registrarResposta,
    mudarStatus,
  };
}

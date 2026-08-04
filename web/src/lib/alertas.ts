import { Notificacao } from '../types';
import { api } from './api';

// Fonte única dos alertas de compliance em aberto.
//
// Existe porque duas telas mostram a MESMA informação: o sino no cabeçalho e o
// painel do dashboard. Com estado separado em cada uma, marcar um alerta como
// lido no painel deixaria o número do sino errado até alguém recarregar a
// página, e a tela passaria a se contradizer sozinha.
//
// Mesmo padrão da store de sessão em lib/auth.ts: um valor em módulo mais um
// conjunto de ouvintes, consumido por useSyncExternalStore. O array só troca de
// identidade quando muda de verdade, que é o que impede o re-render infinito.

let alertas: Notificacao[] | null = null;
let carregandoAgora: Promise<void> | null = null;
const ouvintes = new Set<() => void>();

function avisar() {
  ouvintes.forEach((ouvinte) => ouvinte());
}

export function assinarAlertas(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

export function getAlertas(): Notificacao[] | null {
  return alertas;
}

// null no servidor: useSyncExternalStore exige um retorno estável no SSR, e
// alerta é dado de sessão, que não existe lá.
export function getAlertasNoServidor(): Notificacao[] | null {
  return null;
}

// Chamadas simultâneas (sino e dashboard montando juntos) compartilham a mesma
// requisição em vez de baterem duas vezes na API.
export function carregarAlertas(): Promise<void> {
  if (carregandoAgora) return carregandoAgora;

  carregandoAgora = api
    .get<Notificacao[]>('/notificacoes?lida=false')
    .then((lista) => {
      alertas = lista;
      avisar();
    })
    .catch(() => {
      // Falha de rede não vira lista vazia: dizer "nenhum alerta" quando na
      // verdade não se sabe é pior do que continuar mostrando o que se sabia.
      if (alertas === null) {
        alertas = [];
        avisar();
      }
    })
    .finally(() => {
      carregandoAgora = null;
    });

  return carregandoAgora;
}

export async function marcarAlertaLido(id: string): Promise<void> {
  const antes = alertas;
  // Some da tela na hora. A confirmação do servidor vem depois; se falhar,
  // o estado anterior volta.
  alertas = (alertas ?? []).filter((alerta) => alerta.id !== id);
  avisar();

  try {
    await api.patch(`/notificacoes/${id}/lida`);
  } catch (erro) {
    alertas = antes;
    avisar();
    throw erro;
  }
}

// Usado ao sair da sessão, para o próximo login não herdar os alertas de quem
// estava logado antes.
export function limparAlertas() {
  alertas = null;
  avisar();
}

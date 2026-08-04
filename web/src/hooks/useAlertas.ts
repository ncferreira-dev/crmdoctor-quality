'use client';

import { useSyncExternalStore } from 'react';
import { Notificacao } from '../types';
import { assinarAlertas, getAlertas, getAlertasNoServidor } from '../lib/alertas';

// Lê a store de lib/alertas.ts. Quem monta a lista é o SinoNotificacoes, que
// carrega e revalida; este hook só entrega o que já está lá, para o sino e o
// painel do dashboard mostrarem sempre o mesmo número.
//
// null significa "ainda não sei", que é diferente de lista vazia. As telas usam
// essa distinção para escolher entre esqueleto e estado vazio.
export function useAlertas(): Notificacao[] | null {
  return useSyncExternalStore(assinarAlertas, getAlertas, getAlertasNoServidor);
}

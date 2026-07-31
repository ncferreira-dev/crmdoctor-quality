'use client';

import { useSyncExternalStore } from 'react';
import { Permissao } from '../types';
import { getUser, temPermissao } from '../lib/auth';

// A sessão vive no localStorage e não muda durante a vida da página, então não
// há nada a assinar: a store é estática. useSyncExternalStore entra aqui pelo
// getServerSnapshot — ele devolve o valor neutro no SSR e evita divergência de
// hidratação, sem precisar de setState dentro de effect (que dispara render em
// cascata e é justamente o que a regra react-hooks/set-state-in-effect barra).
const semAssinatura = () => () => {};

export function usePermissao(permissao: Permissao): boolean {
  return useSyncExternalStore(
    semAssinatura,
    () => temPermissao(permissao),
    () => false,
  );
}

export function useNomeUsuario(): string {
  return useSyncExternalStore(
    semAssinatura,
    () => getUser()?.nome ?? '',
    () => '',
  );
}

'use client';

import { useSyncExternalStore } from 'react';
import { Permissao, Usuario } from '../types';
import { assinarSessao, getUser, temPermissao } from '../lib/auth';

// A sessão vive no localStorage e a store de auth.ts avisa quando ela muda
// (login/logout). useSyncExternalStore entra aqui pelo getServerSnapshot — ele
// devolve o valor neutro no SSR e evita divergência de hidratação, sem precisar
// de setState dentro de effect (que dispara render em cascata e é justamente o
// que a regra react-hooks/set-state-in-effect barra).

export function usePermissao(permissao: Permissao): boolean {
  return useSyncExternalStore(
    assinarSessao,
    () => temPermissao(permissao),
    () => false,
  );
}

export function useSessaoUsuario(): Usuario | null {
  return useSyncExternalStore(assinarSessao, getUser, () => null);
}

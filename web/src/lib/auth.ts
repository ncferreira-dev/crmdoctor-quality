import { Permissao, Usuario } from '../types';

const OITO_HORAS_EM_SEGUNDOS = 60 * 60 * 8;

export function getUser(): Usuario | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  return raw ? (JSON.parse(raw) as Usuario) : null;
}

export function salvarSessao(accessToken: string, user: Usuario) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('user', JSON.stringify(user));
  // Cookie espelho só pra o middleware (server-side) conseguir checar se existe token.
  document.cookie = `accessToken=${accessToken}; path=/; max-age=${OITO_HORAS_EM_SEGUNDOS}`;
}

export function limparSessao() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
  document.cookie = 'accessToken=; path=/; max-age=0';
}

export function temPermissao(permissao: Permissao): boolean {
  return !!getUser()?.cargo.permissoes.includes(permissao);
}

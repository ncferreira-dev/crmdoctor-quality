import { Permissao, Usuario } from '../types';

// Mesma duração do JWT na API (auth.module). Se mudar lá, mude aqui: cookie
// vivendo mais que o token gera bounce silencioso; menos, desloga à toa.
const SETE_DIAS_EM_SEGUNDOS = 60 * 60 * 24 * 7;

// Store mínima da sessão. Existe porque getUser() faz JSON.parse e devolveria
// um objeto novo a cada chamada — e useSyncExternalStore compara por
// identidade, o que causaria re-render infinito. O cache é invalidado
// explicitamente quando a sessão muda (login/logout), e os assinantes são
// avisados para a UI acompanhar.
let cache: Usuario | null | undefined;
const ouvintes = new Set<() => void>();

function invalidar() {
  cache = undefined;
  ouvintes.forEach((ouvinte) => ouvinte());
}

export function assinarSessao(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

export function getUser(): Usuario | null {
  if (typeof window === 'undefined') return null;
  if (cache === undefined) {
    const raw = localStorage.getItem('user');
    cache = raw ? (JSON.parse(raw) as Usuario) : null;
  }
  return cache;
}

export function salvarSessao(accessToken: string, user: Usuario) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('user', JSON.stringify(user));
  // Cookie espelho só pra o middleware (server-side) conseguir checar se existe token.
  document.cookie = `accessToken=${accessToken}; path=/; max-age=${SETE_DIAS_EM_SEGUNDOS}`;
  invalidar();
}

// Atualiza só o usuário guardado, mantendo o token. Serve pra quando a pessoa
// edita o próprio perfil: sem isto o nome novo só apareceria na sidebar depois
// de sair e entrar de novo.
export function atualizarUsuarioSessao(user: Usuario) {
  localStorage.setItem('user', JSON.stringify(user));
  invalidar();
}

export function limparSessao() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
  document.cookie = 'accessToken=; path=/; max-age=0';
  invalidar();
}

export function temPermissao(permissao: Permissao): boolean {
  return !!getUser()?.cargo.permissoes.includes(permissao);
}

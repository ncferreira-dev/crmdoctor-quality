import { ResultadoPaginado } from '../types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

function limparSessaoERedirecionar() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
  document.cookie = 'accessToken=; path=/; max-age=0';
  // ?de= devolve a pessoa à página em que estava depois do novo login, e é o
  // que faz a tela de login mostrar o aviso de sessão expirada.
  const de = window.location.pathname;
  window.location.href = de && de !== '/' ? `/login?de=${encodeURIComponent(de)}` : '/login';
}

// Erro com status, para a tela poder distinguir "não posso" de "deu ruim".
export class ErroDaApi extends Error {
  constructor(
    mensagem: string,
    readonly status: number,
  ) {
    super(mensagem);
    this.name = 'ErroDaApi';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  // Content-Type só quando existe corpo, e a razão é de rede, não de estilo.
  //
  // Mandado em toda requisição, ele torna a chamada "não simples" para o CORS,
  // e o navegador passa a fazer um OPTIONS antes de CADA uma. Medido na aba de
  // rede: toda chamada aparecia duas vezes. Num GET sem corpo o cabeçalho ainda
  // é mentira, porque não há conteúdo nenhum para tipar.
  const temCorpo = options.body !== undefined;

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    cache: 'no-store',
    headers: {
      ...(temCorpo ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // 401 no próprio login é credencial errada, não sessão expirada. Sem essa
  // exceção o tratamento abaixo recarregaria a página de login a cada senha
  // errada, apagando o que a pessoa digitou antes de ela ler o erro.
  if (response.status === 401 && !path.startsWith('/auth/login')) {
    limparSessaoERedirecionar();
    throw new Error('Sessão expirada');
  }

  if (!response.ok) {
    const corpo = await response.json().catch(() => null);
    const mensagem = Array.isArray(corpo?.message) ? corpo.message.join(', ') : (corpo?.message ?? response.statusText);
    // O status vem junto porque a tela precisa dele: 403 e 500 pedem frases
    // diferentes e desfechos diferentes. Antes tudo virava `new Error(texto)` e
    // a tela tratava falta de permissão como falha passageira, oferecendo um
    // "Tentar de novo" que nunca ia funcionar.
    throw new ErroDaApi(mensagem, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// Teto do @Max(100) no PaginacaoDto da API: pedir mais que 100 devolve 400.
const MAXIMO_POR_PAGINA = 100;

// Trava de segurança. 20 páginas são 2000 registros; acima disso a tela não
// deveria estar carregando tudo de uma vez, e sim buscando no servidor. O corte
// é registrado no console em vez de acontecer calado, que era o defeito antigo.
const MAXIMO_DE_PAGINAS = 20;

// Antes disto, toda lista da interface pedia `?limit=100` e usava o que viesse.
// No registro 101 o restante sumia sem aviso: o select simplesmente não tinha a
// opção, e não havia como a pessoa perceber. Aqui a paginação da API é
// percorrida até o fim.
async function getTodos<T>(path: string): Promise<T[]> {
  const separador = path.includes('?') ? '&' : '?';
  const url = (page: number) =>
    `${path}${separador}page=${page}&limit=${MAXIMO_POR_PAGINA}`;

  const primeira = await request<ResultadoPaginado<T>>(url(1));
  if (primeira.totalPages <= 1) return primeira.data;

  const ultima = Math.min(primeira.totalPages, MAXIMO_DE_PAGINAS);
  if (primeira.totalPages > MAXIMO_DE_PAGINAS) {
    console.warn(
      `${path}: ${primeira.total} registros, carregando só os ${ultima * MAXIMO_POR_PAGINA} primeiros. Esta tela precisa de busca no servidor.`,
    );
  }

  const restantes = await Promise.all(
    Array.from({ length: ultima - 1 }, (_, i) =>
      request<ResultadoPaginado<T>>(url(i + 2)),
    ),
  );
  return restantes.reduce((tudo, r) => tudo.concat(r.data), primeira.data);
}

// O status do erro, quando ele veio da API. Existe para a tela não precisar
// conhecer a classe: `statusDoErro(e)` devolve undefined para falha de rede e
// para qualquer coisa que não seja resposta HTTP.
export function statusDoErro(erro: unknown): number | undefined {
  return erro instanceof ErroDaApi ? erro.status : undefined;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  // Devolve a lista inteira, não a primeira página. Use em qualquer lugar que
  // precise de todas as opções (select, filtro, calendário do mês).
  getTodos,
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

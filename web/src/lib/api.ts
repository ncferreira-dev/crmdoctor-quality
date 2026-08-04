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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
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
    throw new Error(mensagem);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

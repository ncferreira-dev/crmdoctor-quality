'use client';

import { Button } from './Button';

// Estado de erro único do sistema.
//
// Até 05/08/2026 cada tela escrevia a própria frase ("Não foi possível
// carregar: <mensagem crua da API>") e parava ali. Três problemas nisso:
//
// 1. Era beco sem saída. A única saída era a pessoa recarregar a página na mão,
//    e nem todo mundo sabe que isso resolve.
// 2. Mostrava a mensagem técnica da API para quem não é técnico. "Failed to
//    fetch" não diz nada a quem só quer ver a agenda.
// 3. Cada tela dizia de um jeito, então o sistema parecia falhar de formas
//    diferentes quando a causa era sempre a mesma.
//
// Aqui a mensagem é humana, a técnica fica embaixo em letra miúda (para o dia
// em que eu precisar dela), e existe um botão que tenta de novo sem sair da
// tela.

interface EstadoErroProps {
  // O que a pessoa estava tentando ver, em minúsculas: "os projetos", "a
  // agenda". Vira "Não foi possível carregar os projetos."
  oQue: string;
  // Mensagem crua da API, mostrada em segundo plano.
  detalhe?: string | null;
  // Status HTTP, quando a tela souber. É o que separa "você não pode" de "deu
  // errado, tente de novo": as duas coisas apareciam com a mesma frase e o
  // mesmo botão.
  status?: number;
  // Sem isto o componente vira o mesmo beco sem saída de antes.
  onTentarDeNovo: () => void;
}

// Erro de rede chega como "Failed to fetch", que não explica nada. Vale trocar
// por uma frase que diz o que fazer.
function ehFalhaDeRede(detalhe?: string | null): boolean {
  if (!detalhe) return false;
  const t = detalhe.toLowerCase();
  return t.includes('failed to fetch') || t.includes('networkerror') || t.includes('load failed');
}

// Três desfechos, e a diferença entre eles não é de redação, é de o que fazer.
//
// 403 não é falha: é o sistema funcionando. Oferecer "Tentar de novo" ali
// ensina que o sistema está quebrado e faz a pessoa insistir num botão que
// nunca vai dar certo. 401 é sessão vencida, e o caminho é entrar de novo (o
// lib/api já redireciona sozinho; a frase existe para o caso de ela ver a tela
// antes do redirecionamento). O resto é falha de verdade, e aí sim tentar de
// novo é o certo.
function comoExplicar(status: number | undefined, semConexao: boolean) {
  if (semConexao) {
    return {
      titulo: null,
      frase:
        'O sistema não conseguiu falar com o servidor. Confira a sua conexão e tente de novo.',
      ofereceTentarDeNovo: true,
      mostrarDetalhe: false,
    };
  }
  if (status === 403) {
    return {
      titulo: 'Seu cargo não tem acesso a esta parte do sistema.',
      frase:
        'Não é um erro: é permissão. Se você precisa ver isto para trabalhar, peça a quem administra o sistema.',
      ofereceTentarDeNovo: false,
      mostrarDetalhe: false,
    };
  }
  if (status === 401) {
    return {
      titulo: 'Sua sessão expirou.',
      frase: 'Entre de novo para continuar de onde parou.',
      ofereceTentarDeNovo: false,
      mostrarDetalhe: false,
    };
  }
  return {
    titulo: null,
    frase:
      'Isso costuma ser passageiro. Tente de novo e, se continuar, avise quem administra o sistema.',
    ofereceTentarDeNovo: true,
    mostrarDetalhe: true,
  };
}

export function EstadoErro({ oQue, detalhe, status, onTentarDeNovo }: EstadoErroProps) {
  const semConexao = ehFalhaDeRede(detalhe);
  const explicacao = comoExplicar(status, semConexao);

  return (
    <div
      role="alert"
      className="rounded-card border border-ink/10 bg-white p-8 text-center shadow-card"
    >
      <p className="text-sm text-ink">
        {explicacao.titulo ?? `Não foi possível carregar ${oQue}.`}
      </p>
      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-ink/45">
        {explicacao.frase}
      </p>
      {explicacao.ofereceTentarDeNovo && (
        <Button className="mt-4" onClick={onTentarDeNovo}>
          Tentar de novo
        </Button>
      )}
      {detalhe && explicacao.mostrarDetalhe && (
        <p className="mx-auto mt-4 max-w-md text-[11px] leading-relaxed text-ink/30">{detalhe}</p>
      )}
    </div>
  );
}

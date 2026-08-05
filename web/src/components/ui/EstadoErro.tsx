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

export function EstadoErro({ oQue, detalhe, onTentarDeNovo }: EstadoErroProps) {
  const semConexao = ehFalhaDeRede(detalhe);

  return (
    <div
      role="alert"
      className="rounded-card border border-ink/10 bg-white p-8 text-center shadow-card"
    >
      <p className="text-sm text-ink">Não foi possível carregar {oQue}.</p>
      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-ink/45">
        {semConexao
          ? 'O sistema não conseguiu falar com o servidor. Confira a sua conexão e tente de novo.'
          : 'Isso costuma ser passageiro. Tente de novo e, se continuar, avise quem administra o sistema.'}
      </p>
      <Button className="mt-4" onClick={onTentarDeNovo}>
        Tentar de novo
      </Button>
      {detalhe && !semConexao && (
        <p className="mx-auto mt-4 max-w-md text-[11px] leading-relaxed text-ink/30">{detalhe}</p>
      )}
    </div>
  );
}

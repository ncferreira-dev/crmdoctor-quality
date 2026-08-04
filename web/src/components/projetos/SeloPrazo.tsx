import { UrgenciaPrazo, textoPrazo, urgenciaDoPrazo } from '../../lib/formato';

// O prazo é a informação mais importante de um CRM de compliance, então ele tem
// tratamento próprio em vez de virar mais um texto cinza. A escala de urgência
// usa a paleta da marca: accent só onde há risco real (vencido/crítico),
// brand no que está próximo, neutro no resto — assim o vermelho não perde peso.
//
// Três coisas diferentes usam este selo, e antes as três tinham desenho
// idêntico: prazo regulatório do projeto, marco interno e tarefa do dia.
// "Vence em 6 dias" num projeto de compliance e "vence em 8 dias" numa tarefa
// de ligar para a clínica não pesam a mesma coisa, e a tela dizia que pesavam.
//
// A COR continua sendo só urgência, igual para os três: atrasado é atrasado.
// Quem distingue o tipo é a FORMA, que é o que se lê de longe:
//   compliance  pílula preenchida com escudo. Prazo que responde a órgão.
//   marco       pílula vazada, só contorno. Etapa interna do projeto.
//   tarefa      texto com um ponto. Trabalho do dia a dia.
export type TipoPrazo = 'compliance' | 'marco' | 'tarefa';

const PREENCHIDO: Record<UrgenciaPrazo, string> = {
  vencido: 'bg-accent text-white',
  critico: 'bg-accent/10 text-accent',
  proximo: 'bg-brand/10 text-brand',
  tranquilo: 'bg-surface text-ink/60',
  'sem-prazo': 'bg-surface text-ink/35',
};

const VAZADO: Record<UrgenciaPrazo, string> = {
  vencido: 'border-accent text-accent',
  critico: 'border-accent/40 text-accent',
  proximo: 'border-brand/40 text-brand',
  tranquilo: 'border-ink/15 text-ink/60',
  'sem-prazo': 'border-ink/10 text-ink/35',
};

const TEXTO: Record<UrgenciaPrazo, string> = {
  vencido: 'text-accent',
  critico: 'text-accent',
  proximo: 'text-brand',
  tranquilo: 'text-ink/55',
  'sem-prazo': 'text-ink/35',
};

const PONTO: Record<UrgenciaPrazo, string> = {
  vencido: 'bg-accent',
  critico: 'bg-accent',
  proximo: 'bg-brand',
  tranquilo: 'bg-ink/25',
  'sem-prazo': 'bg-ink/15',
};

// Vai no title: quem passa o mouse descobre de que prazo se trata sem precisar
// decorar o que cada formato significa.
const DESCRICAO: Record<TipoPrazo, string> = {
  compliance: 'Prazo de compliance do projeto',
  marco: 'Prazo do marco',
  tarefa: 'Prazo da tarefa',
};

function IconeEscudo() {
  return (
    <svg
      className="h-3 w-3 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  );
}

export function SeloPrazo({
  prazo,
  tipo = 'compliance',
}: {
  prazo: string | null;
  tipo?: TipoPrazo;
}) {
  const urgencia = urgenciaDoPrazo(prazo);
  const texto = textoPrazo(prazo);
  const titulo = `${DESCRICAO[tipo]}: ${texto.toLowerCase()}`;

  if (tipo === 'tarefa') {
    return (
      <span
        title={titulo}
        className={`dado inline-flex shrink-0 items-center gap-1.5 text-[11px] ${TEXTO[urgencia]}`}
      >
        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${PONTO[urgencia]}`} />
        {texto}
      </span>
    );
  }

  if (tipo === 'marco') {
    return (
      <span
        title={titulo}
        className={`dado inline-flex shrink-0 items-center rounded-full border bg-white px-2.5 py-1 text-[11px] ${VAZADO[urgencia]}`}
      >
        {texto}
      </span>
    );
  }

  return (
    <span
      title={titulo}
      className={`dado inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] ${PREENCHIDO[urgencia]}`}
    >
      <IconeEscudo />
      {texto}
    </span>
  );
}

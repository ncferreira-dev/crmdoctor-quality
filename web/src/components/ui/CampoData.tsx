'use client';

import { useId, useRef, useState } from 'react';

// Campo de data único do sistema.
//
// POR QUE ELE EXISTE, e por que não é `<input type="date">` puro:
// o campo nativo é desenhado pelo NAVEGADOR, não por nós. Cada um escolhe um
// formato conforme o idioma do sistema operacional, e num Mac em português ele
// escreve "19 de ago. de 2026" enquanto o resto do CRM escreve 19/08/2026.
// Trocar o CSS não resolve, porque o texto vive dentro do shadow DOM do
// navegador. Foi por isso que o formato "já foi arrumado e voltou": não havia o
// que arrumar no nosso lado.
//
// A saída é escrever o campo: um campo de texto com máscara dd/mm/aaaa, que
// mostra exatamente o mesmo em qualquer navegador, mais um botão de calendário
// que abre o seletor nativo, que continua sendo o melhor jeito de escolher data
// no celular.
//
// O valor que vai no formulário continua sendo `aaaa-mm-dd` num campo oculto
// com o mesmo `name`, então nenhum formulário precisou mudar como lê os dados.

interface CampoDataProps {
  id: string;
  name: string;
  label?: string;
  // Aceita "2026-08-16" ou o ISO completo que a API devolve.
  defaultValue?: string | null;
  ajuda?: string;
  erro?: string;
  disabled?: boolean;
}

// "2026-08-16T00:00:00.000Z" e "2026-08-16" viram os dois "16/08/2026".
// A data é lida da string, sem passar por fuso: campo @db.Date não tem hora, e
// converter para America/Sao_Paulo joga o instante para o dia anterior. Mesma
// regra do formatarDataCivil.
function isoParaBr(iso: string | null | undefined): string {
  if (!iso) return '';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  if (!ano || !mes || !dia) return '';
  return `${dia}/${mes}/${ano}`;
}

function brParaIso(br: string): string {
  const [dia, mes, ano] = br.split('/');
  if (!dia || !mes || !ano || ano.length !== 4) return '';
  const d = Number(dia);
  const m = Number(mes);
  const a = Number(ano);
  if (d < 1 || d > 31 || m < 1 || m > 12 || a < 1900) return '';
  // Rejeita 31/02 e companhia: o Date corrige em silêncio para 03/03, e data
  // que se conserta sozinha é pior que data recusada.
  const teste = new Date(a, m - 1, d);
  if (teste.getDate() !== d || teste.getMonth() !== m - 1) return '';
  return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
}

// Vai colocando as barras conforme a pessoa digita, e ignora tudo que não for
// dígito. Apagar continua funcionando porque a máscara é recalculada do zero.
function mascarar(bruto: string): string {
  const digitos = bruto.replace(/\D/g, '').slice(0, 8);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

// Máscara de hora, mesma ideia da data: dígitos entram, os dois pontos são
// desenhados por nós.
function mascararHora(bruto: string): string {
  const digitos = bruto.replace(/\D/g, '').slice(0, 4);
  if (digitos.length <= 2) return digitos;
  return `${digitos.slice(0, 2)}:${digitos.slice(2)}`;
}

function horaValida(hora: string): boolean {
  const [h, m] = hora.split(':');
  if (!h || !m || h.length !== 2 || m.length !== 2) return false;
  return Number(h) >= 0 && Number(h) <= 23 && Number(m) >= 0 && Number(m) <= 59;
}

export function CampoData({
  id,
  name,
  label,
  defaultValue,
  ajuda,
  erro,
  disabled,
}: CampoDataProps) {
  const [texto, setTexto] = useState(() => isoParaBr(defaultValue));
  const seletorRef = useRef<HTMLInputElement>(null);
  const idInterno = useId();
  const idAuxiliar = `${id || idInterno}-auxiliar`;
  const iso = brParaIso(texto);
  const mensagem = erro ?? ajuda;
  // Data pela metade não é erro ainda: só cobra quando a pessoa terminou de
  // escrever e o que ficou lá não é data.
  const invalida = texto.length === 10 && !iso;

  function abrirSeletor() {
    const seletor = seletorRef.current;
    if (!seletor) return;
    if (iso) seletor.value = iso;
    // showPicker é o caminho certo, mas não existe em todo navegador. O focus
    // cobre o resto, inclusive o teclado de data do celular.
    if (typeof seletor.showPicker === 'function') {
      seletor.showPicker();
    } else {
      seletor.focus();
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-light uppercase tracking-wide text-ink/60">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="dd/mm/aaaa"
          maxLength={10}
          value={texto}
          disabled={disabled}
          onChange={(evento) => setTexto(mascarar(evento.target.value))}
          aria-invalid={erro || invalida ? true : undefined}
          aria-describedby={mensagem || invalida ? idAuxiliar : undefined}
          className={`w-full rounded-md border py-2 pl-3 pr-10 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-1 ${
            erro || invalida
              ? 'border-accent focus:border-accent focus:ring-accent'
              : 'border-ink/15 focus:border-brand focus:ring-brand'
          }`}
        />

        <button
          type="button"
          onClick={abrirSeletor}
          disabled={disabled}
          // Fora da navegação por Tab: quem usa teclado digita a data direto, e
          // um passo a mais entre os campos só atrapalha.
          tabIndex={-1}
          aria-label="Escolher no calendário"
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-ink/40 transition-colors hover:text-brand disabled:opacity-40"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
        </button>

        {/* O seletor nativo existe só para o botão acima abrir. Fica fora da
            navegação e sem nome, porque quem responde pelo campo é o de texto. */}
        <input
          ref={seletorRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(evento) => setTexto(isoParaBr(evento.target.value))}
          className="pointer-events-none absolute bottom-0 right-2 h-0 w-0 opacity-0"
        />
      </div>

      {/* É este que o formulário lê, em aaaa-mm-dd. */}
      <input type="hidden" name={name} value={iso} />

      {(mensagem || invalida) && (
        <span
          id={idAuxiliar}
          role={erro || invalida ? 'alert' : undefined}
          className={`text-[11px] leading-relaxed ${
            erro || invalida ? 'text-accent' : 'text-ink/45'
          }`}
        >
          {invalida ? 'Data inválida. Use dia/mês/ano, como 16/08/2026.' : mensagem}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

interface CampoDataHoraProps {
  id: string;
  name: string;
  label?: string;
  // Formato 'aaaa-mm-ddThh:mm', o mesmo que o `datetime-local` produzia, para
  // nenhum formulário precisar mudar como lê o campo.
  value: string;
  onChange: (valor: string) => void;
  ajuda?: string;
  erro?: string;
  disabled?: boolean;
}

// Data e hora, pelo mesmo motivo do CampoData: `datetime-local` é desenhado
// pelo navegador, e num Mac em português ele escreve a data por extenso
// enquanto o resto do CRM escreve 19/08/2026. Era o último lugar do sistema com
// campo de data nativo, e é a tela mais usada em campo.
//
// São dois campos e não um: quem marca visita sabe o dia antes de saber a hora,
// e digitar "16/08/2026" e "14:00" em campos separados é mais rápido do que
// caçar o cursor dentro de um campo único.
export function CampoDataHora({
  id,
  name,
  label,
  value,
  onChange,
  ajuda,
  erro,
  disabled,
}: CampoDataHoraProps) {
  const [dataTexto, setDataTexto] = useState(() => isoParaBr(value.slice(0, 10)));
  const [horaTexto, setHoraTexto] = useState(() => value.slice(11, 16));
  const [ultimoValor, setUltimoValor] = useState(value);
  const seletorRef = useRef<HTMLInputElement>(null);
  const idAuxiliar = `${id}-auxiliar`;

  const montar = (data: string, hora: string) => {
    const iso = brParaIso(data);
    if (!iso || !horaValida(hora)) return '';
    return `${iso}T${hora}`;
  };

  // Sincronia com o valor de fora feita DURANTE a renderização, e não em
  // effect: a agenda empurra o fim quando o início muda ("uma hora depois"), e
  // sem isto o campo continuaria mostrando o horário antigo. Effect para isto
  // renderiza duas vezes e é o que a regra react-hooks/set-state-in-effect
  // proíbe.
  //
  // A comparação é contra o que o texto atual representa, e não contra o valor
  // anterior: enquanto a pessoa digita "16/0", o campo emite string vazia, e
  // sem esta guarda o valor vazio voltaria e apagaria o que ela escreveu.
  if (value !== ultimoValor) {
    setUltimoValor(value);
    if (value !== montar(dataTexto, horaTexto)) {
      setDataTexto(isoParaBr(value.slice(0, 10)));
      setHoraTexto(value.slice(11, 16));
    }
  }

  const trocar = (data: string, hora: string) => {
    setDataTexto(data);
    setHoraTexto(hora);
    onChange(montar(data, hora));
  };

  const dataInvalida = dataTexto.length === 10 && !brParaIso(dataTexto);
  const horaInvalida = horaTexto.length === 5 && !horaValida(horaTexto);
  const mensagem = erro ?? ajuda;

  function abrirSeletor() {
    const seletor = seletorRef.current;
    if (!seletor) return;
    const iso = brParaIso(dataTexto);
    if (iso) seletor.value = iso;
    if (typeof seletor.showPicker === 'function') {
      seletor.showPicker();
    } else {
      seletor.focus();
    }
  }

  // Sem largura aqui de propósito: `w-full` e `w-24` são a mesma
  // especificidade, e quem vence é a ordem da folha de estilo, não a ordem da
  // string. Com a largura no meio das classes comuns, o campo de hora ganhava
  // `w-full` e espremia o de data até sobrar só o ícone do calendário. Cada
  // input declara a sua largura, uma vez.
  const classe = (invalido: boolean) =>
    `rounded-md border py-2 pl-3 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-1 ${
      erro || invalido
        ? 'border-accent focus:border-accent focus:ring-accent'
        : 'border-ink/15 focus:border-brand focus:ring-brand'
    }`;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-light uppercase tracking-wide text-ink/60">
          {label}
        </label>
      )}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="dd/mm/aaaa"
            maxLength={10}
            value={dataTexto}
            disabled={disabled}
            onChange={(evento) => trocar(mascarar(evento.target.value), horaTexto)}
            aria-invalid={erro || dataInvalida ? true : undefined}
            aria-describedby={mensagem || dataInvalida || horaInvalida ? idAuxiliar : undefined}
            className={`${classe(dataInvalida)} w-full pr-8`}
          />
          <button
            type="button"
            onClick={abrirSeletor}
            disabled={disabled}
            tabIndex={-1}
            aria-label="Escolher no calendário"
            className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-ink/40 transition-colors hover:text-brand disabled:opacity-40"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
          </button>
          <input
            ref={seletorRef}
            type="date"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(evento) => trocar(isoParaBr(evento.target.value), horaTexto || '09:00')}
            className="pointer-events-none absolute bottom-0 right-2 h-0 w-0 opacity-0"
          />
        </div>

        <input
          id={`${id}-hora`}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="hh:mm"
          maxLength={5}
          value={horaTexto}
          disabled={disabled}
          onChange={(evento) => trocar(dataTexto, mascararHora(evento.target.value))}
          aria-label="Hora"
          aria-invalid={erro || horaInvalida ? true : undefined}
          className={`${classe(horaInvalida)} w-20 shrink-0 pr-2`}
        />
      </div>

      {/* É este que o formulário lê. */}
      <input type="hidden" name={name} value={montar(dataTexto, horaTexto)} />

      {(mensagem || dataInvalida || horaInvalida) && (
        <span
          id={idAuxiliar}
          role={erro || dataInvalida || horaInvalida ? 'alert' : undefined}
          className={`text-[11px] leading-relaxed ${
            erro || dataInvalida || horaInvalida ? 'text-accent' : 'text-ink/45'
          }`}
        >
          {dataInvalida
            ? 'Data inválida. Use dia/mês/ano, como 16/08/2026.'
            : horaInvalida
              ? 'Hora inválida. Use hora:minuto, como 14:30.'
              : mensagem}
        </span>
      )}
    </div>
  );
}

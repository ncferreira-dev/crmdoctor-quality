'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { carregarAlertas, marcarAlertaLido } from '../../lib/alertas';
import { formatarDataCivil } from '../../lib/formato';
import { useAlertas } from '../../hooks/useAlertas';
import { usePermissao } from '../../hooks/useSessao';
import { IconeSino } from '../ui/icons';

// De quanto em quanto tempo buscar alerta novo. O cron roda uma vez por dia às
// 08:00, então um minuto é folgado de sobra: serve para quem deixa a aba aberta
// o dia inteiro ver o alerta aparecer sem recarregar.
const INTERVALO_MS = 60_000;

// Acima disto o badge vira "9+". Um número de dois dígitos não cabe no círculo
// e, passando de nove, a contagem exata deixa de mudar a decisão de ninguém.
const MAXIMO_NO_BADGE = 9;

export function SinoNotificacoes() {
  const podeVer = usePermissao('NOTIFICACOES_READ');
  const alertas = useAlertas();
  const [aberto, setAberto] = useState(false);
  const [marcando, setMarcando] = useState<string | null>(null);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!podeVer) return;

    carregarAlertas();
    const timer = setInterval(carregarAlertas, INTERVALO_MS);

    // Voltar para a aba é quando a pessoa retoma o trabalho: hora de checar se
    // apareceu prazo novo, em vez de esperar o próximo tique do intervalo.
    function aoVoltar() {
      if (document.visibilityState === 'visible') carregarAlertas();
    }
    document.addEventListener('visibilitychange', aoVoltar);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [podeVer]);

  // Fecha ao clicar fora e ao apertar Esc, como qualquer menu suspenso. Sem
  // isto o painel fica aberto atrapalhando a tela até a pessoa acertar o sino
  // de novo.
  useEffect(() => {
    if (!aberto) return;

    function aoClicarFora(evento: MouseEvent) {
      if (!container.current?.contains(evento.target as Node)) setAberto(false);
    }
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setAberto(false);
    }

    document.addEventListener('mousedown', aoClicarFora);
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('mousedown', aoClicarFora);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto]);

  if (!podeVer) return null;

  const quantidade = alertas?.length ?? 0;
  const rotulo =
    quantidade === 0
      ? 'Alertas de compliance: nenhum em aberto'
      : `Alertas de compliance: ${quantidade} em aberto`;

  async function marcar(id: string) {
    setMarcando(id);
    try {
      await marcarAlertaLido(id);
    } catch {
      // A store já desfez a remoção. Nada a dizer aqui: o alerta reaparece na
      // lista, que é a informação que importa.
    } finally {
      setMarcando(null);
    }
  }

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        aria-label={rotulo}
        aria-expanded={aberto}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-ink/60 transition-colors hover:bg-surface hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <IconeSino />
        {quantidade > 0 && (
          <span className="dado absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-none text-white">
            {quantidade > MAXIMO_NO_BADGE ? `${MAXIMO_NO_BADGE}+` : quantidade}
          </span>
        )}
      </button>

      {aberto && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          role="dialog"
          aria-label="Alertas de compliance"
          className="absolute right-0 top-11 z-50 w-[min(92vw,22rem)] overflow-hidden rounded-card border border-ink/10 bg-white shadow-overlay"
        >
          <div className="flex items-baseline justify-between gap-3 border-b border-ink/10 px-4 py-3">
            <p className="text-xs font-light uppercase tracking-wide text-ink/50">
              Alertas de compliance
            </p>
            {quantidade > 0 && <span className="dado text-xs text-ink/45">{quantidade}</span>}
          </div>

          {alertas === null ? (
            <div className="flex flex-col gap-2 p-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-md bg-surface" />
              ))}
            </div>
          ) : quantidade === 0 ? (
            <p className="px-4 py-6 text-center text-sm leading-relaxed text-ink/45">
              Nenhum prazo vencendo nos próximos 15 dias.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-ink/10">
              {alertas.map((alerta) => (
                <li key={alerta.id} className="px-4 py-3">
                  <p className="text-sm leading-snug text-ink">{alerta.mensagem}</p>
                  <div className="mt-1.5 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-ink/45">
                      {alerta.dataReferencia
                        ? `Vence em ${formatarDataCivil(alerta.dataReferencia)}`
                        : alerta.tipo === 'COMPLIANCE_ETAPA'
                          ? 'Marco do projeto'
                          : 'Prazo do projeto'}
                    </span>
                    <button
                      type="button"
                      onClick={() => marcar(alerta.id)}
                      disabled={marcando === alerta.id}
                      className="shrink-0 text-[11px] font-medium text-brand underline-offset-2 hover:underline disabled:opacity-50"
                    >
                      Marcar como lida
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/dashboard#alertas"
            onClick={() => setAberto(false)}
            className="block border-t border-ink/10 px-4 py-2.5 text-center text-xs text-ink/60 transition-colors hover:bg-surface hover:text-ink"
          >
            Ver no dashboard
          </Link>
        </motion.div>
      )}
    </div>
  );
}

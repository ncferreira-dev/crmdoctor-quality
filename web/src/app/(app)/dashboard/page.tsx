'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, statusDoErro } from '../../../lib/api';
import { marcarAlertaLido } from '../../../lib/alertas';
import { usePermissao } from '../../../hooks/useSessao';
import { useAlertas } from '../../../hooks/useAlertas';
import { DashboardResumo } from '../../../types';
import {
  ESTAGIOS_PROJETO,
  ESTAGIO_PROJETO_LABEL,
  formatarDataCivil,
  formatarMoeda,
} from '../../../lib/formato';
import { EstadoErro } from '../../../components/ui/EstadoErro';
import { KpiCard } from '../../../components/dashboard/KpiCard';
import { BarraRanking } from '../../../components/dashboard/BarraRanking';
import { PainelAlertas } from '../../../components/dashboard/PainelAlertas';

// null significa "este cargo não vê dinheiro", e é diferente de zero. Zero
// afirmaria que não há contrato ativo.
function moeda(valor: number | null | undefined): string {
  if (valor === null) return 'Restrito';
  // Sem centavos: o cartão do dashboard existe para dar ordem de grandeza.
  return formatarMoeda(valor);
}

// Campo numérico que pode não existir se a API estiver numa versão anterior.
function num(valor: number | undefined): number {
  return valor ?? 0;
}

export default function DashboardPage() {
  const [resumo, setResumo] = useState<DashboardResumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  // O status vem junto do texto: é ele que separa "seu cargo não tem acesso"
  // de "deu erro, tente de novo". Ver EstadoErro.
  const [statusErro, setStatusErro] = useState<number | undefined>(undefined);
  const [marcando, setMarcando] = useState<string | null>(null);
  const podeVerAlertas = usePermissao('NOTIFICACOES_READ');
  const podeVerValor = usePermissao('FINANCEIRO_READ');
  // Mesma store que alimenta o sino do cabeçalho. Dar baixa aqui muda o badge
  // lá em cima na hora, e o contrário também: são a mesma informação, e duas
  // cópias independentes acabariam se contradizendo na tela.
  const alertas = useAlertas();

  function carregar() {
    api
      .get<DashboardResumo>('/dashboard/resumo')
      .then(setResumo)
      .catch((error: Error) => {
        setErro(error.message);
        setStatusErro(statusDoErro(error));
      });
  }

  useEffect(() => {
    carregar();
  }, []);

  async function marcarLida(id: string) {
    setMarcando(id);
    try {
      await marcarAlertaLido(id);
    } catch {
      // A store desfaz sozinha o que tinha tirado da lista. Nada a fazer aqui.
    } finally {
      setMarcando(null);
    }
  }

  if (erro) {
    return (
      <EstadoErro
        oQue="o dashboard"
        detalhe={erro}
        status={statusErro}
        onTentarDeNovo={() => {
          setErro(null);
          carregar();
        }}
      />
    );
  }

  if (!resumo) {
    return (
      <div>
        <h1 className="titulo-pagina mb-4">Dashboard</h1>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-card bg-white/60" />
          ))}
        </div>
      </div>
    );
  }

  // Defensivo de propósito: se a API estiver numa versão anterior à do front
  // (deploy do backend atrasado), campos novos chegam undefined. Melhor a tela
  // renderizar vazia do que estourar TypeError e não mostrar nada.
  const porEstagio = resumo.projetosPorEstagio ?? [];
  const concentracao = resumo.concentracao ?? [];
  const carga = resumo.cargaConsultores ?? [];
  const marcos = resumo.marcosDaSemana ?? [];
  const totalProjetos = porEstagio.reduce((s, p) => s + p.total, 0);

  // Três blocos escondidos, e não removidos (item 35 do ENTREGA.md).
  //
  // "Concentração por empresa" e "Projetos por estágio" são gráficos de 6
  // projetos, em que cada barra vale 1: com esse volume, a barra não informa
  // nada que a lista já não diga, e ainda dá ar de relatório a um número que
  // cabe na cabeça. "Marcos desta semana" é a QUARTA superfície a mostrar o
  // mesmo prazo, junto do cartão "Marcos vencendo", do painel de alertas e do
  // sino: repetir o mesmo aviso quatro vezes é como se aprende a ignorar os
  // quatro.
  //
  // A condição é uma constante legível de propósito. Quando houver volume,
  // trocar para `true` devolve os três blocos como estavam, sem arqueologia no
  // histórico do git.
  const MOSTRAR_GRAFICOS_DE_VOLUME = false;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="titulo-pagina">Dashboard</h1>

      {/* Grade densa de KPIs — cada card é um botão que leva ao detalhe.
          2 colunas no mobile, 4 a partir do desktop. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Projetos em andamento"
          valor={num(resumo.projetosEmExecucao)}
          href="/projetos"
          nota={`${totalProjetos} no total`}
        />
        <KpiCard
          label="Concluídos"
          valor={num(resumo.projetosConcluidos)}
          href="/projetos"
          nota={`${num(resumo.concluidosNoMes)} este mês`}
        />
        {/* Card de dinheiro some para quem não tem FINANCEIRO_READ, em vez de
            mostrar "Restrito": um card cinza escrito Restrito só anuncia que
            existe informação escondida, e isso não ajuda ninguém a trabalhar. */}
        {podeVerValor && (
          <KpiCard
            label="Valor em andamento"
            valor={moeda(resumo.valorEmExecucao)}
            href="/projetos"
            nota="Projetos não concluídos"
          />
        )}
        <KpiCard
          label="Marcos vencendo"
          valor={num(resumo.etapasVencendo7Dias)}
          href="/projetos"
          nota="Próximos 7 dias"
          alerta={num(resumo.etapasVencendo7Dias) > 0}
        />
        {podeVerAlertas && (
          <KpiCard
            label="Alertas não lidos"
            // A lista carregada manda no número; o valor do resumo só cobre o
            // instante antes dela chegar. Assim o card não fica anunciando um
            // alerta que a pessoa acabou de marcar como lido logo abaixo.
            valor={alertas?.length ?? num(resumo.alertasNaoLidos)}
            // Leva ao painel logo abaixo, onde os alertas estão escritos e é
            // possível dar baixa. Antes apontava para /projetos, que não mostra
            // alerta nenhum.
            href="#alertas"
            nota="Compliance"
            alerta={(alertas?.length ?? num(resumo.alertasNaoLidos)) > 0}
          />
        )}
        <KpiCard
          label="Projetos sem prazo"
          valor={num(resumo.projetosSemPrazo)}
          href="/projetos"
          nota="Não geram alerta"
          alerta={num(resumo.projetosSemPrazo) > 0}
        />
        {/* Leva à tela de Chamados, e não a /empresas. O card contava chamados
            e entregava numa lista de clientes, onde a pessoa tinha que
            adivinhar em qual empresa estavam os chamados que o número
            prometeu. */}
        <KpiCard
          label="Chamados abertos"
          valor={num(resumo.ticketsAbertos)}
          href="/chamados"
          nota={num(resumo.ticketsEmAtraso) > 0 ? `${num(resumo.ticketsEmAtraso)} em atraso` : 'Em dia'}
          alerta={num(resumo.ticketsEmAtraso) > 0}
        />
        <KpiCard
          label="Visitas na semana"
          valor={num(resumo.visitasProximos7Dias)}
          href="/agenda"
          nota="Próximos 7 dias"
        />
      </div>

      {podeVerAlertas && (
        <PainelAlertas alertas={alertas} onMarcarLida={marcarLida} marcando={marcando} />
      )}

      {/* Carga por responsável fica: o item 30 tornou o campo preenchível pela
          tela, então o número passou a ser mantido por quem usa. */}
      <div className="grid gap-3 lg:grid-cols-2">
        {MOSTRAR_GRAFICOS_DE_VOLUME && (
          <BarraRanking
            titulo="Concentração por empresa"
            vazio="Nenhum projeto ativo ainda."
            itens={concentracao.map((c) => ({
              id: c.empresaId,
              rotulo: c.empresa,
              valor: c.projetos,
              detalhe: podeVerValor
                ? `${c.projetos} · ${moeda(c.valor)}`
                : `${c.projetos} ${c.projetos === 1 ? 'projeto' : 'projetos'}`,
              href: `/empresas/${c.empresaId}`,
            }))}
          />
        )}
        <BarraRanking
          titulo="Carga por responsável"
          vazio="Nenhum marco atribuído ainda."
          unidade="marcos"
          itens={carga.map((c) => ({
            id: c.usuarioId,
            rotulo: c.nome,
            valor: c.marcosAbertos,
          }))}
        />
      </div>

      {MOSTRAR_GRAFICOS_DE_VOLUME && (
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Projetos por estágio */}
        <BarraRanking
          titulo="Projetos por estágio"
          vazio="Nenhum projeto cadastrado."
          unidade=""
          itens={ESTAGIOS_PROJETO.map((estagio) => ({
            id: estagio,
            rotulo: ESTAGIO_PROJETO_LABEL[estagio],
            valor: porEstagio.find((p) => p.estagio === estagio)?.total ?? 0,
          }))}
        />

        {/* Marcos da semana: lista clicável, não número */}
        <div className="rounded-card border border-ink/10 bg-white p-5 shadow-card">
          <p className="text-[11px] font-light uppercase tracking-wide text-ink/55">
            Marcos desta semana
          </p>
          {marcos.length === 0 ? (
            <p className="mt-4 text-xs text-ink/35">Nenhum marco vencendo nos próximos 7 dias.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {marcos.map((marco) => (
                <li key={marco.id}>
                  <Link
                    href={`/projetos/${marco.projetoId}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-ink/10 p-2.5 transition-colors hover:border-brand/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink">{marco.nome}</p>
                      <p className="truncate text-[11px] text-ink/50">{marco.projeto}</p>
                    </div>
                    {marco.prazo && (
                      <span className="dado shrink-0 text-[11px] text-ink/55">
                        {formatarDataCivil(marco.prazo)}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

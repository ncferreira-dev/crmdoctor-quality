import {
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { FindNotificacoesQueryDto } from './dto/find-notificacoes-query.dto';
import { inicioDoDiaCivil } from '../common/utils/dia-civil';
import { NOTIFICACAO_REAL, PROJETO_REAL } from '../common/demonstracao';
import { Permissao } from '../common/constants/permissoes';
import {
  AlertaDoResumo,
  TicketSemResposta,
  montarResumo,
  separarEmSecoes,
  totalDeAlertas,
} from './resumo-diario';
import {
  calcularPrazoLimite,
  whereEmAberto,
  whereEmAtraso,
} from '../tickets/tickets.utils';

// O que uma pessoa tem para receber hoje: os alertas de prazo dela e os
// chamados fora do SLA que são dela. As duas listas vivem juntas porque o
// e-mail é um só: duas mensagens por dia seria a mesma pessoa aprendendo a
// ignorar as duas.
interface PessoaDoResumo {
  nome: string;
  email: string;
  alertas: AlertaDoResumo[];
  tickets: TicketSemResposta[];
}

// Chave do heartbeat na tabela cron_execucoes. /health/cron lê pela mesma
// constante (exportada) para os dois lados nunca divergirem.
export const CRON_COMPLIANCE = 'compliance-prazos';

// Carimbo do aviso diário, separado do heartbeat do vigia de prazos. São duas
// perguntas diferentes: "o vigia rodou?" e "o e-mail de hoje já saiu?". Juntar
// as duas num carimbo só faria o disparo do boot ser lido como o disparo do
// dia, ou o contrário.
export const CRON_RESUMO_DIARIO = 'resumo-diario-email';

// Quantos dias antes do prazo o sistema começa a avisar. A tela usa a MESMA
// régua (urgenciaDoPrazo em web/src/lib/formato.ts): divergir faria a tela
// contradizer a notificação.
const DIAS_DE_ANTECEDENCIA = 15;

// Quem recebe um alerta quando o projeto não tem ninguém na equipe. É o piso,
// não a regra: existe para que nenhum prazo fique sem dono, e não para que
// todo prazo vá para todo mundo.
const PERMISSAO_DE_ULTIMO_RECURSO: Permissao = 'PROJETOS_READ';

@Injectable()
export class NotificacoesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(NotificacoesService.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  // Roda o cron no boot. Dois motivos: o deploy diário costuma acontecer fora
  // das 8h, e sem isto o /health/cron responderia 503 até a primeira execução
  // agendada, fazendo o monitor externo alarmar falso depois de cada deploy.
  // É seguro rodar de novo: a criação de notificações é idempotente por
  // constraint, e a reconciliação de destinatários também. O catch existe
  // porque heartbeat não pode derrubar o boot.
  async onApplicationBootstrap() {
    try {
      await this.executarCronCompliance();
    } catch (erro) {
      this.logger.error('Cron de compliance falhou no boot', erro);
    }
  }

  // O que ESTA pessoa precisa ver. Antes daqui a lista era da empresa inteira:
  // não havia coluna de destinatário, e `lida` era um boolean na própria
  // notificação, então quem desse baixa apagava o aviso de todo mundo. Agora a
  // visibilidade vem da linha em notificacao_destinatarios, e a leitura é dela.
  async findAll(usuarioId: string, query: FindNotificacoesQueryDto) {
    const registros = await this.prisma.notificacaoDestinatario.findMany({
      where: {
        usuarioId,
        // Alerta que já nasceu antes do item 9 e é de projeto de demonstração
        // continua no banco, e some da tela por aqui. Filtrar na leitura, e não
        // apagar, deixa o alerta voltar sozinho no dia em que o projeto deixar
        // de ser cenário.
        notificacao: NOTIFICACAO_REAL,
        ...(query.lida === undefined
          ? {}
          : query.lida
            ? { lidaEm: { not: null } }
            : { lidaEm: null }),
      },
      // Prazo mais apertado primeiro. Ordenar por criadoEm punia o alerta
      // antigo que ainda não foi resolvido, empurrando para o fim justamente o
      // que já passou do prazo.
      orderBy: [
        { notificacao: { dataReferencia: 'asc' } },
        { notificacao: { criadoEm: 'desc' } },
      ],
      select: {
        lidaEm: true,
        notificacao: {
          select: {
            id: true,
            tipo: true,
            mensagem: true,
            projetoId: true,
            etapaId: true,
            dataReferencia: true,
            criadoEm: true,
          },
        },
      },
    });

    // `lida` continua saindo na resposta porque é o que o front consome, mas
    // agora é a leitura DESTA pessoa, derivada de lidaEm, e não mais o campo
    // compartilhado da notificação.
    return registros.map((registro) => ({
      ...registro.notificacao,
      lida: registro.lidaEm !== null,
      lidaEm: registro.lidaEm,
    }));
  }

  // Dar baixa é um ato de uma pessoa e fica registrado como tal: quem, e
  // quando. Quem não é destinatário recebe 404 em vez de 403, porque para essa
  // pessoa o alerta simplesmente não existe.
  async marcarLida(notificacaoId: string, usuarioId: string) {
    const registro = await this.prisma.notificacaoDestinatario.findUnique({
      where: { notificacaoId_usuarioId: { notificacaoId, usuarioId } },
    });
    if (!registro) {
      throw new NotFoundException('Notificação não encontrada');
    }
    if (registro.lidaEm) {
      return registro;
    }
    return this.prisma.notificacaoDestinatario.update({
      where: { id: registro.id },
      data: { lidaEm: new Date() },
    });
  }

  // Quantos alertas ESTA pessoa ainda não leu. O dashboard consome daqui em vez
  // de contar notificacoes.lida, que era o número da empresa inteira.
  contarNaoLidas(usuarioId: string) {
    return this.prisma.notificacaoDestinatario.count({
      where: { usuarioId, lidaEm: null, notificacao: NOTIFICACAO_REAL },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM, { timeZone: 'America/Sao_Paulo' })
  async executarCronCompliance() {
    const resultado = await this.verificarPrazosCompliance();
    // Heartbeat DEPOIS do trabalho: só registra execução que terminou. Se a
    // verificação lançar, o carimbo não avança e o /health/cron acusa.
    const executadoEm = new Date();
    await this.prisma.cronExecucao.upsert({
      where: { nome: CRON_COMPLIANCE },
      update: { executadoEm },
      create: { nome: CRON_COMPLIANCE, executadoEm },
    });
    this.logger.log(
      `Cron de compliance: ${resultado.criadas} notificação(ões) criada(s) ` +
        `(${resultado.projetos} projeto(s), ${resultado.etapas} etapa(s)), ` +
        `${resultado.destinatarios} destinatário(s) novo(s)`,
    );

    // O aviso sai DEPOIS de criar e reconciliar, senão o e-mail da manhã
    // contaria o mundo de ontem. A trava de um por dia mora dentro do disparo,
    // e é ela que faz este ponto ser seguro mesmo com o cron rodando no boot.
    const resumo = await this.dispararResumoDiario();

    return { ...resultado, resumo };
  }

  // O AVISO DIÁRIO: um e-mail por pessoa, por dia, com o que é dela.
  //
  // Quem não tem nada não recebe nada. É a regra que separa aviso de ruído: um
  // e-mail diário que chega mesmo vazio é um e-mail que se aprende a arquivar
  // sem ler, e aí o dia em que ele importa também passa batido.
  //
  // A trava de "um por dia" é o carimbo em cron_execucoes, e não uma coluna na
  // notificação, porque a pergunta é sobre O DIA e não sobre cada alerta. Sem
  // ela, todo deploy dispararia a rodada inteira de novo (o cron roda no boot),
  // e três deploys numa terça significariam três e-mails iguais para todo
  // mundo.
  // `forcar` ignora a trava do dia e `carimbar: false` não grava o carimbo: as
  // duas existem para o ensaio do script de medição poder rodar quantas vezes
  // for preciso sem gastar o disparo real do dia. O padrão é o comportamento de
  // produção, então esquecer de passar opção nenhuma faz a coisa certa.
  async dispararResumoDiario(
    opcoes: { forcar?: boolean; carimbar?: boolean } = {},
  ) {
    const carimbar = opcoes.carimbar ?? true;
    const hoje = inicioDoDiaCivil();

    if (!opcoes.forcar) {
      const carimbo = await this.prisma.cronExecucao.findUnique({
        where: { nome: CRON_RESUMO_DIARIO },
      });
      if (carimbo && carimbo.executadoEm.getTime() >= hoje.getTime()) {
        this.logger.log(
          'Aviso diário: já saiu hoje, nada a fazer nesta execução',
        );
        return {
          jaSaiuHoje: true,
          pessoasComAlerta: 0,
          enviados: 0,
          falhas: 0,
          semNadaPendente: 0,
        };
      }
    }

    // Conta desativada e conta com convite pendente ficam de fora pelo mesmo
    // motivo da regra de destinatário: as duas não conseguem entrar no sistema,
    // e o aviso mandaria a pessoa para uma porta fechada. Esta lista também é a
    // terceira contagem que o item 3 pede: quem está apto e não recebe nada.
    const aptos = await this.prisma.user.findMany({
      where: { ativo: true, codigoConviteHash: null },
      select: { id: true, nome: true, email: true },
    });
    const porPessoa = new Map<string, PessoaDoResumo>();
    const paraPessoa = (id: string): PessoaDoResumo | null => {
      const apto = aptos.find((usuario) => usuario.id === id);
      if (!apto) return null;
      const atual = porPessoa.get(id) ?? {
        nome: apto.nome,
        email: apto.email,
        alertas: [],
        tickets: [],
      };
      porPessoa.set(id, atual);
      return atual;
    };

    const pendentes = await this.prisma.notificacaoDestinatario.findMany({
      where: {
        lidaEm: null,
        usuario: { ativo: true, codigoConviteHash: null },
        notificacao: NOTIFICACAO_REAL,
      },
      select: {
        usuarioId: true,
        notificacao: {
          select: { mensagem: true, dataReferencia: true, criadoEm: true },
        },
      },
    });
    for (const linha of pendentes) {
      paraPessoa(linha.usuarioId)?.alertas.push(linha.notificacao);
    }

    await this.acrescentarTicketsSemResposta(paraPessoa);

    let enviados = 0;
    let falhas = 0;

    for (const pessoa of porPessoa.values()) {
      const secoes = separarEmSecoes(pessoa.alertas, hoje);
      secoes.ticketsSemResposta = pessoa.tickets;
      // Alerta sem data de referência não entra em seção nenhuma, então uma
      // pessoa pode ter linha pendente e mesmo assim nada a receber.
      if (totalDeAlertas(secoes) === 0) continue;

      const resultado = await this.email.enviar({
        ...montarResumo(pessoa.nome, secoes, hoje),
        para: pessoa.email,
      });
      if (resultado.enviado) enviados += 1;
      else falhas += 1;
    }

    const elegiveis = aptos.length;

    // Carimba o dia, MENOS quando tudo falhou. Se nada saiu (motor desligado,
    // provedor fora, chave vencida), carimbar transformaria o problema em
    // silêncio até amanhã: o dia estaria "gasto" sem ninguém ter sido avisado.
    // Sem carimbo, o próximo boot tenta de novo, que é o desfecho certo.
    // Falha parcial carimba de propósito: parte das pessoas já recebeu, e
    // repetir mandaria e-mail dobrado para elas.
    const tudoFalhou = enviados === 0 && falhas > 0;
    if (!carimbar) {
      this.logger.log('Aviso diário: ensaio, o dia não foi carimbado');
    } else if (tudoFalhou) {
      this.logger.warn(
        `Aviso diário: nenhum dos ${falhas} e-mail(s) saiu. O dia NÃO foi ` +
          'carimbado, então a próxima execução tenta de novo.',
      );
    } else {
      const executadoEm = new Date();
      await this.prisma.cronExecucao.upsert({
        where: { nome: CRON_RESUMO_DIARIO },
        update: { executadoEm },
        create: { nome: CRON_RESUMO_DIARIO, executadoEm },
      });
    }

    const pessoasComAlerta = porPessoa.size;
    const semNadaPendente = Math.max(elegiveis - pessoasComAlerta, 0);
    this.logger.log(
      `Aviso diário: ${enviados} enviado(s), ${falhas} falha(s), ` +
        `${semNadaPendente} pessoa(s) sem nada pendente (não recebem e-mail)`,
    );

    return {
      jaSaiuHoje: false,
      pessoasComAlerta,
      enviados,
      falhas,
      semNadaPendente,
    };
  }

  // A QUARTA SEÇÃO: chamado sem primeira resposta e fora do prazo (item 4).
  //
  // O prazo já era calculado desde antes (`tickets.utils.ts`: alta 2h, média
  // 8h, baixa 24h) e vivia só como selo na tela, ou seja, só era visto por quem
  // já tinha aberto a tela de Tickets. Um SLA que só aparece para quem foi
  // olhar não é SLA.
  //
  // Não vira linha em `notificacoes`, e isso é decisão, não economia: aquela
  // tabela guarda FATO datado com baixa por pessoa, e SLA estourado não é um
  // fato de um dia, é um estado que dura até alguém responder. Persistir viraria
  // um alerta que precisa ser "lido" enquanto o chamado segue sem resposta.
  // Aqui a seção some sozinha no dia em que a primeira resposta é registrada.
  //
  // Destinatário segue a MESMA escada da regra de destinatário de prazo: quem
  // registrou o chamado, se ainda estiver apto; senão todo mundo que consegue
  // responder, que é quem tem TICKETS_WRITE. Ticket não tem responsável no
  // modelo; no dia em que tiver, o primeiro degrau desta escada passa a ser ele.
  private async acrescentarTicketsSemResposta(
    paraPessoa: (id: string) => PessoaDoResumo | null,
  ) {
    const agora = new Date();
    const atrasados = await this.prisma.ticket.findMany({
      where: {
        ...whereEmAberto(),
        ...whereEmAtraso(agora),
        excluidoEm: null,
      },
      select: {
        titulo: true,
        prioridade: true,
        abertoEm: true,
        criadoPorId: true,
        empresa: { select: { nome: true } },
      },
      orderBy: { abertoEm: 'asc' },
    });

    if (atrasados.length === 0) return;

    let quemResponde: string[] | null = null;
    const carregarQuemResponde = async (): Promise<string[]> => {
      quemResponde ??= await this.usuariosComPermissao('TICKETS_WRITE');
      return quemResponde;
    };

    for (const ticket of atrasados) {
      const linha: TicketSemResposta = {
        titulo: ticket.titulo,
        empresa: ticket.empresa.nome,
        prioridade: ticket.prioridade,
        abertoEm: ticket.abertoEm,
        prazoLimite: calcularPrazoLimite(ticket),
      };

      const registrou = ticket.criadoPorId
        ? paraPessoa(ticket.criadoPorId)
        : null;
      if (registrou) {
        registrou.tickets.push(linha);
        continue;
      }

      for (const id of await carregarQuemResponde()) {
        paraPessoa(id)?.tickets.push(linha);
      }
    }
  }

  async verificarPrazosCompliance() {
    // Dia civil de Brasília, não o dia UTC. O cron agendado roda às 8h daqui
    // (11h UTC, mesmo dia), mas o cron também roda no boot do container, e
    // deploy à noite cai depois da virada do UTC. Ver common/utils/dia-civil.
    const hoje = inicioDoDiaCivil();
    const limite = new Date(
      hoje.getTime() + DIAS_DE_ANTECEDENCIA * 24 * 60 * 60 * 1000,
    );

    const [criadasProjetos, criadasEtapas] = await Promise.all([
      this.verificarPrazosProjetos(limite),
      this.verificarPrazosEtapas(limite),
    ]);

    // Reconciliação DEPOIS da criação, e sobre a janela inteira e não só sobre
    // o que acabou de nascer: quem entrou na equipe de um projeto ontem precisa
    // passar a receber o alerta que foi criado semana passada. É o que faz a
    // regra de destinatário acompanhar a equipe em vez de congelar no dia em
    // que o alerta nasceu.
    const destinatarios = await this.sincronizarDestinatarios(limite);

    return {
      criadas: criadasProjetos + criadasEtapas,
      projetos: criadasProjetos,
      etapas: criadasEtapas,
      destinatarios,
    };
  }

  // Sem piso na janela, de propósito. Antes era `{ gte: hoje, lte: limite }`, e
  // o `gte` tirava da busca exatamente o prazo que já venceu: o sistema parava
  // de falar do problema no dia em que ele virou problema. Num CRM de
  // compliance isso é o oposto do que se quer. O conjunto não cresce sem
  // controle porque projeto concluído já está fora, e porque o @@unique impede
  // criar o mesmo alerta duas vezes.
  private async verificarPrazosProjetos(limite: Date): Promise<number> {
    const projetos = await this.prisma.projeto.findMany({
      where: {
        // Projeto de demonstração não cobra prazo de ninguém: o contrato não
        // existe, e o alerta chegaria como trabalho de verdade na caixa de
        // entrada de uma pessoa de verdade (item 9).
        ...PROJETO_REAL,
        estagio: { not: 'CONCLUIDO' },
        dataLimiteCompliance: { lte: limite },
      },
      include: { empresa: true },
    });

    if (projetos.length === 0) {
      return 0;
    }

    const dados = projetos.map((projeto) => ({
      tipo: 'COMPLIANCE_PRAZO',
      // O FATO, sem contagem de dias. A frase é gravada uma vez e o @@unique
      // impede regravar: um "vence em 9 dias" escrito aqui continuaria dizendo
      // 9 para sempre, e a tela do projeto (que calcula na hora) passaria a
      // contradizer o dashboard. Quem conta os dias é quem lê, a partir de
      // dataReferencia.
      mensagem: `Projeto ${projeto.titulo} da empresa ${projeto.empresa.nome}`,
      projetoId: projeto.id,
      dataReferencia: projeto.dataLimiteCompliance,
    }));

    // O @@unique([projetoId, tipo, dataReferencia]) no schema garante idempotência:
    // se o cron rodar duas vezes no mesmo dia (ou for disparado manualmente depois),
    // skipDuplicates evita criar um segundo alerta pro mesmo projeto/prazo.
    const resultado = await this.prisma.notificacao.createMany({
      data: dados,
      skipDuplicates: true,
    });
    return resultado.count;
  }

  private async verificarPrazosEtapas(limite: Date): Promise<number> {
    const etapas = await this.prisma.etapaProjeto.findMany({
      where: {
        projeto: PROJETO_REAL,
        status: { not: 'CONCLUIDA' },
        prazo: { lte: limite },
      },
      include: { projeto: { include: { empresa: true } } },
    });

    if (etapas.length === 0) {
      return 0;
    }

    const dados = etapas.map((etapa) => ({
      tipo: 'COMPLIANCE_ETAPA',
      mensagem: `Etapa ${etapa.nome} do projeto ${etapa.projeto.titulo} (empresa ${etapa.projeto.empresa.nome})`,
      etapaId: etapa.id,
      // projetoId fica de fora de propósito: o @@unique([etapaId, tipo, dataReferencia])
      // é quem garante a idempotência deste fluxo (ver schema.prisma). Se preenchêssemos
      // projetoId aqui, duas etapas do mesmo projeto com o mesmo prazo colidiriam no
      // índice único de projetos (que não conhece etapaId) e uma notificação legítima
      // seria descartada pelo skipDuplicates.
      dataReferencia: etapa.prazo,
    }));

    const resultado = await this.prisma.notificacao.createMany({
      data: dados,
      skipDuplicates: true,
    });
    return resultado.count;
  }

  // A REGRA DE DESTINATÁRIO, num lugar só.
  //
  //   Alerta de marco   -> o responsável do marco.
  //                        Se não houver, a equipe do projeto.
  //                        Se não houver, o último recurso abaixo.
  //   Alerta de projeto -> a equipe do projeto.
  //                        Se não houver, o último recurso abaixo.
  //   Último recurso    -> todo mundo ativo cujo cargo tem PROJETOS_READ.
  //
  // O último recurso existe porque a alternativa é pior: alerta sem
  // destinatário nenhum é alerta que não chega a ninguém, que é exatamente o
  // defeito que este módulo está corrigindo. Ele é escada de emergência, e o
  // caminho para sair dele é preencher equipe e responsável.
  private async sincronizarDestinatarios(limite: Date): Promise<number> {
    const notificacoes = await this.prisma.notificacao.findMany({
      where: { dataReferencia: { lte: limite } },
      select: {
        id: true,
        projeto: {
          select: { excluidoEm: true, equipe: { select: { id: true } } },
        },
        etapa: {
          select: {
            excluidoEm: true,
            responsavelId: true,
            projeto: {
              select: { excluidoEm: true, equipe: { select: { id: true } } },
            },
          },
        },
      },
    });

    if (notificacoes.length === 0) {
      return 0;
    }

    // Só busca o último recurso se alguma notificação precisar dele. Numa
    // operação com equipe preenchida, esta consulta nunca acontece.
    let ultimoRecurso: string[] | null = null;
    const carregarUltimoRecurso = async (): Promise<string[]> => {
      if (ultimoRecurso === null) {
        ultimoRecurso = await this.usuariosComPermissao(
          PERMISSAO_DE_ULTIMO_RECURSO,
        );
      }
      return ultimoRecurso;
    };

    const linhas: { notificacaoId: string; usuarioId: string }[] = [];

    for (const notificacao of notificacoes) {
      const alvo = notificacao.etapa ?? notificacao.projeto;
      // Projeto ou marco apagado não cobra mais nada de ninguém. Como a
      // visibilidade agora vem daqui, não criar destinatário é o suficiente
      // para o alerta sumir da tela sem precisar apagar a linha.
      if (!alvo || alvo.excluidoEm) continue;
      if (notificacao.etapa?.projeto?.excluidoEm) continue;

      let ids: string[];
      if (notificacao.etapa?.responsavelId) {
        ids = [notificacao.etapa.responsavelId];
      } else {
        const equipe =
          notificacao.etapa?.projeto?.equipe ?? notificacao.projeto?.equipe;
        ids = equipe?.length
          ? equipe.map((pessoa) => pessoa.id)
          : await carregarUltimoRecurso();
      }

      for (const usuarioId of ids) {
        linhas.push({ notificacaoId: notificacao.id, usuarioId });
      }
    }

    if (linhas.length === 0) {
      return 0;
    }

    // skipDuplicates faz a reconciliação ser segura de repetir todo dia: quem
    // já era destinatário continua com a leitura que tinha, e só quem entrou
    // depois ganha linha nova.
    const resultado = await this.prisma.notificacaoDestinatario.createMany({
      data: linhas,
      skipDuplicates: true,
    });
    return resultado.count;
  }

  // Conta desativada e conta com convite pendente ficam de fora: as duas não
  // conseguem entrar no sistema, e mandar alerta para elas seria endereçar o
  // aviso a uma porta fechada.
  private async usuariosComPermissao(permissao: Permissao): Promise<string[]> {
    const usuarios = await this.prisma.user.findMany({
      where: {
        ativo: true,
        codigoConviteHash: null,
        cargo: { permissoes: { has: permissao } },
      },
      select: { id: true },
    });
    return usuarios.map((usuario) => usuario.id);
  }
}

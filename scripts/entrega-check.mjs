#!/usr/bin/env node
// Verificador do programa de entrega. Roda tudo que dá para checar por máquina
// e sai com código diferente de zero se algo falhar.
//
// Regra que este arquivo existe para cumprir (CLAUDE.md, "Regra da classe"):
// correção de defeito de padrão só conta como feita com varredura provando que
// sobrou zero. Por isso quase toda checagem aqui é uma BUSCA QUE DEVE VOLTAR
// VAZIA, e não um teste que afirma sucesso.
//
// Cada checagem imprime o que procurou e o que achou. Nada aqui pode dizer
// "ok" sem ter olhado: se uma verificação não é possível por máquina, ela vai
// para a lista de conferência humana no fim, e não vira checagem falsa.
//
// Uso:  npm run entrega:check
//       npm run entrega:check -- --so-varredura   (pula typecheck/lint/teste)

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SO_VARREDURA = process.argv.includes('--so-varredura');

const VERDE = '\x1b[32m';
const VERMELHO = '\x1b[31m';
const AMARELO = '\x1b[33m';
const CINZA = '\x1b[90m';
const NEGRITO = '\x1b[1m';
const FIM = '\x1b[0m';

const resultados = [];

function registrar(nome, ok, procurou, achou, detalhes = []) {
  resultados.push({ nome, ok, procurou, achou, detalhes });
  const selo = ok ? `${VERDE}[ ok  ]${FIM}` : `${VERMELHO}[FALHA]${FIM}`;
  console.log(`${selo} ${nome}`);
  console.log(`${CINZA}        procurou: ${procurou}${FIM}`);
  console.log(`${CINZA}        achou:    ${achou}${FIM}`);
  for (const linha of detalhes.slice(0, 8)) {
    console.log(`${CINZA}          ${linha}${FIM}`);
  }
  if (detalhes.length > 8) {
    console.log(`${CINZA}          ... mais ${detalhes.length - 8}${FIM}`);
  }
}

// ---------------------------------------------------------------------------
// Ferramentas de leitura de arquivo
// ---------------------------------------------------------------------------

function listarArquivos(dir, extensoes, ignorar = ['node_modules', '.next', 'dist', '.git']) {
  const achados = [];
  if (!existsSync(dir)) return achados;
  for (const nome of readdirSync(dir)) {
    if (ignorar.includes(nome)) continue;
    const caminho = join(dir, nome);
    const info = statSync(caminho);
    if (info.isDirectory()) {
      achados.push(...listarArquivos(caminho, extensoes, ignorar));
    } else if (extensoes.some((ext) => nome.endsWith(ext))) {
      achados.push(caminho);
    }
  }
  return achados;
}

function ler(caminho) {
  try {
    return readFileSync(caminho, 'utf8');
  } catch {
    return '';
  }
}

// Tira comentário de linha e de bloco. Existe porque a maior parte das
// varreduras aqui procura defeito em CÓDIGO, e comentário que fala sobre o
// defeito não é o defeito. Sem isto, todo aviso escrito em comentário viraria
// falso positivo e o verificador nunca ficaria verde.
function semComentarios(fonte) {
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/([^:])\/\/.*$/gm, '$1');
}

// Varredura genérica: procura um padrão e FALHA se achar alguma coisa.
function deveVoltarVazio({ nome, padrao, arquivos, procurou, ignorarComentario = true, filtro }) {
  const ocorrencias = [];
  for (const arquivo of arquivos) {
    const bruto = ler(arquivo);
    const fonte = ignorarComentario ? semComentarios(bruto) : bruto;
    const linhas = fonte.split('\n');
    linhas.forEach((linha, i) => {
      if (padrao.test(linha)) {
        if (filtro && !filtro(arquivo, linha)) return;
        ocorrencias.push(`${relative(RAIZ, arquivo)}:${i + 1}  ${linha.trim().slice(0, 90)}`);
      }
      padrao.lastIndex = 0;
    });
  }
  registrar(
    nome,
    ocorrencias.length === 0,
    procurou,
    ocorrencias.length === 0 ? 'nada, como esperado' : `${ocorrencias.length} ocorrência(s)`,
    ocorrencias,
  );
  return ocorrencias.length === 0;
}

// Varredura invertida: procura um padrão e FALHA se NÃO achar.
function devePresente({ nome, padrao, arquivo, procurou, oQueFalta }) {
  const fonte = ler(join(RAIZ, arquivo));
  const presente = padrao.test(fonte);
  registrar(
    nome,
    presente,
    procurou,
    presente ? 'presente' : `ausente: ${oQueFalta}`,
  );
  return presente;
}

function rodar(nome, comando, args, cwd, procurou) {
  const r = spawnSync(comando, args, {
    cwd: join(RAIZ, cwd),
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  const saida = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim();
  const ok = r.status === 0;
  const linhas = saida.split('\n').filter(Boolean);
  registrar(
    nome,
    ok,
    procurou,
    ok ? 'saiu com código 0' : `saiu com código ${r.status}`,
    ok ? [] : linhas.slice(-10),
  );
  return ok;
}

function titulo(texto) {
  console.log(`\n${NEGRITO}${texto}${FIM}`);
  console.log('-'.repeat(texto.length));
}

// ---------------------------------------------------------------------------

const WEB_SRC = join(RAIZ, 'web/src');
const API_SRC = join(RAIZ, 'api/src');
const arquivosWeb = listarArquivos(WEB_SRC, ['.ts', '.tsx']);
const arquivosApi = listarArquivos(API_SRC, ['.ts']);

console.log(`${NEGRITO}Verificador de entrega, CRM Doctor Quality${FIM}`);
console.log(`${CINZA}raiz: ${RAIZ}${FIM}`);

// ===========================================================================
titulo('1. Saúde do código');
// ===========================================================================

if (SO_VARREDURA) {
  console.log(`${CINZA}        (pulado por --so-varredura)${FIM}`);
} else {
  rodar('api: typecheck', 'npx', ['tsc', '--noEmit'], 'api', 'npx tsc --noEmit dentro de api/');
  rodar(
    'api: lint sem --fix',
    'npx',
    ['eslint', '{src,apps,libs,test,prisma,scripts}/**/*.ts'],
    'api',
    'npx eslint sem --fix (o script npm usa --fix e por isso sempre sai verde)',
  );
  rodar('api: testes', 'npx', ['jest', '--silent'], 'api', 'npx jest dentro de api/');
  rodar('web: typecheck', 'npx', ['tsc', '--noEmit'], 'web', 'npx tsc --noEmit dentro de web/');
  rodar('web: lint', 'npx', ['eslint', '.'], 'web', 'npx eslint dentro de web/');

  // Teste no front: hoje não existe executor. Isto é uma FALHA de propósito,
  // não um "não aplicável": o front concentra urgência, cálculo de dias,
  // formatação e filtros, e nada disso tem rede.
  const pkgWeb = JSON.parse(ler(join(RAIZ, 'web/package.json')) || '{}');
  const temTeste = Boolean(pkgWeb.scripts && pkgWeb.scripts.test);
  registrar(
    'web: testes',
    temTeste,
    'script "test" em web/package.json',
    temTeste ? 'existe, rodando' : 'não existe executor de teste no front',
  );
  if (temTeste) {
    rodar('web: testes (execução)', 'npm', ['test', '--silent'], 'web', 'npm test dentro de web/');
  }

  // e2e da API: existe arquivo, mas o jest padrão tem rootDir "src" e não o
  // alcança. Ou ele roda no verificador, ou não deveria estar no repositório.
  const e2eExiste = existsSync(join(RAIZ, 'api/test/app.e2e-spec.ts'));
  const pkgApi = JSON.parse(ler(join(RAIZ, 'api/package.json')) || '{}');
  const e2eNoCheck = Boolean(pkgApi.scripts && pkgApi.scripts['entrega:e2e']);
  registrar(
    'api: e2e alcançado por algum comando',
    !e2eExiste || e2eNoCheck,
    'api/test/*.e2e-spec.ts e um script que o rode neste verificador',
    e2eExiste && !e2eNoCheck
      ? 'arquivo existe e nenhum comando deste verificador o executa (jest usa rootDir "src")'
      : 'sem pendência',
  );
}

// ===========================================================================
titulo('2. Promessa do produto (Bloco 1)');
// ===========================================================================

// A notificação precisa ter destinatário. O desenho preferido é manter a
// notificação como linha única e criar tabela de leitura por pessoa, que é
// aditivo e não mexe nos dois índices únicos existentes.
const schema = ler(join(RAIZ, 'api/prisma/schema.prisma'));
const blocoNotificacao = (schema.match(/model Notificacao \{[\s\S]*?\n\}/) || [''])[0];
// Aceita qualquer nome para a tabela filha (Destinatario, Leitura, ...): o que
// importa é existir uma linha por pessoa em algum lugar, não como ela se chama.
const temDestinatario =
  /usuarioId/.test(blocoNotificacao) ||
  /model Notificacao[A-Za-z]+\s*\{[\s\S]*?usuarioId/.test(schema);
registrar(
  'notificação tem destinatário ou tabela de leitura',
  temDestinatario,
  'usuarioId no model Notificacao, ou um model Notificacao* com usuarioId no schema.prisma',
  temDestinatario ? 'existe' : 'não existe: o aviso continua sendo da empresa, não de uma pessoa',
);

const servicoNotif = ler(join(RAIZ, 'api/src/notificacoes/notificacoes.service.ts'));
// Busca no CÓDIGO, não no comentário. O service explica em prosa por que o piso
// da janela foi removido, e procurar no arquivo cru fazia essa explicação ser
// lida como o próprio defeito: a checagem acusou falha depois de o defeito ter
// sido corrigido. Falso negativo é pior que checagem ausente, porque esconde a
// regressão de verdade atrás de um alarme que todo mundo aprende a ignorar.
const servicoNotifSemComentario = semComentarios(servicoNotif);
const janelaIgnoraVencido = /gte:\s*hoje/.test(servicoNotifSemComentario);
registrar(
  'janela do cron inclui prazo vencido',
  !janelaIgnoraVencido,
  '"gte: hoje" no código de notificacoes.service.ts, ignorando comentário',
  janelaIgnoraVencido
    ? 'ainda tem "gte: hoje": prazo que já venceu sai do alerta justamente quando mais importa'
    : 'sem "gte: hoje"',
);

const mensagemCongelada = /vence em \$\{/.test(servicoNotifSemComentario);
registrar(
  'mensagem guarda o fato, não o número de dias',
  !mensagemCongelada,
  'interpolação de dias dentro do texto gravado em notificacoes.service.ts',
  mensagemCongelada
    ? 'o texto grava "vence em N dias" e nunca mais é atualizado'
    : 'nenhuma contagem de dias gravada no texto',
);

const temEnvio = [...arquivosApi, join(RAIZ, 'api/package.json')].some((f) =>
  /resend|nodemailer|sendgrid|mailgun|postmark|@aws-sdk\/client-ses/i.test(ler(f)),
);
registrar(
  'existe motor de envio de e-mail',
  temEnvio,
  'resend, nodemailer, sendgrid, mailgun, postmark ou SES em api/src e api/package.json',
  temEnvio ? 'presente' : 'nenhum: o alerta nasce e morre dentro do banco',
);

// Ter motor não é avisar ninguém: até o item 3 o EmailService existia e nada o
// chamava. Esta checagem cobra o LAÇO: o cron diário precisa disparar o resumo,
// e o resumo precisa ser montado por pessoa (o serviço agrupa por destinatário
// antes de chamar o motor).
const chamaResumoNoCron =
  /dispararResumoDiario\(/.test(servicoNotifSemComentario) &&
  /this\.email\.enviar\(/.test(servicoNotifSemComentario);
const separaPorPessoa = existsSync(
  join(RAIZ, 'api/src/notificacoes/resumo-diario.ts'),
);
registrar(
  'o alerta sai do banco: cron dispara aviso por pessoa',
  chamaResumoNoCron && separaPorPessoa,
  'dispararResumoDiario + this.email.enviar em notificacoes.service.ts, e o módulo resumo-diario.ts',
  chamaResumoNoCron && separaPorPessoa
    ? 'o cron diário monta e manda o aviso de cada pessoa'
    : 'o motor existe mas ninguém o chama: o alerta continua morrendo no banco',
);

// ===========================================================================
titulo('3. Guarda de rota (Bloco 3)');
// ===========================================================================

// Rotas de autoatendimento não exigem permissão de módulo de propósito: são
// sobre a própria conta de quem chama.
const ROTAS_SEM_GUARDA_ACEITAS = new Set([
  'GET /',
  'GET /users/me',
  'PATCH /users/me',
  'PATCH /users/me/senha',
]);

function levantarRotas() {
  const rotas = [];
  for (const arquivo of listarArquivos(API_SRC, ['.controller.ts'])) {
    const fonte = ler(arquivo);
    const base = (fonte.match(/@Controller\(['"]?([^'")]*)['"]?\)/) || [, ''])[1];
    const re =
      /((?:@[A-Za-z]+\([^\n]*\)\s*\n\s*)*)@(Get|Post|Patch|Delete|Put)\(([^)]*)\)\s*\n\s*(?:async\s+)?(\w+)/g;
    let m;
    while ((m = re.exec(fonte))) {
      const [, decoradores, verbo, caminhoBruto] = m;
      const caminho = caminhoBruto.trim().replace(/['"]/g, '');
      const completo = '/' + `${base}/${caminho}`.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
      rotas.push({
        chave: `${verbo.toUpperCase()} ${completo}`,
        publica: /@Public\(/.test(decoradores),
        permissao: (decoradores.match(/@RequirePermissao\(['"]([^'"]+)/) || [])[1] ?? null,
        arquivo: relative(RAIZ, arquivo),
      });
    }
  }
  return rotas;
}

const rotas = levantarRotas();
const semGuarda = rotas.filter(
  (r) => !r.publica && !r.permissao && !ROTAS_SEM_GUARDA_ACEITAS.has(r.chave),
);
registrar(
  'toda rota autenticada tem @RequirePermissao',
  semGuarda.length === 0,
  `${rotas.length} rotas nos controllers, tirando @Public e as 4 de autoatendimento`,
  semGuarda.length === 0 ? 'nenhuma sem guarda' : `${semGuarda.length} sem guarda`,
  semGuarda.map((r) => `${r.chave}  (${r.arquivo})`),
);

// Ação de escrita não pode ficar atrás de permissão de leitura.
const controllerNotif = ler(join(RAIZ, 'api/src/notificacoes/notificacoes.controller.ts'));
const executarComRead = /@RequirePermissao\('NOTIFICACOES_READ'\)\s*\n\s*@Post\('executar-agora'\)/.test(
  controllerNotif,
);
registrar(
  'executar-agora não fica atrás de permissão de leitura',
  !executarComRead,
  "@RequirePermissao('NOTIFICACOES_READ') logo acima de @Post('executar-agora')",
  executarComRead
    ? 'a rota que dispara o cron exige só permissão de LEITURA, então qualquer cargo dispara'
    : 'não está atrás de permissão de leitura',
);

// Esta checagem já deu FALSO POSITIVO uma vez, em 09/08/2026: ela procurava o
// texto exato da desestruturação de `semSegredos`, e quando o campo
// `codigoConvite` virou `codigoConviteHash` (item 7) o padrão parou de casar e
// a checagem ficou verde sozinha, com o telefone continuando a vazar. Medido na
// mesma hora: a Coordenadora recebia 3 telefones que não eram dela.
//
// Agora procura a REGRA, não o formato: para o telefone ser filtrado por cargo,
// users.service.ts precisa saber quem gerencia membros, e hoje ele não
// menciona USUARIOS_MANAGE em lugar nenhum.
const servicoUsers = semComentarios(
  ler(join(RAIZ, 'api/src/users/users.service.ts')),
);
const decideQuemVeTelefone = /USUARIOS_MANAGE/.test(servicoUsers);
registrar(
  'telefone não sai de GET /users para quem não gerencia',
  decideQuemVeTelefone,
  'USUARIOS_MANAGE no código de users.service.ts, que é o que decide quem enxerga o número',
  decideQuemVeTelefone
    ? 'o serviço decide o telefone por permissão'
    : 'o serviço não conhece USUARIOS_MANAGE: o telefone de todo mundo continua saindo na resposta',
);

// ===========================================================================
titulo('4. Qualidade que se vê (Bloco 4)');
// ===========================================================================

deveVoltarVazio({
  nome: 'nenhum datetime-local fora do componente de data',
  padrao: /type=["']datetime-local["']/,
  arquivos: arquivosWeb.filter((f) => !f.endsWith('CampoData.tsx')),
  procurou: 'type="datetime-local" em web/src, fora de ui/CampoData.tsx',
});

deveVoltarVazio({
  nome: 'nenhum type="date" solto',
  padrao: /type=["']date["']/,
  arquivos: arquivosWeb.filter((f) => !f.endsWith('CampoData.tsx')),
  procurou: 'type="date" em web/src, fora de ui/CampoData.tsx',
});

deveVoltarVazio({
  nome: 'nenhum hex solto no JSX',
  padrao: /#[0-9a-fA-F]{3,8}\b/,
  arquivos: arquivosWeb,
  procurou: 'cor hexadecimal em .ts e .tsx de web/src (a paleta vive no tailwind.config)',
});

deveVoltarVazio({
  nome: 'nenhum travessão em texto de interface',
  padrao: /—/,
  arquivos: [...arquivosWeb, ...listarArquivos(join(RAIZ, 'web/src/app'), ['.css'])],
  procurou: 'o caractere — em web/src, ignorando comentário (CLAUDE.md, "Texto de produto")',
});

deveVoltarVazio({
  nome: 'nenhum limit fixo fora do paginador',
  padrao: /limit=\$?\{?[A-Za-z0-9_]+\}?/,
  arquivos: arquivosWeb.filter((f) => !f.endsWith('lib/api.ts')),
  procurou: 'limit= em chamada de API fora de lib/api.ts, que é quem pagina',
});

deveVoltarVazio({
  nome: 'formatação de moeda só em lib/formato.ts',
  padrao: /currency:\s*['"]BRL['"]|style:\s*['"]currency['"]/,
  arquivos: arquivosWeb.filter((f) => !f.endsWith('lib/formato.ts')),
  procurou: "style: 'currency' ou currency: 'BRL' fora de lib/formato.ts",
});

deveVoltarVazio({
  nome: 'nenhuma animação decide se algo é visível',
  padrao: /(initial|animate|exit)=\{\{[^}]*opacity|@keyframes[^{]*\{[^}]*opacity/,
  arquivos: [...arquivosWeb, ...listarArquivos(join(RAIZ, 'web/src/app'), ['.css'])],
  procurou:
    'opacity dentro de initial/animate/exit do motion, ou em @keyframes (globals.css: o estado final é o estado base)',
});

// Procura a DIRETIVA, não a palavra: um comentário que explica por que não foi
// preciso suprimir a regra não é uma supressão. Sem esta distinção o
// verificador acusaria prosa e seria ignorado no terceiro dia.
deveVoltarVazio({
  nome: 'nenhum eslint-disable sobrando',
  padrao: /\/\/\s*eslint-disable|\/\*\s*eslint-disable/,
  arquivos: [...arquivosWeb, ...arquivosApi],
  ignorarComentario: false,
  procurou:
    'a diretiva // eslint-disable ou /* eslint-disable em web/src e api/src (regra suprimida não é regra satisfeita)',
});

devePresente({
  nome: 'ValidationPipe recusa campo fora do DTO',
  padrao: /forbidNonWhitelisted:\s*true/,
  arquivo: 'api/src/main.ts',
  procurou: 'forbidNonWhitelisted: true no ValidationPipe de main.ts',
  oQueFalta: 'campo fora do DTO é descartado em silêncio com resposta 200',
});

devePresente({
  nome: 'raiz do Turbopack fixada',
  padrao: /turbopack\s*:\s*\{[\s\S]*root/,
  arquivo: 'web/next.config.ts',
  procurou: 'turbopack.root em web/next.config.ts',
  oQueFalta: 'qualquer lockfile acima da pasta do projeto quebra o npm run dev',
});

const apiTs = ler(join(RAIZ, 'web/src/lib/api.ts'));
const contentTypeSempre = /headers:\s*\{\s*\n\s*'Content-Type'/.test(apiTs);
registrar(
  'GET não manda Content-Type à toa',
  !contentTypeSempre,
  "'Content-Type' fixo no objeto de headers de lib/api.ts",
  contentTypeSempre
    ? 'todo GET manda Content-Type e por isso dispara um OPTIONS antes: o dobro de viagens'
    : 'cabeçalho condicional',
);

// Duas condições, e as duas importam. O DTO precisa chamar um validador de
// CNPJ, e o validador precisa CONFERIR O DÍGITO. Só o nome não basta: um
// decorador chamado EhCnpj que só medisse o tamanho passaria por aqui e
// deixaria entrar um número com um dígito trocado, que é justamente o erro que
// ninguém percebe na hora.
const cnpjDto = ler(join(RAIZ, 'api/src/empresas/dto/create-empresa.dto.ts'));
const cnpjNoDto = /Matches|IsCnpj|EhCnpj|validarCnpj|@Length\(14/.test(cnpjDto);
const validadorCnpj = join(RAIZ, 'api/src/common/validadores/cnpj.ts');
const confereDigito =
  existsSync(validadorCnpj) && /%\s*11|resto/.test(ler(validadorCnpj));
const cnpjValidado = cnpjNoDto && confereDigito;
registrar(
  'CNPJ tem validação de formato',
  cnpjValidado,
  'validador de CNPJ no CreateEmpresaDto, e conta de dígito verificador no validador',
  cnpjValidado
    ? 'formato e dígito verificador'
    : cnpjNoDto
      ? 'o DTO valida, mas o validador não confere dígito'
      : 'só @IsString: qualquer texto entra como CNPJ',
);

const sidebar = ler(join(RAIZ, 'web/src/components/layout/Sidebar.tsx'));
const sidebarFechaComEsc = /Escape/.test(sidebar);
registrar(
  'gaveta do celular fecha com Esc',
  sidebarFechaComEsc,
  'tratamento de Escape em Sidebar.tsx (o Modal já tem, a gaveta não)',
  sidebarFechaComEsc ? 'trata Esc' : 'não trata Esc',
);

// A extensão do Prisma filtra soft delete na consulta DE CIMA, e não no que vem
// por `include`. Uma relação incluída com `true` não tem como filtrar nada:
// linha apagada volta junto. Medido em 10/08/2026, fazendo o item 30: um marco
// excluído pela tela continuava aparecendo na tela do projeto.
deveVoltarVazio({
  nome: 'include de relação com soft delete não volta linha apagada',
  padrao:
    /\b(etapas|interacoes|competencias|tarefas|visitas|tickets|projetos|leads)\s*:\s*true\b/,
  arquivos: arquivosApi,
  procurou:
    'relação com soft delete incluída como `true` em api/src (só `where: { excluidoEm: null }` filtra)',
});

// ===========================================================================
titulo('5. Pela metade (Bloco 5)');
// ===========================================================================

const etapas = ler(join(RAIZ, 'web/src/components/projetos/EtapasSection.tsx'));
const responsavelNaTela = /responsavel/i.test(etapas);
registrar(
  'responsável do marco preenchível em tela',
  responsavelNaTela,
  'responsavel em EtapasSection.tsx',
  responsavelNaTela
    ? 'existe na tela'
    : 'o campo existe no banco e no DTO, e nenhuma tela permite preenchê-lo',
);

// Procura a REGRA e não o formato, pelo mesmo motivo do telefone e do CNPJ: a
// primeira versão desta checagem caçava o texto exato do `&&` que escondia o
// bloco, e passaria a acusar (ou a perdoar) por causa de uma refatoração de
// nome de variável. O que o item pede é que o bloco apareça vazio E ofereça a
// saída, então é isso que se mede: existe a ação de definir equipe, e o bloco
// não está inteiro atrás de uma condição de tamanho.
const projetoDetalhe = ler(join(RAIZ, 'web/src/app/(app)/projetos/[id]/page.tsx'));
const temAcaoDeEquipe = /Definir equipe/.test(projetoDetalhe);
const equipeSomeVazia =
  !temAcaoDeEquipe ||
  /\{\s*\(?\s*(projeto\.equipe\?\.length \?\? 0|naEquipe)\s*\)?\s*>\s*0\s*&&\s*\(\s*\n\s*<div className="rounded-card/.test(
    projetoDetalhe,
  );
registrar(
  'bloco Equipe aparece mesmo vazio, com ação',
  !equipeSomeVazia,
  'a ação "Definir equipe" na tela do projeto, e o bloco fora de uma condição de tamanho',
  equipeSomeVazia
    ? 'o bloco some quando não há ninguém, e some junto o caminho para atribuir'
    : 'bloco sempre visível',
);

// ===========================================================================
titulo('6. Segredo e ambiente (Bloco 2)');
// ===========================================================================

const schemaTemHashConvite = /codigoConviteHash/.test(schema);
registrar(
  'código de convite não fica em texto puro',
  schemaTemHashConvite,
  'campo codigoConviteHash no schema.prisma',
  schemaTemHashConvite
    ? 'guardado como hash'
    : 'o código de 8 dígitos é gravado em claro no banco e vai assim para o backup',
);

const extensaoAudit = semComentarios(
  ler(join(RAIZ, 'api/src/prisma/prisma-audit.extension.ts')),
);
// O defeito era o portão de entrada da extensão: quem não tinha excluidoEm
// saía por `return query(args)` antes de qualquer coisa, e com isso perdia
// soft delete E auditoria de uma vez. Procura a negação exata que fazia isso.
const portaoPeloSoftDelete = /!\s*MODELOS_COM_SOFT_DELETE\.has\(model\)/.test(
  extensaoAudit,
);
const listaDeExcecoes = (extensaoAudit.match(/FORA_DA_TRILHA[\s\S]*?\]\)/) ||
  [''])[0];
const sensivelForaDaTrilha = /'User'|'Cargo'/.test(listaDeExcecoes);
const auditoriaAlcanca = !portaoPeloSoftDelete && !sensivelForaDaTrilha;
registrar(
  'auditoria alcança User e Cargo',
  auditoriaAlcanca,
  '"!MODELOS_COM_SOFT_DELETE.has(model)" no portão da extensão, e User/Cargo na lista de exceções',
  auditoriaAlcanca
    ? 'auditoria desacoplada do soft delete, e nenhuma das duas está excluída'
    : portaoPeloSoftDelete
      ? 'quem não tem excluidoEm sai antes de ser auditado: trocar cargo, criar conta e desativar membro não deixam rastro'
      : 'User ou Cargo está na lista de exceções da trilha',
);

// A trilha guarda o retrato completo da linha. Com User dentro dela, esse
// retrato passaria a incluir hash de senha e código de convite se ninguém
// limpasse antes de gravar.
const redacaoDeSegredo = /CAMPOS_QUE_NUNCA_ENTRAM/.test(extensaoAudit);
registrar(
  'auditoria não copia credencial para dentro do log',
  redacaoDeSegredo,
  'lista de campos ocultados antes de gravar em audit_logs',
  redacaoDeSegredo
    ? 'senhaHash e codigoConvite são substituídos antes de serializar'
    : 'o retrato vai cru para audit_logs, que entra inteiro no arquivo de backup',
);

// Arquivo com segredo dentro precisa estar fechado. `.env` e `.env.local` têm
// senha de banco e o JWT_SECRET, e ficavam em 644, legíveis por qualquer
// processo do usuário, enquanto `.env.producao` já estava correto em 600.
// Os arquivos são locais e ficam fora do git: numa cópia recém-clonada eles não
// existem, e aí não há o que proteger.
for (const arquivo of ['api/.env', 'api/.env.local', 'api/.env.producao']) {
  const caminho = join(RAIZ, arquivo);
  if (!existsSync(caminho)) {
    registrar(
      `${arquivo} fechado`,
      true,
      'permissão do arquivo',
      'não existe nesta cópia, nada a proteger',
    );
    continue;
  }
  const modo = (statSync(caminho).mode & 0o777).toString(8);
  registrar(
    `${arquivo} fechado`,
    modo === '600',
    'permissão 600 (só o dono lê), porque o arquivo tem senha de banco dentro',
    modo === '600' ? '600' : `${modo}, legível por outros processos`,
  );
}

// O `npm run lint` da api rodava com `--fix`: ele consertava e saía verde,
// então o zero era o estado DEPOIS do conserto e não o do código commitado. E
// como `nest build` exclui os `*.spec.ts`, dava para ter lint verde com a
// compilação quebrada, que foi o que aconteceu entre 07/08 e 09/08/2026. As
// duas coisas juntas são o motivo de o marco zero deste programa ter sido
// diferente do que os relatórios afirmavam.
for (const projeto of ['api', 'web']) {
  const scripts =
    JSON.parse(ler(join(RAIZ, `${projeto}/package.json`)) || '{}').scripts ?? {};
  const lint = scripts.lint ?? '';
  const comFix = /--fix/.test(lint);
  const chamaTypecheck = /typecheck|tsc\s+--noEmit/.test(lint);
  const ok = Boolean(lint) && !comFix && chamaTypecheck;
  registrar(
    `${projeto}: lint mede o estado real`,
    ok,
    `o script "lint" de ${projeto}/package.json: sem --fix e chamando o typecheck`,
    !lint
      ? 'não existe script de lint'
      : comFix
        ? 'roda com --fix: conserta e sai verde, então o número não é o do código commitado'
        : !chamaTypecheck
          ? 'não chama o typecheck: dá para ter lint verde com a compilação quebrada'
          : 'sem --fix e com typecheck junto',
  );
}

// Comando que promete rodar aqui e conecta num banco remoto é armadilha, e esta
// já foi documentada como caminho seguro uma vez. Ver comentario:start.
const pkgApiScripts = JSON.parse(ler(join(RAIZ, 'api/package.json')) || '{}')
  .scripts ?? {};
const temArmadilhaDeStart = 'start:dev' in pkgApiScripts || 'start:debug' in pkgApiScripts;
registrar(
  'nenhum script sobe a API sem carregar .env.local',
  !temArmadilhaDeStart,
  'start:dev e start:debug em api/package.json, que rodam nest start sem carregar .env.local',
  temArmadilhaDeStart
    ? 'existe comando que promete subir a API aqui e pega o .env, que aponta para um Neon remoto'
    : 'só start:local sobe a API em desenvolvimento',
);

const urlApiRegistrada = ['README.md', 'CLAUDE.md', 'docs/ENDERECOS.md'].some((f) =>
  /easypanel\.host|api\.[a-z]+\.com\.br/i.test(ler(join(RAIZ, f))),
);
registrar(
  'endereço da API de produção está no repositório',
  urlApiRegistrada,
  'host do EasyPanel em README.md, CLAUDE.md ou docs/ENDERECOS.md',
  urlApiRegistrada
    ? 'registrado'
    : 'a URL só existe na variável de ambiente da Vercel: se aquele painel se perder, ninguém sabe onde a API mora',
);

// ===========================================================================
// Resultado
// ===========================================================================

const falhas = resultados.filter((r) => !r.ok);
console.log(`\n${NEGRITO}Resultado${FIM}`);
console.log('-'.repeat(9));
console.log(`${resultados.length - falhas.length} de ${resultados.length} checagens passaram.`);
if (falhas.length) {
  console.log(`\n${VERMELHO}${NEGRITO}Falhando agora:${FIM}`);
  for (const f of falhas) console.log(`  ${VERMELHO}x${FIM} ${f.nome}`);
}

// ---------------------------------------------------------------------------
// Conferência humana
// ---------------------------------------------------------------------------
//
// O que entra aqui é o que NÃO dá para provar por máquina neste repositório.
// Preferimos esta lista longa e honesta a uma checagem que finge cobrir.

console.log(`\n${AMARELO}${NEGRITO}Conferência humana${FIM}`);
console.log('-'.repeat(18));
const humanas = [
  ['Gaveta do celular', 'Abra o CRM em 390px, toque no menu e depois toque fora. A gaveta deve escurecer o fundo ao abrir e sumir por completo ao fechar. Se a tela parecer não responder ao toque, o defeito voltou.'],
  ['Alvo de toque', 'Na Agenda em 390px, os botões Mês, Semana, Dia e Lista devem ter pelo menos 36px de altura. Hoje têm 28px, e os blocos de visita têm 19px.'],
  ['Membros e 403', 'Logado como CEO, na tela de Membros, a linha de alguém do mesmo nível não deve oferecer Editar, Resetar senha nem Desativar. Hoje oferece, e os três devolvem erro.'],
  ['Mensagem de erro', 'Logado como Analista, abra /membros pelo endereço. Deve dizer que o cargo não tem acesso, e não "isso costuma ser passageiro, tente de novo" com o nome de uma permissão na tela.'],
  ['Botão da agenda', 'O botão do topo da Agenda e o título do formulário que ele abre precisam dizer a mesma coisa. Hoje o botão diz Evento e o formulário diz Nova visita.'],
  ['E-mail chegando', 'Depois do Bloco 1, dispare o aviso e confirme que o e-mail chegou na caixa de entrada de verdade, não só que a API respondeu 200.'],
  ['Contas de teste', 'Na tela de Membros da PRODUÇÃO, nenhuma conta @teste.com pode aparecer como ativa.'],
  ['Backup restaurado', 'Restaure o backup mais recente num banco descartável e compare a contagem das tabelas com a produção. Backup nunca restaurado não é backup.'],
  ['Cópia fora da máquina', 'Confirme que existe uma cópia do backup fora deste Mac. Hoje o arquivo é único e mora no Desktop.'],
  ['Permissão do .env', 'api/.env precisa estar em 600 como o .env.producao. Hoje está 644, e tem senha do banco e o segredo do JWT dentro.'],
  ['Dado de demonstração', 'Decida o que fazer com o cenário de demonstração que está na produção. Enquanto ele existir, todo número do dashboard é parte real e parte encenação.'],
];
for (const [nome, oQue] of humanas) {
  console.log(`  ${AMARELO}?${FIM} ${NEGRITO}${nome}${FIM}`);
  console.log(`    ${CINZA}${oQue}${FIM}`);
}

console.log('');
process.exit(falhas.length ? 1 : 0);

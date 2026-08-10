import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { RequestMethod } from '@nestjs/common';
import {
  PATH_METADATA,
  METHOD_METADATA,
  MODULE_METADATA,
} from '@nestjs/common/constants';
import { AppModule } from '../../app.module';
import { PERMISSAO_KEY } from '../decorators/require-permissao.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Permissao } from '../constants/permissoes';

// A DECLARAÇÃO de quem pode chamar o quê, rota por rota.
//
// Por que existe: `GET /cargos` ficou sem guarda nenhuma desde o começo do
// projeto, e ninguém notou. Qualquer pessoa autenticada, inclusive o cargo mais
// baixo, lia o mapa completo de permissões da empresa. O menu escondia, a API
// entregava. Não foi falta de cuidado num dia ruim: foi não haver lugar onde a
// pergunta "quem pode chamar isto?" tivesse resposta escrita.
//
// Este arquivo é esse lugar. A tabela abaixo diz o que DEVE valer, o teste lê o
// que vale de verdade na metadata (a mesma que PermissionsGuard e JwtAuthGuard
// leem em runtime, e não uma varredura de texto que pode discordar do que o
// Nest enxerga), e compara os dois.
//
// Três consequências, e as três importam:
//
//   1. Rota nova sem entrada aqui quebra o teste. Não dá para acrescentar
//      endpoint e esquecer de decidir quem o acessa.
//   2. Tirar a guarda de uma rota quebra o teste, mesmo que nada mais quebre.
//   3. Entrada aqui para rota que não existe mais também quebra, senão a tabela
//      vira documentação envelhecida, que é como esta base já se enganou quatro
//      vezes esta semana.
//
// ELE NASCEU FALHANDO, DE PROPÓSITO, em 09/08/2026, em exatamente três casos:
// GET /cargos, GET /cargos/:id e POST /notificacoes/executar-agora. A tabela
// declarava o que deveria ser, e o código ainda não estava lá. Consertar antes
// de escrever o teste faria o teste passar sem nunca ter provado que o buraco
// existia.
//
// Os três foram fechados no mesmo dia, pelos itens 13 e 15 do ENTREGA.md, e a
// partir daqui o teste está verde. Se algum deles voltar a falhar, é
// regressão.

// 'AUTENTICADO' é rota que exige sessão e nenhuma permissão de módulo. Existe
// como valor declarável de propósito: sem ele, uma rota que perdesse a guarda
// por acidente cairia no mesmo balde das que legitimamente não têm, e o teste
// ficaria verde justamente no caso que ele existe para pegar.
type Guarda = Permissao | 'PUBLICO' | 'AUTENTICADO';

const DECLARACAO: Record<string, Guarda> = {
  // Saúde e autenticação. Públicas porque quem chama ainda não tem sessão, ou
  // porque é um monitor externo, que não tem como se autenticar.
  'GET /health': 'PUBLICO',
  'GET /health/cron': 'PUBLICO',
  'POST /auth/login': 'PUBLICO',
  'POST /users/resgatar-convite': 'PUBLICO',

  // Boilerplate do Nest, responde "Hello World!". Sem permissão de módulo
  // porque não expõe dado nenhum.
  'GET /': 'AUTENTICADO',

  // Autoatendimento: a pessoa age sobre a própria conta, então não há
  // permissão de módulo a exigir, e a hierarquia não se aplica.
  'GET /users/me': 'AUTENTICADO',
  'PATCH /users/me': 'AUTENTICADO',
  'PATCH /users/me/senha': 'AUTENTICADO',

  // Empresas
  'GET /empresas': 'EMPRESAS_READ',
  'GET /empresas/:id': 'EMPRESAS_READ',
  'POST /empresas': 'EMPRESAS_WRITE',
  'PATCH /empresas/:id': 'EMPRESAS_WRITE',
  'DELETE /empresas/:id': 'EMPRESAS_WRITE',

  // Projetos e marcos
  'GET /projetos': 'PROJETOS_READ',
  'GET /projetos/:id': 'PROJETOS_READ',
  'GET /projetos/:id/etapas': 'PROJETOS_READ',
  'POST /projetos': 'PROJETOS_WRITE',
  'POST /projetos/:id/etapas': 'PROJETOS_WRITE',
  'PATCH /projetos/:id': 'PROJETOS_WRITE',
  'PATCH /projetos/:id/estagio': 'PROJETOS_WRITE',
  'DELETE /projetos/:id': 'PROJETOS_WRITE',
  'PATCH /etapas/:id': 'PROJETOS_WRITE',
  'DELETE /etapas/:id': 'PROJETOS_WRITE',

  // Tickets
  'GET /tickets': 'TICKETS_READ',
  'GET /tickets/:id': 'TICKETS_READ',
  'POST /tickets': 'TICKETS_WRITE',
  'PATCH /tickets/:id': 'TICKETS_WRITE',
  'PATCH /tickets/:id/status': 'TICKETS_WRITE',
  'PATCH /tickets/:id/responder': 'TICKETS_WRITE',
  'DELETE /tickets/:id': 'TICKETS_WRITE',

  // Agenda
  'GET /visitas': 'VISITAS_READ',
  'GET /visitas/:id': 'VISITAS_READ',
  // Lista enxuta de quem pode receber visita. Fica em VISITAS_READ e não em
  // USUARIOS_READ de propósito: quem monta a agenda precisa desta lista sem
  // precisar enxergar o cadastro de membros inteiro.
  'GET /visitas/consultores': 'VISITAS_READ',
  'POST /visitas': 'VISITAS_WRITE',
  'PATCH /visitas/:id': 'VISITAS_WRITE',
  'DELETE /visitas/:id': 'VISITAS_WRITE',

  // Tarefas
  'GET /tarefas': 'TAREFAS_READ',
  'GET /tarefas/:id': 'TAREFAS_READ',
  'POST /tarefas': 'TAREFAS_WRITE',
  'PATCH /tarefas/:id': 'TAREFAS_WRITE',
  'DELETE /tarefas/:id': 'TAREFAS_WRITE',

  // Interações
  'GET /interacoes': 'INTERACOES_READ',
  'POST /interacoes': 'INTERACOES_WRITE',

  // Competências
  'GET /competencias': 'COMPETENCIAS_READ',
  'GET /competencias/:id': 'COMPETENCIAS_READ',
  'POST /competencias': 'COMPETENCIAS_WRITE',
  'PATCH /competencias/:id': 'COMPETENCIAS_WRITE',
  'DELETE /competencias/:id': 'COMPETENCIAS_WRITE',

  // Leads. Fora do menu por decisão de produto, mas as rotas existem e
  // precisam de guarda igual.
  'GET /leads': 'LEADS_READ',
  'GET /leads/:id': 'LEADS_READ',
  'POST /leads': 'LEADS_WRITE',
  'PATCH /leads/:id': 'LEADS_WRITE',
  'PATCH /leads/:id/estagio': 'LEADS_WRITE',
  'DELETE /leads/:id': 'LEADS_WRITE',
  // Converter lead cria uma EmpresaCliente: a permissão é a do que se cria, e
  // não a do que se lê.
  'POST /leads/:id/converter': 'EMPRESAS_WRITE',

  'GET /dashboard/resumo': 'DASHBOARD_READ',

  // Notificações
  'GET /notificacoes': 'NOTIFICACOES_READ',
  // Marcar como lida é escrita, mas escreve a própria leitura de quem chama, e
  // o service já devolve 404 para quem não é destinatário. Ler o próprio alerta
  // e dar baixa nele são o mesmo direito.
  'PATCH /notificacoes/:id/lida': 'NOTIFICACOES_READ',
  // Ficava em NOTIFICACOES_READ, ou seja, uma permissão de LEITURA protegendo
  // uma ação que cria notificação e destinatário: medido em 09/08/2026, o
  // token de Analista recebia 201 aqui. PROJETOS_WRITE porque quem força o
  // vigia de prazos é quem mexe em prazo.
  'POST /notificacoes/executar-agora': 'PROJETOS_WRITE',

  // Cargos. As duas de leitura ficaram sem guarda nenhuma desde o começo do
  // projeto: qualquer pessoa autenticada lia o mapa completo de permissões da
  // empresa. Conferido na tela antes do conserto: o Analista digitava /cargos
  // no endereço e a página renderizava inteira.
  'GET /cargos': 'CARGOS_MANAGE',
  'GET /cargos/:id': 'CARGOS_MANAGE',
  // Lista enxuta (id, nome, nível) para o seletor do cadastro de membro.
  // Guarda diferente das outras de propósito: escolher o cargo de alguém é
  // gerenciar MEMBRO, não gerenciar cargo. Sem esta rota, fechar as duas acima
  // deixaria o seletor vazio, e vazio em silêncio, para quem tem
  // USUARIOS_MANAGE e não tem CARGOS_MANAGE. Mesmo desenho de
  // GET /visitas/consultores.
  'GET /cargos/atribuiveis': 'USUARIOS_MANAGE',
  'POST /cargos': 'CARGOS_MANAGE',
  'PATCH /cargos/:id': 'CARGOS_MANAGE',
  'DELETE /cargos/:id': 'CARGOS_MANAGE',

  // Membros. Ver e gerenciar são permissões separadas: o Coordenador lê a
  // equipe e não mexe nela.
  'GET /users': 'USUARIOS_READ',
  'GET /users/:id': 'USUARIOS_READ',
  'POST /users': 'USUARIOS_MANAGE',
  'PATCH /users/:id': 'USUARIOS_MANAGE',
  'DELETE /users/:id': 'USUARIOS_MANAGE',
  'POST /users/:id/reenviar-convite': 'USUARIOS_MANAGE',
};

// ---------------------------------------------------------------------------
// Leitura do que vale de verdade
// ---------------------------------------------------------------------------

const VERBO: Record<number, string> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH',
};

// Descobre os controllers caminhando o grafo de módulos a partir do AppModule,
// e não lendo arquivos do disco. A diferença importa: arquivo de controller que
// ninguém registrou num módulo não serve rota nenhuma, e arquivo que existe não
// é o mesmo que rota que existe. Aqui a fonte é a mesma metadata que o Nest usa
// para montar o roteador.
type Classe = { prototype: object };

function controllersDoGrafo(raiz: unknown): Set<Classe> {
  const achados = new Set<Classe>();
  const vistos = new Set<unknown>();
  const fila: unknown[] = [raiz];

  while (fila.length) {
    const entrada = fila.pop();
    if (!entrada) continue;

    // ConfigModule.forRoot() e afins devolvem um objeto { module, ... } em vez
    // da classe: o módulo de verdade está lá dentro.
    const classe =
      typeof entrada === 'object' && entrada !== null && 'module' in entrada
        ? entrada.module
        : entrada;

    // Dedupe na CLASSE resolvida, e só depois de resolver. Marcar a entrada
    // crua antes de processar fazia todo módulo simples ser pulado, porque a
    // classe resolvida era a própria entrada já marcada.
    if (!classe || vistos.has(classe)) continue;
    vistos.add(classe);

    const controllers =
      (Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, classe) as
        Classe[] | undefined) ?? [];
    for (const controller of controllers) achados.add(controller);

    const importados =
      (Reflect.getMetadata(MODULE_METADATA.IMPORTS, classe) as
        unknown[] | undefined) ?? [];
    fila.push(...importados);
  }
  return achados;
}

// Conferência de cobertura: todo arquivo *.controller.ts precisa ter virado um
// controller registrado. Se alguém criar o arquivo e esquecer de pôr no módulo,
// as duas contagens divergem e o teste acusa, em vez de a rota simplesmente
// não existir em silêncio.
function contarArquivosDeController(dir: string): number {
  let total = 0;
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      total += contarArquivosDeController(caminho);
    } else if (nome.endsWith('.controller.ts')) {
      total += 1;
    }
  }
  return total;
}

function guardaDe(handler: unknown, controller: unknown): Guarda {
  // Mesma ordem do getAllAndOverride dos guards: o handler ganha da classe.
  const publico =
    (Reflect.getMetadata(IS_PUBLIC_KEY, handler as object) as
      boolean | undefined) ??
    (Reflect.getMetadata(IS_PUBLIC_KEY, controller as object) as
      boolean | undefined);
  if (publico) return 'PUBLICO';

  const permissao =
    (Reflect.getMetadata(PERMISSAO_KEY, handler as object) as
      Permissao | undefined) ??
    (Reflect.getMetadata(PERMISSAO_KEY, controller as object) as
      Permissao | undefined);
  return permissao ?? 'AUTENTICADO';
}

const CONTROLLERS = controllersDoGrafo(AppModule);

function levantarRotas(): Map<string, Guarda> {
  const rotas = new Map<string, Guarda>();

  for (const controller of CONTROLLERS) {
    const base = Reflect.getMetadata(PATH_METADATA, controller) as
      string | undefined;
    if (base === undefined) continue;

    const prototipo = controller.prototype;
    for (const nome of Object.getOwnPropertyNames(prototipo)) {
      if (nome === 'constructor') continue;
      const handler = (prototipo as Record<string, unknown>)[nome];
      if (typeof handler !== 'function') continue;

      const sub = Reflect.getMetadata(PATH_METADATA, handler) as
        string | undefined;
      const metodo = Reflect.getMetadata(METHOD_METADATA, handler) as
        number | undefined;
      if (sub === undefined || metodo === undefined) continue;

      const caminho =
        '/' +
        [base, sub]
          .join('/')
          .replace(/^\/+|\/+$/g, '')
          .replace(/\/+/g, '/');
      rotas.set(`${VERBO[metodo]} ${caminho}`, guardaDe(handler, controller));
    }
  }
  return rotas;
}

const ROTAS_REAIS = levantarRotas();

// ---------------------------------------------------------------------------

describe('Rotas e permissões: o que a tabela declara é o que o código faz', () => {
  const declaradas = Object.keys(DECLARACAO).sort();

  it.each(declaradas)('%s', (chave) => {
    expect(ROTAS_REAIS.get(chave)).toBe(DECLARACAO[chave]);
  });
});

describe('Rotas e permissões: a tabela e o código cobrem o mesmo conjunto', () => {
  it('toda rota do sistema está declarada na tabela', () => {
    const naoDeclaradas = [...ROTAS_REAIS.keys()]
      .filter((chave) => !(chave in DECLARACAO))
      .sort();
    // Rota que existe e ninguém declarou é rota cujo acesso ninguém decidiu.
    expect(naoDeclaradas).toEqual([]);
  });

  it('nenhuma entrada da tabela aponta para rota que não existe mais', () => {
    const orfas = Object.keys(DECLARACAO)
      .filter((chave) => !ROTAS_REAIS.has(chave))
      .sort();
    expect(orfas).toEqual([]);
  });

  it('a contagem de rotas bate com a da tabela', () => {
    expect(ROTAS_REAIS.size).toBe(Object.keys(DECLARACAO).length);
  });

  it('todo arquivo de controller virou controller registrado num módulo', () => {
    const noDisco = contarArquivosDeController(join(__dirname, '..', '..'));
    // Divergir significa arquivo de controller que ninguém pôs no módulo: as
    // rotas dele não existem, e não existem em silêncio.
    expect(CONTROLLERS.size).toBe(noDisco);
  });
});

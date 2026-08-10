import { semSegredosParaAuditoria } from './prisma-audit.extension';

// A trilha de auditoria guarda um retrato completo da linha. Quando User
// entrou na trilha, em 09/08/2026, esse retrato passou a incluir senhaHash e
// codigoConvite, que são credencial: o hash de senha e o código de uso único de
// primeiro acesso. Escrevê-los em audit_logs colocaria credencial numa tabela
// que ninguém trata como sensível e que vai inteira para o arquivo de backup.
//
// Esta base já teve o codigoConvite vazando na listagem de /users e o senhaHash
// quase vazando pela agenda, das duas vezes por um `include` cru em User. É a
// mesma porta abrindo pela terceira vez, e por isso a defesa tem teste próprio.
describe('semSegredosParaAuditoria', () => {
  it('esconde o hash de senha e o código de convite', () => {
    const limpo = semSegredosParaAuditoria({
      id: 'u1',
      nome: 'Renata',
      email: 'renata@exemplo.com',
      senhaHash: '$argon2id$v=19$m=65536,t=3,p=4$abc',
      codigoConvite: '33871029',
    }) as Record<string, unknown>;

    expect(limpo.senhaHash).toBe('[oculto]');
    expect(limpo.codigoConvite).toBe('[oculto]');
    expect(JSON.stringify(limpo)).not.toContain('argon2');
    expect(JSON.stringify(limpo)).not.toContain('33871029');
  });

  it('mantém o resto do retrato, que é a razão de a trilha existir', () => {
    const limpo = semSegredosParaAuditoria({
      id: 'u1',
      nome: 'Renata',
      email: 'renata@exemplo.com',
      cargoId: 'c-coordenador',
      ativo: false,
    }) as Record<string, unknown>;

    expect(limpo).toMatchObject({
      id: 'u1',
      nome: 'Renata',
      email: 'renata@exemplo.com',
      cargoId: 'c-coordenador',
      ativo: false,
    });
  });

  // Substituir e não omitir: com a chave ausente, "esta conta não tinha código
  // de convite" e "tinha e eu escondi" viram o mesmo retrato, e a trilha existe
  // justamente para dizer o que havia.
  it('distingue campo ausente de campo escondido', () => {
    const comCodigo = semSegredosParaAuditoria({
      codigoConvite: '12345678',
    }) as Record<string, unknown>;
    const semCodigo = semSegredosParaAuditoria({
      codigoConvite: null,
    }) as Record<string, unknown>;

    expect(comCodigo).toHaveProperty('codigoConvite', '[oculto]');
    expect(semCodigo).toHaveProperty('codigoConvite', null);
  });

  it('alcança objeto aninhado e lista, e não só o primeiro nível', () => {
    const limpo = semSegredosParaAuditoria({
      cargo: { nome: 'CEO' },
      usuarios: [
        { nome: 'A', senhaHash: 'hash-a' },
        { nome: 'B', senhaHash: 'hash-b' },
      ],
    }) as { usuarios: Record<string, unknown>[] };

    expect(limpo.usuarios[0].senhaHash).toBe('[oculto]');
    expect(limpo.usuarios[1].senhaHash).toBe('[oculto]');
    expect(limpo.usuarios[0].nome).toBe('A');
  });

  it('não quebra com data, nulo e valor primitivo', () => {
    const data = new Date('2026-08-09T12:00:00.000Z');
    expect(semSegredosParaAuditoria(data)).toBe(data);
    expect(semSegredosParaAuditoria(null)).toBeNull();
    expect(semSegredosParaAuditoria('texto')).toBe('texto');
    expect(semSegredosParaAuditoria(42)).toBe(42);
  });
});

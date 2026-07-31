import { ForbiddenException } from '@nestjs/common';
import { exigirNivelMenor } from './exigir-nivel-menor';
import { AuthUser } from '../types/auth-user';

function requestUser(cargoNivel: number): AuthUser {
  return {
    sub: '1',
    nome: 'Fulano',
    email: 'f@x.com',
    cargoNivel,
    permissoes: [],
  };
}

describe('exigirNivelMenor (hierarquia RBAC)', () => {
  it('permite gerenciar quem tem nível menor', () => {
    expect(() => exigirNivelMenor(5, requestUser(10), 'msg')).not.toThrow();
  });

  it('bloqueia nível igual ao seu', () => {
    expect(() => exigirNivelMenor(10, requestUser(10), 'msg')).toThrow(
      ForbiddenException,
    );
  });

  it('bloqueia nível maior que o seu', () => {
    expect(() => exigirNivelMenor(20, requestUser(10), 'msg')).toThrow(
      ForbiddenException,
    );
  });

  it('propaga a mensagem recebida', () => {
    expect(() =>
      exigirNivelMenor(10, requestUser(10), 'sem permissão pra isso'),
    ).toThrow('sem permissão pra isso');
  });
});

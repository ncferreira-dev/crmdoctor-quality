import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { AuthUser } from '../types/auth-user';
import { Permissao } from '../constants/permissoes';

function contexto(user?: Partial<AuthUser>): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function guardExigindo(permissao: Permissao | undefined): PermissionsGuard {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(permissao),
  } as unknown as Reflector;
  return new PermissionsGuard(reflector);
}

describe('PermissionsGuard', () => {
  it('libera rota sem @RequirePermissao', () => {
    expect(guardExigindo(undefined).canActivate(contexto())).toBe(true);
  });

  it('libera quando o usuário tem a permissão exigida', () => {
    const guard = guardExigindo('LEADS_READ');
    expect(guard.canActivate(contexto({ permissoes: ['LEADS_READ'] }))).toBe(
      true,
    );
  });

  it('bloqueia (403) quando o usuário não tem a permissão', () => {
    const guard = guardExigindo('LEADS_WRITE');
    expect(() =>
      guard.canActivate(contexto({ permissoes: ['LEADS_READ'] })),
    ).toThrow(ForbiddenException);
  });

  it('bloqueia (403) quando não há usuário na request', () => {
    const guard = guardExigindo('LEADS_READ');
    expect(() => guard.canActivate(contexto(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('bloqueia cargo sem nenhuma permissão', () => {
    const guard = guardExigindo('DASHBOARD_READ');
    expect(() => guard.canActivate(contexto({ permissoes: [] }))).toThrow(
      ForbiddenException,
    );
  });
});
